# Configuration SQL Server

## Prérequis

1. Un serveur PostgreSQL accessible (AWS RDS, Heroku Postgres, etc.)
2. Les identifiants de connexion à la base de données

## Étapes de configuration

### 1. Configuration de la base de données

Créez une base de données PostgreSQL et exécutez le schéma SQL fourni dans `backend/schema.sql` :

```bash
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE -f backend/schema.sql
```

### 2. Configuration des variables d'environnement

Ajoutez la variable d'environnement suivante dans votre fichier `.env` :

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

Pour la production, assurez-vous d'utiliser SSL :

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name?sslmode=require
```

### 3. Initialisation des données

Pour créer un utilisateur administrateur par défaut :

```sql
INSERT INTO users (id, email, password, role, nom, prenom, is_active, is_activated)
VALUES (
  'admin-001',
  'admin@vgp.fr',
  -- Le mot de passe 'admin123' haché en SHA256
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  'Administrateur',
  'Système',
  1,
  TRUE
);
```

### 4. Configuration CORS

Pour le déploiement en production, mettez à jour le fichier `backend/hono.ts` pour limiter les origines autorisées :

```typescript
app.use("*", cors({
  origin: ['https://votre-domaine.com'],
  credentials: true,
}));
```

### 5. Déploiement

#### Backend (AWS Lambda, EC2, ou autre)

1. Assurez-vous que `DATABASE_URL` est configurée dans les variables d'environnement
2. Déployez le backend avec : `npm run build` ou selon votre plateforme

#### Frontend (IONOS ou autre hébergeur)

1. Construisez le frontend web : `npm run build:web`
2. Configurez la variable `EXPO_PUBLIC_RORK_API_BASE_URL` pour pointer vers votre backend
3. Déployez les fichiers statiques générés dans le dossier `dist`

### 6. Variables d'environnement requises

**Backend :**
- `DATABASE_URL` : URL de connexion PostgreSQL
- `RESEND_API_KEY` : Clé API pour l'envoi d'emails (optionnel)
- `NODE_ENV` : `production` ou `development`

**Frontend :**
- `EXPO_PUBLIC_RORK_API_BASE_URL` : URL de votre backend API (ex: `https://api.votre-domaine.com`)

### 7. Sécurité

- Changez tous les mots de passe par défaut
- Utilisez des connexions SSL/TLS pour la base de données en production
- Configurez correctement les CORS
- Utilisez des secrets forts pour les tokens d'authentification
- Mettez en place des sauvegardes régulières de la base de données

## Commandes utiles

### Créer une sauvegarde

```bash
pg_dump -h YOUR_HOST -U YOUR_USER YOUR_DATABASE > backup.sql
```

### Restaurer une sauvegarde

```bash
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE < backup.sql
```

### Vérifier les connexions actives

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'YOUR_DATABASE';
```

## Support

Pour toute question ou problème, consultez la documentation PostgreSQL : https://www.postgresql.org/docs/
