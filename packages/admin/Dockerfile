# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web/package.json    packages/web/package.json
COPY packages/api/package.json    packages/api/package.json
COPY packages/admin/package.json  packages/admin/package.json

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/admin packages/admin

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# admin has no public/ directory — create it so the runner COPY succeeds
RUN mkdir -p packages/admin/public

RUN pnpm --filter @homeservices/admin build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# standalone server.js defaults to port 3000; override for admin
ENV PORT=3001

COPY --from=builder /app/packages/admin/.next/standalone                                          packages/admin/.next/standalone
COPY --from=builder /app/packages/admin/.next/static  packages/admin/.next/standalone/packages/admin/.next/static
COPY --from=builder /app/packages/admin/public        packages/admin/.next/standalone/packages/admin/public

EXPOSE 3001
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=${PORT:-10000} node packages/admin/.next/standalone/packages/admin/server.js"]
