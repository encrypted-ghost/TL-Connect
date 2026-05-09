-- TL Connect System Schema
-- Targeted Schema: connect

CREATE SCHEMA IF NOT EXISTS "connect";

-- Enums
CREATE TYPE "connect"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER');
CREATE TYPE "connect"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
CREATE TYPE "connect"."LeadStatus" AS ENUM ('NEW', 'TO_CONTACT', 'SENT', 'OPENED', 'CLICKED', 'REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'CLOSED_WON', 'CLOSED_LOST', 'BOUNCED', 'UNSUBSCRIBED');
CREATE TYPE "connect"."CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');
CREATE TYPE "connect"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "connect"."ActivityType" AS ENUM ('EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED', 'EMAIL_BOUNCED', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'NOTE_ADDED', 'MEETING_BOOKED');

-- Tables

CREATE TABLE "connect"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "emailDailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "slackWebhookUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "connect"."Role" NOT NULL DEFAULT 'AGENT',
    "status" "connect"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "workspaceId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "logoUrl" TEXT,
    "notes" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "title" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "status" "connect"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "customFields" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."Activity" (
    "id" TEXT NOT NULL,
    "type" "connect"."ActivityType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "userId" TEXT,
    "leadId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connect"."LoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL, -- SUCCESS, FAILED
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints & Indexes
CREATE UNIQUE INDEX "Workspace_slug_key" ON "connect"."Workspace"("slug");
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "connect"."WorkspaceSettings"("workspaceId");
CREATE UNIQUE INDEX "User_email_key" ON "connect"."User"("email");
CREATE UNIQUE INDEX "Lead_email_workspaceId_key" ON "connect"."Lead"("email", "workspaceId");

-- Foreign Keys (Examples)
ALTER TABLE "connect"."User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "connect"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "connect"."Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "connect"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
