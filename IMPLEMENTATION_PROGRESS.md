# FinanzasApp — Registro de progreso de implementación

> Bitácora de ejecución del `FINANCIAL_CORE_MASTER_PLAN.md`. Actualizar al cerrar cada sesión de trabajo.

---

## Sesión 2026-11-15 — Slice 1: Fuentes de ingreso ✅

### Qué se hizo

**Base de datos (ejecutado en Supabase SQL Editor — confirmado por la usuaria):**
- Script: `supabase/migrations/20261115_01_income_sources.sql`
- Enums `income_type_enum` (`fixed`/`variable`/`mixed`) y `debt_frequency_enum`
- Tabla `income_sources` con CHECK: `expected_amount_usd` obligatorio para `fixed`/`mixed`
- RLS por usuario (4 policies: select/insert/update/delete sobre `auth.uid() = user_id`)
- Función genérica `set_row_updated_at()` + trigger en `income_sources`
- Columna `transactions.income_source_id` con `ON DELETE SET NULL` + índice

**Código:**
- `src/lib/actions/income-sources.ts` — nuevo: CRUD (`list`, `create`, `update`, `setActive`, `delete`) + tipos `IncomeSource`, `IncomeType`, `IncomeFrequency`
- `src/lib/actions/transactions.ts` — `TransactionInput.incomeSourceId`, insert de `income_source_id` (solo si `type === 'income'`), join `income_source:income_sources(name)` en `listTransactions`
- `src/components/IncomeSourcesManager.tsx` — nuevo: formulario de creación + lista con badges de tipo, pausar/activar y eliminar
- `src/components/TransactionForm.tsx` — selector de fuente visible solo en ingresos + hint del monto esperado
- `src/components/TransactionPage.tsx` — renderiza el manager en `/dashboard/income` y muestra `Fuente: X` en movimientos recientes

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅

### Decisiones tomadas

- La clasificación vive en la **fuente** (`income_sources`), no por transacción; la transacción solo guarda `income_source_id`
- `space_id` y `destination_account_id` **se omitieron a propósito** — se agregan con `ALTER` cuando existan `financial_spaces` y `accounts` (no requiere rehacer la tabla)
- RLS simple por usuario por ahora; migra a membresías cuando exista `financial_spaces`
- Eliminar una fuente no borra movimientos históricos (`SET NULL`), solo pierden el vínculo
- Trabajo incremental por slices testeables, migraciones en `supabase/migrations/` pegadas al SQL Editor

### Pendiente de verificación manual (usuaria)

- Crear fuente fija/variable/mixta desde `/dashboard/income` y registrar un ingreso vinculado
- Confirmar que `transactions.income_source_id` queda poblado en Supabase

---

## Sesión 2026-11-18 — Edición de fuentes + Slice 2: Espacios y cuentas ✅ (código)

### Qué se hizo

**Edición de fuentes (commit `75d63b5`):**
- `IncomeSourcesManager` — botón Editar por fila con formulario inline (campos compartidos entre crear/editar), usa `updateIncomeSource` que ya existía

**Migración pendiente de ejecutar (usuaria):**
- Script: `supabase/migrations/20261118_01_financial_spaces_accounts.sql` → pegar en SQL Editor
- Enums `financial_space_type_enum` y `account_type_enum`
- Tablas: `financial_spaces`, `financial_space_members` (roles owner/admin/editor/viewer), `accounts`, `financial_settings`
- Funciones `SECURITY DEFINER` `is_space_member/is_space_editor/is_space_admin` (patrón anti-recursión igual al de wallets)
- RLS en las 4 tablas + policy extra para que miembros vean fuentes de su espacio
- `ALTER income_sources`: `space_id` + `destination_account_id`
- `ALTER transactions`: `account_id` + `space_id` + `USDT` en el CHECK de moneda

