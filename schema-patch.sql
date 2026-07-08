-- TL Connect Schema Patch
-- Run this in your Supabase SQL Editor

-- Create unsubscribes table
CREATE TABLE IF NOT EXISTS unsubscribes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, workspace_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_workspace_id ON unsubscribes(workspace_id);

-- Permissions
GRANT ALL ON TABLE unsubscribes TO anon, authenticated, service_role;
