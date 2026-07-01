# Directus

Directus runs separately from the Next.js app in `../web`.

## Start

```powershell
cd directus
Copy-Item .env.example .env
docker compose up -d
```

Open Directus at:

```text
http://localhost:8055
```

Default admin values come from `.env`. Change `DIRECTUS_SECRET`, `DIRECTUS_ADMIN_EMAIL`, and `DIRECTUS_ADMIN_PASSWORD` before using this beyond local development.

## Stop

```powershell
docker compose down
```

## Reset Database

This removes the local Directus database volume.

```powershell
docker compose down -v
```

## Local Folders

- `uploads/` stores uploaded files from Directus.
- `extensions/` is mounted for custom Directus extensions.

## Store Database Schema

The starter store tables live in `schema.sql`. Run it against the `tb_store` database in your local Postgres instance.

If `psql` is installed:

```powershell
psql -h localhost -U postgres -d tb_store -f schema.sql
```

You can also open `schema.sql` in pgAdmin or another Postgres client and run it in the `tb_store` database.
