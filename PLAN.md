# Estado y plan de FinanzasApp

FinanzasApp es una aplicación Next.js + Supabase con autenticación, tasas BCV/Binance, CRUD de wallets con permisos, movimientos financieros, comparador de pagos, resumen mensual y base inicial para PWA.

**Estado actualizado:** 2026-10-01  
**Leyenda:** `[x] Listo` · `[~] Parcial / requiere validación` · `[ ] Pendiente`

## Resumen de avance

- **Listo:** autenticación, recuperación de contraseña, wallets, permisos, corrección de RLS recursivo, actualización de tasas, comparador, movimientos, resumen mensual básico, navegación y verificación técnica.
- **Parcial:** migraciones SQL deben ejecutarse/verificarse en Supabase; reporte mensual todavía no tiene todos los filtros/exportaciones; PWA tiene una base inicial.
- **Pendiente:** pruebas automatizadas, validación completa de roles, normalización histórica de monedas, exportación de reportes y empaquetado nativo.

## Prioridades

1. `[~]` Estabilizar RLS, wallets, tipos, lint y rutas de diagnóstico.
2. `[~]` Implementar transacciones, categorías y cálculo real de balances.
3. `[x]` Crear `/dashboard/compare` con costo BCV y valores de efectivo/USD, mostrando si conviene Binance/Binance Pay o Bs.
4. `[x]` Guardar compras comparadas con sus tasas, fuente, fecha y supuestos.
5. `[~]` Generar resumen mensual por categorías, wallets, métodos de pago, ingresos, gastos y saldo.
6. `[~]` Hacer responsive la aplicación y preparar una PWA instalable; evaluar empaquetado nativo después.

## Funcionalidades implementadas

### Autenticación

- `[x]` Registro e inicio de sesión con Supabase.
- `[x]` Confirmación de correo mediante callback.
- `[x]` Recuperación de contraseña por correo.
- `[x]` Formulario para establecer una nueva contraseña.
- `[x]` Redirección segura del callback.

Archivos principales:

- `src/app/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/auth/reset-password/page.tsx`

### Wallets y permisos

- `[x]` Crear wallets.
- `[x]` Editar wallets.
- `[x]` Eliminar wallets.
- `[x]` Listar wallets propias y compartidas.
- `[x]` Gestionar permisos `owner`, `editor` y `viewer`.
- `[x]` Buscar usuarios por email, nombre o username.
- `[x]` Mostrar nombre, username o email como fallback en accesos.
- `[x]` Mostrar el usuario autenticado en el dashboard.
- `[x]` Registrar `updated_at` e historial mediante `wallet_history.sql`.
- `[x]` Evitar recursión RLS mediante funciones `SECURITY DEFINER`.
- `[~]` Validar manualmente todas las combinaciones de permisos con varios usuarios.

Migraciones/policies relacionadas:

- `fix_wallet_visibility.sql` — corregir recursión RLS de `wallets` y `wallet_permissions`.
- `wallet_history.sql` — `updated_at`, triggers e historial de cambios.
- `transactions_categories.sql` — movimientos y tags.

**Acción pendiente en Supabase:** ejecutar y validar las migraciones SQL en el proyecto remoto.

### Tasas

- `[x]` Obtener tasas BCV y Binance P2P.
- `[x]` Guardar tasas en `exchange_rates`.
- `[x]` Botón para actualizar tasas desde el dashboard.
- `[x]` Tooltip temporal después de actualizar.
- `[x]` Corregir el rango del scraper para aceptar la tasa BCV actual aproximada de `832.4883`.
- `[x]` Proteger el endpoint de actualización para usuarios autenticados.

Archivos principales:

- `src/lib/bcv-scraper.ts`
- `src/lib/binance-p2p-service.ts`
- `src/app/api/update-rates/route.ts`
- `src/components/RefreshRatesButton.tsx`

### Movimientos, tags y balances

- `[x]` Crear migración para `transactions`.
- `[x]` Usar la tabla existente `tags` como categorías.
- `[x]` Crear acciones servidoras para listar wallets, tags, movimientos y resúmenes.
- `[x]` Registrar ingresos y gastos.
- `[x]` Asociar método de pago: Binance, Bs, efectivo USD u otro.
- `[x]` Mostrar movimientos recientes en dashboard, ingresos, gastos y detalle de wallet.
- `[~]` El balance actual es funcional para la primera versión, pero debe normalizar correctamente transacciones en USD, VES y EUR.
- `[ ]` Agregar edición y eliminación de transacciones desde la interfaz.
- `[ ]` Agregar creación y administración de tags desde la interfaz.

