# TL Connect API Reference

All requests must be made to the `/api` prefix.

## Authentication
Most endpoints require a `Bearer <token>` in the `Authorization` header.

### Bootstrap System
`POST /api/auth/bootstrap`
- **Description**: Initializes the first workspace and admin user.
- **Access**: Public (only works if no workspaces exist).

## Leads
Endpoints for managing the CRM data.

### List Leads
`GET /api/leads`
- **Query Parameters**:
  - `status`: Filter by `NEW`, `CONTACTED`, `REPLIED`, `INTERESTED`, `NOT_INTERESTED`.
  - `search`: Full-text search across name and email.
  - `limit`: Default 50.
  - `offset`: For pagination.

### Create Lead
`POST /api/leads`
- **Body**:
  ```json
  {
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "companyName": "string (optional)"
  }
  ```

## Templates
Endpoints for managing email content templates.

### List Templates
`GET /api/templates`
- **Returns**: Array of email templates.

### Create Template
`POST /api/templates`
- **Body**:
  ```json
  {
    "name": "string",
    "subject": "string",
    "content": "string (HTML/Text)",
    "category": "string"
  }
  ```

### Seed Defaults
`POST /api/templates/seed`
- **Description**: Populates the workspace with 10 reference themes.

## Analytics

### Workspace Overview
`GET /api/analytics/overview`
- **Returns**: High-level metrics for the current dashboard.
  ```json
  {
    "leadsCount": 1240,
    "totalSent": 15000,
    "replyRate": 12.5,
    "bounceRate": 0.8
  }
  ```

## Infrastructure & Health

### Health Check
`GET /api/health`
- **Description**: Verification endpoint for Vercel/Cloud Run.
