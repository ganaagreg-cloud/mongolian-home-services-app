# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps with layer-cache-friendly ordering (manifests first)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api/package.json    packages/api/package.json
COPY packages/web/package.json    packages/web/package.json
COPY packages/admin/package.json  packages/admin/package.json

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY packages/api    packages/api

RUN pnpm --filter @homeservices/api build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules               ./node_modules
COPY --from=builder /app/packages/api/dist         packages/api/dist
COPY --from=builder /app/packages/api/node_modules packages/api/node_modules
COPY --from=builder /app/packages/shared            packages/shared

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "packages/api/dist/index.js"]
