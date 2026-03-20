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