# Two Brothers Store

This repository has two separate apps:

- `web/` - Next.js storefront
- `directus/` - Directus CMS/API running with Docker

## Requirements

- Node.js
- npm
- Docker Desktop

On Windows PowerShell, prefer `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

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

## Run Both Apps

Use two terminals.

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

## Folders

- `web/public/` - static web assets, including the logo
- `web/src/app/` - Next.js routes
- `web/src/components/` - shared UI components
- `directus/uploads/` - local Directus uploaded files
- `directus/extensions/` - custom Directus extensions