**Código:**
- `src/lib/actions/financial-spaces.ts` — nuevo: `listFinancialSpaces` (con rol propio), `getOrCreatePersonalSpace` (idempotente, crea "Personal" + membresía owner), `create`, `update`, `setActive`, `delete` (bloquea si tiene cuentas)
- `src/lib/actions/accounts.ts` — nuevo: `list` (con nombre/tipo del espacio), `create` (con saldo inicial), `update` (puede mover de espacio), `setArchived`, `delete` (bloquea si tiene movimientos o fuentes)
- `src/app/dashboard/accounts/page.tsx` — nueva página; asegura espacio personal y calcula balance = saldo inicial + movimientos por cuenta
- `src/components/SpacesManager.tsx` — nuevo: crear/editar/desactivar/eliminar espacios
- `src/components/AccountsManager.tsx` — nuevo: crear/editar/archivar/eliminar cuentas por espacio
- `income-sources.ts` — `destinationAccountId` en input; guarda `destination_account_id` y deriva `space_id` de la cuenta
- `transactions.ts` — `accountId` en input; sella `account_id` + `space_id` de la cuenta; `USDT` en `Currency`; join `account:accounts(name)`
- `TransactionForm` — selector de cuenta (ambos tipos) + opción USDT
- `TransactionPage` — pasa cuentas al form y al manager; muestra `Cuenta: X`
- `IncomeSourcesManager` — selector "Cuenta destino" en crear/editar; muestra `Destino: X`
- `Sidebar` — entrada "Cuentas" → `/dashboard/accounts`

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅

### Decisiones tomadas

- `current_balance` en `accounts` guarda el **saldo inicial declarado**; el balance mostrado = inicial + Σ movimientos vinculados (mismo cálculo que wallets). La actualización automática de saldos queda para Fase 3
- Una fuente con cuenta destino hereda el `space_id` de esa cuenta; sin cuenta queda `NULL` (personal)
- Borrar espacio bloqueado si tiene cuentas; borrar cuenta bloqueado si tiene movimientos/fuentes (usar archivar)
- Transactions siguen viviendo en wallets; `account_id`/`space_id` son opcionales y no cambian la visibilidad actual
- Membresías (invitar miembros) quedan para un slice posterior; hoy el creador es owner automático
- `financial_settings` ya tiene tabla+RLS pero sin actions/UI (slice de valoración)

### Pendiente de verificación manual (usuaria)

- Ejecutar `20261118_01_financial_spaces_accounts.sql` en Supabase — **CONFIRMADO por la usuaria** (migración corrió; el error inicial era solo la caché de schema de PostgREST)
- Entrar a `/dashboard/accounts`: debe auto-crearse el espacio "Personal"
- Crear cuenta (ej. Binance USDT), registrar ingreso/gasto con esa cuenta y verificar `account_id`/`space_id` en Supabase
- Crear fuente con cuenta destino y confirmar `space_id` heredado
- Cuando se confirme, marcar checkboxes de Fase 1/4 en el plan maestro

---

## Sesión 2026-11-18 (cont.) — Slice 3: Lógica de ingresos ✅

### Qué se hizo

**Código:**
- `src/lib/actions/income-summary.ts` — nuevo: `getIncomePeriodSummary(month)` calcula por fuente y por periodo: esperado (× períodos según frecuencia: mensual 1, quincenal 2, semanal 4, otra 1), recibido, split fijo/variable (hasta `expected` cuenta fijo, excedente variable), pendiente, estado cobrado/parcial/pendiente; más totales del mes, % estabilidad, promedio móvil variable de 3 meses, base 50-30-20 sugerida (fijo esperado + promedio variable) y excedente variable
- `src/app/dashboard/page.tsx` — nueva tarjeta "Ingresos del mes": barra fijo recibido vs. esperado, % fijo/variable, base 50-30-20, alerta de cobros pendientes, sugerencia de excedente y aviso de ingresos sin fuente
- `TransactionPage` — pasa `stats` por fuente al manager
- `IncomeSourcesManager` — badge de estado (Cobrado/Parcial/Pendiente) + línea "Cobrado $X de $Y" por fuente

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅

### Decisiones tomadas

