# Refonte SQL - Résumé des changements

L'application a été complètement refondue pour fonctionner avec un serveur SQL PostgreSQL via tRPC.

## Architecture mise en place

### Backend
- **Base de données** : PostgreSQL avec schéma complet (`backend/schema.sql`)
- **Connexion** : Pool de connexions PostgreSQL (`backend/db.ts`)
- **API** : Routes tRPC pour l'authentification et les données
  - `backend/trpc/routes/auth.ts` : Login, register, activation, reset password
  - `backend/trpc/routes/clients.ts` : CRUD clients
  - `backend/trpc/routes/machines.ts` : CRUD machines
  - `backend/trpc/routes/data.ts` : Users, templates, events, VGP history

### Frontend
- **AuthProvider** : Authentification via tRPC avec AsyncStorage
- **DataProvider** : Gestion des données via React Query et tRPC
- **Suppression** : Amplify, Supabase, SurrealDB, SyncProvider

## Configuration requise

### 1. Variables d'environnement

**Backend :**
```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
RESEND_API_KEY=your_resend_api_key
NODE_ENV=production
```

**Frontend :**
```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-backend-url.com
```

### 2. Initialisation de la base de données

```bash
# Créer la base de données et exécuter le schéma
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE -f backend/schema.sql

# Créer un utilisateur admin (mot de passe: admin123)
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE << EOF
INSERT INTO users (id, email, password, role, nom, prenom, is_active, is_activated)
VALUES (
  'admin-001',
  'admin@vgp.fr',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  'Administrateur',
  'Système',
  1,
  TRUE
);
EOF
```

### 3. Déploiement

**Backend** : AWS Lambda, EC2, ou tout hébergeur Node.js
**Frontend** : IONOS ou tout hébergeur de fichiers statiques

## Fichiers modifiés/créés

### Créés
- `backend/schema.sql` - Schéma PostgreSQL complet
- `backend/db.ts` - Connexion PostgreSQL
- `backend/trpc/routes/auth.ts` - Routes d'authentification
- `SETUP-SQL.md` - Instructions détaillées

### Modifiés
- `backend/trpc/routes/clients.ts` - Refait avec SQL
- `backend/trpc/routes/machines.ts` - Refait avec SQL
- `backend/trpc/routes/data.ts` - Refait avec SQL
- `backend/trpc/app-router.ts` - Ajout des nouveaux routers
- `providers/AuthProvider.tsx` - Simplifié avec tRPC uniquement
- `providers/DataProvider.tsx` - Simplifié avec tRPC uniquement
- `app/_layout.tsx` - Suppression de SyncProvider et Amplify
- `types/index.ts` - Types mis à jour

### À supprimer (optionnel)
- `lib/supabase.ts`
- `lib/amplify-config.ts`
- `lib/database.ts` (ancien SurrealDB)
- `lib/local-database.ts`
- `lib/sync-service.ts`
- `providers/SyncProvider.tsx`
- `amplify/` (dossier complet)

## Prochaines étapes

1. **Configurer la base de données PostgreSQL** (AWS RDS, Heroku Postgres, etc.)
2. **Déployer le backend** avec la variable `DATABASE_URL`
3. **Configurer les CORS** pour autoriser votre domaine frontend
4. **Tester l'authentification** avec l'utilisateur admin
5. **Migrer les données existantes** si nécessaire

## Notes importantes

- Les mots de passe sont hashés en SHA256
- Les tokens d'activation expirent après 24h
- Pensez à configurer SSL pour PostgreSQL en production
- Mettez en place des sauvegardes régulières de la base

Pour plus de détails, consultez `SETUP-SQL.md`.
