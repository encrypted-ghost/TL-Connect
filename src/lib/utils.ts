import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Standard relative time format
 */
export function timeAgo(date: Date | string) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Safely format error object or string into a string for toasts and logs
 */
export function getErrorMessage(err: any, fallback: string = 'An error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.response?.data?.error) {
    const apiErr = err.response.data.error;
    if (typeof apiErr === 'string') return apiErr;
    if (apiErr.message) return apiErr.message;
    return JSON.stringify(apiErr);
  }
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

