# FinanzasApp — Plan Maestro y TODO List de Implementación

Este documento define la arquitectura, el modelo de datos, la lógica de negocio y las fases de desarrollo paso a paso para transformar FinanzasApp en un sistema de gestión financiera adaptado a la dinámica venezolana: economía bimonetaria, BCV, P2P, presupuesto 50-30-20, dinero en custodia y control de deudas.

> Este es el plan futuro de arquitectura financiera. El estado implementado actualmente está documentado en `APP_CURRENT_STATE.md`.

---

## 1. Arquitectura de Negocio y Reglas Operativas

### A. Moneda y referencia de valoración configurables

- El usuario debe poder escoger la **moneda de valoración** de sus finanzas: `USD` o `USDT`.
- El usuario debe poder escoger la **referencia cambiaria** usada para convertir, comparar y consolidar:
  - `BCV USD`.
  - `Binance/USDT`.
  - `BCV EUR`.
  - Una referencia personalizada, si se habilita explícitamente.
- En el caso operativo actual, la referencia preferida será **USDT/Binance**, porque suele tener un valor superior al USD BCV y al EUR BCV.
- La preferencia debe vivir en una configuración por usuario, no estar hardcodeada en el sistema.
- Cada movimiento debe conservar:
  - moneda original;
  - monto original;
  - moneda de valoración;
  - tasa usada;
  - fuente de la tasa;
  - fecha/hora de la tasa;
  - monto convertido.
- Las fórmulas dependen de la referencia elegida. Ejemplo para una cuenta en VES:

  ```text
  Monto valorado = Monto VES / Tasa seleccionada
  ```

- USD y USDT pueden mantener paridad patrimonial 1:1 para ciertos reportes, pero la aplicación debe conservar la diferencia semántica entre efectivo USD y saldo USDT.
- EUR debe convertirse mediante una tasa explícita; no debe sumarse directamente con USD/USDT.
- No se deben sumar monedas crudas: los reportes consolidados deben usar el monto valorado y mostrar qué referencia se utilizó.

### B. Espacios financieros, privacidad y separación de fondos

La aplicación debe separar **visibilidad**, **propiedad** y **tratamiento financiero**. Compartir una wallet no debe exponer automáticamente todas las cuentas personales del usuario.

#### 1. Fondo Común Hogar

- Debe existir un espacio financiero compartido del hogar, por ejemplo `Hogar`.
- La pareja puede compartir únicamente las cuentas, wallets, categorías y movimientos que pertenezcan a ese espacio.
- Los movimientos pueden ser creados por distintos miembros autorizados y deben conservar `created_by`.
- Las cuentas personales de Andreina y Jesús deben permanecer en espacios personales salvo que se compartan explícitamente.
- No se registran deudas internas entre los miembros de la pareja como pasivos externos.

#### 2. Espacios personales y privacidad

- Cada usuario debe tener un espacio personal privado.
- Una persona puede crear múltiples espacios:
  - Personal.
  - Hogar.
  - Custodia Mami.
  - Otro proyecto o grupo.
- El acceso debe administrarse mediante membresías por espacio y permisos por cuenta/wallet cuando sea necesario.
- El dashboard debe permitir cambiar de espacio y no mezclar saldos personales con el Fondo Común.

#### 3. Fondo Mami — Custodia / Pasivo

- Dinero administrado por un tercero.
- Un depósito de Mami incrementa el fondo de custodia, no los ingresos del hogar.
- Una compra para Mami descuenta:
  - la cuenta bancaria o cuenta de salida;
  - el saldo disponible de Mami;
  - pero no el presupuesto de gastos del hogar.
- Los reportes del hogar deben excluir los gastos asociados a `custody_fund_id`.
- Mami debe poder tener acceso al espacio o wallet de custodia para consultar y administrar sus finanzas, sin recibir acceso a las cuentas personales de la pareja.
- La visibilidad del fondo de Mami debe ser independiente del acceso a las cuentas del hogar.

#### 4. Deudas Externas

- Jhonny ya está saldado y no debe inicializarse como deuda activa por defecto.
- El sistema debe soportar múltiples deudas activas o saldadas con:
  - acreedor;
  - monto inicial;
  - saldo restante;
  - cuotas;
  - frecuencia mensual/quincenal/o seleccionable;
  - fecha de vencimiento;
  - prioridad;
  - historial de pagos;
  - estado y fecha de liquidación.
- Un pago a cualquier acreedor descuenta:
  - la cuenta financiera de salida;
  - el saldo pendiente de esa deuda.
- Los reportes deben mostrar:
  - deuda total;
  - saldo restante;
  - porcentaje pagado;
  - dinero faltante;
  - cuotas restantes;
  - cuota sugerida para cumplir la fecha;
  - proyección de liquidación;
  - alertas de vencimiento.
