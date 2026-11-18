# FinanzasApp — Auditoría técnica del estado actual

**Fecha de auditoría:** 2026-10-14  
**Repositorio:** `D:\Backup\Documents\finanzas-app\Finance-app`  
**Estado:** MVP funcional en desarrollo; no es todavía un sistema contable/financiero listo para producción.

## Resumen ejecutivo

FinanzasApp es una aplicación Next.js con Supabase que ya permite autenticarse, crear y compartir wallets, registrar ingresos/gastos básicos, consultar tasas BCV/Binance, comparar alternativas de pago y generar un resumen mensual elemental.

El producto tiene una base útil para un MVP, pero todavía existen diferencias importantes entre la intención de una aplicación de finanzas personales y el modelo actual:

- Las wallets son contenedores genéricos; no representan explícitamente cuentas bancarias, Binance, efectivo, terceros, deudas o fondos en custodia.
- Las transacciones soportan `USD`, `VES` y `EUR`, pero los balances y reportes suman los importes sin conversión ni separación por moneda.
- `USDT` no existe como moneda propia; Binance aparece como método de pago.
- No existen presupuestos, metas, deudas, transferencias entre cuentas, conciliación, saldo inicial, saldo histórico ni cierre mensual real.
- Las migraciones SQL están distribuidas en archivos manuales y la base remota debe considerarse una fuente de verdad separada hasta validar qué scripts se ejecutaron.
- El RLS tuvo una recursión entre `wallets` y `wallet_permissions`; actualmente existe una solución basada en funciones `SECURITY DEFINER`, pero debe probarse con una matriz completa de usuarios/roles.
- No hay pruebas automatizadas, tipos generados desde Supabase ni CI.

## Estado del repositorio

### Commits recientes

- `d7ac252` — Update edit wallet functionality.
- `b6e085b` — Fix wallets visibility.
- `0a240f3` — Massive update.
- `25a63a6` — Update wallets permissions access.

### Estado del árbol al auditar

Había cambios locales no confirmados en:

- `PLAN.md`.
- `fix_wallet_visibility.sql`.
- `transactions_categories.sql`.
- `wallet_history.sql`.
- Acciones y páginas de transacciones.
- Páginas de ingresos/gastos/dashboard/wallets.

También existen archivos SQL de diagnóstico y configuración que no equivalen a migraciones formales.

### Verificaciones ejecutadas

Las siguientes verificaciones terminaron correctamente:

```text
npm run lint
npx tsc --noEmit
npm run build
```

El build conserva una advertencia de Next.js: la convención `middleware` está deprecada en favor de `proxy`. No hay tests automatizados configurados.

---

# 1. Resumen de stack y arquitectura

## Frameworks y runtime

- **Runtime:** Node.js.
- **Framework:** Next.js `16.1.4`.
- **Modelo de aplicación:** App Router.
- **UI:** React `19.2.3`.
- **Lenguaje:** TypeScript `5`, con `strict: true`.
- **CSS/UI:** Tailwind CSS `4`, clases utilitarias y componentes propios.
- **Iconos:** `lucide-react`.
- **Scraping HTML:** `cheerio`.
- **Compilación:** Turbopack en desarrollo/build de Next.
- **React Compiler:** habilitado en `next.config.ts`.

## Backend-as-a-Service y acceso a datos

- **BaaS:** Supabase.
- **Base de datos:** PostgreSQL administrado por Supabase.
- **ORM/query builder:** no hay Prisma, Drizzle ni ORM formal; se usa directamente `@supabase/supabase-js`.
- **SSR:** `@supabase/ssr`.
- **Migraciones:** no hay carpeta formal de migraciones versionadas; existen scripts SQL manuales en la raíz.
- **Tipos de base de datos:** no hay tipos generados desde el esquema Supabase. Los modelos se representan mediante interfaces locales y tipos inferidos de consultas.

## Autenticación y sesiones

Implementado:

