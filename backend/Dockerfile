# ==========================================
# STAGE 1: Builder (Compilación TypeScript y Prisma)
# ==========================================
FROM node:20-alpine AS builder

# Instalar OpenSSL necesario para los motores binarios de Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Instalar dependencias primero para aprovechar el caché de capas de Docker
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generar cliente de Prisma para Linux
RUN npx prisma generate

# Copiar código fuente y documentación OpenAPI
COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs

# Compilar TypeScript a JavaScript estándar
RUN npm run build && ls -la dist/

# ==========================================
# STAGE 2: Runner de Producción
# ==========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copiar manifiestos y prisma para instalar sólo dependencias de producción
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copiar el build compilado y la especificación OpenAPI desde la etapa de compilación
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs
COPY index.js ./

RUN ls -la dist/

# Cambiar permisos al usuario sin privilegios 'node' para endurecimiento de seguridad
RUN chown -R node:node /app

USER node

EXPOSE 4000

# Verificación de salud (Health Check)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "index.js"]