- Conversión provisional a USD con la última tasa BCV (`usd_bcv`; EUR vía `eur_bcv/usd_bcv`; USDT/USD 1:1) hasta que exista `financial_settings` con la referencia elegida
- Regla de split uniforme: en cualquier fuente no-variable, lo recibido hasta `expected` es fijo y el excedente es variable
- `budgetBase` = fijo esperado + promedio variable 3m (la regla configurable por usuario queda para `financial_settings`)
- Alerta de cobro pendiente respeta `pay_day_of_month`: solo se muestra cuando el día ya pasó (meses pasados siempre alertan)
- Agregada al plan: pregunta de onboarding "¿modo personal o finanzas compartidas del hogar?" con creación del espacio Hogar si aplica

### Pendiente

- Cobros de fuentes `custom` cuentan como 1× esperado al mes (simplificación documentada)
- Desviación por cobro individual (hoy es agregada por fuente al mes)
- Regla de base presupuestaria configurable (requiere UI de `financial_settings`)

---

## Sesión 2026-11-18 (cont. 2) — Slice 4: Membresías de espacio ✅

### Qué se hizo

**Código:**
- `financial-spaces.ts` — nuevas acciones: `listSpaceMembers`, `searchUsersForSpaceAccess` (búsqueda en profiles excluyendo miembros), `addSpaceMember` (upsert, roles admin/editor/viewer), `updateSpaceMemberRole` (bloquea tocar al owner), `removeSpaceMember` (admin o salida propia); helper `getMySpaceRole` (miembro o dueño del espacio)
- `src/components/SpaceMembersPanel.tsx` — nuevo: lista de miembros con rol, búsqueda+agregar con rol elegido, cambio de rol, quitar; `canManage` = owner/admin
- `SpacesManager` — botón "Miembros" por espacio que expande el panel (carga lazy)

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅ · sin migración nueva (RLS ya existía desde `20261118_01`)

### Decisiones tomadas

- El rol `owner` no se asigna por invitación; solo el creador del espacio lo tiene
- Miembros con cualquier rol pueden ver la lista; solo owner/admin gestionan
- Un miembro puede salir de un espacio por sí mismo (RLS delete permite `user_id = auth.uid()`)

### Pendiente de verificación manual (usuaria)

- Crear espacio "Hogar", invitar al otro usuario por email/username y confirmar que ve el espacio y sus cuentas
- Confirmar que un `viewer` no puede crear cuentas ni invitar (RLS editor+)

## Sesión 2026-11-18 (cont. 3) — Slice 5: Custodia (Fondo Mami) ✅

### Qué se hizo

**DB (pendiente ejecutar):** `supabase/migrations/20261118_02_custody_funds.sql` — tabla `custody_funds` (espacio requerido, beneficiario, saldo inicial, notas), RLS por membresía del espacio (mismo patrón que accounts), `transactions.custody_fund_id` + índice.

**Código:**
- `src/lib/actions/custody-funds.ts` — nuevo: list/create/update/delete (delete con guardia de movimientos); join del nombre del espacio
- `transactions.ts` — `custodyFundId` en input (valida fondo, hereda su `space_id` si no hay cuenta), `custody_fund_name` en listado, `getMonthlySummary` excluye movimientos de custodia
- `income-summary.ts` — depósitos a custodia excluidos del resumen de ingresos
- `src/components/CustodyFundsManager.tsx` — nuevo: crear (espacio, beneficiario, saldo inicial, notas), editar, eliminar; saldo = inicial + depósitos − compras
- `/dashboard/accounts` — sección "Fondos de custodia" con saldos calculados
- `TransactionForm` — selector "Fondo de custodia" para ingreso (depósito) y gasto (compra), con aviso de que no cuenta para el hogar
- `TransactionPage` — "Custodia: X" en movimientos
- Dashboard — tarjeta "Fondos de custodia" con saldo por fondo

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅

### Decisiones tomadas

