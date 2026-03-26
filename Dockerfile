# ============================================================
# Web3 AI Agent - Multi-stage Docker Build for Akash Network
# ============================================================

# ── Stage 1: Dependencies ──────────────────────────────────────
FROM node:20-alpine3.19 AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# ── Stage 2: Build ─────────────────────────────────────────────
FROM node:20-alpine3.19 AS builder
ARG OPENAI_API_KEY=build-dummy
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output for minimal runtime image)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
RUN npm run build

# ── Stage 3: Runner ────────────────────────────────────────────
FROM node:20-alpine3.19 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + generated client for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