- Registro con email/contraseña.
- Inicio de sesión con `signInWithPassword`.
- Confirmación de email mediante `/auth/callback`.
- Recuperación de contraseña con `resetPasswordForEmail`.
- Cambio de contraseña en `/auth/reset-password`.
- Cliente browser con `createBrowserClient`.
- Cliente server con cookies mediante `createServerClient`.
- Middleware que refresca/lee la sesión con `supabase.auth.getUser()`.
- Logout desde el Sidebar.

Archivos principales:

- `src/lib/supabase.ts`.
- `src/lib/supabase-browser.ts`.
- `src/middleware.ts`.
- `src/app/login/page.tsx`.
- `src/app/auth/callback/route.ts`.
- `src/app/auth/reset-password/page.tsx`.
- `src/components/LogoutButton.tsx`.

Limitaciones:

- El middleware no implementa una política explícita de redirección para todas las rutas protegidas; las páginas dependen de que sus propias consultas detecten la ausencia de usuario.
- El callback usa un flujo de cookies compatible con el código actual, pero debe probarse específicamente en producción.
- No hay MFA, recuperación de cuenta administrativa, gestión de sesiones activas ni control de dispositivos.

## Estado global y UI

- No hay Zustand, Redux, Context global ni store persistente.
- Estado local con `useState`, `useTransition`, `useEffect` y `useMemo`.
- Datos server-side se refrescan mediante `router.refresh()`.
- Modales y formularios son componentes client.
- Las páginas y layouts principales son server components.
- Los permisos se aplican principalmente en Supabase/RLS y se replican parcialmente en acciones server-side.

## PWA

Existe una base inicial:

- `public/manifest.webmanifest`.
- `public/sw.js`.
- `src/components/PwaRegistration.tsx`.

El service worker se registra solo en producción. No existe todavía una estrategia offline robusta, sincronización offline, iconografía completa ni empaquetado nativo.

---

# 2. Modelo de datos y esquema

## Fuente del esquema actual

La imagen de Supabase incluida en `doc/bd-context/image.png` mostró inicialmente estas tablas:

- `profiles`.
- `wallets`.
- `wallet_permissions`.
- `tags`.
- `exchange_rates`.
- Relación con `auth.users`.

Los scripts del repositorio agregan o modifican:

- `transactions`.
- `wallet_history`.
- `wallets.updated_at`.
- Policies y funciones RLS.

La existencia real de las tablas añadidas debe verificarse en el proyecto Supabase donde se ejecutaron las migraciones.

## `auth.users`

Tabla administrada por Supabase Auth, no por el repositorio.

Campos relevantes usados por la aplicación:

- `id UUID`.
- `email`.
- `raw_user_meta_data`.
- Fechas de creación administradas por Supabase.

Relaciones:

- `profiles.id` representa el mismo usuario.
- `wallets.created_by` referencia conceptualmente al usuario creador.
- `wallet_permissions.user_id` referencia conceptualmente al usuario con acceso.
- `transactions.created_by` referencia `auth.users.id`.
- `wallet_history.changed_by` referencia `auth.users.id`.

## `profiles`

Campos observados en la imagen/esquema:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | Identificador ligado a `auth.users.id`. |
| `email` | `text` | Email sincronizado/visible para búsqueda. |
| `username` | `text` | Identificador amigable de búsqueda. |
| `full_name` | `text` | Nombre mostrado en accesos. |
| `avatar_url` | `text` | Avatar opcional. |
| `updated_at` | `timestamptz` | Actualización del perfil. |

Relaciones:

- Uno a uno lógico con `auth.users`.
- Se consulta para mostrar el nombre/email de usuarios con acceso.

Limitaciones:

- No hay campos de preferencias, zona horaria, moneda base, configuración regional ni estado de cuenta.
- El script `create_profile_trigger.sql` y `add_email_password_to_profiles.sql` implementan triggers alternativos; no deben ejecutarse indistintamente sin revisar el trigger existente.
- La contraseña correctamente permanece en `auth.users`, no en `profiles`.

