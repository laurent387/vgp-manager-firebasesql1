-- Schema SQL pour l'application VGP (MySQL/MariaDB)

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'controleur', 'client') NOT NULL,
  client_id VARCHAR(255),
  nom VARCHAR(255),
  prenom VARCHAR(255),
  qualifications JSON,
  is_active INTEGER DEFAULT 1,
  is_activated BOOLEAN DEFAULT FALSE,
  activation_token VARCHAR(255),
  activation_token_expiry TIMESTAMP NULL,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_client_id ON users(client_id);
CREATE INDEX idx_users_activation_token ON users(activation_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(255) PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  contact_nom VARCHAR(255),
  contact_prenom VARCHAR(255),
  contact_email VARCHAR(255),
  contact_telephone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_clients_nom ON clients(nom);

-- Table des machines
CREATE TABLE IF NOT EXISTS machines (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  date_mise_en_service DATE NOT NULL,
  numero_serie VARCHAR(255) NOT NULL,
  constructeur VARCHAR(255),
  modele VARCHAR(255),
  type_machine ENUM('mobile', 'fixe', 'presse_plieuse') NOT NULL,
  date_derniere_vgp DATE,
  prochaine_vgp DATE,
  periodicite INTEGER DEFAULT 12,
  observations TEXT,
  custom_fields JSON,
  reference_client VARCHAR(255),
  force VARCHAR(100),
  compteur_horaire VARCHAR(100),
  categorie_pdf VARCHAR(100),
  annee_mise_en_service INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_machines_client_id ON machines(client_id);
CREATE INDEX idx_machines_numero_serie ON machines(numero_serie);
CREATE INDEX idx_machines_prochaine_vgp ON machines(prochaine_vgp);

-- Table de l'historique VGP
CREATE TABLE IF NOT EXISTS vgp_history (
  id VARCHAR(255) PRIMARY KEY,
  machine_id VARCHAR(255) NOT NULL,
  date_control DATE NOT NULL,
  technicien_id VARCHAR(255),
  resultat ENUM('conforme', 'non_conforme', 'ajournee'),
  observations TEXT,
  checkpoints JSON,
  photos JSON,
  documents JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vgp_history_machine_id ON vgp_history(machine_id);
CREATE INDEX idx_vgp_history_date_control ON vgp_history(date_control);
CREATE INDEX idx_vgp_history_technicien_id ON vgp_history(technicien_id);

-- Table des sessions de contrôle
CREATE TABLE IF NOT EXISTS control_sessions (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  machine_ids JSON NOT NULL,
  date_control DATE NOT NULL,
  technicien_id VARCHAR(255) NOT NULL,
  statut ENUM('en_cours', 'termine') DEFAULT 'en_cours',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_control_sessions_client_id ON control_sessions(client_id);
CREATE INDEX idx_control_sessions_technicien_id ON control_sessions(technicien_id);
CREATE INDEX idx_control_sessions_date_control ON control_sessions(date_control);

-- Table des résultats de contrôle
CREATE TABLE IF NOT EXISTS control_results (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  machine_id VARCHAR(255) NOT NULL,
  checklist JSON NOT NULL,
  observations TEXT,
  conforme BOOLEAN DEFAULT TRUE,
  date_control DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES control_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_control_results_session_id ON control_results(session_id);
CREATE INDEX idx_control_results_machine_id ON control_results(machine_id);

-- Table des événements planifiés
CREATE TABLE IF NOT EXISTS scheduled_events (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  client_id VARCHAR(255),
  machine_ids JSON,
  technicien_id VARCHAR(255),
  type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_scheduled_events_date ON scheduled_events(date);
CREATE INDEX idx_scheduled_events_client_id ON scheduled_events(client_id);
CREATE INDEX idx_scheduled_events_technicien_id ON scheduled_events(technicien_id);

-- Table des interventions
CREATE TABLE IF NOT EXISTS interventions (
  id VARCHAR(255) PRIMARY KEY,
  machine_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(100),
  description TEXT,
  technicien_id VARCHAR(255),
  cout DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interventions_machine_id ON interventions(machine_id);
CREATE INDEX idx_interventions_date ON interventions(date);

-- Table des pièces
CREATE TABLE IF NOT EXISTS parts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  reference VARCHAR(255),
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  price DECIMAL(10, 2),
  supplier VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_parts_reference ON parts(reference);
CREATE INDEX idx_parts_name ON parts(name);

-- Table des types de tickets
CREATE TABLE IF NOT EXISTS ticket_types (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des templates de champs personnalisés
CREATE TABLE IF NOT EXISTS custom_field_templates (
  id VARCHAR(255) PRIMARY KEY,
  `key` VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  label VARCHAR(255) NOT NULL,
  type ENUM('text', 'number', 'date', 'photo', 'pdf') NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_custom_field_templates_key ON custom_field_templates(`key`);

-- Table des templates de points de contrôle
CREATE TABLE IF NOT EXISTS checkpoint_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  label VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  description TEXT,
  ordre INTEGER DEFAULT 0,
  order_index INTEGER,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_checkpoint_templates_category ON checkpoint_templates(category);
CREATE INDEX idx_checkpoint_templates_ordre ON checkpoint_templates(ordre);

-- Table des rapports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  machine_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(100),
  numero_rapport VARCHAR(255),
  inspections JSON,
  observations JSON,
  photos JSON,
  technicien_id VARCHAR(255),
  conforme BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reports_client_id ON reports(client_id);
CREATE INDEX idx_reports_machine_id ON reports(machine_id);
CREATE INDEX idx_reports_date ON reports(date);

-- Table des logs d'import
CREATE TABLE IF NOT EXISTS import_logs (
  id VARCHAR(255) PRIMARY KEY,
  imported_by VARCHAR(255),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_rows INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  errors JSON,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_import_logs_imported_at ON import_logs(imported_at);
CREATE INDEX idx_import_logs_imported_by ON import_logs(imported_by);

-- Table change_log pour la synchronisation offline-first
CREATE TABLE IF NOT EXISTS change_log (
  revision BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  operation ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  payload_json JSON,
  server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255),
  device_id VARCHAR(255),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  INDEX idx_change_log_entity (entity),
  INDEX idx_change_log_entity_id (entity_id),
  INDEX idx_change_log_revision (revision),
  INDEX idx_change_log_event_id (event_id),
  INDEX idx_change_log_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