- Las deudas deben poder pertenecer a un espacio personal, del hogar o de otro grupo.

### C. Ahorros y metas

- Un ahorro no es solo una categoría; puede tener una meta cuantificable.
- Cada meta debe soportar:
  - nombre;
  - monto objetivo;
  - monto acumulado;
  - fecha objetivo opcional;
  - frecuencia de aporte mensual/quincenal/semanal/diaria;
  - aporte sugerido;
  - cuenta o cuentas asociadas;
  - estado activa/completada/pausada.
- La aplicación debe mostrar:
  - porcentaje completado;
  - monto faltante;
  - aporte necesario por periodo;
  - proyección de fecha de cumplimiento;
  - desviación contra el plan;
  - historial de aportes.

### D. Transferencias Internas

- Cambiar USDT de Binance a Bolívares en BNC/Pago Móvil no es ingreso ni gasto.
- Es un movimiento entre cuentas representado por `internal_transfers`.
- Una transferencia debe:
  - disminuir la cuenta origen;
  - aumentar la cuenta destino;
  - guardar importes y monedas de origen/destino;
  - conservar la tasa resultante;
  - no afectar presupuesto ni gasto del hogar.
    (Esto refleja generalmente un incremento al pasar de usdt a bs pero el gasto final ingresado debe ser en la moneda en que se decidio gestionar el presupuesto, en mi caso el usdt)

### E. Ingresos: clasificación fija, variable y mixta

Los ingresos no deben tratarse como un único monto agregado. La app debe distinguir la **estabilidad** de cada ingreso, porque la capacidad de presupuestar, proyectar y comprometer gastos depende de qué tan predecible es el ingreso.

#### 1. Clasificación

- **Fijo:** monto y periodicidad conocidos (salario, pensión, retiro programado). Se puede presupuestar contra él con seguridad.
- **Variable:** monto o fecha irregulares (freelance, comisiones puras, ventas, arbitraje P2P). No debe comprometerse en gastos fijos sin colchón.
- **Mixto:** componente base fijo garantizado más un componente variable (salario + comisiones, sueldo + bonos). Solo el componente fijo cuenta como ingreso garantizado.

#### 2. Reglas operativas

- La clasificación se define a nivel de **fuente de ingreso** (`income_sources`), no solo por movimiento.
- Cada fuente debe soportar:
  - nombre;
  - tipo `fixed | variable | mixed`;
  - monto fijo esperado (obligatorio para fijo y mixto; opcional como estimación para variable);
  - componente variable estimado (solo para mixto);
  - frecuencia de cobro (mensual/quincenal/semanal/irregular);
  - día esperado de cobro;
  - cuenta destino habitual;
  - estado activa/inactiva.
- Las transacciones de tipo ingreso deben poder vincularse a una fuente mediante `income_source_id`.
- En una fuente mixta, el cobro recibido debe poder separarse en parte fija y parte variable: hasta `expected_amount` cuenta como fijo y el excedente como variable, salvo corrección manual.
- La **base del presupuesto 50-30-20** debe ser configurable:
  - solo ingreso fijo garantizado (conservador);
  - ingreso esperado total: fijo + variable estimado;
  - promedio móvil de ingresos reales de los últimos N meses.
- El sistema debe mostrar:
  - ingreso fijo esperado vs. recibido en el periodo (cobros pendientes);
  - desviación de cada cobro contra lo esperado;
  - porcentaje de ingresos fijos vs. variables (índice de estabilidad);
  - proyección conservadora del mes siguiente: fijo + promedio variable.
- El excedente de ingreso variable sobre lo estimado debe sugerirse como candidato a ahorro o pago adelantado de deuda, nunca comprometerse automáticamente.

---

## 2. Esquema de Base de Datos — PostgreSQL / Supabase

### Ruta propuesta de migración

```text
supabase/migrations/20261016_financial_core.sql
```

> El repositorio actual todavía utiliza scripts SQL en la raíz. Antes de aplicar este diseño en producción, migrar los scripts manuales a una secuencia formal y generar tipos desde Supabase.

### Compatibilidad con el esquema actual

El esquema existente tiene:

- `wallets`.
- `wallet_permissions`.
- `profiles`.
- `tags`.
- `exchange_rates`.
- `transactions` con `tag_id`.

La migración propuesta usa `category_id` hacia `budget_categories`. Hay que elegir una estrategia antes de ejecutarla:

1. **Migración progresiva recomendada:** mantener `tag_id` para compatibilidad y añadir `category_id` como categoría presupuestaria.
2. **Renombrado controlado:** migrar `tag_id` a `category_id`, actualizar todas las actions/UI y validar todas las policies.
3. **Separación semántica:** conservar `tags` para etiquetas libres y usar `budget_categories` para categorías contables 50-30-20. Seleccionada esta opción.

