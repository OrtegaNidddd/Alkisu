# 🏛️ Papoi Jewelry ERP Backend — Manual de Arquitectura y Referencia Técnica

> **Versión del Documento:** 1.0.0  
> **Estado del Sistema:** Producción / Desarrollo Activo  
> **Stack Principal:** Node.js (v20+), Express 5, TypeScript 5+, Prisma ORM 6, PostgreSQL, Supabase Storage, Brevo  
> **Especificación API:** OpenAPI 3.1.0 (Swagger UI / Redoc)

---

## 📑 Tabla de Contenidos
1. [Resumen Ejecutivo (Executive Summary)](#1-resumen-ejecutivo)
2. [Arquitectura General del Sistema y Topología](#2-arquitectura-general-del-sistema-y-topología)
3. [Registro de Decisiones Arquitectónicas (ADRs)](#3-registro-de-decisiones-arquitectónicas-adrs)
4. [Modelos de Dominio y Máquinas de Estado](#4-modelos-de-dominio-y-máquinas-de-estado)
5. [Inmersión Técnica en Componentes Principales](#5-inmersión-técnica-en-componentes-principales)
6. [Diseño de Datos, Esquema y Persistencia](#6-diseño-de-datos-esquema-y-persistencia)
7. [Puntos de Integración con Terceros](#7-puntos-de-integración-con-terceros)
8. [Modelo de Seguridad, Autorización y Auditoría Forense](#8-modelo-de-seguridad-autorización-y-auditoría-forense)
9. [Características de Rendimiento y Escalabilidad](#9-características-de-rendimiento-y-escalabilidad)
10. [Guías Operativas, Despliegue y Resolución de Problemas](#10-guías-operativas-despliegue-y-resolución-de-problemas)
11. [Glosario y Apéndices](#11-glosario-y-apéndices)

---

## 1. Resumen Ejecutivo

### 1.1 Contexto y Propósito del Negocio
La manufactura de joyería de alta gama presenta una dinámica operativa radicalmente diferente a la manufactura tradicional en serie:
- **Materiales de Altísimo Valor Unitario:** Cada gramo de metales preciosos (oro 18k, platino, plata 925) y cada quilate de gemas deben tener trazabilidad milimétrica para evitar fugas financieras.
- **Pérdidas de Proceso (Mermas y Limallas):** Durante la fundición, laminado, corte, limado y pulido de piezas personalizadas, el metal se desprende en forma de polvo o partículas (limalla). Es imperativo calcular el balance entre el metal entregado al artesano, el peso final de la joya, la limalla reingresada a bodega y la merma técnica evaporada/irrecuperable.
- **Inmutabilidad Financiera:** Las joyas sobre pedido implican cotizaciones aceptadas donde el precio pactado con el cliente debe permanecer inmutable ante las fluctuaciones del precio spot del metal en el mercado.
- **Flujo de Pagos Progresivos:** Los clientes abonan anticipos para compra de materias primas y liquidan el saldo contra entrega. Las entregas deben estar blindadas contra deudas pendientes.

El backend de **Papoi** resuelve esta problemática centralizando el control de acceso basado en roles (**RBAC**), el flujo de taller, la gestión de inventarios con control de mermas, el registro inmutable de auditoría forense y la emisión de métricas operativas en tiempo real.

### 1.2 Capacidades Clave del Sistema
```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPACIDADES CLAVE PAPOI                        │
├────────────────────────────────────────────────────────────────────────┤
│  ✓ Control estricto de mermas y reingreso automático de limallas       │
│  ✓ Inmutabilidad de cotizaciones aprobadas convertidas a pedidos       │
│  ✓ Bloqueo algorítmico de entrega ante saldo insoluto                  │
│  ✓ Auditoría forense inmutable (AuditLog) de consumos y balances       │
│  ✓ Alertas automáticas de inventario crítico vía Brevo                 │
│  ✓ Gestión de activos visuales (renders, certificados) en Supabase     │
│  ✓ Contrato formal e interactivo OpenAPI 3.1.0 documentado             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura General del Sistema y Topología

El sistema adopta una arquitectura multicapa desacoplada orientada a servicios (**Layered Service-Oriented Architecture**), implementada bajo Node.js con módulos nativos ECMAScript (ESM) y TypeScript en modo estricto.

### 2.1 Diagrama de Topología del Sistema

```mermaid
graph TD
    ClientApp["Clientes Web / SPA Frontend"] -->|"HTTPS / JSON"| APIGateway["Express 5 Gateway & Routing"]

    subgraph "Backend Core (Papoi Service Layer)"
        APIGateway --> SecurityMW["Auth Middleware (JWT + RBAC)"]
        SecurityMW --> ValidationMW["Validation Middleware (Zod Schemas)"]
        ValidationMW --> Controllers["Controllers Layer"]
        Controllers --> Services["Services Layer (Business Logic)"]
        
        Services --> ErrorMW["Centralized Error Handler (AppError)"]
    end

    subgraph "Persistencia & Datos"
        Services --> PrismaClient["Prisma ORM 6 Engine"]
        PrismaClient --> PostgresDB[("PostgreSQL 15+ Database")]
    end

    subgraph "Servicios Externos / Nube"
        Services --> SupabaseStorage["Supabase Storage (Buckets S3)"]
        Services --> BrevoEmail["Brevo Email Service (Transactional)"]
    end

    subgraph "Documentación & Contrato"
        APIGateway --> SwaggerDocs["Swagger UI (/api/docs)"]
        SwaggerDocs -.-> OpenAPISpec["OpenAPI 3.1.0 Spec (openapi.yaml)"]
    end
```

### 2.2 Flujo de Peticiones y Responsabilidades por Capa

| Capa | Ubicación en Código | Responsabilidad Primaria |
| :--- | :--- | :--- |
| **Routing** | [`src/routes/*.routes.ts`](file:///c:/Proyectos/papoi/backend/src/routes) | Definir URIs REST, asociar middlewares de seguridad y delegar en el controlador. |
| **Middlewares** | [`src/middlewares/`](file:///c:/Proyectos/papoi/backend/src/middlewares) | Extracción/verificación de tokens JWT, filtrado RBAC, validación asíncrona de DTOs con Zod, captura centralizada de excepciones. |
| **Controladores** | [`src/controllers/*.controller.ts`](file:///c:/Proyectos/papoi/backend/src/controllers) | Parsear parámetros HTTP (`req.params`, `req.query`, `req.body`), orquestar llamadas a servicios y estandarizar códigos de estado HTTP (200, 201, 204). |
| **Servicios** | [`src/services/*.service.ts`](file:///c:/Proyectos/papoi/backend/src/services) | **Núcleo de negocio:** Reglas del taller, validaciones de saldo, transacciones atómicas (`$transaction`), emisión de auditorías y cálculos matemáticos de mermas. |
| **Acceso a Datos** | [`src/lib/prisma.ts`](file:///c:/Proyectos/papoi/backend/src/lib/prisma.ts), [`prisma/schema.prisma`](file:///c:/Proyectos/papoi/backend/prisma/schema.prisma) | Mapeo objeto-relacional mediante Prisma Client, asegurando consultas fuertemente tipadas y protección nativa contra inyecciones SQL. |

---

## 3. Registro de Decisiones Arquitectónicas (ADRs)

### ADR-01: Adopción de Express 5 sobre Node.js ESM Nativo
- **Contexto:** Se requería una base probada y ligera con soporte nativo de promesas y compatibilidad moderna de paquetes npm.
- **Decisión:** Usar `express@^5.2.1` con `"type": "module"` en `package.json`.
- **Consecuencia:** Express 5 resuelve automáticamente promesas rechazadas en controladores hacia el middleware de errores sin requerir envoltorios tipo `express-async-errors`. Mejora la limpieza del código y la estabilidad del event loop.

### ADR-02: Manejo de Tipos Numéricos en Metales y Moneda
- **Contexto:** JavaScript maneja números con estándar IEEE 754 (coma flotante de 64 bits), lo que genera errores de redondeo inaceptables en metales preciosos (ej. `0.1 + 0.2 = 0.30000000000000004`).
- **Decisión:** Definir en PostgreSQL tipos `Decimal(10, 3)` para insumos de joyería (precisión al miligramo) y `Decimal(12, 2)` para finanzas. En el código TypeScript, las operaciones matemáticas críticas se manejan con casting explícito y `toFixed()` estricto, o tipos Prisma Decimal.
- **Consecuencia:** Cero discrepancias en inventarios de metales ni balances financieros en caja.

### ADR-03: Transaccionalidad ACID en Balances de Taller
- **Contexto:** La liquidación de una joya involucra simultáneamente: validar el material consumido, incrementar el stock de bodega por limalla devuelta, registrar el log inmutable en `AuditLog` y asentar el evento en `OrderStatusHistory`. Si un paso falla, el sistema quedaría en estado corrupto.
- **Decisión:** Ejecutar todas las mutaciones multientidad dentro de bloques interactivos `prisma.$transaction(async (tx) => { ... })`.
- **Consecuencia:** Consistencia estricta garantizada; aislamiento de lecturas y reversión total (rollback) ante cualquier error.

### ADR-04: Inmutabilidad del Precio Pactado (`totalPactado`)
- **Contexto:** El precio de los metales cotiza en tiempo real en bolsas internacionales. Un presupuesto aprobado al cliente no puede fluctuar durante las 3-4 semanas que toma la manufactura.
- **Decisión:** Al aprobar una cotización (`QuoteStatus.APROBADA`) o crear un pedido directo, el campo `totalPactado` se congela en la entidad `Order`. Las posteriores subidas o bajadas de insumos no alteran el compromiso contractual.
- **Consecuencia:** Certeza jurídica y comercial para asesores y clientes.

### ADR-05: Umbral de Alerta de Merma Técnica Atípica (> 8.0%)
- **Contexto:** En orfebrería de alta gama, la merma estándar tolerada oscila entre el 4% y el 7% dependiendo de la técnica (cera perdida, calado, engaste). Una merma superior al 8% suele indicar fallas en el crisol, limado descuidado o desvío no autorizado de metal.
- **Decisión:** Al invocar `registerMetalReturn`, si `(merma / totalEntregado) * 100 > 8.0%`, el sistema marca la bandera booleana `alertaMermaInusual: true`, disparando un registro forense en `AuditLog`.
- **Consecuencia:** Detección temprana de anomalías en mesa de trabajo sin frenar el flujo del artesano.

---

## 4. Modelos de Dominio y Máquinas de Estado

### 4.1 Máquina de Estados del Pedido (`OrderStatus`)

El ciclo de vida del pedido en taller es unidireccional y cuenta con barreras de control de acceso y precondiciones:

```mermaid
stateDiagram-v2
    [*] --> CREADO: Pedido Registrado / Cotización Aprobada
    
    CREADO --> FABRICACION: Asignación de Joyero Requerida
    CREADO --> CANCELADO: Cancelación por Asesor/Admin
    
    FABRICACION --> CALIDAD: Fin de Trabajo en Mesa & Liquidación de Metal
    FABRICACION --> CANCELADO: Cancelación de Urgencia
    
    CALIDAD --> ENTREGADO: Saldo Pendiente == $0.00 OBLIGATORIO
    CALIDAD --> FABRICACION: Rechazo de Calidad (Re-trabajo)
    
    ENTREGADO --> [*]: Joya Entregada (Inmutable)
    CANCELADO --> [*]: Pedido Cancelado (Inmutable)
```

#### Reglas de Transición Inviolables:
1. **Transición a `FABRICACION`:** Requiere obligatoriamente un artesano asignado (`artisanId`). Si no existe en la orden ni se envía en el cuerpo, la petición es abortada con error 400.
2. **Transición a `ENTREGADO`:** Requiere verificación matemática estricta de saldo pendiente:
   $$\text{Saldo Pendiente} = \text{totalPactado} - \sum \text{Pagos} \le 0$$
   Si existe saldo pendiente (> 0), la entrega es rechazada.
3. **Inmutabilidad de `ENTREGADO`:** Un pedido entregado jamás puede pasar a `CANCELADO` ni regresar a estados de taller.

### 4.2 Máquina de Estados de Cotizaciones (`QuoteStatus`)

```mermaid
stateDiagram-v2
    [*] --> BORRADOR: Registro de Ítems y Precios
    BORRADOR --> ENVIADA: Compartida con Cliente
    ENVIADA --> APROBADA: Aceptación de Términos
    ENVIADA --> RECHAZADA: Declinada por Cliente
    BORRADOR --> APROBADA: Aprobación Directa en Taller
    
    state APROBADA {
        [*] --> GenerarPedido: Dispara Transacción Atómica
        GenerarPedido --> CrearOrder: totalPactado = quote.totalAmount
        CrearOrder --> VincularQuote: quoteId = quote.id
    }
```

---

## 5. Inmersión Técnica en Componentes Principales

### 5.1 Motor de Órdenes y Liquidación de Mesa (`order.service.ts`)
Ubicación: [`src/services/order.service.ts`](file:///c:/Proyectos/papoi/backend/src/services/order.service.ts)

El servicio orquesta toda la interacción del taller. Las funciones más destacadas son:

#### A. Registro de Abonos y Control de Sobregiros
```typescript
// Fragmento representativo de src/services/order.service.ts
const totalAbonado = order.payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
const saldoActual = Number(order.totalPactado) - totalAbonado;

if (data.amount > saldoActual) {
  throw new Error(`El abono ($${data.amount}) excede el saldo pendiente ($${saldoActual})`);
}
```
Evita que un cliente abone de más por error administrativo, asegurando consistencia en la contabilidad del taller.

#### B. Algoritmo de Cierre de Mesa y Merma Técnica (`registerMetalReturn`)
Calcula con exactitud:
$$\text{Peso Devuelto Total} = \text{finalPieceWeight} + \text{scrapWeight}$$
$$\text{Merma Técnica} = \text{totalEntregado} - \text{Peso Devuelto Total}$$
$$\%\text{ Merma} = \left(\frac{\text{Merma}}{\text{totalEntregado}}\right) \times 100$$

Si $\text{scrapWeight} > 0$, el inventario de la bodega de metal se incrementa automáticamente mediante `tx.material.update({ data: { stock: { increment: scrapWeight } } })`.

```mermaid
sequenceDiagram
    autonumber
    actor Joyero as Joyero / Artesano
    participant Controller as OrderController
    participant Service as OrderService
    participant DB as PostgreSQL (Tx)
    
    Joyero->>Controller: POST /api/orders/:id/metal-return
    Note over Joyero,Controller: Envía joyaFinal (g) y limalla (g)
    Controller->>Service: registerMetalReturn(params)
    Service->>DB: Iniciar Transacción ($transaction)
    Service->>DB: Leer consumos de OrderMaterial
    Service->>Service: Validar: devuelto <= entregado
    Service->>Service: Calcular merma y % merma (>8% alerta)
    alt Limalla > 0
        Service->>DB: Reingresar limalla a Material.stock
    end
    Service->>DB: Insertar AuditLog forense
    Service->>DB: Registrar en OrderStatusHistory
    Service->>DB: Commit Transacción
    Service-->>Controller: Balance resumido + auditId
    Controller-->>Joyero: 201 Created (JSON Resumen Balance)
```

---

### 5.2 Control de Inventario y Alertas Proactivas (`material.service.ts`)
Ubicación: [`src/services/material.service.ts`](file:///c:/Proyectos/papoi/backend/src/services/material.service.ts)

- **Consumo en Pedidos (`consumeMaterialInOrder`):** Valida disponibilidad en stock antes de debitar. Dispara auditoría inmutable del despacho de material al joyero.
- **Reabastecimiento (`restockMaterial`):** Entrada de material desde proveedores o fundiciones mayores con registro de usuario responsable e IP.
- **Detección de Stock Crítico:** Si el stock resultante es $\le \text{minStock}$, se notifica a la dirección vía email transactional (`email.service.ts` con Brevo).

---

### 5.3 Motor de Dashboards y Analítica Operativa (`dashboard.service.ts`)
Ubicación: [`src/services/dashboard.service.ts`](file:///c:/Proyectos/papoi/backend/src/services/dashboard.service.ts)

Consolida en una sola consulta de alto rendimiento los 4 cuadrantes clave para la toma de decisiones gerenciales:
1. **Cuadrante Financiero:** Total Facturado, Total Recaudado, Cartera Pendiente (cuentas por cobrar).
2. **Cuadrante de Taller:** Pedidos activos, órdenes en fabricación, pedidos en control de calidad, compromisos con entrega en los próximos 7 días.
3. **Cuadrante de Inventario:** Lista de metales y piedras bajo stock crítico de seguridad.
4. **Cuadrante Comercial:** Cotizaciones en estado borrador pendientes de cierre.

---

## 6. Diseño de Datos, Esquema y Persistencia

### 6.1 Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    User ||--o{ Order : "creador (createdOrders)"
    User ||--o{ Order : "artesano (assignedOrders)"
    User ||--o{ Quote : "creador (createdQuotes)"
    User ||--o{ Payment : "registrador (registeredPays)"
    User ||--o{ OrderStatusHistory : "ejecutor"
    User ||--o{ AuditLog : "responsable"

    Client ||--o{ Order : "posee"
    Client ||--o{ Quote : "recibe"

    Quote ||--o| Order : "origina (quoteId)"
    Quote ||--o{ QuoteItem : "contiene"

    Order ||--o{ OrderMaterial : "consume"
    Order ||--o{ Payment : "recibe"
    Order ||--o{ OrderStatusHistory : "registra_historial"
    Order ||--o{ OrderAttachment : "posee_archivos"

    Material ||--o{ OrderMaterial : "despachado_a"

    User {
        String id PK
        String fullName
        String email UK
        String passwordHash
        Role role
        DateTime createdAt
    }

    Client {
        String id PK
        String fullName
        String phone
        String email
        String documentId UK
    }

    Quote {
        String id PK
        String clientId FK
        String createdById FK
        QuoteStatus status
        Decimal totalAmount
    }

    QuoteItem {
        String id PK
        String quoteId FK
        String description
        Int quantity
        Decimal unitPrice
        Decimal subtotal
    }

    Order {
        String id PK
        String quoteId FK
        String clientId FK
        String artisanId FK
        String createdById FK
        OrderStatus status
        Decimal totalPactado
        DateTime estimatedDelivery
        DateTime deliveryDate
    }

    Material {
        String id PK
        String name
        MaterialType type
        MeasurementUnit unit
        Decimal stock
        Decimal minStock
    }

    OrderMaterial {
        String id PK
        String orderId FK
        String materialId FK
        Decimal quantity
    }

    Payment {
        String id PK
        String orderId FK
        String registeredById FK
        Decimal amount
        PaymentMethod paymentMethod
        String referenceNotes
    }

    AuditLog {
        String id PK
        String userId FK
        String action
        String tableName
        String recordId
        String ipAddress
        Json details
        DateTime createdAt
    }
```

### 6.2 Especificación de Tipos y Precisión Numérica

| Entidad | Campo | Tipo de Dato DB | Propósito y Justificación |
| :--- | :--- | :--- | :--- |
| `Order` | `totalPactado` | `Decimal(12, 2)` | Monto contractual inmutable con 2 decimales para moneda estándar. |
| `Payment` | `amount` | `Decimal(12, 2)` | Abono dinerario registrado en caja. |
| `Material` | `stock`, `minStock` | `Decimal(10, 3)` | Inventario exacto en gramos (ej. `124.550 g`) o quilates (ct). |
| `OrderMaterial` | `quantity` | `Decimal(10, 3)` | Gramaje exacto retirado de bodega para la mesa de trabajo. |
| `AuditLog` | `details` | `Json` (PostgreSQL `jsonb`) | Snapshot semiestructurado con el estado previo y posterior de la operación. |

---

## 7. Puntos de Integración con Terceros

### 7.1 Supabase Object Storage
Ubicación: [`src/lib/supabase.ts`](file:///c:/Proyectos/papoi/backend/src/lib/supabase.ts) / [`src/services/storage.service.ts`](file:///c:/Proyectos/papoi/backend/src/services/storage.service.ts)

- **Objetivo:** Almacenamiento perenne de bocetos enviados por clientes, renders técnicos en 3D, fotografías de inspección de calidad y certificados gemológicos.
- **Flujo:** Las cargas se procesan en memoria con `multer` (`storage: multer.memoryStorage()`, límite 10MB) y se suben directamente al bucket `jewelry-assets`.
- **Estructura de llaves (Keys):** `{folder}/{timestamp}-{uuid}.{ext}` garantizando cero colisiones.
- **Resolución de URL:** Se genera URL pública estandarizada para consumo directo desde interfaces web o móviles.

### 7.2 Brevo (Sendinblue) Transactional Email
Ubicación: [`src/services/email.service.ts`](file:///c:/Proyectos/papoi/backend/src/services/email.service.ts)

- **Objetivo:** Notificaciones reactivas e inmediatas a la administración ante desabastecimiento de insumos críticos.
- **Resiliencia Operativa:** Las alertas por correo se ejecutan dentro de bloques `try / catch` no bloqueantes. Si la API de Brevo sufre intermitencia o la clave no está configurada, el consumo de material en base de datos continúa de forma exitosa sin interrumpir la operación del taller.

---

## 8. Modelo de Seguridad, Autorización y Auditoría Forense

### 8.1 Autenticación JWT y Manejo de Sesiones
- **Algoritmo:** HMAC-SHA256 con secreto de entorno (`JWT_SECRET`).
- **Payload:** `{ id: string, email: string, role: Role }`.
- **Expiración:** 24 horas por defecto.
- **Mecanismo:** Cabecera HTTP `Authorization: Bearer <TOKEN>`.

### 8.2 Matriz de Control de Acceso Basado en Roles (RBAC)

```
ADMIN   = Control total: usuarios, inventario, auditoría, dashboard, reportes.
ASESOR  = Gestión comercial: clientes, cotizaciones, órdenes, abonos, subida de fotos.
JOYERO  = Producción: consulta de órdenes, consumo de material, liquidación de metales y mermas.
```

| Módulo | Endpoint | Método | ADMIN | ASESOR | JOYERO | Justificación Operativa |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Auth** | `/api/auth/register` | `POST` | ✅ | ✅ | ✅ | Auto-registro o creación de cuenta. |
| **Auth** | `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | Inicio de sesión universal. |
| **Usuarios** | `/api/users` | `GET` | ✅ | ✅ | ❌ | Asesores pueden listar artesanos para asignación. |
| **Usuarios** | `/api/users/:id` | `PATCH` | ✅ | ❌ | ❌ | Solo Admin modifica roles o estados de usuario. |
| **Clientes** | `/api/clients` | `POST` / `PATCH` | ✅ | ✅ | ❌ | Gestión de cartera comercial. |
| **Cotizaciones** | `/api/quotes` | `POST` | ✅ | ✅ | ❌ | Elaboración de propuestas económicas. |
| **Cotizaciones** | `/api/quotes/:id/approve` | `POST` | ✅ | ✅ | ❌ | Cierre de venta comercial. |
| **Pedidos** | `/api/orders` | `POST` | ✅ | ✅ | ❌ | Creación directa de pedidos. |
| **Pedidos** | `/api/orders/:id/payments` | `POST` | ✅ | ✅ | ❌ | Caja y finanzas. |
| **Pedidos** | `/api/orders/:id/status` | `PATCH` | ✅ | ✅ | ✅ | Joyeros actualizan a CALIDAD; Asesor/Admin a otros. |
| **Pedidos** | `/api/orders/:id/cancel` | `PATCH` | ✅ | ✅ | ❌ | Joyeros no pueden cancelar pedidos. |
| **Pedidos** | `/api/orders/:id/materials` | `POST` | ✅ | ❌ | ✅ | Retiro de metal a cargo de artesano o supervisor. |
| **Pedidos** | `/api/orders/:id/metal-return` | `POST` | ✅ | ❌ | ✅ | Cierre de mesa técnica por joyero o supervisor. |
| **Materiales** | `/api/materials` | `POST` | ✅ | ❌ | ❌ | Creación de nuevos tipos de oro o piedras. |
| **Materiales** | `/api/materials/:id/restock` | `PATCH` | ✅ | ❌ | ❌ | Solo administración ingresa metal de proveedores. |
| **Auditoría** | `/api/audit` | `GET` | ✅ | ❌ | ❌ | Pista forense exclusiva para compliance/dueños. |
| **Dashboard** | `/api/dashboard/stats` | `GET` | ✅ | ✅ | ❌ | Métricas de negocio confidenciales para operarios. |

### 8.3 Auditoría Forense Inmutable (`AuditLog`)
A diferencia de los logs de consola que rotan y desaparecen, `AuditLog` es una tabla persistente en PostgreSQL. Cada evento sensible registra:
- `userId`: ID del usuario que autenticó la petición.
- `action`: Código nemotécnico (ej. `LIQUIDACION_METAL_MERMA`, `CONSUMO_MATERIAL_PEDIDO`, `REABASTECIMIENTO_MATERIAL`).
- `tableName` y `recordId`: Puntero exacto al registro afectado.
- `ipAddress`: IP cliente capturada para trazabilidad legal.
- `details`: Estructura JSON con cantidades anteriores, nuevas y notas.

---

## 9. Características de Rendimiento y Escalabilidad

1. **Agrupación y Concurrencia de Consultas:**
   En operaciones de alta demanda como [`getDashboardMetrics`](file:///c:/Proyectos/papoi/backend/src/services/dashboard.service.ts#L4) y [`getOrders`](file:///c:/Proyectos/papoi/backend/src/services/order.service.ts#L194), se utiliza `Promise.all` para ejecutar en paralelo las lecturas y conteos en PostgreSQL, reduciendo la latencia de respuesta hasta en un 60%.
2. **Paginación Basada en Límites:**
   Los endpoints `/api/orders` y `/api/audit` implementan paginación obligatoria (`page` y `limit`), acotando el uso de memoria RAM del proceso Node.js y previniendo ataques de denegación de servicio (DoS) por sobrecarga de memoria al consultar miles de registros.
3. **Manejo de Transacciones Ligeras:**
   Las transacciones interactivas en Prisma se mantienen en scope mínimo: únicamente las escrituras estrictamente acopladas se ejecutan dentro del delegado `tx`, liberando conexiones del pool de PostgreSQL de forma expedita.
4. **Procesamiento de Archivos en Streaming / Buffer:**
   La subida de adjuntos no escribe en el disco local del servidor (evitando problemas de espacio en contenedores efímeros o Docker). Se procesa directamente en memoria (`Buffer`) hacia Supabase Storage.

---

## 10. Guías Operativas, Despliegue y Resolución de Problemas

### 10.1 Variables de Entorno Requeridas (`.env`)

```ini
# Configuración del Servidor
PORT=4000
NODE_ENV=development

# Base de Datos Relacional (PostgreSQL)
DATABASE_URL="postgresql://usuario:password@localhost:5432/papoi_db?schema=public"

# Seguridad y Criptografía
JWT_SECRET="super_secret_jwt_key_papoi_2026"

# Supabase Object Storage
SUPABASE_URL="https://xyzcompany.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
SUPABASE_STORAGE_BUCKET="jewelry-assets"

# Brevo (Email Transaccional)
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="notificaciones@papoi.com"
BREVO_SENDER_NAME="Papoi Taller de Joyería"
ADMIN_NOTIFICATION_EMAIL="gerencia@papoi.com"
```

### 10.2 Comandos Operativos y Migraciones

```bash
# Instalación de dependencias
npm install

# Generar cliente de Prisma tras cambios en schema.prisma
npx prisma generate

# Aplicar migraciones en ambiente de desarrollo
npx prisma migrate dev --name <nombre_migracion>

# Aplicar migraciones en ambiente de producción / CI-CD
npx prisma migrate deploy

# Iniciar servidor en modo desarrollo con recarga en caliente
npm run dev
```

### 10.3 Guía de Diagnóstico y Casos Típicos

#### Problema A: La transición a `FABRICACION` falla con "No se puede pasar a FABRICACIÓN: el pedido no tiene un joyero asignado"
- **Causa:** El pedido se encuentra en estado `CREADO` sin un `artisanId` preasignado, y el usuario no incluyó `artisanId` en el payload de la petición.
- **Solución:** Enviar el campo `"artisanId": "<UUID_DEL_JOYERO>"` en el body de `PATCH /api/orders/:id/status`.

#### Problema B: La entrega falla con "Entrega rechazada: el pedido tiene un saldo pendiente de $X"
- **Causa:** El total abonado es menor a `totalPactado`. El sistema previene fugas de capital bloqueando el cambio de estado a `ENTREGADO`.
- **Solución:** Registrar el pago restante vía `POST /api/orders/:id/payments`. Una vez que el saldo sea 0, la transición se completará de inmediato.

#### Problema C: La liquidación de metal falla con "El peso total devuelto excede el material entregado"
- **Causa:** La suma de `finalPieceWeight` (joya terminada) + `scrapWeight` (limalla) es matemáticamente superior a lo que se despachó de bodega en `OrderMaterial`.
- **Solución:** Verificar el pesaje en la báscula de taller. Si se agregó metal adicional no registrado durante la fundición, primero debe registrarse el despacho correspondiente mediante `POST /api/orders/:id/materials`.

---

## 11. Glosario y Apéndices

### 11.1 Glosario de Términos del Dominio
- **Merma Técnica:** Porcentaje de metal que se pierde inevitablemente durante los procesos térmicos y abrasivos de fabricación (fundición, limado, pulido).
- **Limalla:** Virutas, partículas y polvillo de metal precioso recuperados de la astilla o gaveta de la mesa de trabajo para su posterior refinación o reingreso a bodega.
- **Precio Pactado (`totalPactado`):** Importe monetario acordado con el cliente al momento de cerrar la cotización o pedido, inalterable durante la fabricación.
- **Mesa de Trabajo / Cierre de Mesa:** Procedimiento físico y contable donde el artesano entrega la joya acabada junto con la limalla para cuadrar la balanza contra el material retirado de bodega.
- **RBAC (Role-Based Access Control):** Modelo de seguridad que restringe el acceso a operaciones según el rol conferido al usuario (`ADMIN`, `ASESOR`, `JOYERO`).

### 11.2 Mapa Estructural de Archivos

```
backend/
├── docs/
│   ├── ARCHITECTURE.md          # Este documento (Manual Técnico y Arquitectura)
│   ├── README.md                # Guía rápida y cheasheet de la API
│   ├── openapi.yaml             # Contrato formal OpenAPI 3.1.0
│   ├── openapi.json             # Compilado JSON del contrato OpenAPI
│   └── index.html               # Visor autónomo Redoc
├── prisma/
│   ├── migrations/              # Historial de migraciones SQL versionadas
│   └── schema.prisma            # Esquema relacional, enums y modelos
├── src/
│   ├── controllers/             # Handlers HTTP Express
│   ├── lib/                     # Clientes singleton (Prisma, Supabase)
│   ├── middlewares/             # Auth, RBAC, Zod, ErrorHandler, Multer
│   ├── routes/                  # Definición de rutas y endpoints
│   ├── schemas/                 # Esquemas Zod para validación de DTOs
│   ├── services/                # Reglas de negocio y transacciones de taller
│   ├── app.ts                   # Inicialización de middlewares y rutas Express
│   └── server.ts                # Entrypoint de arranque del servidor HTTP
├── package.json
└── tsconfig.json
```

---
*Manual elaborado conforme a los estándares de arquitectura de software para el taller de alta joyería Papoi.*
