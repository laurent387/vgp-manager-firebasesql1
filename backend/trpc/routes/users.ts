import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { Resend } from "resend";

export const usersRouter = createTRPCRouter({
  sendPasswordResetEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        resetToken: z.string(),
        prenom: z.string().optional(),
        nom: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, resetToken, prenom, nom } = input;
      
      console.log('[SendPasswordResetEmail] Starting email send process');
      console.log('[SendPasswordResetEmail] Email:', email);
      console.log('[SendPasswordResetEmail] Token:', resetToken?.substring(0, 20) + '...');
      
      const apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
      
      console.log('[SendPasswordResetEmail] API Base URL:', apiBaseUrl);
      console.log('[SendPasswordResetEmail] Toolkit URL:', toolkitUrl);
      
      if (!apiBaseUrl) {
        console.error('[SendPasswordResetEmail] Missing EXPO_PUBLIC_RORK_API_BASE_URL');
        throw new Error('Configuration manquante: EXPO_PUBLIC_RORK_API_BASE_URL');
      }
      
      if (!toolkitUrl) {
        console.error('[SendPasswordResetEmail] Missing EXPO_PUBLIC_TOOLKIT_URL');
        throw new Error('Configuration manquante: EXPO_PUBLIC_TOOLKIT_URL');
      }
      
      const resetUrl = `${apiBaseUrl}/activate-account?token=${resetToken}`;
      
      const displayName = prenom && nom ? `${prenom} ${nom}` : prenom || nom || email;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe VGP</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #0066CC 0%, #004999 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Réinitialisation de mot de passe
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour ${displayName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Une demande de réinitialisation de mot de passe a été effectuée pour votre compte VGP. Pour créer un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0066CC 0%, #004999 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ou copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">
                ${resetUrl}
              </p>
              
              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Important :</strong> Ce lien de réinitialisation expirera dans 24 heures pour des raisons de sécurité.
                </p>
              </div>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5; text-align: center;">
                Cet email a été envoyé automatiquement par la plateforme VGP
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} VGP - Vérification Générale Périodique
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        
        if (!resendApiKey) {
          console.error('[SendPasswordResetEmail] Missing RESEND_API_KEY');
          throw new Error('Configuration manquante: RESEND_API_KEY');
        }
        
        const resend = new Resend(resendApiKey);
        
        console.log('[SendPasswordResetEmail] Sending email to:', email);
        
        const result = await resend.emails.send({
          from: 'VGP <onboarding@resend.dev>',
          to: email,
          subject: "Réinitialisation de votre mot de passe VGP",
          html: emailHtml,
        });
        
        console.log('[SendPasswordResetEmail] Success:', result);
        
        return {
          success: true,
          message: "Email de réinitialisation envoyé avec succès",
          result,
        };
      } catch (error) {
        console.error('[SendPasswordResetEmail] Error:', error);
        
        if (error instanceof Error) {
          throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
        }
        
        throw new Error(
          "Erreur lors de l'envoi de l'email de réinitialisation"
        );
      }
    }),

  sendActivationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        activationToken: z.string(),
        prenom: z.string().optional(),
        nom: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, activationToken, prenom, nom } = input;
      
      console.log('[SendActivationEmail] Starting email send process');
      console.log('[SendActivationEmail] Email:', email);
      console.log('[SendActivationEmail] Token:', activationToken?.substring(0, 20) + '...');
      
      const apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
      
      console.log('[SendActivationEmail] API Base URL:', apiBaseUrl);
      console.log('[SendActivationEmail] Toolkit URL:', toolkitUrl);
      
      if (!apiBaseUrl) {
        console.error('[SendActivationEmail] Missing EXPO_PUBLIC_RORK_API_BASE_URL');
        throw new Error('Configuration manquante: EXPO_PUBLIC_RORK_API_BASE_URL');
      }
      
      if (!toolkitUrl) {
        console.error('[SendActivationEmail] Missing EXPO_PUBLIC_TOOLKIT_URL');
        throw new Error('Configuration manquante: EXPO_PUBLIC_TOOLKIT_URL');
      }
      
      const activationUrl = `${apiBaseUrl}/activate-account?token=${activationToken}`;
      
      const displayName = prenom && nom ? `${prenom} ${nom}` : prenom || nom || email;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activation de votre compte VGP</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #0066CC 0%, #004999 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Bienvenue sur VGP
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour ${displayName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Un compte a été créé pour vous sur la plateforme VGP. Pour activer votre compte et créer votre mot de passe, veuillez cliquer sur le bouton ci-dessous :
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${activationUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0066CC 0%, #004999 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);">
                      Activer mon compte
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ou copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">
                ${activationUrl}
              </p>
              
              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Important :</strong> Ce lien d'activation expirera dans 24 heures pour des raisons de sécurité.
                </p>
              </div>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas demandé la création de ce compte, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5; text-align: center;">
                Cet email a été envoyé automatiquement par la plateforme VGP
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} VGP - Vérification Générale Périodique
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        
        if (!resendApiKey) {
          console.error('[SendActivationEmail] Missing RESEND_API_KEY');
          throw new Error('Configuration manquante: RESEND_API_KEY');
        }
        
        const resend = new Resend(resendApiKey);
        
        console.log('[SendActivationEmail] Sending email to:', email);
        
        const result = await resend.emails.send({
          from: 'VGP <onboarding@resend.dev>',
          to: email,
          subject: "Activation de votre compte VGP",
          html: emailHtml,
        });
        
        console.log('[SendActivationEmail] Success:', result);
        
        return {
          success: true,
          message: "Email d'activation envoyé avec succès",
          result,
        };
      } catch (error) {
        console.error('[SendActivationEmail] Error:', error);
        
        if (error instanceof Error) {
          throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
        }
        
        throw new Error(
          "Erreur lors de l'envoi de l'email d'activation"
        );
      }
    }),
});
