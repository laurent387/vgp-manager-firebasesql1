import { ChecklistItem } from '@/types';

export const DEFAULT_PERIODICITY = {
  mobile: 6,
  fixe: 12,
  presse_plieuse: 3,
};

export const PERIODICITY_OPTIONS = [
  { value: 3, label: '3 mois (trimestriel)', description: 'Presses plieuses, engins très sollicités' },
  { value: 6, label: '6 mois (mobile/risque élevé)', description: 'Chariots élévateurs, grues, nacelles' },
  { value: 12, label: '12 mois (fixe/risque faible)', description: 'Ponts roulants, installations fixes' },
];

export const VGP_WARNING_DAYS = 30;

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Examen visuel de la structure' },
  { label: 'Vérification des freins et systèmes de sécurité' },
  { label: 'Contrôle électrique/pneumatique/hydraulique' },
  { label: 'Essais de fonctionnement avec charge' },
  { label: 'Vérification des dispositifs de limiteurs' },
  { label: 'Vérification des arrêts d\'urgence' },
  { label: 'État des câbles, chaînes et élingues' },
  { label: 'Contrôle des niveaux (huile, liquide de refroidissement)' },
  { label: 'Test des dispositifs sonores et lumineux' },
  { label: 'Vérification de la plaque signalétique et marquages' },
];

export const VGP_COLORS = {
  overdue: '#DC2626',
  warning: '#F59E0B',
  ok: '#10B981',
};

export const APP_COLORS = {
  primary: '#1E3A5F',
  primaryLight: '#2C5282',
  secondary: '#10B981',
  accent: '#86BC25',
  background: '#FFFFFF',
  backgroundLight: '#F8FAFC',
  cardBackground: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  error: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
};

const DEFAULT_GROUPE_ADF_LOGO =
  'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ax0vz9j4kid8s8ic3tbi';

export const GROUPE_ADF_LOGO: string =
  (process.env.EXPO_PUBLIC_GROUPE_ADF_LOGO_URL as string | undefined) ??
  DEFAULT_GROUPE_ADF_LOGO;

export const GROUPE_ADF_COLORS = {
  primary: '#1E3A5F',
  secondary: '#86BC25',
  accent: '#10B981',
  darkBlue: '#0A2540',
  lightBlue: '#EFF6FF',
};

export const MODE_FONCTIONNEMENT_OPTIONS = [
  'Coup par coup',
  'Manuel',
  'Semi-automatique',
  'Automatique',
  'Cycle continu',
  'Réglage / Maintenance',
  'Mode dégradé',
  'Pas à pas',
  'Autre',
];

export const BATI_OPTIONS = [
  'À col de cygne',
  'À arcade',
  'À portique',
  'En H',
  'Monobloc',
  'Soudé',
  'Mécano-soudé',
  'Fermé',
  'Ouvert',
  'Autre',
];

export const COMMANDES_MOUVEMENTS_OPTIONS = [
  'Vérin hydraulique',
  'Vérin pneumatique',
  'Moteur électrique',
  'Came mécanique',
  'Vis / vis à billes',
  'Manivelle',
  'Levier manuel',
  'Pédale',
  'Autre',
];

export const MODE_CHARGEMENT_OPTIONS = [
  'Manuel',
  'Automatique',
  'Semi-automatique',
  'Robotisé',
  'Par convoyeur',
  'Par manipulateur',
  'Gravitaire',
  'Autre',
];

export const MODE_DECHARGEMENT_OPTIONS = [
  'Manuel',
  'Automatique',
  'Semi-automatique',
  'Robotisé',
  'Par convoyeur',
  'Gravitaire',
  'Éjection mécanique',
  'Autre',
];

export const COURSE_TYPE_OPTIONS = [
  'Non renseignée',
  'Course fixe',
  'Course réglable',
];

export const OUTILLAGE_OPTIONS = [
  'Outillage ouvert',
  'Outillage fermé',
  'Moule',
  'Poinçon / matrice',
  'Lame de cisaille',
  'Outil spécifique constructeur',
  'Aucun outillage en place',
  'Autre',
];

export const REFERENCE_OUTILLAGE_OPTIONS = [
  'Référence constructeur',
  'Référence interne client',
  'Sans référence',
  'Non applicable',
];
