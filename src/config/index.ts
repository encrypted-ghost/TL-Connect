import { env } from './env.config';

export const config = {
  app: {
    name: 'TL Connect',
    url: env.APP_URL,
    version: '1.0.0',
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    expiresIn: '24h',
    cookieName: 'tl_connect_auth',
  },
  roles: {
    ADMIN: ['*'],
    MANAGER: ['leads.*', 'campaigns.*', 'analytics.view'],
    AGENT: ['leads.view', 'leads.edit', 'campaigns.view', 'inbox.*'],
    VIEWER: ['leads.view', 'campaigns.view', 'analytics.view'],
  },
  email: {
    provider: 'mailjet', // Default provider
    limits: {
      daily: 1000,
      interval: { min: 3, max: 5 }, // seconds
    },
  },
  queue: {
    batchSize: 10,
    maxRetries: 3,
  }
} as const;

export type Config = typeof config;
export type Role = keyof typeof config.roles;
