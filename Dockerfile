# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
# --ignore-scripts skips the postinstall `prisma generate` — we run it in the builder stage
# once the schema file is available.
RUN bun install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for Linux (required before build)
RUN bunx prisma generate

# Build Next.js (skip env validation — real vars are injected at runtime)
ENV SKIP_ENV_VALIDATION=1
RUN bun run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder                        /app/public          ./public

# Prisma CLI + engines needed for `migrate deploy` at startup
COPY --from=builder /app/prisma                ./prisma
COPY --from=builder /app/generated             ./generated
COPY --from=builder /app/node_modules/.bin/prisma            ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma                 ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma                ./node_modules/@prisma

COPY --chown=nextjs:nodejs scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
