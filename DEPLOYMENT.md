# Deployment Guide: Vercel + Supabase

## 1. Supabase Setup

### Database Configuration
Since we are using the **HTTPS REST API** via the `supabase-js` client (to avoid IPv4 connection string issues on Vercel), you must ensure your tables are created in the `public` schema.

1. Go to **Supabase Dashboard** -> **SQL Editor**.
2. Run the `schema.sql` migration script.
3. If you get "schema cache" errors, wait a minute or click "Reload PostgREST config" in Settings -> API -> Advanced.
4. Ensure **RLS (Row Level Security)** is managed properly, or given the system is a managed backend, ensure the `Service Role` key is stored securely in Vercel.

## 2. Environment Variables

Set these in the **Vercel Project Settings**:

| Key | Value | Description |
|---|---|---|
| `SUPABASE_URL` | `https://your-proj.supabase.co` | From Settings -> API |
| `SUPABASE_PUBLISHABLE_KEY` | `public-anon-key` | Required for client init |
| `SUPABASE_SECRET_KEY` | `service-role-key` | **CRITICAL**: Do not expose to client |
| `JWT_SECRET` | `RANDOM_32_CHAR_STRING` | Internal Auth Signing |
| `SENDPULSE_API_ID` | `...` | SendPulse REST API ID |
| `SENDPULSE_API_SECRET` | `...` | SendPulse REST API Secret |

## 3. Vercel Configuration (`vercel.json`)

The project uses a custom server for the background worker. Ensure your `vercel.json` is configured to handle the server builds if using Serverless Functions, or rely on the Vite SPA build if deploying as a static site with an external API.

*Note: For the internal Queue worker to run continuously, it is recommended to use a dedicated Node.js runtime or trigger the `/api/queue/process` endpoint via a Cron Job.*
