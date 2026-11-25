# Evaluación inicial del software

Proyecto: Papoi, sistema de gestión para talleres de joyería. Medición del 25 de noviembre de 2026 sobre el commit `9e46c6b`, antes de refactorizar.

## Alcance

- Incluido: `backend/src` y `frontend/src` (TypeScript y TSX).
- Excluido: `node_modules`, `backend/dist`, `frontend/dist`, el cliente generado por Prisma, los scripts de datos iniciales y las pruebas.
- Las métricas miden todo el código. Las mejoras se hicieron en el backend, donde están las reglas de negocio.

## Herramientas

| Herramienta | Versión | Qué mide |
|---|---|---|
| cloc | 2.12 | Líneas de código y número de archivos |
| ESLint | 9.39.5 | Complejidad ciclomática, diseño y estándares |
| typescript-eslint | 8.74.0 | Estándares de TypeScript |
| eslint-plugin-sonarjs | 4.2.3 | Problemas de calidad y complejidad cognitiva |
| eslint-plugin-security | 4.2.1 | Posibles vulnerabilidades en el código |
| jscpd | 4.3.0 | Código duplicado |
| npm audit | npm 11.17.0 | Vulnerabilidades en dependencias de producción |

Están en `calidad/`, separadas del despliegue.

## Comandos

```bash
cd calidad
npm install
node medir.mjs antes      # línea base
node medir.mjs despues    # después de refactorizar
node polimetrica.mjs      # gráfico polimétrico
```

`cloc` necesita Perl, que viene con Git para Windows.

Los dos puntos de medición usan el mismo script y la misma configuración. Para repetir la línea base se debe volver antes al commit `438dfe4`, porque el comando mide el código que esté en la carpeta.

## Configuración

Está en `calidad/eslint.config.mjs` y `calidad/medir.mjs`:

- Reglas recomendadas de typescript-eslint, sonarjs y security.
- Complejidad ciclomática máxima de 10 por función, que es donde empieza el nivel alto de la guía.
- Complejidad cognitiva máxima de 15, función de máximo 80 líneas, archivo de máximo 400 líneas, 4 parámetros y 4 niveles de anidamiento.
- Duplicación: bloques de al menos 5 líneas y 50 tokens.
- Los comentarios `eslint-disable` se ignoran, para que no oculten problemas.

Cada hallazgo se asigna a una categoría:

| Categoría | Reglas |
|---|---|
| Diseño | Complejidad, tamaño de archivo y función, parámetros, anidamiento, textos y condicionales repetidos o anidados |
| Vulnerabilidades | `security/*` y reglas de seguridad de sonarjs |
| Calidad | Las demás reglas de `sonarjs` |
| Estándares | typescript-eslint y reglas base de ESLint |

## Resultados iniciales

| Indicador | Backend | Frontend | Total |
|---|---:|---:|---:|
| Líneas de código | 2112 | 11613 | 13725 |
| Archivos | 39 | 36 | 75 |
| Funciones | 111 | 725 | 836 |
| Complejidad promedio por función | 2.90 | 3.05 | 3.03 |
| Complejidad máxima | 11 | 157 | 157 |
| Funciones con complejidad alta (11 a 20) | 1 | 27 | 28 |
| Funciones con complejidad muy alta (más de 20) | 0 | 9 | 9 |
| Líneas duplicadas | 43 | 61 | 104 |
| Duplicación | 1.73 % | 0.53 % | 0.74 % |
| Problemas de calidad | 12 | 84 | 96 |
| Problemas de diseño | 7 | 109 | 116 |
| Incumplimientos de estándares | 54 | 125 | 179 |
| Posibles vulnerabilidades en código | 4 | 51 | 55 |
| Dependencias vulnerables (npm audit) | 7 altas | 1 alta | 8 |
| Deuda técnica estimada | 12.0 h | 104.4 h | 116.4 h |

La deuda técnica es una **estimación propia**, no la calcula ninguna herramienta usada. Suma minutos por hallazgo: diseño 30, vulnerabilidad 30, calidad 10 y estándar 5. Sirve para comparar antes y después con el mismo criterio. No se usó SonarQube porque necesita un servidor y Docker no estaba en ejecución.

