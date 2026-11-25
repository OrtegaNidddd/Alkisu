# Pruebas del software

## Herramientas y ubicación

| Tipo | Herramienta | Ubicación |
|---|---|---|
| Integración de la API y unitarias | Vitest y Supertest | `backend/tests/` |
| Extremo a extremo | Node y PostgreSQL local desechable (`embedded-postgres`) | `calidad/e2e.mjs` |

En las pruebas de Vitest, Prisma, Supabase y Brevo están simulados. La prueba de extremo a extremo usa el backend compilado y una base temporal en `127.0.0.1:5999`. Ninguna usa la base de datos de `backend/.env`.

## Comandos

```bash
cd backend
npm install
npm test

cd ../calidad
npm install
npm run e2e
```

## Resultados

| Ejecución | Ejecutadas | Aprobadas | Fallidas | Evidencia |
|---|---:|---:|---:|---|
| Antes de refactorizar | 37 | 32 | 5 | `docs/evidencias/antes/pruebas.txt` |
| Después, mismas pruebas | 37 | 37 | 0 | `docs/evidencias/despues/pruebas.txt` |
| Después, con 5 pruebas nuevas | 42 | 42 | 0 | `docs/evidencias/despues/pruebas-completas.txt` |
| Extremo a extremo, después | 38 | 38 | 0 | `docs/evidencias/despues/e2e.txt` |

Las cinco pruebas que fallaron antes son las marcadas `[defecto]`. Se escribieron con el comportamiento correcto para demostrar los defectos. Las otras 32 confirman que lo que ya funcionaba no cambió. La prueba de extremo a extremo solo se ejecutó después.

## Casos

Resultado obtenido: A = aprobada, F = fallida.

| ID | Caso | Resultado esperado | Antes | Después |
|---|---|---|:-:|:-:|
| P01 | Registrar abono | 201 y nuevo saldo | A | A |
| P02 | Abono mayor al saldo | 400 y no se guarda | A | A |
| P03 | Abono negativo | 400 de validación | A | A |
| P04 | Detalle del pedido | Resumen financiero correcto | A | A |
| P05 | Lista de pedidos | Saldo y paginación correctos | A | A |
| P06 | Entregar con saldo | 400 y no se actualiza | A | A |
| P07 | Entregar pedido pagado | 200, fecha e historial | A | A |
| P08 | Fabricar sin joyero | 400 | A | A |
| P09 | Flujo normal de estados | 200 | A | A |
| P10 | Entregar sin pasar por CALIDAD | 400 | **F** | A |
| P11 | Reabrir pedido entregado | 400 | **F** | A |
| P12 | Cancelar por la ruta de estados | 400 | **F** | A |
| P13 | Cancelar con motivo, y cancelar entregado | 200 y 400 | A | A |
| P14 | Liquidar metal | Merma, limalla y auditoría | A | A |
| P15 | Umbral de merma (dos casos) | 8 % normal; mayor, inusual | A | A |
| P16 | Devolver más metal del entregado | 400 | A | A |
| P17 | Liquidar sin consumos | Error de negocio | A | A |
| P18 | Consumo que llega al mínimo | Descuenta, audita y envía correo | A | A |
| P19 | Consumo sobre el mínimo | No envía correo | A | A |
| P20 | Brevo falla | El consumo responde 200 | A | A |
| P21 | Brevo sin configurar | Omite el correo | A | A |
| P22 | Consumo mayor al stock | 400 | A | A |
| P23 | Crear cotización | Subtotales y total | A | A |
| P24 | Editar cotización | Reemplaza ítems y recalcula | A | A |
| P25 | Editar cotización aprobada | 400 | A | A |
| P26 | Cotización sin ítems | 400 | A | A |
| P27 | Iniciar sesión | Token válido, sin hash | A | A |
| P28 | Credenciales inválidas | 401 | A | A |
| P29 | Sin token o token inválido | 401 | A | A |
| P30 | Joyero registra abono | 403 | A | A |
| P31 | Token con el secreto de respaldo | No se acepta | **F** | A |
| P32 | Pedido inexistente | 404 | A | A |
| P33 | Falla la base al consultar | 500 sin detalle | A | A |
| P34 | Falla interna al abonar | 500 sin detalle | **F** | A |
| P35 | Cliente repetido | 400 con mensaje claro | A | A |
| P36 | Asignar joyero inexistente | 400 | A | A |
| N01 | `calcularSaldo` | Saldo correcto | No existía | A |
| N02 | Política de entrega | Exige CALIDAD y saldo cero | No existía | A |
| N03 | Transiciones | Permite reproceso, rechaza saltos | No existía | A |
| N04 | Balance de metal | Merma y validación | No existía | A |
| N05 | Ítems de cotización | Total y subtotales | No existía | A |

P15 cuenta como dos pruebas: en total 37 más 5.

## Cobertura por área

| Área | Pruebas |
|---|---|
| Funcionalidad | P01, P04, P05, P07, P09, P13, P14, P23, P24, P27 |
| Reglas de negocio | P02, P06, P08, P10 a P12, P15 a P17, P22, P25, N01 a N05 |
| Validación de datos | P03, P26 |
| Almacenamiento y consulta | P01, P05, P07, P14, P18, P24; con base real en el extremo a extremo |
| Manejo de errores | P28, P32 a P36 |
| Seguridad | P29 a P31 |
| Integración externa (Brevo simulado) | P18 a P21 |

## Otras verificaciones

- El servidor compilado arranca y responde en `/api/health`; sin `JWT_SECRET` no arranca.
- El frontend compila (`npm run build`).

## Límites

- La interfaz web no tiene pruebas automatizadas.
- Supabase Storage y el envío real por Brevo no se probaron.
- La base remota no respondió desde el equipo de prueba, por eso se usó PostgreSQL local.
