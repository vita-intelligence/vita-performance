# ============================================================
# Vita Performance — Next.js Frontend
# Node 20 slim with standalone output
# ============================================================

FROM node:20-slim AS base

# ============================================================
# Dependencies stage
# ============================================================
FROM base AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Build stage
# ============================================================
FROM dependencies AS builder

WORKDIR /app
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_URL

# Docker Desktop on the dev builder has a ~2.8 GB VM — Next 16's
# default Node heap target blew past it mid-trace and the container
# OOM killer tripped. Cap the heap at ~2.2 GB so Node starts GCing
# aggressively instead of asking for more memory than the VM has.
# Prod CI runners get 7 GB+ so this cap is a no-op there.
ENV NODE_OPTIONS="--max-old-space-size=2200"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# ============================================================
# Runtime stage
# ============================================================
FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]