## `wallets`

Campos observados/agregados:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK de la wallet. |
| `name` | `text` | Nombre visible. |
| `description` | `text` | Descripción opcional. |
| `created_by` | `uuid` | Usuario propietario/creador. |
| `created_at` | `timestamptz` | Fecha de creación. |
| `updated_at` | `timestamptz` | Agregado por `wallet_history.sql`; actualizado por trigger. |

Relaciones:

- Uno a muchos con `wallet_permissions`.
- Uno a muchos con `tags`.
- Uno a muchos con `transactions`.
- Uno a muchos con `wallet_history`.
- `created_by` apunta al usuario de Auth.

Semántica actual:

- Una wallet funciona como un contenedor de movimientos.
- No existe tipo de wallet, institución, moneda principal, cuenta bancaria, dirección de Binance o saldo inicial.
- No existe separación entre fondos propios, fondos de terceros, cuentas por cobrar o fondos en custodia.

## `wallet_permissions`

Campos observados:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK. |
| `wallet_id` | `uuid` | Wallet compartida. |
| `user_id` | `uuid` | Usuario beneficiario. |
| `role` | `text` | `owner`, `editor` o `viewer`. |

Relaciones:

- Muchos permisos pertenecen a una wallet.
- Un usuario puede tener permisos sobre muchas wallets.
- El repositorio agrega un índice único esperado sobre `(wallet_id, user_id)` para soportar `upsert`.

Policies:

- El propietario puede consultar y gestionar permisos.
- El usuario beneficiario puede consultar su propia fila.
- Se usan `SECURITY DEFINER` para evitar la recursión entre `wallets` y `wallet_permissions`.

Riesgo:

- La ejecución de `fix_wallet_visibility.sql` es obligatoria para que las policies actuales coincidan con el código.
- La instancia remota puede conservar policies antiguas si el script no se ejecutó completo.

## `tags`

Campos observados:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK. |
| `wallet_id` | `uuid` | Wallet a la que pertenece el tag. |
| `name` | `text` | Nombre de categoría mostrado por la aplicación. |
| `icon` | `text` | Icono opcional. |
| `color` | `text` | Color opcional. |

La aplicación llama a estos registros “categorías”, pero utiliza la tabla existente `tags`.

Limitaciones:

- No hay jerarquía de categorías.
- No hay categorías globales o por usuario separadas de las de una wallet.
- La UI lista tags, pero la creación/administración completa todavía no está expuesta en una pantalla dedicada.

## `exchange_rates`

Campos observados:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK. |
| `source` | `text` | `BCV`, `Binance` u otros valores de diagnóstico. |
| `usd_bcv` | `numeric` | Tasa USD oficial/BCV. |
| `eur_bcv` | `numeric` | Tasa EUR/BCV. |
| `binance_rate` | `numeric` | Campo existente observado, no es usado consistentemente. |
| `binance_sell_rate` | `numeric` | Venta Binance P2P. |
| `binance_buy_rate` | `numeric` | Compra Binance P2P. |
| `moment` | `text` | Timestamp usado por el endpoint actual. |
| `created_at` | `timestamptz` | Fecha de registro. |

Limitaciones:

- No hay par de divisas explícito, precisión documentada ni fuente normalizada.
- El endpoint no siempre llena todos los campos existentes.
- No hay tabla de snapshots de mercado separada ni control de frescura.
- Binance se modela como tasa VES/USDT implícita, no como una cuenta de saldo USDT.

## `transactions`

