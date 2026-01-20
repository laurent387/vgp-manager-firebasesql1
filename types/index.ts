export type UserRole = 'admin' | 'controleur' | 'client';

export interface Qualification {
  id: string;
  name: string;
  category?: string;
  validUntil?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  clientId?: string;
  qualifications?: Qualification[];
  nom?: string;
  prenom?: string;
}

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  clientId?: string;
  qualifications?: Qualification[];
  nom?: string;
  prenom?: string;
  createdAt: string;
  activationToken?: string;
  activationTokenExpiry?: string;
  isActivated?: boolean;
  isActive?: number;
  resetToken?: string;
  resetTokenExpiry?: string;
}

export interface Client {
  id: string;
  nom: string;
  adresse: string;
  contactNom: string;
  contactPrenom: string;
  contactEmail: string;
  contactTelephone: string;
  createdAt: string;
}

export interface CustomField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'photo' | 'pdf';
  value?: string;
}

export interface CustomFieldTemplate {
  id: string;
  key: string;
  name?: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'photo' | 'pdf';
  required?: boolean;
  createdAt: string;
}

export interface CheckpointTemplate {
  id: string;
  name?: string;
  label: string;
  category?: string;
  description?: string;
  ordre: number;
  orderIndex?: number;
  actif: boolean;
  createdAt: string;
}

export interface Machine {
  id: string;
  clientId: string;
  dateMiseEnService: string;
  numeroSerie: string;
  constructeur: string;
  modele: string;
  typeMachine: 'mobile' | 'fixe' | 'presse_plieuse';
  dateDerniereVGP?: string;
  prochaineVGP?: string;
  periodicite: number;
  observations?: string;
  customFields?: CustomField[];
  referenceClient?: string;
  force?: string;
  compteurHoraire?: string;
  categoriePdf?: string;
  anneeMiseEnService?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  reponse?: 'oui' | 'non' | 'autre';
  details?: string;
}

export interface ProtectionDevice {
  boutonsArret: boolean;
  protecteursFixes: boolean;
  protecteursMobilesVerrouilles: boolean;
  limitationVitesse: boolean;
  pedale3Positions: boolean;
}

export interface MachineParticularites {
  modeFonctionnement: string[];
  bati: string[];
  commandesMouvements: string[];
  modeChargement: string[];
  modeDechargement: string[];
  course: {
    type: string;
    valeur: string;
  };
  outillageEnPlace: string[];
  referenceOutillage: string;
}

export interface ControlSession {
  id: string;
  clientId: string;
  machineIds: string[];
  dateControl: string;
  technicienId: string;
  statut: 'en_cours' | 'termine';
  createdAt: string;
}

export interface ControlResult {
  id: string;
  sessionId: string;
  machineId: string;
  checklist: ChecklistItem[];
  observations: string;
  conforme: boolean;
  dateControl: string;
}

export interface VGPHistory {
  id: string;
  machineId: string;
  dateControl: string;
  controllerId?: string;
  technicienId?: string;
  technicienEmail?: string;
  status?: string;
  resultat?: 'conforme' | 'non_conforme' | 'ajournee';
  checklist?: ChecklistItem[];
  checkpoints?: any;
  observations?: string;
  photos?: any;
  documents?: any;
  conforme?: boolean;
  protectionDevices?: ProtectionDevice;
  particularites?: MachineParticularites;
  createdAt: string;
}

export type VGPStatus = 'overdue' | 'warning' | 'ok';

export interface ScheduledEvent {
  id: string;
  type?: 'vgp_deadline' | 'scheduled_control' | string;
  clientId?: string;
  machineId?: string;
  machineIds?: string[];
  controllerId?: string;
  technicienId?: string;
  scheduledDate?: string;
  date: string;
  title: string;
  description?: string;
  notes?: string;
  createdAt: string;
}

export type InterventionType = 'preventive' | 'corrective' | 'ameliorative';
export type InterventionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type InterventionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Intervention {
  id: string;
  machineId: string;
  clientId: string;
  type: InterventionType;
  status: InterventionStatus;
  priority: InterventionPriority;
  title: string;
  description: string;
  technicianId?: string;
  scheduledDate?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  parts?: InterventionPart[];
  workDone?: string;
  observations?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterventionPart {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
}

export interface Part {
  id: string;
  reference: string;
  name: string;
  description?: string;
  category?: string;
  stockQuantity: number;
  minStockLevel: number;
  unitPrice: number;
  supplier?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  machineId: string;
  clientId: string;
  reportedBy: string;
  title: string;
  description: string;
  priority: InterventionPriority;
  status: 'open' | 'assigned' | 'resolved' | 'closed';
  assignedTo?: string;
  interventionId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export type ReportResultStatus = 'OK' | 'KO' | 'NOT_VERIFIED' | 'INFO_ONLY';

export interface ReportObservation {
  id: string;
  inspectionId: string;
  numero?: number | null;
  point_de_controle?: string | null;
  observation?: string | null;
  date_1er_constat?: string | null;
  page?: number | null;
}

export interface ReportInspection {
  id: string;
  reportId: string;
  machineId: string;
  titre_section?: string | null;
  mission_code?: string | null;
  texte_reference?: string | null;
  resultat_status?: ReportResultStatus | null;
  resultat_comment?: string | null;
  particularites_json?: any | null;
  observations?: ReportObservation[];
}

export interface Report {
  id: string;
  report_number: string;
  clientId: string;
  organisme?: string | null;
  client_reference?: string | null;
  categorie?: string | null;
  date_verification?: string | null;
  date_rapport?: string | null;
  signataire_nom?: string | null;
  has_observations?: boolean | number | null;
  pieces_jointes?: string | null;
  adresse_facturation_raw?: string | null;
  raw_payload?: any;
  createdAt: string;
  inspections?: ReportInspection[];
}

export interface ReportImportPayload {
  source_file?: string;
  client: {
    nom: string;
    adresse: string;
    latitude?: number | null;
    longitude?: number | null;
    contactNom?: string | null;
    contactPrenom?: string | null;
    contactEmail?: string | null;
    contactTelephone?: string | null;
  };
  site?: {
    nom_site?: string | null;
    adresse: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  report: {
    organisme?: string | null;
    report_number: string;
    client_reference?: string | null;
    categorie?: string | null;
    date_verification?: string | null;
    date_rapport?: string | null;
    signataire_nom?: string | null;
    has_observations?: boolean | null;
    pieces_jointes?: string | null;
    adresse_facturation_raw?: string | null;
    raw_text_stored?: boolean | null;
  };
  machines: {
    titre_section?: string | null;
    nature?: string | null;
    constructeur?: string | null;
    referenceClient?: string | null;
    modele?: string | null;
    type?: string | null;
    numeroSerie?: string | null;
    force?: string | null;
    anneeMiseEnService?: number | null;
    mission_code?: string | null;
    texte_reference?: string | null;
    resultat_status?: ReportResultStatus | null;
    resultat_comment?: string | null;
    particularites?: any | null;
    observations?: {
      numero?: number | null;
      point_de_controle?: string | null;
      observation?: string | null;
      date_1er_constat?: string | null;
      page?: number | null;
    }[] | null;
  }[];
}

export interface ImportLog {
  type: 'client' | 'machine' | 'report' | 'inspection' | 'observation' | 'vgp_history';
  action: 'created' | 'updated' | 'skipped';
  id?: string;
  name?: string;
  details?: string;
}
