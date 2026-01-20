import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { query } from "../../db";
import * as crypto from "crypto";

export const dataRouter = createTRPCRouter({
  getVGPHistory: publicProcedure
    .input(z.object({ machineId: z.string().optional() }))
    .query(async ({ input }) => {
      const sql = input.machineId
        ? `SELECT * FROM vgp_history WHERE machine_id = ? ORDER BY date_control DESC`
        : `SELECT * FROM vgp_history ORDER BY date_control DESC`;
      
      const result = await query<any>(sql, input.machineId ? [input.machineId] : []);

      return result.rows.map(row => ({
        id: row.id,
        machineId: row.machine_id,
        dateControl: row.date_control,
        technicienId: row.technicien_id,
        resultat: row.resultat,
        observations: row.observations,
        checkpoints: row.checkpoints || [],
        photos: row.photos || [],
        documents: row.documents || [],
        createdAt: row.created_at,
      }));
    }),

  createVGPHistory: publicProcedure
    .input(
      z.object({
        machineId: z.string(),
        dateControl: z.string(),
        technicienId: z.string().optional(),
        resultat: z.enum(['conforme', 'non_conforme', 'ajournee']),
        observations: z.string().optional(),
        checkpoints: z.array(z.any()).optional(),
        photos: z.array(z.any()).optional(),
        documents: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO vgp_history (id, machine_id, date_control, technicien_id, resultat, observations, checkpoints, photos, documents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, input.machineId, input.dateControl, input.technicienId || null, input.resultat,
          input.observations || null, JSON.stringify(input.checkpoints || []),
          JSON.stringify(input.photos || []), JSON.stringify(input.documents || [])
        ]
      );

      return { id };
    }),

  getUsers: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT id, email, role, client_id, nom, prenom, qualifications, is_active, created_at
       FROM users 
       ORDER BY created_at DESC`
    );

    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      clientId: row.client_id,
      nom: row.nom,
      prenom: row.prenom,
      qualifications: row.qualifications || [],
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }),

  updateUser: publicProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'controleur', 'client']).optional(),
        clientId: z.string().optional(),
        nom: z.string().optional(),
        prenom: z.string().optional(),
        qualifications: z.array(z.any()).optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.email !== undefined) {
        updates.push(`email = ?`);
        values.push(input.email);
      }
      if (input.role !== undefined) {
        updates.push(`role = ?`);
        values.push(input.role);
      }
      if (input.clientId !== undefined) {
        updates.push(`client_id = ?`);
        values.push(input.clientId);
      }
      if (input.nom !== undefined) {
        updates.push(`nom = ?`);
        values.push(input.nom);
      }
      if (input.prenom !== undefined) {
        updates.push(`prenom = ?`);
        values.push(input.prenom);
      }
      if (input.qualifications !== undefined) {
        updates.push(`qualifications = ?`);
        values.push(JSON.stringify(input.qualifications));
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = ?`);
        values.push(input.isActive);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(input.id);
      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return { success: true };
    }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM users WHERE id = ?', [input.id]);
      return { success: true };
    }),

  getCheckpointTemplates: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT * FROM checkpoint_templates WHERE actif = TRUE ORDER BY ordre ASC`
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      label: row.label,
      category: row.category,
      description: row.description,
      ordre: row.ordre,
      orderIndex: row.order_index,
      actif: row.actif,
      createdAt: row.created_at,
    }));
  }),

  createCheckpointTemplate: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        label: z.string(),
        category: z.string().optional(),
        description: z.string().optional(),
        ordre: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO checkpoint_templates (id, name, label, category, description, ordre)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.name || null, input.label, input.category || null, input.description || null, input.ordre]
      );

      return { id };
    }),

  updateCheckpointTemplate: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        label: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        ordre: z.number().optional(),
        actif: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.name !== undefined) {
        updates.push(`name = ?`);
        values.push(input.name);
      }
      if (input.label !== undefined) {
        updates.push(`label = ?`);
        values.push(input.label);
      }
      if (input.category !== undefined) {
        updates.push(`category = ?`);
        values.push(input.category);
      }
      if (input.description !== undefined) {
        updates.push(`description = ?`);
        values.push(input.description);
      }
      if (input.ordre !== undefined) {
        updates.push(`ordre = ?`);
        values.push(input.ordre);
      }
      if (input.actif !== undefined) {
        updates.push(`actif = ?`);
        values.push(input.actif);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(input.id);
      await query(
        `UPDATE checkpoint_templates SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return { success: true };
    }),

  deleteCheckpointTemplate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM checkpoint_templates WHERE id = ?', [input.id]);
      return { success: true };
    }),

  getCustomFieldTemplates: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT * FROM custom_field_templates ORDER BY created_at DESC`
    );

    return result.rows.map(row => ({
      id: row.id,
      key: row.key,
      name: row.name,
      label: row.label,
      type: row.type,
      required: row.required,
      createdAt: row.created_at,
    }));
  }),

  createCustomFieldTemplate: publicProcedure
    .input(
      z.object({
        key: z.string(),
        name: z.string().optional(),
        label: z.string(),
        type: z.enum(['text', 'number', 'date', 'photo', 'pdf']),
        required: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO custom_field_templates (id, key, name, label, type, required)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.key, input.name || null, input.label, input.type, input.required || false]
      );

      return { id };
    }),

  deleteCustomFieldTemplate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM custom_field_templates WHERE id = ?', [input.id]);
      return { success: true };
    }),

  getScheduledEvents: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT * FROM scheduled_events ORDER BY date ASC`
    );

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      date: row.date,
      clientId: row.client_id,
      machineIds: row.machine_ids || [],
      technicienId: row.technicien_id,
      type: row.type,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }),

  createScheduledEvent: publicProcedure
    .input(
      z.object({
        title: z.string(),
        date: z.string(),
        clientId: z.string().optional(),
        machineIds: z.array(z.string()).optional(),
        technicienId: z.string().optional(),
        type: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO scheduled_events (id, title, date, client_id, machine_ids, technicien_id, type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, input.title, input.date, input.clientId || null,
          JSON.stringify(input.machineIds || []), input.technicienId || null,
          input.type || null, input.notes || null
        ]
      );

      return { id };
    }),

  updateScheduledEvent: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        date: z.string().optional(),
        clientId: z.string().optional(),
        machineIds: z.array(z.string()).optional(),
        technicienId: z.string().optional(),
        type: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.title !== undefined) {
        updates.push(`title = ?`);
        values.push(input.title);
      }
      if (input.date !== undefined) {
        updates.push(`date = ?`);
        values.push(input.date);
      }
      if (input.clientId !== undefined) {
        updates.push(`client_id = ?`);
        values.push(input.clientId);
      }
      if (input.machineIds !== undefined) {
        updates.push(`machine_ids = ?`);
        values.push(JSON.stringify(input.machineIds));
      }
      if (input.technicienId !== undefined) {
        updates.push(`technicien_id = ?`);
        values.push(input.technicienId);
      }
      if (input.type !== undefined) {
        updates.push(`type = ?`);
        values.push(input.type);
      }
      if (input.notes !== undefined) {
        updates.push(`notes = ?`);
        values.push(input.notes);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(input.id);
      await query(
        `UPDATE scheduled_events SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return { success: true };
    }),

  deleteScheduledEvent: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM scheduled_events WHERE id = ?', [input.id]);
      return { success: true };
    }),
});
