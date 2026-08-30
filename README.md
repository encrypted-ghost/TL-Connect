# TL Connect (Transfer Legacy)

Production-grade internal outreach CRM, multi-provider email infrastructure, and operational campaign delivery platform.

---

## 🚀 Architecture Overview

TL Connect is built with a high-performance, modular architecture engineered for reliable delivery at scale (15,000+ monthly email volume) across multiple isolated tenants.

- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Design System**: Modern dark/light interface, Lucide Icons, Sonner toast notifications
- **Backend API**: Node.js + Express + TypeScript (`tsx`)
- **Database**: Supabase (PostgreSQL with Row Level Security & JSONB credentials)
- **Authentication**: JWT-based RBAC (Admin, Manager, Agent, Viewer)
- **Email Delivery Engine**: Modular Multi-Provider Factory (Brevo, Resend, SendGrid, Postmark, Mailgun, Mailjet, Custom SMTP / SES / Stalwart)
- **Queue & Background Jobs**: Inngest Serverless Event Queue + Internal worker loop with backoff retry
- **Template Engine**: Live MJML Template Studio with in-browser compilation & dynamic token interpolation
- **Engagement & Telemetry**: Pixel-based open tracking, redirect proxy click tracking, and bounce telemetry

---

## 📬 Multi-Provider Email Delivery Engine

TL Connect decouples delivery providers through a unified **`IEmailProvider`** abstraction and a dynamic **`EmailProviderFactory`**. Providers can be configured per-workspace in the UI or supplied via fallback environment variables.

### Supported Email Providers

| Provider | Integration Type | Key Features |
| :--- | :--- | :--- |
| **Brevo (Sendinblue)** | REST API v3 (`@getbrevo/brevo` compatible) | Transactional & campaign delivery, tags, custom headers |
| **Resend** | REST API (`resend.com`) | Modern developer-first API, HTML/text rendering |
| **SendGrid** | SendGrid v3 Mail Send API | Enterprise deliverability, categories, custom tracking |
| **Postmark** | Postmark Server API | High transactional inbox placement, tag support |
| **Mailgun** | Mailgun API (`mailgun.js` + `form-data`) | Domain-level isolation, DKIM validation |
| **Mailjet** | Mailjet v3.1 SDK (`node-mailjet`) | Multi-recipient batching, custom campaign IDs |
| **Custom SMTP / AWS SES / Stalwart** | SMTP Protocol (`nodemailer`) | STARTTLS / TLS SSL, custom ports (587, 465, 25), self-hosted Stalwart support |
| **Mock Provider** | Local Memory Simulation | Safe offline development, testing, and sandbox verification |

---

## 🎨 MJML Live Email Template Studio

- **In-Browser Compilation**: Real-time preview powered by `mjml-browser`.
- **Dynamic Personalization**: Automatically replaces variables (e.g., `{{firstName}}`, `{{company}}`, `{{senderName}}`, `{{unsubscribeUrl}}`).
- **Responsive by Design**: Perfect cross-client rendering across mobile, desktop, Gmail, Apple Mail, and Outlook.
- **Pre-built Templates**: Cold outreach, follow-ups, product announcements, and onboarding flows.

---

## ⚙️ Inngest Serverless Event Queue & Rate Limiting

- **Event-Driven Architecture**: Powered by `/api/inngest` handler for asynchronous sending.
- **Smart Throttling**: Enforces workspace daily sending limits and provider rate caps.
- **Automatic Retries**: Exponential backoff on transient network drops or provider rate-limit errors.
- **Delivery Status Tracking**: Real-time state transitions (`queued` ➔ `sending` ➔ `delivered` / `bounced` / `failed`).

---

## 📂 Project Structure

```text
TL-Connect/
├── api/                   # Vercel serverless function entry points
├── public/                # Static assets & brand logos
├── src/
│   ├── components/        # Reusable UI system (shadcn/ui, modals, forms)
│   ├── config/            # Validated environment & app constants
│   ├── lib/               # Supabase Admin, JWT, and core utilities
│   ├── modules/           # Domain-driven feature modules
│   │   ├── activity/      # Audit logs & timeline tracking
│   │   ├── analytics/     # Campaign performance metrics
│   │   ├── auth/          # RBAC & session management
│   │   ├── email/         # Multi-provider factory & provider implementations
│   │   │   ├── providers/ # Brevo, Resend, SendGrid, Postmark, Mailgun, Mailjet, SMTP, Mock
│   │   │   ├── email.factory.ts
│   │   │   └── provider.interface.ts
│   │   ├── leads/         # CRM, list segmentation & CSV import
│   │   ├── queue/         # Background job processor & Inngest functions
│   │   └── workspaces/    # Multi-tenant workspace isolation
│   ├── pages/             # Frontend view routes (Dashboard, Campaigns, Templates, Providers)
│   └── types/             # TypeScript type definitions
├── server.ts              # Express API Server & Inngest endpoint
├── schema.sql             # Base database schema
├── schema-providers.sql   # Provider configuration schema
└── package.json
```

---

## 🛠 Setup & Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# JWT Secret & Admin
JWT_SECRET=your-32-char-jwt-secret
ADMIN_EMAIL=admin@transferlegacy.com
ADMIN_PASSWORD=your-secure-password

# Optional Environment Fallback Providers (Or configure directly in the UI)
BREVO_API_KEY=
RESEND_API_KEY=
SENDGRID_API_KEY=
POSTMARK_SERVER_TOKEN=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILJET_API_KEY=
MAILJET_API_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 3. Run Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000` (or your configured `PORT`), hosting both the Vite frontend and the Express backend API.

---

## 🔐 Security & Governance

- **RBAC Matrix**: Strict permission gates for `ADMIN`, `MANAGER`, `AGENT`, and `VIEWER` roles.
- **Provider Credential Isolation**: Securely stored in Supabase with tenant-level workspace scoping.
- **Audit Logging**: Every lead update, campaign execution, and template change is recorded in the `Activity` log.
- **Tracking Privacy**: Built-in unsubscribe management and RFC-compliant email header generation.
