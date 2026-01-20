import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { query } from "../../db";
import * as crypto from "crypto";

export const machinesRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const result = await query<any>(
      `SELECT id, client_id, date_mise_en_service, numero_serie, constructeur, modele, type_machine,
              date_derniere_vgp, prochaine_vgp, periodicite, observations, custom_fields, reference_client,
              force, compteur_horaire, categorie_pdf, annee_mise_en_service, created_at
       FROM machines 
       ORDER BY numero_serie ASC`
    );

    return result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      dateMiseEnService: row.date_mise_en_service,
      numeroSerie: row.numero_serie,
      constructeur: row.constructeur,
      modele: row.modele,
      typeMachine: row.type_machine,
      dateDerniereVGP: row.date_derniere_vgp,
      prochaineVGP: row.prochaine_vgp,
      periodicite: row.periodicite,
      observations: row.observations,
      customFields: row.custom_fields || [],
      referenceClient: row.reference_client,
      force: row.force,
      compteurHoraire: row.compteur_horaire,
      categoriePdf: row.categorie_pdf,
      anneeMiseEnService: row.annee_mise_en_service,
      createdAt: row.created_at,
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await query<any>(
        `SELECT id, client_id, date_mise_en_service, numero_serie, constructeur, modele, type_machine,
                date_derniere_vgp, prochaine_vgp, periodicite, observations, custom_fields, reference_client,
                force, compteur_horaire, categorie_pdf, annee_mise_en_service, created_at
         FROM machines 
         WHERE id = ?`,
        [input.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Machine non trouvée');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        dateMiseEnService: row.date_mise_en_service,
        numeroSerie: row.numero_serie,
        constructeur: row.constructeur,
        modele: row.modele,
        typeMachine: row.type_machine,
        dateDerniereVGP: row.date_derniere_vgp,
        prochaineVGP: row.prochaine_vgp,
        periodicite: row.periodicite,
        observations: row.observations,
        customFields: row.custom_fields || [],
        referenceClient: row.reference_client,
        force: row.force,
        compteurHoraire: row.compteur_horaire,
        categoriePdf: row.categorie_pdf,
        anneeMiseEnService: row.annee_mise_en_service,
        createdAt: row.created_at,
      };
    }),

  getByClientId: publicProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      const result = await query<any>(
        `SELECT id, client_id, date_mise_en_service, numero_serie, constructeur, modele, type_machine,
                date_derniere_vgp, prochaine_vgp, periodicite, observations, custom_fields, reference_client,
                force, compteur_horaire, categorie_pdf, annee_mise_en_service, created_at
         FROM machines 
         WHERE client_id = ?
         ORDER BY numero_serie ASC`,
        [input.clientId]
      );

      return result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        dateMiseEnService: row.date_mise_en_service,
        numeroSerie: row.numero_serie,
        constructeur: row.constructeur,
        modele: row.modele,
        typeMachine: row.type_machine,
        dateDerniereVGP: row.date_derniere_vgp,
        prochaineVGP: row.prochaine_vgp,
        periodicite: row.periodicite,
        observations: row.observations,
        customFields: row.custom_fields || [],
        referenceClient: row.reference_client,
        force: row.force,
        compteurHoraire: row.compteur_horaire,
        categoriePdf: row.categorie_pdf,
        anneeMiseEnService: row.annee_mise_en_service,
        createdAt: row.created_at,
      }));
    }),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        dateMiseEnService: z.string(),
        numeroSerie: z.string(),
        constructeur: z.string(),
        modele: z.string(),
        typeMachine: z.enum(['mobile', 'fixe', 'presse_plieuse']),
        dateDerniereVGP: z.string().optional(),
        prochaineVGP: z.string().optional(),
        periodicite: z.number(),
        observations: z.string().optional(),
        customFields: z.array(z.any()).optional(),
        referenceClient: z.string().optional(),
        force: z.string().optional(),
        compteurHoraire: z.string().optional(),
        categoriePdf: z.string().optional(),
        anneeMiseEnService: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO machines (id, client_id, date_mise_en_service, numero_serie, constructeur, modele, type_machine,
                               date_derniere_vgp, prochaine_vgp, periodicite, observations, custom_fields,
                               reference_client, force, compteur_horaire, categorie_pdf, annee_mise_en_service)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, input.clientId, input.dateMiseEnService, input.numeroSerie, input.constructeur, input.modele,
          input.typeMachine, input.dateDerniereVGP || null, input.prochaineVGP || null, input.periodicite,
          input.observations || null, JSON.stringify(input.customFields || []), input.referenceClient || null,
          input.force || null, input.compteurHoraire || null, input.categoriePdf || null, input.anneeMiseEnService || null
        ]
      );

      return { id };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        clientId: z.string(),
        dateMiseEnService: z.string(),
        numeroSerie: z.string(),
        constructeur: z.string(),
        modele: z.string(),
        typeMachine: z.enum(['mobile', 'fixe', 'presse_plieuse']),
        dateDerniereVGP: z.string().optional(),
        prochaineVGP: z.string().optional(),
        periodicite: z.number(),
        observations: z.string().optional(),
        customFields: z.array(z.any()).optional(),
        referenceClient: z.string().optional(),
        force: z.string().optional(),
        compteurHoraire: z.string().optional(),
        categoriePdf: z.string().optional(),
        anneeMiseEnService: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await query(
        `UPDATE machines 
         SET client_id = ?, date_mise_en_service = ?, numero_serie = ?, constructeur = ?, modele = ?,
             type_machine = ?, date_derniere_vgp = ?, prochaine_vgp = ?, periodicite = ?, observations = ?,
             custom_fields = ?, reference_client = ?, force = ?, compteur_horaire = ?, categorie_pdf = ?,
             annee_mise_en_service = ?
         WHERE id = ?`,
        [
          input.clientId, input.dateMiseEnService, input.numeroSerie, input.constructeur, input.modele,
          input.typeMachine, input.dateDerniereVGP || null, input.prochaineVGP || null, input.periodicite,
          input.observations || null, JSON.stringify(input.customFields || []), input.referenceClient || null,
          input.force || null, input.compteurHoraire || null, input.categoriePdf || null, input.anneeMiseEnService || null,
          input.id
        ]
      );

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await query('DELETE FROM machines WHERE id = ?', [input.id]);
      return { success: true };
    }),
});
