# Plan de mantenimiento

## Estado actual

- El backend compila, pasa 42 pruebas automatizadas y 38 comprobaciones de extremo a extremo.
- El backend no tiene funciones de complejidad alta ni problemas de calidad reportados. Conserva 2 problemas de diseño, 7 de estándares y 3 posibles vulnerabilidades.
- El frontend compila, pero concentra la deuda: 9 funciones de complejidad muy alta y ninguna prueba.

## Deuda pendiente

| N.º | Deuda | Ubicación |
|---|---|---|
| 1 | El registro de usuarios es público y acepta cualquier rol, incluso ADMIN | `backend/src/routes/auth.routes.ts` |
| 2 | Tokens de sesión y contraseñas de demostración escritos en el código | `frontend/src/hooks/useAuth.tsx`, `frontend/src/api/client.ts` |
| 3 | 8 dependencias de producción reportadas con severidad alta | `backend/package.json`, `frontend/package.json` |
| 4 | El cambio de estado no exige rol | `backend/src/routes/order.routes.ts` |
| 5 | El abono consulta y guarda sin transacción; dos abonos simultáneos pueden superar el saldo | `addPayment` en `backend/src/services/order.service.ts` |
| 6 | El consumo de material consulta el stock y lo descuenta sin bloqueo | `consumeMaterialInOrder` en `backend/src/services/material.service.ts` |
| 7 | Crear un pedido descarta el joyero enviado | `backend/src/schemas/order.schemas.ts` |
| 8 | Componente de 2200 líneas con complejidad 157 | `frontend/src/components/orders/OrderDetailModal.tsx` |
| 9 | Componente de 1779 líneas | `frontend/src/components/quotes/QuoteBuilder.tsx` |
| 10 | 52 importaciones sin usar | `frontend/src` |
| 11 | CORS acepta cualquier origen | `backend/src/app.ts` |
| 12 | `backend/dist` se guarda en Git y Docker lo usa sin compilar | `backend/Dockerfile` |

## Problemas futuros posibles

- **Seguridad:** las deudas 1, 2 y 4 permiten accesos con más permisos de los debidos.
- **Dinero e inventario:** las deudas 5 y 6 pueden dejar saldos o stock negativos con varios usuarios a la vez.
- **Despliegue:** olvidar recompilar `dist` publica una versión anterior.
- **Crecimiento:** las consultas de pedidos traen todas sus relaciones y serán lentas con muchos datos.
- **Proveedores:** cambios en Brevo, Supabase o Prisma pueden exigir adaptaciones. Para Brevo ya existe el adaptador.

## Actividades propuestas

| Actividad | Tipo | Prioridad |
|---|---|---|
| Proteger el registro y limitar los roles permitidos | Correctivo | Alta |
| Eliminar tokens y contraseñas del frontend y cambiar el secreto JWT | Correctivo | Alta |
| Exigir rol en el cambio de estado | Correctivo | Alta |
| Registrar abonos y consumos con transacción y bloqueo | Correctivo | Alta |
| Actualizar dependencias vulnerables y repetir las pruebas | Preventivo | Alta |
| Incluir el joyero en el esquema de creación | Correctivo | Media |
| Restringir CORS al dominio del frontend | Preventivo | Media |
| Compilar dentro de Docker y sacar `dist` de Git | Preventivo | Media |
| Ejecutar pruebas y análisis en cada cambio (integración continua) | Preventivo | Media |
| Dividir `OrderDetailModal` y `QuoteBuilder` | Perfectivo | Media |
| Agregar pruebas del frontend | Preventivo | Media |
| Agregar otras políticas de entrega si el taller da crédito | Perfectivo | Baja |
| Limpiar importaciones sin usar | Perfectivo | Baja |
| Adaptar a nuevas versiones de Prisma, Node y proveedores | Adaptativo | Baja |

## Recomendaciones

1. Atender primero seguridad y concurrencia, antes de nuevas funciones.
2. Ejecutar `npm test` antes de cada commit y `node medir.mjs` en cada entrega.
3. Recompilar `backend/dist` mientras siga en Git.
4. Verificar que `JWT_SECRET` esté definido en el servidor antes de desplegar esta versión, porque sin él la API no arranca.
5. Dividir el frontend por partes, con pruebas antes de cada cambio.
