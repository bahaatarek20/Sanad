# ═══════════════════════════════════════════════════════════════════════════
# منصة «سَنَد» — ملف التشغيل بالحاويات (Production Dockerfile)
# Multi-stage optimized build for High Performance & Zero-Bloat
# ═══════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

# المرحلة الأولى: تثبيت الحزم والاعتماديات
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# المرحلة الثانية: بناء التطبيق
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# المرحلة الثالثة: صورة التشغيل الإنتاجية الخفيفة والآمنة
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# إنشاء مستخدم آمن غير جذري (Non-root user)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# نسخ الملفات اللازمة للتشغيل
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