- Saldo del fondo = `current_balance_usd` (inicial) + ingresos vinculados − gastos vinculados (mismo patrón computado que cuentas/wallets)
- La cuenta de salida (si se elige) también descuenta su saldo — la compra "descuenta custodia y cuenta de salida" como pide el plan
- Un movimiento de custodia puede llevar `account_id`; el `space_id` es el de la cuenta si existe, si no el del fondo
- NO se impide compra > saldo disponible (queda como pendiente del plan con confirmación explícita)

### Pendiente de verificación manual (usuaria)

- Ejecutar `supabase/migrations/20261118_02_custody_funds.sql` en SQL Editor
- Crear espacio tipo `custody` "Custodia Mami" → crear fondo "Mami"
- Registrar un ingreso con "Depósito a Mami" → verificar que NO suma a ingresos del hogar pero SÍ sube el saldo del fondo
- Registrar gasto "Compra para Mami" con cuenta de salida → verifica que baja cuenta y fondo, y no aparece en gastos del resumen mensual
- Invitar a Mami como admin del espacio custodia → ella administra sin ver cuentas personales

## Sesión 2026-11-18 (cont. 4) — Slice 6: Deudas externas ✅

### Qué se hizo

**DB (pendiente ejecutar):** `supabase/migrations/20261118_03_liabilities.sql` — tablas `liabilities` (espacio requerido, acreedor, monto total, cuota+frecuencia, día de vencimiento, prioridad, `is_settled`/`settled_at`) y `liability_payments` (deuda, cuenta opcional, transaction_id, monto, fecha), `transactions.liability_id`, RLS por membresía del espacio.

**Código:**
- `src/lib/actions/liabilities.ts` — nuevo: list/create/update/delete (guardia de pagos), `recordLiabilityPayment` (crea movimiento expense con `liability_id` + `account_id` opcional, inserta pago, descuenta `current_balance_usd`, marca `is_settled` al llegar a cero, rechaza pago > saldo), `listLiabilityPayments`
- `src/app/dashboard/debts/page.tsx` + `DebtsManager` — crear, editar, barra de progreso, "Pagar" (wallet de salida requerida + cuenta opcional + monto sugerido = cuota o saldo), historial lazy, eliminar
- Sidebar — entrada "Deudas"
- Dashboard — tarjeta "Deudas activas" con saldo restante + % pagado

**Verificado:** `npx tsc --noEmit` ✅ · `npm run lint` ✅

### Decisiones tomadas

- El pago requiere **wallet de salida** (transactions.wallet_id es NOT NULL y la RLS es por wallet); `account_id` es vinculación opcional para descontar también la cuenta
- Los pagos de deuda cuentan como `expense` en el resumen mensual (la separación "deuda vs. gasto ordinario" queda para Fase 5, el `liability_id` ya lo permite)
- No hay confirmación de sobrepago: el servidor rechaza pago > saldo directamente

### Pendiente de verificación manual (usuaria)

- Ejecutar `supabase/migrations/20261118_03_liabilities.sql` en SQL Editor
- Crear deuda en `/dashboard/debts` → registrar pago → verificar que descuenta saldo, aparece en gastos y en historial
- Pagar hasta agotar → verificar badge "Saldada" y que desaparece del dashboard

## Próximos pasos (en orden sugerido)

1. **Selector de espacio** en dashboard/transacciones + definir relación wallets↔espacios/cuentas
2. **`financial_settings` UI** — moneda de valoración + referencia cambiaria + regla de base presupuestaria
3. **Indicador compartido/privado** en movimientos (plan Fase 4)
4. **Presupuesto 50-30-20** — `budget_categories` + `monthly_budgets`

## Cómo retomar mañana

```bash
cd "D:\Backup\Documents\finanzas-app\Finance-app"
npm run dev   # http://localhost:3000
```

- Roadmap con checkboxes actualizados: `FINANCIAL_CORE_MASTER_PLAN.md`
- Último slice: espacios + cuentas en `/dashboard/accounts` (requiere ejecutar migración `20261118_01`)
- Para nuevos slices: crear script en `supabase/migrations/` → pegar en SQL Editor → implementar actions/UI → `npx tsc --noEmit && npm run lint`
