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

## Próximos pasos (en orden sugerido)

1. **Editar fuente** — `updateIncomeSource` existe pero no hay UI de edición (solo crear/pausar/eliminar)
2. **Slice `financial_spaces` + `accounts`** — base estructural: todo lo demás (custodia, deudas, presupuesto por espacio) depende de estas tablas. Después, `ALTER income_sources` para agregar `space_id` + `destination_account_id`
3. **Lógica de ingresos** — cobrado vs. esperado del periodo, split fijo/variable en mixtas, promedio móvil
4. **Dashboard** — tarjeta de ingresos del mes (esperado vs. recibido, % fijo/variable) + alerta de cobro pendiente

## Cómo retomar mañana

```bash
cd "D:\Backup\Documents\finanzas-app\Finance-app"
npm run dev   # http://localhost:3000
```

- Roadmap con checkboxes actualizados: `FINANCIAL_CORE_MASTER_PLAN.md`
- Último slice: fuentes de ingreso funcionales en `/dashboard/income`
- Para nuevos slices: crear script en `supabase/migrations/` → pegar en SQL Editor → implementar actions/UI → `npx tsc --noEmit && npm run lint`
