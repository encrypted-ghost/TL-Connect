-- TL Connect Email Providers Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_providers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL, -- 'brevo', 'resend', 'sendgrid', 'postmark', 'mailjet', 'mailgun', 'smtp'
    name TEXT NOT NULL,          -- e.g. "Primary Brevo", "AWS SES Relayer", "Resend Free"
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL,
    reply_to TEXT,
    credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted / JSON credentials
    daily_limit INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by workspace and default status
CREATE INDEX IF NOT EXISTS idx_email_providers_workspace ON email_providers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_providers_active ON email_providers(workspace_id, is_active);

-- Permissions
GRANT ALL ON TABLE email_providers TO anon, authenticated, service_role;
