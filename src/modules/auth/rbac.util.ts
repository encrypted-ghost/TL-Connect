/**
 * RBAC Utility for TL Connect
 */

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  MANAGER: ['leads.*', 'campaigns.*', 'analytics.view'],
  AGENT: ['leads.view', 'leads.edit', 'campaigns.view'],
  VIEWER: ['leads.view', 'campaigns.view', 'analytics.view'],
};

export function hasPermission(userRole: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  
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
  USER_DELETE: 'users.delete',
  USERS_DELETE: 'users.delete',
} as const;