La opción 3 es la más flexible para el modelo operativo futuro.

### Cuentas administrables por el usuario

- Las cuentas del seeder son datos iniciales de ejemplo, no un catálogo fijo.
- El usuario debe poder:
  - crear cuentas nuevas;
  - editar nombre, tipo, moneda y espacio;
  - archivar cuentas que ya no utiliza;
  - eliminar cuentas sin movimientos;
  - conservar cuentas históricas con movimientos mediante archivado, no borrado destructivo.
- Una cuenta debe pertenecer a un `financial_space`.
- Una cuenta personal no debe aparecer en el espacio Hogar salvo que el usuario la comparta explícitamente.

### Privacidad y colaboración multiusuario

- El sistema debe ser multiusuario desde el modelo de datos, no solo desde la pantalla de login.
- Un `financial_space` define el límite de visibilidad.
- `financial_space_members` define quién puede ver o modificar el espacio.
- El Fondo Común Hogar debe ser un espacio compartido.
- Las cuentas personales deben pertenecer a espacios personales privados.
- El Fondo Mami puede ser un espacio de custodia compartido con Mami, o una wallet/cuenta con membresía limitada.
- La visibilidad de una transacción debe derivarse del espacio/cuenta, no de compartir todo el usuario.
- El modelo debe permitir que una persona participe en varios espacios sin mezclar sus saldos.

### Script base de migración

