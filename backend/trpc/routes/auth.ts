import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { query } from "../../db";
import * as crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;
      console.log('[AUTH] Login attempt for:', email);
      
      const hashedPassword = hashPassword(password);

      let result;
      try {
        result = await query<any>(
          `SELECT id, email, role, client_id, nom, prenom, qualifications, is_active, is_activated
           FROM users 
           WHERE email = ? AND password = ?`,
          [email, hashedPassword]
        );
        console.log('[AUTH] Query result:', { found: result.rows.length > 0 });
      } catch (dbError: any) {
        console.error('[AUTH] Database error during login:', dbError.message);
        throw new Error('Erreur de connexion à la base de données');
      }

      if (result.rows.length === 0) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw new Error('Compte désactivé');
      }

      if (!user.is_activated) {
        throw new Error('Compte non activé. Vérifiez votre email.');
      }

      let qualifications = [];
      try {
        qualifications = user.qualifications ? 
          (typeof user.qualifications === 'string' ? JSON.parse(user.qualifications) : user.qualifications) : 
          [];
      } catch (e) {
        console.error('[AUTH] Error parsing qualifications:', e);
        qualifications = [];
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          clientId: user.client_id,
          nom: user.nom,
          prenom: user.prenom,
          qualifications,
        },
        token: generateToken(),
      };
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'controleur', 'client']),
        clientId: z.string().optional(),
        nom: z.string().optional(),
        prenom: z.string().optional(),
        qualifications: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password, role, clientId, nom, prenom, qualifications } = input;
      
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const hashedPassword = hashPassword(password);
      const activationToken = generateToken();
      const activationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const userId = crypto.randomUUID();

      await query(
        `INSERT INTO users (id, email, password, role, client_id, nom, prenom, qualifications, is_active, is_activated, activation_token, activation_token_expiry)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, FALSE, ?, ?)`,
        [userId, email, hashedPassword, role, clientId || null, nom || null, prenom || null, JSON.stringify(qualifications || []), activationToken, activationTokenExpiry]
      );

      return {
        userId,
        activationToken,
      };
    }),

  activateAccount: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { token, password } = input;

      const result = await query<any>(
        `SELECT id, email, activation_token_expiry FROM users 
         WHERE activation_token = ?`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Token invalide');
      }

      const user = result.rows[0];

      if (new Date() > new Date(user.activation_token_expiry)) {
        throw new Error('Token expiré');
      }

      const hashedPassword = hashPassword(password);

      await query(
        `UPDATE users 
         SET password = ?, is_activated = TRUE, activation_token = NULL, activation_token_expiry = NULL
         WHERE id = ?`,
        [hashedPassword, user.id]
      );

      return { success: true };
    }),

  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      const result = await query<any>(
        'SELECT id, nom, prenom FROM users WHERE email = ?',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('Aucun utilisateur trouvé avec cet email');
      }

      const user = result.rows[0];
      const resetToken = generateToken();
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await query(
        `UPDATE users 
         SET reset_token = ?, reset_token_expiry = ?
         WHERE id = ?`,
        [resetToken, resetTokenExpiry, user.id]
      );

      return {
        resetToken,
        nom: user.nom,
        prenom: user.prenom,
      };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { token, password } = input;

      const result = await query<any>(
        `SELECT id, reset_token_expiry FROM users 
         WHERE reset_token = ?`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Token invalide');
      }

      const user = result.rows[0];

      if (new Date() > new Date(user.reset_token_expiry)) {
        throw new Error('Token expiré');
      }

      const hashedPassword = hashPassword(password);

      await query(
        `UPDATE users 
         SET password = ?, reset_token = NULL, reset_token_expiry = NULL
         WHERE id = ?`,
        [hashedPassword, user.id]
      );

      return { success: true };
    }),
});
