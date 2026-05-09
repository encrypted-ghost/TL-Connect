# TL Connect (Transfer Legacy)

Production-grade internal outreach CRM and operational communication platform.

## 🚀 Architecture Overview

TL Connect is built with a high-performance, modular architecture designed for stability and 15,000+ monthly email volume.

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Design System**: shadcn/ui + Lucide Icons + Framer Motion
- **Backend API**: Node.js (Express)
- **Database**: Supabase (via PostgreSQL REST API for IPv4 compatibility)
- **Authentication**: JWT-based RBAC (Role-Based Access Control)
- **Infrastructure**: Vercel (Deployment) + Cloudflare (DNS/Tracking)
- **Email Delivery**: SendPulse (via Provider Abstraction Layer)
- **Queue System**: Internal worker loop with backoff retry logic

## 📂 Folder Structure

```text
src/
├── components/       # Reusable UI system (shadcn/ui)
├── config/           # Validated environment & app config
├── lib/              # Core utility & infrastructure clients
├── modules/          # Feature-specific logic (SOLID isolated)
│   ├── activity/     # Audit logs & timeline
│   ├── analytics/    # Performance metrics
│   ├── auth/         # RBAC & Session management
│   ├── email/        # Provider abstraction (SendPulse)
│   ├── leads/        # CRM & Lead management
│   ├── queue/        # Background job processing
│   └── workspaces/   # Multi-tenant isolation logic
└── server.ts         # Main Entry Point
```

## 🛠 Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your Supabase and SendPulse credentials.

3. **Database Initialization**:
   The system will automatically bootstrap the initial workspace and admin account on the first run via the `/api/auth/bootstrap` endpoint.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🔐 Security Standards

- **RBAC**: Strict role enforcement (ADMIN, MANAGER, AGENT, VIEWER).
- **ID Hardening**: All IDs are validated and regex-guarded.
- **Environment Safety**: Service Role keys are restricted to the server-side only.
- **Audit Logs**: Every critical action (Lead update, Campaign start) is logged to the `Activity` table.