```sql
-- 1. ENUMS
CREATE TYPE account_type_enum AS ENUM (
  'binance',
  'bank_ves',
  'mobile_pay_ves',
  'digital_usd',
  'foreign_bank',
  'cash'
);

CREATE TYPE budget_pillar_enum AS ENUM (
  'needs',
  'wants',
  'savings'
);

CREATE TYPE financial_space_type_enum AS ENUM (
  'personal',
  'household',
  'custody',
  'shared'
);

CREATE TYPE debt_frequency_enum AS ENUM (
  'monthly',
  'biweekly',
  'weekly',
  'custom'
);

CREATE TYPE income_type_enum AS ENUM (
  'fixed',
  'variable',
  'mixed'
);

-- 2. ESPACIOS FINANCIEROS Y MEMBRESÍAS
CREATE TABLE IF NOT EXISTS financial_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type financial_space_type_enum NOT NULL DEFAULT 'personal',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- 3. PREFERENCIAS DE VALORACIÓN POR USUARIO/ESPACIO
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE,
  valuation_currency TEXT NOT NULL DEFAULT 'USDT'
    CHECK (valuation_currency IN ('USD', 'USDT')),
  valuation_rate_source TEXT NOT NULL DEFAULT 'binance_usdt'
    CHECK (valuation_rate_source IN ('bcv_usd', 'binance_usdt', 'bcv_eur', 'custom')),
  custom_rate NUMERIC(18, 6),
  timezone TEXT NOT NULL DEFAULT 'America/Caracas',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, space_id)
);

-- 4. CUENTAS FINANCIERAS DINÁMICAS
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type account_type_enum NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD'
    CHECK (currency IN ('USD', 'USDT', 'VES', 'EUR')),
  current_balance NUMERIC(18, 4) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Las cuentas deben poder crearse, editarse, archivarse y eliminarse de forma segura.
-- Una cuenta con movimientos se archiva; una cuenta sin movimientos puede eliminarse.

-- 5. FONDOS DE CUSTODIA
CREATE TABLE IF NOT EXISTS custody_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  beneficiary_name TEXT NOT NULL,
  current_balance_usd NUMERIC(18, 2) DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PASIVOS / DEUDAS EXTERNAS
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  creditor_name TEXT NOT NULL,
  total_initial_amount_usd NUMERIC(18, 2) NOT NULL,
  current_balance_usd NUMERIC(18, 2) NOT NULL,
  monthly_installment_usd NUMERIC(18, 2) DEFAULT 0.0,
  installment_frequency debt_frequency_enum NOT NULL DEFAULT 'monthly',
  installment_amount_usd NUMERIC(18, 2) DEFAULT 0.0,
  due_day_of_month INT,
  priority INT DEFAULT 0,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liability_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID REFERENCES liabilities(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount_usd NUMERIC(18, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRESUPUESTO 50-30-20
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pillar budget_pillar_enum NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE NOT NULL,
  month_year DATE NOT NULL,
  assigned_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month_year)
);

-- 8. METAS DE AHORRO
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount_usd NUMERIC(18, 2) NOT NULL,
  current_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0,
  target_date DATE,
  contribution_frequency debt_frequency_enum,
  proposed_contribution_usd NUMERIC(18, 2) DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount_usd NUMERIC(18, 2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FUENTES DE INGRESO
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  income_type income_type_enum NOT NULL,
  expected_amount_usd NUMERIC(18, 2),
  variable_component_usd NUMERIC(18, 2) DEFAULT 0.0,
  frequency debt_frequency_enum DEFAULT 'monthly',
  pay_day_of_month INT,
  destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- expected_amount_usd es obligatorio por lógica de negocio para 'fixed' y 'mixed';
-- para 'variable' puede usarse como estimación o dejarse NULL.

-- 10. EXTENSIONES DE MOVIMIENTOS EXISTENTES
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES financial_spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custody_fund_id UUID REFERENCES custody_funds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS liability_id UUID REFERENCES liabilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS income_source_id UUID REFERENCES income_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS rate_source TEXT,
  ADD COLUMN IF NOT EXISTS valuation_currency TEXT DEFAULT 'USDT',
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0;

-- 11. TRANSFERENCIAS INTERNAS / P2P
CREATE TABLE IF NOT EXISTS internal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE NOT NULL,
  source_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT NOT NULL,
  destination_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT NOT NULL,
  source_amount NUMERIC(18, 4) NOT NULL,
  source_currency TEXT NOT NULL,
  destination_amount NUMERIC(18, 4) NOT NULL,
  destination_currency TEXT NOT NULL,
  exchange_rate NUMERIC(18, 6),
  transfer_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Recomendaciones antes de ejecutar la migración

- No dejar `amount_usd DEFAULT 0` como solución definitiva para registros existentes.
- Crear una rutina de backfill con la tasa histórica disponible o marcar registros antiguos como pendientes de conversión.
- Agregar `USDT` a la restricción de monedas de `transactions`.
- Mantener `source_currency` y `destination_currency` con una lista controlada o enum.
- Agregar `CHECK` para impedir transferencias a la misma cuenta.
- Agregar índices por `user_id`, `account_id`, `transaction_date`, `currency`, `custody_fund_id` y `liability_id`.
- Definir RLS para todas las tablas nuevas antes de insertar datos.
- Definir triggers consistentes para `updated_at`.

---

## 3. Seeder e inicialización de datos

Crear una función server-side:

```text
seedInitialData(userId)
```

Debe ser idempotente y ejecutarse una sola vez por usuario, usando claves naturales o una tabla `user_setup_state`.

### Cuentas iniciales configurables

Estas cuentas son valores iniciales para la configuración actual, no cuentas obligatorias del sistema. El usuario debe poder agregar, editar, archivar y eliminar las necesarias desde la UI.
-- esto ya no es canon, yo las puedo ir creando testeando o agregar el nuevo estatus actual.

- [ ] Binance Andre — `$169.70 USDT`.
- [ ] Binance Jesus — `$65.00 USDT`.
- [ ] Zinli — `$131.25 USD`.
- [ ] BNC — `7.00 VES`.
- [ ] Bolívares Andreina — `2.00 VES`.
- [ ] Bolívares Jesus — `0.00 VES`.
- [ ] Bank of America — `$0.00 USD`.
- [ ] Efectivo — `$1.00 USD`.

### Custodia

- [ ] Beneficiario: `Mami`.
- [ ] Saldo base: `$24.50 USD`.

### Deudas

- [x] Jhonny está saldado y no debe aparecer como deuda activa por defecto.
- [ ] Si se conserva como registro histórico: acreedor `Jhonny`, saldo inicial `$610.00 USD`, cuota `$102.00 USD`, día `15`, estado `settled`.
- [ ] Permitir crear múltiples deudas con montos, cuotas, frecuencias, prioridades y fechas independientes.

### Categorías Necesidades

- [ ] Comidas — `$86.50`.
- [ ] Medicinas — `$62.00`.
- [ ] Teléfonos — `$2.00`.
- [ ] Psicólogo — `$30.00`.
- [ ] Mascotas — `$19.00`.
- [ ] Pasajes — `$7.00`.
- [ ] Andreina — `$20.00`.
- [ ] Higiene — `$25.00`.
- [ ] Seguro Médico — `$1.30`.
- [ ] Ajuste Jesus — `-$7.00`.

> `assigned_amount_usd` debe aceptar ajustes negativos solo si el modelo de presupuesto lo permite explícitamente. De lo contrario, representar el ajuste como una transferencia o corrección separada.

### Categorías Deseos

- [ ] Cumpleaños / Eventos — asignación con remanente.
- [ ] Deseos generales — `$0.00`.

### Categorías Ahorros

- [ ] Ahorro de Emergencia — `$88.00`.
- [ ] Mascotas Ahorro — `$20.00`.

### Metas de ahorro

- [ ] Meta inicial opcional: `Ahorro de Emergencia`.
- [ ] Monto objetivo configurable por el usuario.
- [ ] Fecha objetivo configurable.
- [ ] Aporte mensual o quincenal sugerido.
- [ ] Historial de aportes.
- [ ] Estadísticas de progreso y monto faltante.

### Fuentes de ingreso

- [ ] `Nómina / Salario` — tipo fijo; monto esperado y día de cobro configurables.
- [ ] `Freelance / Proyectos` — tipo variable; monto esperado opcional.
- [ ] Opcional: fuente mixta de ejemplo `Salario + comisiones`.
- [ ] Todas las fuentes deben poder editarse, pausarse y eliminarse desde la UI.

---

## 4. TODO List de Implementación

## Fase 1 — Base de datos y tipos TypeScript

- [ ] Crear `supabase/migrations/20261016_financial_core.sql`.
- [ ] Convertir los scripts raíz en migraciones ordenadas.
- [ ] Ejecutar la migración en Supabase.
- [ ] Verificar que `accounts`, `custody_funds`, `liabilities`, `budget_categories`, `monthly_budgets` e `internal_transfers` existan.
- [x] Crear `financial_spaces` y `financial_space_members` para separar espacios personales, hogar y custodia.
- [x] Crear `financial_settings` para guardar la moneda de valoración y referencia cambiaria por usuario/espacio.
- [x] Crear `savings_goals` y `savings_contributions`.
- [x] Crear `liability_payments` para el historial de pagos de cada deuda.
- [x] Crear `income_sources` y `income_type_enum` para clasificar ingresos fijos, variables y mixtos.
- [x] Agregar `income_source_id` a `transactions`.
- [ ] Actualizar `src/types/database.ts` con tipos generados o interfaces para:
  - [x] `Account`.
  - [x] `FinancialSpace`.
  - [x] `FinancialSpaceMember`.
  - [ ] `FinancialSettings`.
  - [ ] `CustodyFund`.
  - [ ] `Liability`.
  - [ ] `LiabilityPayment`.
  - [ ] `BudgetCategory`.
  - [ ] `MonthlyBudget`.
  - [ ] `SavingsGoal`.
  - [ ] `SavingsContribution`.
  - [x] `IncomeSource`.
  - [ ] `InternalTransfer`.
  - [x] `Transaction` extendida.
- [x] Mantener `tags` para etiquetas libres y usar `budget_categories` para categorías contables 50-30-20.
- [x] Resolver la compatibilidad entre `transactions.tag_id` y `budget_categories.category_id`.
- [x] Agregar `USDT` como moneda válida.
- [x] Permitir elegir la moneda de valoración `USD` o `USDT`.
- [x] Permitir elegir referencia `BCV USD`, `Binance/USDT`, `BCV EUR` o personalizada.
- [x] Definir preferencias por usuario y por espacio financiero.
- [x] Definir zona horaria oficial para cierres y fechas.
- [x] Crear RLS por espacio, membresía, cuenta y fondo de custodia.
- [x] Crear índices y policies RLS de las tablas nuevas.

## Fase 2 — Seeder e inicialización

- [ ] Crear `seedInitialData(userId)`.
- [ ] Hacer el seeder idempotente.
- [ ] Crear cuentas base.
- [ ] Crear fondo Mami.
- [ ] Crear deuda Jhonny.
- [ ] Crear categorías de Necesidades.
- [ ] Crear categorías de Deseos.
- [ ] Crear categorías de Ahorros.
- [ ] Crear metas de ahorro sin imponer un monto objetivo fijo.
- [ ] Mostrar una pantalla de configuración inicial al usuario nuevo.
- [ ] Preguntar en la configuración inicial si la app se usará en modo personal o con finanzas compartidas del hogar.
- [ ] Si se comparten: crear el espacio Hogar durante el setup y guiar la invitación de miembros.
- [ ] Impedir duplicar cuentas/categorías al repetir el seeder.
- [ ] No crear una deuda activa de Jhonny; conservarla solo como histórico opcional.
- [ ] Permitir editar o descartar los datos iniciales antes de confirmar el setup.

## Fase 3 — Lógica de negocio y Server Actions

### Conversión cambiaria

- [ ] Reestructurar `src/lib/actions/transactions.ts`.
- [ ] Leer la referencia cambiaria seleccionada por el usuario/espacio.
- [ ] Calcular siempre `amount_usd` antes del insert:
  - [ ] `VES`: `monto / usd_bcv`.
  - [ ] `USD`: `monto`.
  - [ ] `USDT`: `monto`.
  - [ ] `EUR`: conversión explícita mediante tasa EUR/USD definida.
- [ ] Calcular también `amount_valuation_currency` según la referencia elegida.
- [ ] Guardar `exchange_rate_used`.
- [ ] Guardar `rate_source`.
- [ ] Guardar `valuation_currency`.
- [ ] Guardar timestamp de la tasa utilizada.
- [ ] Resolver qué ocurre si la tasa del día no está disponible.
- [ ] No usar fallbacks hardcodeados como dato contable sin marcar el registro.

### Saldos de cuentas

- [x] Crear acciones CRUD para cuentas.
- [x] Permitir archivar cuentas con historial.
- [x] Permitir eliminar cuentas que no tengan movimientos.
- [x] Impedir eliminar cuentas usadas por transferencias, transacciones o pagos.
- [ ] Actualizar el saldo `current_balance` de la cuenta de origen al registrar un gasto.
- [ ] Actualizar el saldo de la cuenta de origen al registrar un ingreso.
- [ ] Evitar doble actualización al reintentar una acción.
- [ ] Definir si `current_balance` es cache derivado o fuente de verdad.
- [ ] Crear una rutina de reconciliación entre saldo cacheado y ledger.

### Manejo de custodia

- [x] Si `custody_fund_id` está presente, descontar del balance del fondo.
- [x] Excluir el movimiento de reportes de gastos del hogar.
- [x] Registrar beneficiario y motivo de la operación.
- [ ] Impedir que una compra supere el saldo disponible sin confirmación explícita.

### Manejo de deudas

- [x] Si `liability_id` está presente, descontar `liabilities.current_balance_usd`.
- [x] Crear historial de pagos de deuda.
- [x] Crear acción para registrar pagos parciales o cuotas.
- [ ] Calcular porcentaje pagado, saldo restante y cuotas restantes.
- [ ] Calcular dinero faltante para cubrir la próxima cuota.
- [ ] Calcular cuota sugerida mensual/quincenal para una fecha objetivo.
- [ ] Crear estadísticas de pago y proyección de liquidación.
- [x] Impedir pagos mayores al saldo salvo que sean sobrepagos explícitos.
- [x] Marcar la deuda como liquidada al llegar a cero.
- [x] Mostrar cuota, vencimiento y saldo restante.

### Transferencias internas

- [x] Crear `src/lib/actions/transfers.ts`.
- [x] Implementar `createInternalTransfer`.
- [x] Descontar de la cuenta origen.
- [x] Sumar a la cuenta destino.
- [x] Guardar importes y monedas de ambos lados.
- [x] Guardar tasa resultante.
- [x] Excluir la transferencia de ingresos/gastos.
- [ ] Validar idempotencia.
- [ ] Implementar reversión o corrección controlada.

### Metas de ahorro

- [x] Crear acciones CRUD para metas.
- [x] Registrar aportes vinculados a una cuenta.
- [x] Actualizar progreso y saldo acumulado.
- [x] Calcular monto faltante.
- [x] Calcular aporte recomendado mensual y quincenal.
- [ ] Calcular fecha proyectada de cumplimiento.
- [ ] Mostrar desviación entre ahorro esperado y real.

### Ingresos

- [x] Crear `src/lib/actions/income-sources.ts` con CRUD de fuentes.
- [x] Vincular transacciones de ingreso a `income_source_id`.
- [x] Validar `expected_amount_usd` obligatorio para fuentes fijas y mixtas.
- [x] Separar componente fijo y variable en cobros de fuentes mixtas.
- [x] Calcular ingreso fijo esperado vs. recibido del periodo.
- [x] Calcular promedio móvil de ingresos variables.
- [x] Calcular la base presupuestaria 50-30-20 según la regla elegida por el usuario.
- [x] Alertar cobros de ingreso fijo no recibidos al llegar su fecha esperada.
- [ ] Detectar desviación de un cobro fijo contra su monto esperado.
- [x] Sugerir destino del excedente variable (ahorro o deuda) sin aplicarlo automáticamente.

## Fase 4 — Interfaz de usuario

### Quick Capture

- [ ] Crear formulario de captura rápida global.
- [x] Selector de espacio financiero: Personal, Hogar, Custodia u otro.
- [ ] Campo Cuenta.
- [ ] Campo Monto.
- [ ] Campo Moneda: VES / USD / USDT / EUR.
- [ ] Campo fecha.
- [ ] Campo descripción.
- [ ] Previsualización instantánea en USD para VES.
- [ ] Mostrar tasa BCV utilizada.
- [ ] Mostrar la referencia de valoración activa: BCV, Binance/USDT, EUR o personalizada.
- [ ] Permitir cambiar la referencia de valoración según el espacio, si el usuario tiene permiso.
- [ ] Selector de tipo de operación:
  - [ ] Gasto hogar.
  - [ ] Gasto para Mami.
  - [ ] Pago de deuda.
  - [ ] Ingreso.
- [x] Selector de fuente de ingreso cuando el tipo es ingreso.
- [x] Indicador del tipo de fuente (fijo/variable/mixto) y su monto esperado.
- [ ] Para fuentes mixtas, separación opcional del cobro en parte fija y variable.
- [x] Selección de categoría 50-30-20.
- [ ] Validar cuenta, moneda y destino antes de guardar.

### Transferencia P2P / traspaso

- [ ] Crear modal de transferencia.
- [ ] Cuenta origen.
- [ ] Monto USDT/VES/USD de origen.
- [ ] Cuenta destino.
- [ ] Monto recibido.
- [ ] Tasa resultante.
- [ ] Fecha.
- [ ] Notas.
- [ ] Resumen antes de confirmar.

### Espacios compartidos y privacidad

- [ ] Crear selector de espacio financiero.
- [x] Crear espacio personal por usuario.
- [x] Crear espacio común del hogar.
- [x] Invitar miembros al espacio del hogar.
- [x] Permitir roles owner/admin/editor/viewer.
- [x] Compartir únicamente cuentas/wallets seleccionadas.
- [x] Crear espacio o wallet de custodia para Mami.
- [x] Permitir que Mami administre su espacio sin ver cuentas personales.
- [x] Mostrar claramente qué movimientos son compartidos y cuáles son privados.

### Cuentas financieras

- [x] Vista de cuentas activas.
- [x] Crear cuenta.
- [x] Editar cuenta.
- [x] Archivar cuenta.
- [x] Eliminar cuenta sin movimientos.
- [x] Mostrar saldo por moneda.
- [ ] Mostrar saldo convertido a la referencia elegida.
- [x] Mostrar institución/tipo y espacio al que pertenece.

### Dashboard principal

- [ ] Mostrar referencia cambiaria activa del usuario/espacio.
- [x] Barras de progreso de Necesidades, Deseos y Ahorros.
- [x] Tarjeta independiente `Fondo Mami`.
- [x] Tarjetas para todas las deudas activas.
- [ ] Alerta de próxima quincena/vencimiento.
- [ ] Saldos consolidados por cuenta en USD.
- [ ] Saldos consolidados en la moneda de valoración seleccionada.
- [ ] Separación visual entre hogar, custodia y pasivos.
- [ ] Mostrar calidad/frescura de la tasa usada.
- [x] Tarjeta de ingresos del mes: esperado vs. recibido, % fijo vs. variable.
- [x] Alerta de cobro de ingreso fijo pendiente al llegar su fecha.

### Fuentes de ingreso

- [x] Vista de fuentes activas con su clasificación fijo/variable/mixto.
- [x] Crear fuente: nombre, tipo, monto esperado, componente variable, frecuencia, día de cobro y cuenta destino.
- [x] Editar, pausar y archivar fuentes.
- [x] Mostrar cobrado vs. esperado del periodo por fuente.
- [ ] Mostrar desviación de cada cobro contra lo esperado.
- [x] Configurar la regla de base presupuestaria (solo fijo / esperado / promedio).

### Metas de ahorro

- [x] Vista de metas activas.
- [x] Crear meta.
- [x] Editar meta.
- [x] Pausar/completar meta.
- [x] Registrar aporte.
- [x] Barra de progreso.
- [x] Monto faltante.
- [x] Aporte mensual sugerido.
- [ ] Aporte quincenal sugerido.
- [ ] Fecha proyectada.

### Wallets y movimientos

- [ ] Convertir wallets en cuentas financieras o definir claramente su relación.
- [ ] Agregar tipo de cuenta.
- [ ] Agregar moneda principal.
- [ ] Agregar saldo inicial.
- [ ] Mostrar balance por moneda y balance convertido.
- [ ] Agregar historial de movimientos filtrable.
- [ ] Agregar edición y eliminación de transacciones.
- [ ] Agregar creación/edición de tags.

## Fase 5 — Reportes y control financiero

- [ ] Reemplazar sumas de monedas crudas por agregaciones de `amount_usd`.
- [x] Excluir custodia de reportes del hogar.
- [ ] Separar pagos de deuda de gasto ordinario.
- [ ] Reporte por cuenta.
- [ ] Reporte por espacio financiero.
- [ ] Reporte por categoría/pilar.
- [ ] Reporte por método de pago.
- [ ] Reporte de transferencias internas separado.
- [ ] Reporte de fondos de custodia separado.
- [ ] Reporte de deudas: saldo inicial, pagos, saldo actual, cuotas y proyección.
- [ ] Reporte de metas: progreso, aporte real vs. propuesto y fecha estimada.
- [ ] Reporte de ingresos: fijo vs. variable por periodo, por fuente y desviación contra lo esperado.
- [ ] Índice de estabilidad de ingresos y proyección conservadora del mes siguiente.
- [ ] Comparación contra mes anterior.
- [ ] Estado inicial/final del mes.
- [ ] Flujo de cierre mensual.
- [ ] Exportación CSV.
- [ ] Exportación PDF.
- [ ] Pruebas de conciliación de totales.

## Fase 6 — Robustez y seguridad

- [ ] Reemplazar cliente admin en eliminación por policies/cascadas seguras.
- [ ] Consolidar RLS en migraciones formales.
- [ ] Revisar funciones `SECURITY DEFINER`.
- [ ] Restringir `EXECUTE` de funciones sensibles.
- [ ] Eliminar endpoints destructivos de diagnóstico.
- [ ] Eliminar logs de datos personales.
- [ ] Añadir rate limiting.
- [ ] Validar todas las inputs server-side.
- [ ] Añadir protección de rutas.
- [ ] Validar aislamiento entre espacios personales, hogar y custodia.
- [ ] Validar que compartir una wallet no exponga otras cuentas personales.
- [ ] Validar membresías con dos o más usuarios.
- [ ] Añadir tests RLS.
- [ ] Añadir tests unitarios del comparador.
- [ ] Añadir tests de balances.
- [ ] Añadir CI.
- [ ] Documentar variables de entorno.
- [ ] Actualizar README.

## Fase 7 - PWA y despliegue

- [ ] Validar manifest e iconos.
- [ ] Validar instalación en Android/iOS compatible.
- [ ] Validar instalación en escritorio.
- [ ] Diseñar onboarding para usuarios distintos al caso personal inicial.
- [ ] Permitir configuración inicial de moneda/referencia cambiaria.
- [ ] Permitir configuración de cuentas, espacios, metas y deudas.
- [ ] Definir alcance offline.
- [ ] Implementar cola de sincronización si se necesita.
- [ ] Probar cookies/auth en PWA instalada.
- [ ] Configurar dominio y redirects Supabase de producción.
- [ ] Evaluar Capacitor/Tauri/Electron después de estabilizar la PWA.

## Fase 8 - Escalabilidad multiusuario

- [ ] Separar identidad, espacios, membresías y datos financieros.
- [ ] Eliminar supuestos hardcodeados de Andreina, Jesús, Mami y Jhonny del código de producto.
- [ ] Convertir esos valores en datos iniciales opcionales del onboarding.
- [x] Añadir configuración de moneda de valoración por usuario/espacio.
- [ ] Añadir invitaciones y revocación de miembros.
- [ ] Diseñar límites de acceso por espacio, cuenta, wallet y custodia.
- [ ] Añadir auditoría de cambios financieros.
- [ ] Preparar paginación y consultas por tenant/espacio.
- [ ] Añadir políticas de exportación y eliminación de datos personales.
- [ ] Validar experiencia móvil como prioridad de producto.

---

## 5. Criterios de aceptación del núcleo financiero

- [ ] Un ingreso en VES se convierte a USD usando la tasa BCV del momento.
- [ ] Un usuario puede elegir Binance/USDT como referencia de valoración.
- [ ] Un reporte cambia correctamente cuando el usuario cambia su referencia de valoración.
- [ ] Un ingreso en USD o USDT conserva moneda original y valor USD.
- [ ] Un ingreso puede clasificarse como fijo, variable o mixto a través de su fuente.
- [ ] Un cobro de fuente mixta separa su componente fijo del variable en reportes.
- [x] El presupuesto 50-30-20 puede calcularse solo sobre el ingreso fijo garantizado.
- [ ] El usuario ve el ingreso fijo esperado aún no cobrado en el periodo.
- [ ] El excedente variable se reporta aparte y no se compromete automáticamente.
- [x] Un gasto de hogar afecta presupuesto y cuenta financiera.
- [x] Un depósito de Mami no afecta ingresos ni presupuesto del hogar.
- [x] Una compra de Mami descuenta custodia y cuenta de salida.
- [x] Un pago a cualquier deuda descuenta la deuda y la cuenta de salida.
- [x] Una deuda saldada deja de aparecer como obligación activa.
- [x] Una meta de ahorro muestra monto faltante, progreso y aporte sugerido.
- [x] Una transferencia Binance → BNC no aparece como ingreso ni gasto.
- [ ] Los balances consolidados no suman monedas sin convertir.
- [ ] Una cuenta puede archivarse sin destruir su historial.
- [ ] Una wallet compartida permite colaboración sin exponer cuentas personales.
- [x] Un espacio de custodia puede ser administrado por el beneficiario autorizado.
- [ ] Cada movimiento muestra quién lo registró.
- [ ] Cada movimiento conserva la tasa usada.
- [ ] Un usuario sin membresía no puede leer ni modificar cuentas/movimientos.
- [ ] Editor y viewer tienen permisos distintos y comprobados.
- [ ] Una operación repetida no duplica saldos.
- [ ] Un reporte mensual concilia contra el ledger.
