# ==========================================
# STAGE 1: Builder (Compilación de Vite y React)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias con caché optimizado
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Variables de entorno en tiempo de compilación para Vite
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Compilar para producción (genera directorio /dist)
RUN npm run build

# ==========================================
# STAGE 2: Servidor Web Nginx Alpine Ultraligero
# ==========================================
FROM nginx:alpine AS runner

# Reemplazar configuración por defecto con la optimizada para SPA y proxy API
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los assets estáticos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Verificación de salud (Health Check)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
