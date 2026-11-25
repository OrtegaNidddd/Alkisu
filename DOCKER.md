# Guía de Despliegue con Docker - Papoi ERP

Esta configuración implementa una arquitectura en contenedores desacoplada y de producción para **Papoi ERP**:

- **Frontend (`frontend/Dockerfile`):** Multi-stage build (Node 20 Alpine para compilación con Vite + Nginx Alpine para servir archivos estáticos con compresión gzip, caché de assets y proxy inverso a `/api`).
- **Backend (`backend/Dockerfile`):** Multi-stage build (Node 20 Alpine con OpenSSL para Prisma ORM, compilación TypeScript, usuario sin privilegios `node` y healthcheck en `/api/health`).
- **Orquestación (`docker-compose.yml`):** Coordina ambos contenedores en una red interna privada `papoi-net`, mapeando el Frontend en el puerto `3000` y el Backend en el `4000`.

---

## 🚀 Comandos Rápidos

### 1. Construir e Iniciar los Contenedores
```bash
docker compose up --build -d
```

### 2. Ver Estado de los Contenedores y Healthchecks
```bash
docker compose ps
```

### 3. Ver Logs en Tiempo Real
```bash
# Ambos servicios
docker compose logs -f

# Solo el backend
docker compose logs -f backend

# Solo el frontend
docker compose logs -f frontend
```

### 4. Ejecutar Migraciones o Seeds en el Contenedor Backend
```bash
# Sincronizar Prisma en la base de datos
docker compose exec backend npx prisma db push

# Ejecutar script de seed
docker compose exec backend npx tsx scripts/seed-complete-db.ts
```

### 5. Detener los Contenedores
```bash
docker compose down
```

---

## 🌐 URLs de Acceso Local con Docker

- **Frontend (Aplicación Web Papoi):** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000/api](http://localhost:4000/api)
- **Documentación Swagger:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Healthcheck del Backend:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
