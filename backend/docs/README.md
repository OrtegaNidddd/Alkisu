# 💎 Papoi Jewelry Workshop API Documentation

Especificación formal e interactiva de la API RESTful para el **Sistema de Gestión de Taller de Alta Joyería Papoi**.

> 📖 **Manual de Arquitectura y Referencia Técnica Completa:** Consulta [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) para el análisis profundo de diseño, diagramas de topología, máquinas de estado y reglas de mermas.

---

## 📑 Índice de Contenidos
1. [Estructura y Especificación OpenAPI](#-especificación-openapi)
2. [Matriz de Roles y Autorización](#-matriz-de-roles-y-autorización)
3. [Flujo de Autenticación JWT](#-flujo-de-autenticación-jwt)
4. [Reglas Críticas de Negocio](#-reglas-críticas-de-negocio)
5. [Guía Rápida de Endpoints (Cheatsheet)](#-guía-rápida-de-endpoints)
6. [Cómo Visualizar la Documentación Interactiva](#-cómo-visualizar-la-documentación-interactiva)

---

## 📐 Especificación OpenAPI
El contrato completo y formal de la API se encuentra definido bajo el estándar **OpenAPI 3.1.0** en:
- 📄 Archivo YAML: [`docs/openapi.yaml`](./openapi.yaml)

Cubre el 100% de los endpoints, tipos de datos, enumeraciones de Prisma, validaciones con Zod, cabeceras de autorización y códigos de respuesta HTTP.

---

## 🛡️ Matriz de Roles y Autorización

El sistema implementa control de acceso basado en roles (**RBAC**):

| Módulo / Recurso | Endpoint | Método | ADMIN | ASESOR | JOYERO |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Auth** | `/api/auth/register` | `POST` | ✅ | ✅ | ✅ *(Público/Registro)* |
| **Auth** | `/api/auth/login` | `POST` | ✅ | ✅ | ✅ *(Público/Acceso)* |
| **Usuarios** | `/api/users` | `GET` | ✅ | ✅ | ❌ |
| **Usuarios** | `/api/users/:id` | `GET` | ✅ | ✅ | ❌ |
| **Usuarios** | `/api/users/:id` | `PATCH` | ✅ | ❌ | ❌ |
| **Clientes** | `/api/clients` | `GET` | ✅ | ✅ | ✅ |
| **Clientes** | `/api/clients/:id` | `GET` | ✅ | ✅ | ✅ |
| **Clientes** | `/api/clients` | `POST` | ✅ | ✅ | ❌ |
| **Clientes** | `/api/clients/:id` | `PATCH` | ✅ | ✅ | ❌ |
| **Cotizaciones**| `/api/quotes` | `GET` / `GET :id` | ✅ | ✅ | ✅ |
| **Cotizaciones**| `/api/quotes` | `POST` | ✅ | ✅ | ❌ |
| **Cotizaciones**| `/api/quotes/:id/approve` | `POST` | ✅ | ✅ | ❌ |
| **Pedidos** | `/api/orders` | `GET` / `GET :id` | ✅ | ✅ | ✅ |
| **Pedidos** | `/api/orders` | `POST` | ✅ | ✅ | ❌ |
| **Pedidos** | `/api/orders/:id/payments` | `POST` | ✅ | ✅ | ❌ |
| **Pedidos** | `/api/orders/:id/status` | `PATCH` | ✅ | ✅ | ✅ |
| **Pedidos** | `/api/orders/:id/cancel` | `PATCH` | ✅ | ✅ | ❌ |
| **Pedidos** | `/api/orders/:id/materials` | `GET` | ✅ | ✅ | ✅ |
| **Pedidos** | `/api/orders/:id/materials` | `POST` | ✅ | ❌ | ✅ |
| **Pedidos** | `/api/orders/:id/metal-return` | `POST` | ✅ | ❌ | ✅ |
| **Adjuntos** | `/api/orders/:id/attachments` | `GET` | ✅ | ✅ | ✅ |
| **Adjuntos** | `/api/orders/:id/attachments` | `POST` | ✅ | ✅ | ✅ |
| **Materiales** | `/api/materials` | `GET` | ✅ | ✅ | ✅ |
| **Materiales** | `/api/materials` | `POST` | ✅ | ❌ | ❌ |
| **Materiales** | `/api/materials/:id/restock` | `PATCH` | ✅ | ❌ | ❌ |
| **Auditoría** | `/api/audit` | `GET` | ✅ | ❌ | ❌ |
| **Dashboard** | `/api/dashboard/stats` | `GET` | ✅ | ✅ | ❌ |
| **Uploads** | `/api/upload` | `POST` | ✅ | ✅ | ✅ |

---

## 🔑 Flujo de Autenticación JWT

1. **Obtención del Token:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@papoi.com", "password": "TuPasswordSeguro"}'
   ```
   **Respuesta:**
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
       "fullName": "Administrador Principal",
       "email": "admin@papoi.com",
       "role": "ADMIN"
     }
   }
   ```

2. **Consumo de Endpoints Protegidos:**
   Incluir el token en la cabecera `Authorization`:
   ```http
   Authorization: Bearer <TU_TOKEN_JWT>
   ```

---

## ⚡ Reglas Críticas de Negocio

1. **Inmutabilidad de Precios Pactados:**
   - Una vez aprobado el presupuesto o creado el pedido, el `totalPactado` es inmutable.
2. **Control de Sobregiros en Abonos:**
   - Ningún pago puede ser mayor al `saldoPendiente` (`totalPactado - totalAbonado`).
3. **Validación de Asignación en Fabricación:**
   - No es posible transicionar a estado `FABRICACION` sin un joyero (`artisanId`) asignado.
4. **Bloqueo de Entrega con Saldo Pendiente:**
   - El pedido no puede transicionar a `ENTREGADO` si `saldoPendiente > 0`.
5. **Protección de Pedidos Finalizados:**
   - Un pedido ya en estado `ENTREGADO` no puede ser cancelado.
6. **Manejo Técnico de Mermas y Limallas:**
   - Al cerrar la mesa en `/api/orders/:id/metal-return`:
     - Retorno total (`joyaFinal + limalla`) no puede superar el material entregado.
     - La limalla se reingresa automáticamente al stock de bodega.
     - Si la merma supera el **8.0%**, se activa una marca de advertencia por merma atípica.
     - Se registra evento forense en `AuditLog`.
7. **Notificación de Stock Bajo:**
   - Cuando el despacho de un material deja el stock por debajo de `minStock`, el backend dispara una notificación por correo electrónico con Brevo.

---

## 🖥️ Cómo Visualizar la Documentación Interactiva

### Opción 1: Swagger UI en Vivo (Servidor Local)
Con el servidor en ejecución (`npm run dev`), ingresa directamente en tu navegador:
👉 **[http://localhost:4000/api/docs](http://localhost:4000/api/docs)**

Permite autenticarse con el botón **Authorize** (pegando tu Bearer Token) y ejecutar peticiones directamente en vivo con el botón **Try it out**.

### Opción 2: Visor HTML Autónomo (Redoc)
Abre directamente el archivo compilado en cualquier navegador:
👉 [`docs/index.html`](./index.html) (o ejecuta `start docs/index.html`)

### Opción 3: Importar en Postman / Bruno / Insomnia
- **Postman:** Botón `Import` -> Seleccionar [`docs/openapi.yaml`](./openapi.yaml) o [`docs/openapi.json`](./openapi.json). Se generará automáticamente la colección con todas las carpetas, variables y esquemas.

---

Desarrollado para el ecosistema **Papoi Jewelry ERP**.
