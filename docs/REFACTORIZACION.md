# Refactorización

Se hicieron seis mejoras en el backend. Cada una está en Git:

| Mejora | Commit |
|---|---|
| 1, 2 y 3. Saldo, entrega y metal | `5378dbe` |
| 4. Notificaciones | `5954e91` |
| 5. Errores | `470f783` |
| 5. Secreto JWT | `7e0d8ea` |
| 6. Cotizaciones | `4bf86b1` |

Las mejoras 1, 3, 4 y 6 conservan el comportamiento. Las mejoras 2 y 5 **también corrigen defectos**, y sus cambios se indican.

---

## 1. Cálculo del saldo

**Problema:** la misma operación estaba en cuatro funciones.
**Archivos:** `backend/src/services/order.service.ts`, `backend/src/domain/saldo.ts` (nuevo).

Antes (repetido cuatro veces):

```ts
const totalAbonado = order.payments.reduce(
  (acc, curr) => acc + Number(curr.amount),
  0
);
const balance = Number(order.totalPactado) - totalAbonado;
```

Después:

```ts
export const calcularSaldo = (pedido: PedidoConPagos): Saldo => {
  const totalPactado = Number(pedido.totalPactado);
  const totalAbonado = pedido.payments.reduce((acc, pago) => acc + Number(pago.amount), 0);
  return { totalPactado, totalAbonado, saldoPendiente: totalPactado - totalAbonado };
};

// uso
const saldo = calcularSaldo(order);
```

- **Técnica:** extraer función.
- **Principios:** DRY y responsabilidad única.
- **Justificación:** el saldo decide si se acepta un abono y si se entrega una joya, así que debe calcularse igual siempre.
- **Beneficios:** un solo lugar para cambiar la regla y prueba unitaria sin base de datos (N01).

---

## 2. Política de entrega y secuencia de estados

**Problema:** la regla estaba dentro del servicio y no se validaba el estado de origen.
**Archivos:** `backend/src/services/order.service.ts`, `backend/src/domain/politica-entrega.ts` y `transiciones-pedido.ts` (nuevos).

Antes:

```ts
if (data.newStatus === OrderStatus.ENTREGADO) {
  const totalAbonado = order.payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = Number(order.totalPactado) - totalAbonado;
  if (balance > 0) {
    throw new Error(`Entrega rechazada: el pedido tiene un saldo pendiente de $${balance}`);
  }
}
```

Después:

```ts
const politicaEntrega: IPoliticaEntregaStrategy = new PoliticaContadoEstrictoStrategy();

if (data.newStatus === OrderStatus.ENTREGADO) {
  const { esValido, motivoRechazo } = politicaEntrega.validarEntrega({
    status: order.status,
    saldoPendiente: calcularSaldo(order).saldoPendiente,
  });
  if (!esValido) throw new AppError(motivoRechazo ?? 'Entrega rechazada');
} else {
  validarTransicion(order.status, data.newStatus);
}
```

- **Técnica:** reemplazar condicional por el patrón Strategy y por una tabla de transiciones.
- **Principios:** abierto/cerrado, inversión de dependencias y responsabilidad única.
- **Justificación:** otra política, por ejemplo entregar con crédito, se agrega como otra clase.
- **Beneficios:** reglas probadas por separado (N02 y N03).
- **Cambio de comportamiento:** ya no se puede entregar un pedido que no esté en CALIDAD, reabrir un pedido entregado o cancelado, saltar estados ni cancelar por la ruta de estados. Sí se permite volver de CALIDAD a FABRICACION por reproceso. La interfaz ya seguía ese orden.

---

## 3. Liquidación de metal

**Problema:** `registerMetalReturn` ocupaba 107 líneas y hacía seis cosas; el umbral era un número sin nombre.
**Archivos:** `backend/src/services/order.service.ts`, `backend/src/services/metal.service.ts` y `backend/src/domain/balance-metal.ts` (nuevos).

Antes (fragmento):

```ts
const merma = Number((totalEntregado - pesoDevueltoTotal).toFixed(3));
const porcentajeMerma = Number(((merma / totalEntregado) * 100).toFixed(2));
const mermaInusual = porcentajeMerma > 8.0; // Umbral de alerta estándar en taller (> 8%)

let updatedMaterial = material;
if (data.scrapWeight > 0) {
  updatedMaterial = await tx.material.update({ /* ... */ });
}
const audit = await tx.auditLog.create({ /* 20 líneas */ });
await tx.orderStatusHistory.create({ /* ... */ });
```

Después:

```ts
export const registerMetalReturn = (data: DevolucionMetal) =>
  prisma.$transaction(async (tx) => {
    const { status, entregado, material } = await obtenerConsumo(tx, data);
    const balance = calcularBalanceMetal(entregado, data.finalPieceWeight, data.scrapWeight, material.unit);
    const actualizado = data.scrapWeight > 0 ? await reintegrarLimalla(tx, data) : material;

    const resumen = resumenBalance(data, entregado, balance);
    const audit = await auditarLiquidacion(tx, data, material, {
      ...resumen,
      alertaMermaInusual: balance.mermaInusual,
    });
    await registrarEnHistorial(tx, data, status, balance);
    // ...
  });
```

- **Técnica:** extraer función, extraer módulo y reemplazar número mágico por `UMBRAL_MERMA_INUSUAL`.
- **Principios:** responsabilidad única y separación entre cálculo y persistencia.
- **Justificación:** el cálculo de merma es la regla más delicada del taller y no se podía probar sin base de datos.
- **Beneficios:** cada paso tiene nombre y todo sigue dentro de una transacción.

---

## 4. Notificaciones

**Problema:** el controlador dependía de Brevo y mezclaba configuración, plantilla y envío.
**Archivos:** se eliminó `backend/src/services/email.service.ts`; se creó `backend/src/notificaciones/`; se ajustó `backend/src/controllers/material.controller.ts`.

Antes:

```ts
import { sendLowStockAlert } from '../services/email.service.js';

sendLowStockAlert({ materialName: result.materialName, /* ... */ })
  .catch((err) => console.error('[Brevo] Falló el envío en segundo plano:', err));
```

Después:

```ts
export interface INotificacionService {
  enviarAlertaStockBajo(alerta: AlertaStockBajo): Promise<void>;
}

export class BrevoNotificacionAdapter implements INotificacionService { /* ... */ }

// controlador
void notificaciones.enviarAlertaStockBajo({ materialName: result.materialName, /* ... */ });
```

- **Técnica:** extraer interfaz y patrón Adapter.
- **Principios:** inversión de dependencias, abierto/cerrado y bajo acoplamiento.
- **Justificación:** Brevo es un servicio externo que puede cambiar.
- **Beneficios:** el proveedor se elige en un solo archivo (`notificaciones/index.ts`) y la plantilla HTML quedó aparte.

---

## 5. Manejo de errores y secreto JWT

**Problema:** `try/catch` repetido en los controladores, errores internos respondidos como 400 con su detalle, y secreto de respaldo duplicado.
**Archivos:** `backend/src/controllers/*.ts`, `backend/src/services/*.ts`, `backend/src/middlewares/error.middleware.ts`, `auth.middleware.ts`, `upload.middleware.ts`, `backend/src/server.ts`, `backend/src/app.ts`; nuevos `backend/src/lib/errors.ts` y `backend/src/config/jwt.ts`.

Antes:

```ts
export const handleAssignArtisan = async (req, res) => {
  try {
    // ...
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

jwt.verify(token, process.env.JWT_SECRET || 'secret_fallback', ...);
```

Después:

```ts
export const handleAssignArtisan = async (req: AuthenticatedRequest, res: Response) => {
  // ... sin try/catch: Express 5 envía el error al manejador central
};

export const obtenerJwtSecret = (): string => {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) throw new Error('JWT_SECRET no está configurado');
  return secreto;
};
```

- **Técnica:** centralizar el manejo de errores, extraer función y dividir `errorHandler`, cuya complejidad bajó de 11 a 1 (la función más compleja que resultó tiene 7).
- **Principios:** DRY, responsabilidad única y configuración segura por defecto.
- **Justificación:** `AppError` ya existía, pero los servicios no lo usaban.
- **Beneficios:** respuestas uniformes y sin datos internos.
- **Cambio de comportamiento:** los errores de negocio conservan mensaje y código. Los fallos inesperados responden 500 con un mensaje genérico, los datos inválidos para Prisma responden 400, los límites de carga de archivos responden 400 y el servidor **no arranca sin `JWT_SECRET`**. También se desactivó la cabecera `X-Powered-By`.

---

## 6. Ítems de cotización

**Problema:** el total y los ítems se calculaban igual al crear y al editar.
**Archivos:** `backend/src/services/quote.service.ts`, `backend/src/domain/items-cotizacion.ts` (nuevo).

Antes (dos veces):

```ts
const totalAmount = data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
// ...
totalAmount,
items: {
  create: data.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  })),
},
```

Después:

```ts
...construirItems(data.items),
```

- **Técnica:** extraer función.
- **Principios:** DRY.
- **Justificación:** jscpd lo reportó como bloque duplicado de 15 líneas.
- **Beneficios:** crear y editar no pueden calcular totales distintos.