Definida en `transactions_categories.sql`.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK. |
| `wallet_id` | `uuid` | FK a `wallets`, `ON DELETE CASCADE`. |
| `created_by` | `uuid` | FK a `auth.users`, usuario que registra el movimiento. |
| `tag_id` | `uuid` | FK a `tags`, `ON DELETE SET NULL`. |
| `type` | `text` | `income` o `expense`. |
| `amount` | `numeric(18,2)` | Importe positivo. |
| `currency` | `text` | `USD`, `VES` o `EUR`. |
| `payment_method` | `text` | `binance`, `bs`, `cash_usd` u `other`. |
| `description` | `text` | Descripción libre. |
| `transaction_date` | `date` | Fecha financiera del movimiento. |
| `comparison_bcv_usd` | `numeric(18,2)` | Valor usado por comparador. |
| `comparison_cash_usd` | `numeric(18,2)` | Alternativa efectivo USD. |
| `comparison_cash_ves` | `numeric(18,2)` | Alternativa efectivo VES. |
| `comparison_binance_rate` | `numeric(18,6)` | Tasa Binance usada por el comparador. |
| `created_at` | `timestamptz` | Fecha técnica de creación. |
| `updated_at` | `timestamptz` | Preparado para futuras ediciones. |

Policies:

- Miembros pueden consultar movimientos de wallets accesibles.
- Propietario/editor pueden insertar, editar y borrar.
- `viewer` queda fuera de inserción/edición/borrado.
- Un trigger impide cambiar `created_by` en una actualización.

Limitaciones críticas:

- No hay transferencias entre wallets.
- No hay `account_id`, institución, contraparte, número de referencia, comprobante o saldo disponible.
- No hay `amount_base_currency` ni tasa histórica normalizada.
- Sumar `USD`, `VES` y `EUR` juntos produce balances económicamente incorrectos.
- El reporte etiqueta importes agregados como USD aunque puedan pertenecer a monedas distintas.

## `wallet_history`

Definida en `wallet_history.sql`.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | PK. |
| `wallet_id` | `uuid nullable` | FK a wallet activa; queda null tras borrar. |
| `wallet_id_at_event` | `uuid` | Identificador preservado para eventos históricos. |
| `changed_by` | `uuid nullable` | Usuario que generó el cambio. |
| `action` | `text` | `created`, `updated`, `deleted`. |
| `old_name` | `text` | Nombre anterior. |
| `old_description` | `text` | Descripción anterior. |
| `new_name` | `text` | Nombre nuevo. |
| `new_description` | `text` | Descripción nueva. |
| `changed_at` | `timestamptz` | Fecha del evento. |

Limitaciones:

- Audita cambios de wallet, no cambios de permisos ni transacciones.
- La visibilidad del historial de wallets borradas debe validarse porque ya no existe la fila padre para aplicar membership RLS.

## Multimoneda y custodia

### Soporte multimoneda actual

Parcial:

- Sí: `USD`, `VES`, `EUR` como strings permitidos en `transactions`.
- Sí: tasas USD/EUR BCV y Binance VES/USDT implícito.
- No: `USDT` como moneda persistida.
- No: conversión histórica por transacción.
- No: moneda base configurable.
- No: precisión/rounding contable centralizado.

### Cuentas propias vs. fondos de terceros

No existe separación nativa. Todas las wallets son del mismo tipo y los permisos representan acceso colaborativo, no propiedad económica de los fondos.

### Categorías, presupuestos y deudas

- Categorías: parcialmente representadas por `tags`.
- Presupuestos: no existen tablas, campos ni acciones.
- Metas: no existen.
- Deudas: no existen.
- Cuentas por cobrar/pagar: no existen.
- Intereses, cuotas, vencimientos y acreedores: no existen.

---

# 3. Funcionalidades y flujos implementados

## Rutas y grado de funcionalidad

