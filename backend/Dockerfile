FROM node:22-alpine

# Instalar OpenSSL requerido por los binarios de Prisma ORM
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Instalar dependencias de producción y generar Prisma Client
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copiar todo el contenido del backend (incluyendo dist/ precompilado e index.js)
COPY . .

EXPOSE 4000

# Verificación de salud para el balanceador de carga
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "index.js"]
