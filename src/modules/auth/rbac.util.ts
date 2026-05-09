/**
 * RBAC Utility for TL Connect
 */
import { Role } from '@prisma/client';
import { config } from '../config';

export function hasPermission(userRole: Role, permission: string): boolean {
  const permissions = config.roles[userRole] as string[];
  
  if (permissions.includes('*')) return true;
  
  // Check for exact match
  if (permissions.includes(permission)) return true;
  
  // Check for wildcard match (e.g., 'leads.*' matching 'leads.view')
  const parts = permission.split('.');
  if (parts.length > 1) {
    const wildCard = `${parts[0]}.*`;
    if (permissions.includes(wildCard)) return true;
  }
  
  return false;
}

export const PERMISSIONS = {
  LEADS_VIEW: 'leads.view',
  LEADS_EDIT: 'leads.edit',
  LEADS_DELETE: 'leads.delete',
  CAMPAIGNS_VIEW: 'campaigns.view',
  CAMPAIGNS_EDIT: 'campaigns.edit',
  ANALYTICS_VIEW: 'analytics.view',
  SETTINGS_EDIT: 'settings.edit',
  USER_INVITE: 'users.invite',
} as const;
