import { VGPStatus } from '@/types';
import { VGP_WARNING_DAYS } from '@/constants/vgp';

export function calculateNextVGP(lastVGP: string, periodicityMonths: number): string {
  const lastDate = new Date(lastVGP);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + periodicityMonths);
  return nextDate.toISOString().split('T')[0];
}

export function getVGPStatus(prochaineVGP: string | undefined): VGPStatus {
  if (!prochaineVGP) return 'warning';
  
  const today = new Date();
  const dueDate = new Date(prochaineVGP);
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= VGP_WARNING_DAYS) return 'warning';
  return 'ok';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getDaysUntilVGP(prochaineVGP: string | undefined): number {
  if (!prochaineVGP) return -999;
  
  const today = new Date();
  const dueDate = new Date(prochaineVGP);
  return Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
