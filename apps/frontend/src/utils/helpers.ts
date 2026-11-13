import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getProgressColor(progress: number): 'success' | 'warning' | 'danger' {
  if (progress >= 100) return 'danger';
  if (progress >= 80) return 'warning';
  return 'success';
}

export function getProgressClass(progress: number): string {
  const color = getProgressColor(progress);
  return `progress-${color}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function calculateRemainingHours(appliedInterval: number, hoursSinceMaintenance: number): number {
  return Math.max(0, appliedInterval - hoursSinceMaintenance);
}

export function getMaintenanceStatusText(progress: number, maintenanceRequired: boolean): string {
  if (maintenanceRequired) return 'Maintenance Required';
  if (progress >= 80) return 'Maintenance Soon';
  if (progress >= 50) return 'In Progress';
  return 'Normal';
}