| Ruta | Estado | Funcionalidad |
|---|---|---|
| `/` | Maqueta | Sigue siendo la página inicial de Create Next App; no es landing ni redirección al login/dashboard. |
| `/login` | Funcional | Login, registro y recuperación de contraseña. |
| `/auth/callback` | Funcional | Intercambia código por sesión y valida `next` interno. |
| `/auth/reset-password` | Funcional | Formulario de nueva contraseña y validación de sesión de recuperación. |
| `/dashboard` | Funcional parcial | Tasas, balance mensual básico y últimos movimientos. |
| `/dashboard/wallets` | Funcional | Listado, creación, edición, eliminación, accesos rápidos de ingreso/gasto. |
| `/dashboard/wallets/[id]` | Funcional parcial | Detalle, movimientos e historial de wallet; balance limitado a la consulta actual. |
| `/dashboard/income` | Funcional básica | Formulario manual y lista de ingresos. |
| `/dashboard/expenses` | Funcional básica | Formulario manual y lista de gastos. |
| `/dashboard/compare` | Funcional MVP | Comparador y guardado de compra como gasto. |
| `/dashboard/reports` | Funcional básica | Resumen del mes actual por categoría/método. |
| `/dashboard/shared` | No implementada | Enlace visible en Sidebar, no existe página. |
| `/dashboard/settings` | No implementada | Enlace visible en Sidebar, no existe página. |

## Entrada de transacciones

Actualmente es manual:

- Selección de wallet.
- Tipo implícito por página: ingreso/gasto.
- Monto.
- Moneda `USD`, `VES`, `EUR`.
- Fecha.
- Tag/categoría.
- Método de pago.
- Descripción.

También se puede acceder desde una wallet con:

- `/dashboard/income?walletId=...`
- `/dashboard/expenses?walletId=...`

No existe:

- Importación bancaria.
- CSV/OFX.
- OCR.
- Recurrentes.
- Edición/eliminación desde UI.
- Adjuntos/comprobantes.
- Transferencias.

## Conversión de divisas

Existe:

- Scraper HTML del BCV con `https` + `cheerio`.
- Consulta directa a Binance P2P mediante `https.request`.
- Tasas de compra/venta.
- Fallbacks numéricos.
- Comparador de alternativas.

No existe:

- Arbitraje persistido como operación.
- Conversión histórica exacta por fecha.
- Fuente/timestamp guardados para todas las transacciones.
- Control de spread real por operación.
- Comisiones Binance efectivas.
- USDT como moneda contable.

El scraper BCV tiene riesgo de fragilidad por depender de selectores HTML y texto. Usa `rejectUnauthorized: false` y fallbacks hardcodeados.

## Cuentas y balances

La aplicación permite crear wallets múltiples, pero no cuentas financieras especializadas:

- No hay cuenta bancaria en Bs.
- No hay cuenta Binance.
- No hay efectivo.
- No hay billetera digital.
- No hay cuenta de terceros/custodia.
- No hay saldo inicial.
- No hay transferencias.

El balance por wallet se calcula sumando ingresos y restando gastos, pero no normaliza monedas. El dashboard principal calcula un resumen del mes actual con la misma limitación.

## Presupuestos, metas y deudas

No implementados.

---

# 4. Endpoints, APIs y lógica de negocio

## Server Actions de wallets

Archivo: `src/lib/actions/wallets.ts`.

Implementa:

- `listWalletAccess(walletId)`.
- `searchUsersForWalletAccess(walletId, query)`.
- `grantWalletAccess(walletId, targetUserId, role)`.
- `updateWalletAccessRole(walletId, targetUserId, role)`.
- `revokeWalletAccess(walletId, targetUserId)`.
- `createWallet(name, description)`.
- `updateWallet(id, name, description)`.
- `deleteWallet(id)`.

Controles:

- Verifica `auth.getUser()`.
- Valida propietario/rol.
- Usa cliente normal para respetar RLS.
- Usa cliente admin opcional en lógica de eliminación, lo que debe auditarse cuidadosamente.

## Server Actions de transacciones

Archivo: `src/lib/actions/transactions.ts`.

Implementa:

- `listAccessibleWallets()`.
- `listCategories(walletId?)`, leyendo `tags`.
- `createCategory(name, walletId?)`.
- `createTransaction(input)`.
- `listTransactions(type?)`.
- `getMonthlySummary(month)`.

