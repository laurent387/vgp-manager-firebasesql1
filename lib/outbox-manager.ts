import { Platform } from 'react-native';
import { localDB } from './local-database';
import { v4 as uuidv4 } from 'uuid';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface OutboxEvent {
  event_id: string;
  entity: string;
  entity_id: string;
  operation: SyncOperation;
  payload_json: string;
  client_timestamp: number;
  status: string;
  retries: number;
  last_error: string | null;
}

class OutboxManager {
  private generateEventId(): string {
    return uuidv4();
  }

  async createWithOutbox(entity: string, data: Record<string, any>): Promise<string> {
    if (Platform.OS === 'web') {
      console.log('[OutboxManager] Skipping on web');
      return data.id;
    }

    const entityId = data.id || this.generateEventId();
    const eventId = this.generateEventId();
    const payload = { ...data, id: entityId };

    await localDB.insert(entity, payload);

    await localDB.addToOutbox({
      eventId,
      entity,
      entityId,
      operation: 'CREATE',
      payload,
    });

    console.log(`[OutboxManager] Created ${entity}/${entityId} with outbox event ${eventId}`);
    return entityId;
  }

  async updateWithOutbox(entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('[OutboxManager] Skipping on web');
      return;
    }

    const eventId = this.generateEventId();
    const payload = { ...data, id: entityId };

    await localDB.update(entity, data, `id = '${entityId}'`);

    await localDB.addToOutbox({
      eventId,
      entity,
      entityId,
      operation: 'UPDATE',
      payload,
    });

    console.log(`[OutboxManager] Updated ${entity}/${entityId} with outbox event ${eventId}`);
  }

  async deleteWithOutbox(entity: string, entityId: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('[OutboxManager] Skipping on web');
      return;
    }

    const eventId = this.generateEventId();

    await localDB.delete(entity, `id = '${entityId}'`);

    await localDB.addToOutbox({
      eventId,
      entity,
      entityId,
      operation: 'DELETE',
      payload: { id: entityId },
    });

    console.log(`[OutboxManager] Deleted ${entity}/${entityId} with outbox event ${eventId}`);
  }

  async getPendingEvents(): Promise<OutboxEvent[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    return await localDB.getPendingOutboxEvents();
  }

  async markEventAcknowledged(eventId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await localDB.markOutboxEventStatus(eventId, 'ACK');
  }

  async markEventError(eventId: string, error: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await localDB.markOutboxEventStatus(eventId, 'ERROR', error);
  }

  async markEventSent(eventId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await localDB.markOutboxEventStatus(eventId, 'SENT');
  }

  async clearAcknowledged(): Promise<void> {
    if (Platform.OS === 'web') return;
    await localDB.clearAcknowledgedOutbox();
  }

  async getLastPulledRevision(): Promise<number> {
    if (Platform.OS === 'web') return 0;
    return await localDB.getLastPulledRevision();
  }

  async setLastPulledRevision(revision: number): Promise<void> {
    if (Platform.OS === 'web') return;
    await localDB.setLastPulledRevision(revision);
  }

  async applyRemoteChanges(changes: {
    revision: number;
    entity: string;
    entity_id: string;
    operation: SyncOperation;
    payload: Record<string, any>;
  }[]): Promise<number> {
    if (Platform.OS === 'web') return 0;
    
    let latestRevision = await this.getLastPulledRevision();
    
    for (const change of changes) {
      try {
        await localDB.applyRemoteChange({
          entity: change.entity,
          entity_id: change.entity_id,
          operation: change.operation,
          payload: change.payload,
        });
        
        if (change.revision > latestRevision) {
          latestRevision = change.revision;
        }
      } catch (error) {
        console.error(`[OutboxManager] Error applying change ${change.revision}:`, error);
      }
    }
    
    if (latestRevision > 0) {
      await this.setLastPulledRevision(latestRevision);
    }
    
    return latestRevision;
  }
}

export const outboxManager = new OutboxManager();
