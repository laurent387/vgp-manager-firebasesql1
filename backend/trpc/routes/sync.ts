import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';
import { query, getClient } from '../../db';

const VALID_ENTITIES = [
  'clients',
  'machines',
  'users',
  'vgp_history',
  'control_sessions',
  'control_results',
  'scheduled_events',
  'interventions',
  'parts',
  'checkpoint_templates',
  'custom_field_templates',
  'reports',
] as const;

const OutboxEventSchema = z.object({
  event_id: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  payload_json: z.string(),
  client_timestamp: z.number(),
});

const PushInputSchema = z.object({
  deviceId: z.string(),
  userId: z.string().optional(),
  events: z.array(OutboxEventSchema),
});

const PullInputSchema = z.object({
  sinceRevision: z.number().default(0),
  limit: z.number().min(1).max(500).default(100),
});

interface ChangeLogEntry {
  revision: number;
  entity: string;
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload_json: string | null;
  server_timestamp: Date;
  user_id: string | null;
  device_id: string | null;
  event_id: string;
}

type PushResult = {
  event_id: string;
  status: 'ACK' | 'ERROR' | 'DUPLICATE';
  error?: string;
  revision?: number;
}[];

export const syncRouter = createTRPCRouter({
  push: publicProcedure
    .input(PushInputSchema)
    .mutation(async ({ input }) => {
      const { deviceId, userId, events } = input;
      const results: PushResult = [];

      console.log(`[Sync] Push received: ${events.length} events from device ${deviceId}`);

      const connection = await getClient();
      
      try {
        await connection.beginTransaction();

        for (const event of events) {
          try {
            const existingResult = await connection.execute(
              'SELECT revision FROM change_log WHERE event_id = ?',
              [event.event_id]
            );
            const existing = (existingResult[0] as any[])[0];

            if (existing) {
              console.log(`[Sync] Duplicate event_id: ${event.event_id}, skipping`);
              results.push({
                event_id: event.event_id,
                status: 'DUPLICATE',
                revision: existing.revision,
              });
              continue;
            }

            if (!VALID_ENTITIES.includes(event.entity as any)) {
              throw new Error(`Invalid entity: ${event.entity}`);
            }

            const payload = JSON.parse(event.payload_json);
            
            if (event.operation === 'CREATE') {
              await applyCreate(connection, event.entity, payload);
            } else if (event.operation === 'UPDATE') {
              await applyUpdate(connection, event.entity, event.entity_id, payload);
            } else if (event.operation === 'DELETE') {
              await applyDelete(connection, event.entity, event.entity_id);
            }

            const [insertResult] = await connection.execute(
              `INSERT INTO change_log (entity, entity_id, operation, payload_json, user_id, device_id, event_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                event.entity,
                event.entity_id,
                event.operation,
                event.payload_json,
                userId || null,
                deviceId,
                event.event_id,
              ]
            );

            const revision = (insertResult as any).insertId;

            console.log(`[Sync] Applied event ${event.event_id}: ${event.operation} ${event.entity}/${event.entity_id} -> revision ${revision}`);

            results.push({
              event_id: event.event_id,
              status: 'ACK',
              revision,
            });
          } catch (error: any) {
            console.error(`[Sync] Error processing event ${event.event_id}:`, error);
            results.push({
              event_id: event.event_id,
              status: 'ERROR',
              error: error.message,
            });
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

      const ackCount = results.filter(r => r.status === 'ACK').length;
      const errorCount = results.filter(r => r.status === 'ERROR').length;
      const dupCount = results.filter(r => r.status === 'DUPLICATE').length;

      console.log(`[Sync] Push complete: ${ackCount} ACK, ${errorCount} ERROR, ${dupCount} DUPLICATE`);

      return { results };
    }),

  pull: publicProcedure
    .input(PullInputSchema)
    .query(async ({ input }) => {
      const { sinceRevision, limit } = input;

      console.log(`[Sync] Pull requested: sinceRevision=${sinceRevision}, limit=${limit}`);

      const { rows } = await query<ChangeLogEntry>(
        `SELECT revision, entity, entity_id, operation, payload_json, server_timestamp, user_id, device_id, event_id
         FROM change_log
         WHERE revision > ?
         ORDER BY revision ASC
         LIMIT ?`,
        [sinceRevision, limit]
      );

      const changes = rows.map(row => ({
        revision: row.revision,
        entity: row.entity,
        entity_id: row.entity_id,
        operation: row.operation as 'CREATE' | 'UPDATE' | 'DELETE',
        payload: row.payload_json ? JSON.parse(row.payload_json as string) : null,
        server_timestamp: row.server_timestamp,
        event_id: row.event_id,
      }));

      const latestRevisionResult = await query<{ max_revision: number }>(
        'SELECT COALESCE(MAX(revision), 0) as max_revision FROM change_log'
      );
      const latestRevision = latestRevisionResult.rows[0]?.max_revision || 0;

      console.log(`[Sync] Pull response: ${changes.length} changes, latestRevision=${latestRevision}`);

      return {
        changes,
        latestRevision,
        hasMore: changes.length === limit,
      };
    }),

  getLatestRevision: publicProcedure.query(async () => {
    const { rows } = await query<{ max_revision: number }>(
      'SELECT COALESCE(MAX(revision), 0) as max_revision FROM change_log'
    );
    return rows[0]?.max_revision || 0;
  }),
});

async function applyCreate(connection: any, entity: string, payload: Record<string, any>) {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map(() => '?').join(', ');
  const columnNames = columns.map(c => `\`${toSnakeCase(c)}\``).join(', ');

  await connection.execute(
    `INSERT INTO ${entity} (${columnNames}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${columns.map(c => `\`${toSnakeCase(c)}\` = VALUES(\`${toSnakeCase(c)}\`)`).join(', ')}`,
    values
  );
}

async function applyUpdate(connection: any, entity: string, entityId: string, payload: Record<string, any>) {
  const updates = Object.keys(payload)
    .filter(k => k !== 'id')
    .map(k => `\`${toSnakeCase(k)}\` = ?`);
  
  if (updates.length === 0) return;

  const values = Object.keys(payload)
    .filter(k => k !== 'id')
    .map(k => payload[k]);
  
  values.push(entityId);

  await connection.execute(
    `UPDATE ${entity} SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

async function applyDelete(connection: any, entity: string, entityId: string) {
  await connection.execute(`DELETE FROM ${entity} WHERE id = ?`, [entityId]);
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
