# Deployment Guide

## Prerequisites

- Docker with `buildx` enabled
- Azure CLI (`az`) — logged in via `az login`
- Docker Hub account with push access to `maksymcherhyk/` repositories

---

## Environment Setup

Create a `.env.deploy` file in the project root (this file is gitignored):

```env
# Frontend build args
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_APP_URL=
```

Source it before deploying:

```bash
source .env.deploy
```

---

## Backend

From the `server/` directory:

```bash
# Build for linux/amd64 and push to Docker Hub
docker buildx build \
  --platform linux/amd64 \
  -t maksymcherhyk/vita-performance-api:latest \
  --push .

# Restart the Azure Web App to pull the new image
az webapp restart \
  --name vita-performance-api \
  --resource-group Vita_Intelligence
```

---

## Frontend

From the `client/` directory:

```bash
# Build with environment variables and push to Docker Hub
docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  --build-arg NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
  --build-arg NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  -t maksymcherhyk/vita-performance-frontend:latest \
  --push .

# Restart
az webapp restart \
  --name vita-performance-frontend \
  --resource-group Vita_Intelligence
```

---

## Quick Reference

| Service  | Azure Resource           | Resource Group    |
| -------- | ------------------------ | ----------------- |
| Backend  | `vita-performance-api`   | Vita_Intelligence |
| Database | `vita-performance-db`    | Vita_Intelligence |
| Redis    | `vita-performance-redis` | Vita_Intelligence |

---

## Database Access

Connect to the production database directly (requires your IP to be whitelisted in the Azure PostgreSQL firewall):

```bash
psql "postgresql://<user>:<password>@vita-performance-db.postgres.database.azure.com:5432/vitadb?sslmode=require"
```

---

## Useful Commands

```bash
# View backend logs
az webapp log tail \
  --name vita-performance-api \
  --resource-group Vita_Intelligence

# Check what platform the Docker image was built for
docker buildx imagetools inspect maksymcherhyk/vita-performance-api:latest

# Force Azure to re-pull the container image
az webapp config container set \
  --name vita-performance-api \
  --resource-group Vita_Intelligence \
  --container-image-name maksymcherhyk/vita-performance-api:latest

# Create a superuser (set DJANGO_SUPERUSER_* env vars first)
# Then add to entrypoint: python manage.py createsuperuser --noinput
```

---

## Notes

- Always build with `--platform linux/amd64` — Azure Web Apps do not support ARM images.
- After pushing a new image, always restart the Web App — Azure does not auto-pull on push unless continuous deployment is configured.
- The `.env.deploy` file should **never** be committed to version control.
