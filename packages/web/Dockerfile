# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web/package.json    packages/web/package.json
COPY packages/api/package.json    packages/api/package.json
COPY packages/admin/package.json  packages/admin/package.json

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/shared packages/shared
# packages/api source required — packages/web devDeps on it for `import type { AppType }`
COPY packages/api    packages/api
COPY packages/web    packages/web

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @homeservices/shared build && pnpm --filter @homeservices/web build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone is self-contained; static + public must live inside it
COPY --from=builder /app/packages/web/.next/standalone                                        packages/web/.next/standalone
COPY --from=builder /app/packages/web/.next/static  packages/web/.next/standalone/packages/web/.next/static
COPY --from=builder /app/packages/web/public        packages/web/.next/standalone/packages/web/public

EXPOSE 3000
CMD ["node", "packages/web/.next/standalone/packages/web/server.js"]
