# Déploiement sur AWS Amplify

## Configuration du Backend sur AWS Amplify

### 1. Créer une application Amplify

1. Connectez-vous à la console AWS Amplify
2. Cliquez sur "Create new app" > "Host web app"
3. Connectez votre repository GitHub/GitLab/Bitbucket
4. Sélectionnez votre branche (généralement `main` ou `master`)

### 2. Configuration des Variables d'Environnement

Dans la console AWS Amplify, allez dans "Environment variables" et ajoutez :

```
DB_HOST=votre-db-host.mysql.database.azure.com
DB_NAME=votre_base_de_donnees
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
RESEND_API_KEY=votre_cle_resend
PORT=3000
```

### 3. Configuration du Build

Le fichier `amplify.yml` est déjà configuré pour :
- Installer les dépendances
- Builder le backend Node.js
- Démarrer le serveur Hono

### 4. Configuration du Serveur

AWS Amplify va automatiquement détecter que c'est une application Node.js et utilisera `server.js` comme point d'entrée.

Le serveur écoute sur le port défini par `process.env.PORT` (par défaut 3000).

### 5. Endpoints de l'API

Une fois déployé, votre API sera disponible à :
- `https://votre-app.amplifyapp.com/` - Health check
- `https://votre-app.amplifyapp.com/api/health` - Database health check  
- `https://votre-app.amplifyapp.com/api/trpc/*` - Endpoints tRPC

### 6. Configurer l'URL dans l'Application Mobile

Mettez à jour la variable d'environnement dans Rork :
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://votre-app.amplifyapp.com
```

### 7. Base de données MySQL

Assurez-vous que votre base de données MySQL est accessible depuis AWS :
- Configurez les règles de pare-feu pour autoriser les connexions AWS
- Utilisez SSL si disponible
- Vérifiez que les tables sont créées (voir `backend/schema.sql`)

### 8. Créer un utilisateur admin

Après le déploiement, connectez-vous à votre base de données et exécutez :

```sql
INSERT INTO users (
  id,
  email,
  password,
  `role`,
  nom,
  prenom,
  is_active,
  is_activated,
  created_at
) VALUES (
  UUID(),
  'admin@votre-domaine.fr',
  SHA2('votre_mot_de_passe', 256),
  'admin',
  'Admin',
  'Principal',
  1,
  1,
  NOW()
);
```

**Note:** Le mot de passe doit être hashé avec SHA-256 (comme dans le code `backend/trpc/routes/auth.ts`).

### 9. Test de l'API

Testez votre API avec curl :

```bash
# Health check
curl https://votre-app.amplifyapp.com/api/health

# Login
curl -X POST https://votre-app.amplifyapp.com/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@votre-domaine.fr","password":"votre_mot_de_passe"}'
```

### Dépannage

#### Erreur "Failed to fetch"
- Vérifiez que l'URL de l'API est correcte dans `EXPO_PUBLIC_RORK_API_BASE_URL`
- Vérifiez que le backend est bien déployé sur Amplify
- Testez l'endpoint `/api/health` dans un navigateur

#### Erreur "Unexpected non-whitespace character after JSON"
- Cela signifie que le serveur retourne du HTML au lieu de JSON
- Vérifiez les logs AWS Amplify pour voir les erreurs
- Assurez-vous que la connexion à la base de données fonctionne

#### Problèmes de connexion à la base de données
- Vérifiez que les variables d'environnement sont correctement configurées
- Vérifiez que le pare-feu MySQL autorise les connexions AWS
- Testez la connexion depuis AWS CloudShell ou EC2
