# Two Brothers Store

This repository contains:

- `web/` - Next.js storefront and admin PWA
- `directus/` - Directus CMS/API
- `docker-compose.yml` - production web and Directus stack

## Requirements

- Node.js
- npm
- Docker Desktop
- PostgreSQL reachable from Docker

On Windows PowerShell, prefer `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

## Run The Production Stack

From the repository root:

```powershell
Copy-Item .env.example .env
```

Update `.env` with the Directus, PostgreSQL, and session secrets, then run:

```powershell
docker compose up -d --build
```

Open:

```text
Web:      http://localhost:3000
Directus: http://localhost:8055
```

The web container uses the production standalone Next.js server. It starts only after the Directus health check passes.

View status and logs:

```powershell
docker compose ps
docker compose logs -f web directus
```

Stop both services:

```powershell
docker compose down
```

## Run The Web App

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Useful web commands:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run start
```

If port `3000` is busy, run:

```powershell
npm.cmd run dev -- -p 3001
```

## Run Directus

From the repo root:

```powershell
cd directus
Copy-Item .env.example .env
docker compose up -d
```

Open:

```text
http://localhost:8055
```

Default local admin:

```text
Email: admin@twobrothers.store
Password: change-this-password
```

Before real use, edit `directus/.env` and change:

```text
DIRECTUS_SECRET
DIRECTUS_ADMIN_EMAIL
DIRECTUS_ADMIN_PASSWORD
POSTGRES_PASSWORD
```

## Stop Directus

```powershell
cd directus
docker compose down
```

## Reset Directus Database

This deletes the local database volume.

```powershell
cd directus
docker compose down -v
```

Then start it again:

```powershell
docker compose up -d
```

## Run Both Apps For Development

Use two terminals when developing without the production web container.

Terminal 1:

```powershell
cd directus
docker compose up -d
```

Terminal 2:

```powershell
cd web
npm.cmd run dev
```

URLs:

```text
Web:      http://localhost:3000
Directus: http://localhost:8055
```

## Connect Web To Directus

Create `web/.env.local`:

```env
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
DIRECTUS_URL=http://localhost:8055
DIRECTUS_STATIC_TOKEN=
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

For local development, allow public read access to the required storefront collections or configure `DIRECTUS_STATIC_TOKEN`. When Directus is unavailable, public routes enter maintenance mode while the prepared admin PWA can continue using its offline data.

## Folders

- `web/public/` - static web assets, including the logo
- `web/src/app/` - Next.js routes
- `web/src/components/` - shared UI components
- `directus/uploads/` - local Directus uploaded files
- `directus/extensions/` - custom Directus extensions