Funciones de cálculo:

- Balance por wallet: ingresos menos gastos, sin conversión monetaria.
- Resumen mensual: ingresos, gastos, balance, gasto por tag y método de pago.
- Comparador: normaliza alternativas a USD/VE cuando se proporcionan tasas, pero bajo supuestos simplificados.

## API routes

### Producto

#### `GET /api/update-rates`

- Requiere usuario autenticado.
- Obtiene BCV y Binance.
- Lee tasas anteriores.
- Inserta dos filas en `exchange_rates`.
- Mutación vía `GET`, lo cual no es ideal semánticamente.
- No usa transacción SQL ni upsert por snapshot.
- Puede insertar valores duplicados cada vez que se presiona el botón.

### Diagnóstico/desarrollo

Bloqueados en producción por `rejectProductionDiagnostics()`:

- `GET /api/check-columns`.
- `GET /api/check-rls`.
- `GET /api/check-schema`.
- `POST /api/debug-delete`.
- `GET /api/debug-wallets`.
- `GET /api/test-env`.
- `GET /api/test-insert`.
- `GET /api/test-rates`.
- `GET /api/test-supabase`.

Riesgos:

- `check-schema` y `test-insert` intentan insertar datos de prueba.
- `check-rls` puede insertar usando service role.
- `debug-delete` intenta borrar permisos y una wallet.
- `debug-wallets` expone información interna al usuario autenticado.
- En desarrollo los endpoints siguen disponibles.

## Integraciones externas

### BCV

- URL: `https://www.bcv.org.ve/`.
- Método: HTTPS + parsing HTML con Cheerio.
- Dependencia de clases/textos del sitio.
- Fallback USD actual: `832.4883`.
- Fallback EUR actual en código: `447.22`.

### Binance P2P

- Endpoint: `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search`.
- Asset: `USDT`.
- Fiat: `VES`.
- Consulta anuncios `SELL` para compra de USDT y `BUY` para venta.
- Selecciona el menor precio de compra y mayor precio de venta.
- Tiene fallback `395.0`/`405.0`, que puede quedar obsoleto.

---

# 5. Gaps técnicos y funcionalidades incompletas

## Gaps de datos y arquitectura

1. **No existe un ledger contable completo.**
   - Falta moneda base, valor equivalente, tasa usada, origen y trazabilidad por movimiento.

2. **No existe el concepto de cuenta.**
   - Wallet no distingue banco, Binance, efectivo, billetera digital, tercero o custodia.

3. **No existen transferencias.**
   - Mover Bs de banco a efectivo o USDT de Binance a otra cuenta no puede modelarse correctamente.

4. **No hay presupuestos ni metas.**

5. **No hay deudas ni obligaciones.**

6. **No existe reconciliación.**
   - No hay saldo esperado vs. saldo real, conciliación bancaria o ajuste controlado.

7. **No existen migraciones formales.**
   - Los scripts pueden ejecutarse en un orden incorrecto.
   - Hay scripts históricos alternativos para perfiles y RLS.
   - No se conoce desde el código si todos fueron aplicados a Supabase.

8. **No hay tipos generados de Supabase.**
   - Los cambios de columnas pueden fallar en runtime sin ser detectados por TypeScript.

## Gaps de producto

- `/dashboard/shared` no existe.
- `/dashboard/settings` no existe.
- La página `/` sigue siendo boilerplate.
- No hay edición/eliminación de transacciones.
- No hay tags administrables desde la UI.
- No hay filtros por wallet/fecha/categoría.
- No hay selector de mes en reportes.
- No hay exportación CSV/PDF.
- No hay gráficos.
- No hay notificaciones reales.
- El botón de campana es visual.
- No hay paginación.
- Las consultas de transacciones están limitadas a 50 en algunos flujos.

## Gaps de conversión y precisión

