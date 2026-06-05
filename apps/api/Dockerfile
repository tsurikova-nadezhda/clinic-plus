# Backend (apps/api) — собирать с КОНТЕКСТОМ В КОРНЕ монорепо.
#   docker build -f apps/api/Dockerfile -t clinic-plus-api .
# apps/mobile и apps/admin исключены через .dockerignore → workspace-install
# ставит только api + packages/shared (лёгкий образ, без expo/vite).
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# 1) Манифесты — для кэширования слоёв установки
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# --no-frozen-lockfile: lock содержит mobile/admin, которых нет в контексте
RUN bun install --no-frozen-lockfile

# 2) Исходники
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

ENV NODE_ENV=production
# Railway/Render задают PORT сами; локально дефолт 3001.
EXPOSE 3001

WORKDIR /app/apps/api
# index.ts применяет миграции Drizzle, (опц.) сидит админа и запускает cron.
CMD ["bun", "run", "src/index.ts"]
