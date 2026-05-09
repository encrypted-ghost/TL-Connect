-- TL Connect System Schema
-- Targeted Schema: connect
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS "connect";
SET search_path TO connect, public;

-- Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'TO_CONTACT', 'SENT', 'OPENED', 'CLICKED', 'REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'CLOSED_WON', 'CLOSED_LOST', 'BOUNCED', 'UNSUBSCRIBED');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityType' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'connect')) THEN
        CREATE TYPE "ActivityType" AS ENUM ('EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED', 'EMAIL_BOUNCED', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'NOTE_ADDED', 'MEETING_BOOKED');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS workspace_settings (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL,
    email_daily_limit INTEGER NOT NULL DEFAULT 1000,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    slack_webhook_url TEXT,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workspace_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    role "Role" NOT NULL DEFAULT 'AGENT',
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    workspace_id TEXT NOT NULL,
    last_login_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    logo_url TEXT,
    notes TEXT,
    workspace_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS leads (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    title TEXT,
    phone TEXT,
    linkedin_url TEXT,
    status "LeadStatus" NOT NULL DEFAULT 'NEW',
    score INTEGER NOT NULL DEFAULT 0,
    company_id TEXT,
    owner_id TEXT,
    workspace_id TEXT NOT NULL,
    custom_fields JSONB DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    color TEXT,
    workspace_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tags_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS lead_tags (
    lead_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    CONSTRAINT lead_tags_pkey PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS templates (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    category TEXT,
    workspace_id TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    status "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    template_id TEXT,
    workspace_id TEXT NOT NULL,
    started_at TIMESTAMP(3),
    completed_at TIMESTAMP(3),
    stats_sent INTEGER NOT NULL DEFAULT 0,
    stats_opened INTEGER NOT NULL DEFAULT 0,
    stats_clicked INTEGER NOT NULL DEFAULT 0,
    stats_replied INTEGER NOT NULL DEFAULT 0,
    stats_bounced INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS domains (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    domain TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    dns_provider TEXT,
    workspace_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT domains_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS activities (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    type "ActivityType" NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    user_id TEXT,
    lead_id TEXT,
    workspace_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activities_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS login_logs (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT login_logs_pkey PRIMARY KEY (id)
);

-- Unique Constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_key ON workspaces(slug);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_settings_workspace_id_key ON workspace_settings(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_workspace_id_key ON leads(email, workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS domains_domain_workspace_id_key ON domains(domain, workspace_id);

-- Foreign Keys
ALTER TABLE users ADD CONSTRAINT users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE leads ADD CONSTRAINT leads_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE leads ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT leads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE templates ADD CONSTRAINT templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE domains ADD CONSTRAINT domains_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE lead_tags ADD CONSTRAINT lead_tags_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE lead_tags ADD CONSTRAINT lead_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- Permissions (Basic example)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA connect TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA connect TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA connect TO anon, authenticated, service_role;
