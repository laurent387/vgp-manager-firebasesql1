import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { query } from "../../db";
import * as crypto from "crypto";

export const clientsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT id, nom, adresse, contact_nom, contact_prenom, contact_email, contact_telephone, created_at
       FROM clients 
       ORDER BY nom ASC`
    );

    return result.rows.map(row => ({
      id: row.id,
      nom: row.nom,
      adresse: row.adresse,
      contactNom: row.contact_nom,
      contactPrenom: row.contact_prenom,
      contactEmail: row.contact_email,
      contactTelephone: row.contact_telephone,
      createdAt: row.created_at,
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await query<any>(
        `SELECT id, nom, adresse, contact_nom, contact_prenom, contact_email, contact_telephone, created_at
         FROM clients 
         WHERE id = ?`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Client non trouvé');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        nom: row.nom,
        adresse: row.adresse,
        contactNom: row.contact_nom,
        contactPrenom: row.contact_prenom,
        contactEmail: row.contact_email,
        contactTelephone: row.contact_telephone,
        createdAt: row.created_at,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        nom: z.string(),
        adresse: z.string(),
        contactNom: z.string(),
        contactPrenom: z.string(),
        contactEmail: z.string().email(),
        contactTelephone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO clients (id, nom, adresse, contact_nom, contact_prenom, contact_email, contact_telephone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.nom, input.adresse, input.contactNom, input.contactPrenom, input.contactEmail, input.contactTelephone]
      );

      return { id };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        nom: z.string(),
        adresse: z.string(),
        contactNom: z.string(),
        contactPrenom: z.string(),
        contactEmail: z.string().email(),
        contactTelephone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await query(
        `UPDATE clients 
         SET nom = ?, adresse = ?, contact_nom = ?, contact_prenom = ?, contact_email = ?, contact_telephone = ?
         WHERE id = ?`,
        [input.nom, input.adresse, input.contactNom, input.contactPrenom, input.contactEmail, input.contactTelephone, input.id]
      );

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM clients WHERE id = ?', [input.id]);
      return { success: true };
    }),
});