- El comparador asume que la referencia BCV está en Bs y que Binance equivale a convertir ese valor mediante otra tasa.
- Binance Pay no está integrado como API; se representa conceptualmente con tasa Binance.
- Las comisiones son un porcentaje manual, no una comisión verificada.
- El reporte muestra `USD` incluso cuando los movimientos pueden estar en VES/EUR.
- El balance de wallet también suma importes de distinta moneda.
- No existe rate lock o snapshot completo de la tasa usada.

## Gaps de seguridad

- `createAdminClient()` permite bypass de RLS y es usado en lógica de eliminación; requiere revisión/auditoría específica.
- Los endpoints de diagnóstico, aunque bloqueados en producción por variable de entorno, son sensibles si se habilita un entorno incorrectamente.
- Hay logging de IDs, perfiles y respuestas de usuarios en server actions.
- El scraper usa `rejectUnauthorized: false`.
- No hay límites de rate limiting para actualización de tasas, login ni búsqueda de usuarios.
- No hay políticas documentadas para `profiles`, `tags`, `exchange_rates` y todas las tablas nuevas en un único lugar.
- Las funciones `SECURITY DEFINER` de RLS deberían tener permisos de ejecución explícitos y una política de `search_path` revisada en Supabase.

## Gaps de calidad

- No hay framework de testing configurado.
- No hay tests unitarios del comparador.
- No hay tests de RLS.
- No hay tests de agregaciones mensuales.
- No hay tests de permisos entre dos usuarios.
- No hay CI/CD.
- README conserva el texto de Create Next App y no documenta variables de entorno, migraciones ni despliegue.
- Hay warning de migración futura de `middleware` a `proxy`.

---

# Conclusión para el asistente de arquitectura financiera

La aplicación está en el punto de un MVP de captura y comparación, no en el de una plataforma financiera completa. El siguiente salto arquitectónico no debería ser agregar más pantallas sobre `wallets`, sino introducir un modelo financiero explícito:

1. `accounts` o `financial_accounts` para representar banco, Binance, efectivo, terceros y custodia.
2. `account_balances` o saldo inicial por cuenta.
3. `transactions` con moneda original, moneda base, tasa, fuente, timestamp y tipo de operación.
4. `transfers` para movimientos entre cuentas.
5. `categories`, `budgets`, `budget_periods` y metas.
6. `liabilities`/`debts` para deudas, cuotas, vencimientos y pagos.
7. `exchange_rate_snapshots` para congelar las tasas históricas usadas.
8. Reportes que agreguen por moneda o conviertan a una moneda base, nunca sumando monedas crudas.
9. RLS diseñada alrededor de `account_memberships`, no solo alrededor de wallets.
10. Migraciones formales, tipos generados y pruebas de autorización antes de ampliar la funcionalidad.

## Roadmap técnico recomendado

### Fase A — Consolidación

- Confirmar el esquema real de Supabase.
- Consolidar scripts en migraciones ordenadas.
- Generar tipos Supabase.
- Añadir tests de RLS para propietario/editor/viewer/externo.
- Eliminar endpoints destructivos de diagnóstico.

### Fase B — Modelo financiero

- Introducir cuentas financieras y tipos de cuenta.
- Definir moneda base y reglas de conversión.
- Separar transacción, transferencia y ajuste.
- Agregar saldo inicial y saldo actual por cuenta.

### Fase C — Operación personal

- Categorías/tags administrables.
- Presupuestos mensuales.
- Metas.
- Deudas y obligaciones.
- Recurrentes.
- Filtros y conciliación.

### Fase D — Comparador y reportes

- Guardar snapshots de tasas.
- Comparar costo real por método de pago.
- Reporte mensual multi-moneda.
- Variación contra meses anteriores.
- Exportación y gráficos.

### Fase E — Entrega multiplataforma

- PWA completa.
- Offline limitado para captura.
- Sincronización y conflictos.
- Evaluar empaquetado móvil/escritorio solo después de estabilizar el modelo.
