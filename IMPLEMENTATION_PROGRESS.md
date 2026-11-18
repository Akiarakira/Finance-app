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

- Ejecutar `20261118_01_financial_spaces_accounts.sql` en Supabase
- Entrar a `/dashboard/accounts`: debe auto-crearse el espacio "Personal"
- Crear cuenta (ej. Binance USDT), registrar ingreso/gasto con esa cuenta y verificar `account_id`/`space_id` en Supabase
- Crear fuente con cuenta destino y confirmar `space_id` heredado
- Cuando se confirme, marcar checkboxes de Fase 1/4 en el plan maestro

## Próximos pasos (en orden sugerido)

1. **Ejecutar migración `20261118_01`** en Supabase y probar `/dashboard/accounts` (pendiente verificación manual)
2. **Lógica de ingresos** — cobrado vs. esperado del periodo, split fijo/variable en mixtas, promedio móvil
3. **Dashboard** — tarjeta de ingresos del mes (esperado vs. recibido, % fijo/variable) + alerta de cobro pendiente
4. **Membresías de espacio** — invitar miembros al Hogar/Custodia con roles (`financial_space_members` ya tiene RLS)
5. **Selector de espacio** en dashboard/transacciones + migración de wallets a espacios/cuentas

## Cómo retomar mañana

```bash
cd "D:\Backup\Documents\finanzas-app\Finance-app"
npm run dev   # http://localhost:3000
```

- Roadmap con checkboxes actualizados: `FINANCIAL_CORE_MASTER_PLAN.md`
- Último slice: espacios + cuentas en `/dashboard/accounts` (requiere ejecutar migración `20261118_01`)
- Para nuevos slices: crear script en `supabase/migrations/` → pegar en SQL Editor → implementar actions/UI → `npx tsc --noEmit && npm run lint`