De las 55 posibles vulnerabilidades, 47 son de la regla `detect-object-injection`, que marca todo acceso `objeto[variable]` y suele dar falsos positivos.

## Problemas identificados

| N.º | Problema | Archivo y ubicación (commit `9e46c6b`) | Tipo |
|---|---|---|---|
| 1 | Cálculo del saldo repetido cuatro veces | `backend/src/services/order.service.ts`: `addPayment`, `getOrderById`, `updateOrderStatus`, `getOrders` | Duplicación |
| 2 | Regla de entrega fija y sin validar la secuencia de estados | `backend/src/services/order.service.ts`: `updateOrderStatus` (línea 140) | Diseño y defecto funcional |
| 3 | Función de 107 líneas con varias responsabilidades y número mágico | `backend/src/services/order.service.ts`: `registerMetalReturn` (línea 376) | Diseño |
| 4 | Aplicación acoplada a Brevo | `backend/src/services/email.service.ts` y `controllers/material.controller.ts` | Diseño |
| 5 | Manejo de errores repetido y secreto JWT de respaldo | `backend/src/controllers/*.ts`, `middlewares/error.middleware.ts`, `middlewares/auth.middleware.ts`, `services/auth.service.ts` | Calidad y seguridad |
| 6 | Ítems y total de cotización calculados dos veces | `backend/src/services/quote.service.ts`: `createQuote`, `updateQuote` | Duplicación |

### 1. Saldo repetido
- **Causa:** cada función copió la misma operación.
- **Impacto:** un cambio en la regla exige editar cuatro lugares y puede dejar saldos distintos según la pantalla.
- **Solución:** una sola función `calcularSaldo`.

### 2. Entrega y estados
- **Causa:** la regla está escrita dentro del servicio y solo revisa el saldo.
- **Impacto:** se podía pasar de CREADO a ENTREGADO, reabrir un pedido entregado y cancelar por la ruta de estados sin motivo. Las pruebas P10, P11 y P12 lo demostraron.
- **Solución:** patrón Strategy para la entrega y tabla de transiciones permitidas.

### 3. Liquidación de metal
- **Causa:** una función consulta, valida, calcula, actualiza inventario, audita y escribe el historial. El umbral `8.0` no tiene nombre.
- **Impacto:** difícil de probar y de modificar; ESLint reporta `max-lines-per-function` dos veces.
- **Solución:** separar el cálculo puro del acceso a datos y crear `UMBRAL_MERMA_INUSUAL`.

### 4. Correo
- **Causa:** el controlador llama a una función que construye el cliente de Brevo.
- **Impacto:** cambiar de proveedor obliga a tocar la aplicación.
- **Solución:** interfaz `INotificacionService` y adaptador para Brevo.

### 5. Errores y secreto JWT
- **Causa:** cada controlador repite `try/catch`, y `JWT_SECRET || 'secret_fallback'` está en dos archivos.
- **Impacto:** un fallo interno respondía 400 con el detalle técnico (P34). Sin `JWT_SECRET`, cualquiera que conociera el valor de respaldo podía firmar un token de administrador (P31).
- **Solución:** `AppError` y manejador central; una función que falla si no hay secreto.

### 6. Cotizaciones
- **Causa:** copia del cálculo entre crear y editar.
- **Impacto:** 15 líneas duplicadas detectadas por jscpd.
- **Solución:** función `construirItems`.

## Evidencia

En `docs/evidencias/antes/`:

| Archivo | Contenido |
|---|---|
| `resumen.json` | Todos los indicadores |
| `cloc.txt` | Salida de cloc |
| `complejidad.json` | Complejidad de cada función |
| `componentes.json` | Métricas por archivo |
| `eslint-hallazgos.json` | Regla, archivo y línea de cada hallazgo |
| `jscpd.json` | Bloques duplicados |
| `pruebas.txt` | Pruebas antes de refactorizar |