Rutas implementadas:

- `/dashboard/income`
- `/dashboard/expenses`
- `/dashboard/wallets/[id]`

### Comparador de pagos

- `[x]` Ruta `/dashboard/compare`.
- `[x]` Input de costo según BCV en Bs.
- `[x]` Input de costo en efectivo USD.
- `[x]` Input de costo en efectivo Bs.
- `[x]` Tasa BCV editable.
- `[x]` Tasa Binance editable.
- `[x]` Comisión Binance opcional.
- `[x]` Comparación Binance/Binance Pay, Bs y efectivo.
- `[x]` Diferencia absoluta y porcentual.
- `[x]` Recomendación de alternativa más conveniente.
- `[x]` Guardar alternativa elegida como gasto.
- `[x]` Conservar tasas y valores usados en la transacción.
- `[~]` Agregar pruebas automatizadas para casos límite y tasas desactualizadas.
- `[ ]` Agregar indicador explícito de fuente y fecha de cada tasa en la interfaz.

Lógica principal:

- `src/lib/compare-payment.ts`
- `src/components/PaymentComparator.tsx`

### Estado de cuenta

- `[x]` Ruta `/dashboard/reports`.
- `[x]` Total mensual de ingresos.
- `[x]` Total mensual de gastos.
- `[x]` Balance mensual.
- `[x]` Gastos por tag/categoría.
- `[x]` Gastos por método de pago.
- `[x]` Enlace al comparador.
- `[ ]` Selector de mes.
- `[ ]` Comparación con el mes anterior.
- `[ ]` Distribución completa por wallet.
- `[ ]` Saldo inicial y saldo final históricos.
- `[ ]` Exportación CSV/PDF.
- `[ ]` Gráficos y métricas de ahorro.

### Instalación y PWA

- `[x]` Manifest web.
- `[x]` Registro de service worker en producción.
- `[x]` Service worker inicial.
- `[~]` Dashboard y formularios con responsive inicial.
- `[ ]` Validación formal de instalación en teléfono.
- `[ ]` Validación formal de instalación en computadora.
- `[ ]` Caché/offline robusto.
- `[ ]` Evaluar empaquetado nativo con Capacitor, Tauri o Electron.

Archivos principales:

- `public/manifest.webmanifest`
- `public/sw.js`
- `src/components/PwaRegistration.tsx`

## Seguridad y limpieza técnica

- `[x]` Rutas `/api/debug-*`, `/api/check-*` y `/api/test-*` bloqueadas en producción.
- `[x]` Service role key utilizada solamente desde servidor.
- `[x]` Corrección de tipos `any` principales.
- `[x]` `npm run lint` sin errores.
- `[x]` `npx tsc --noEmit` sin errores.
- `[x]` `npm run build` exitoso.
- `[~]` Resolver advertencia futura de Next.js sobre migrar `middleware` a `proxy`.
- `[ ]` Reducir logs de depuración de usuarios y wallets.
- `[ ]` Añadir pruebas automatizadas.

## Verificación

- `[x]` CRUD básico de wallets probado durante el flujo de desarrollo.
- `[~]` RLS probado para propietario; falta matriz completa.
- `[ ]` RLS probado con propietario, editor, viewer, usuario ajeno y usuario no autenticado.
- `[x]` `npm run lint` sin errores.
- `[x]` `npx tsc --noEmit` sin errores.
- `[x]` `npm run build` exitoso.
- `[~]` Comparador verificado manualmente; faltan pruebas automatizadas.
- `[~]` Reporte mensual básico verificado; faltan filtros/exportación.
- `[ ]` PWA validada en teléfono y escritorio.
- `[ ]` Auditoría final de rutas, variables de entorno y policies antes de producción.

## Próximos pasos recomendados

1. `[ ]` Confirmar en Supabase que se ejecutaron `fix_wallet_visibility.sql`, `wallet_history.sql` y `transactions_categories.sql`.
2. `[ ]` Ejecutar pruebas RLS con dos usuarios y los tres roles.
3. `[ ]` Normalizar montos entre USD, VES y EUR usando la tasa histórica de cada movimiento.
4. `[ ]` Agregar edición/eliminación de transacciones y administración de tags.
5. `[ ]` Añadir selector mensual, comparación contra mes anterior y exportación del reporte.
6. `[ ]` Crear pruebas automatizadas para comparador, balances, reportes y permisos.
7. `[ ]` Validar instalación PWA en móvil y escritorio.
