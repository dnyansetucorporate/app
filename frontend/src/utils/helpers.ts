import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  d: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', options);
}

export function formatCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '₹0';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export function formatStudentName(firstName?: string, lastName?: string, middleName?: string): string {
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || '—';
}
