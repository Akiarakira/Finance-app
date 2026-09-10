# Estado y plan de FinanzasApp

FinanzasApp es una aplicación Next.js + Supabase con autenticación, tasas BCV/Binance y CRUD de wallets con permisos. El objetivo es estabilizar RLS y el código, implementar transacciones/categorías/balances, crear un comparador Binance/Bs, generar estados de cuenta mensuales y preparar una PWA instalable en teléfono y computadora.

## Prioridades

1. Estabilizar RLS, wallets, tipos, lint y rutas de diagnóstico.
2. Implementar transacciones, categorías y cálculo real de balances.
3. Crear `/dashboard/compare` con costo BCV y ambos valores de efectivo/USD, mostrando si conviene Binance/Binance Pay o Bs.
4. Guardar las compras comparadas con sus tasas, fuente, fecha y supuestos.
5. Generar resumen mensual por categorías, wallets, métodos de pago, ingresos, gastos y saldo.
6. Hacer responsive la aplicación y preparar una PWA instalable; evaluar empaquetado nativo después.

## Decisiones confirmadas

- Binance y Binance Pay se tratarán como la misma alternativa; se documentará la tasa aplicada.
- El comparador permitirá ingresar precio en USD y monto equivalente en Bs en efectivo.
- La primera prioridad es RLS y estabilidad antes del comparador.
- Se recomienda usar una PWA como primera estrategia multiplataforma.

## Comparador

La función de cálculo deberá ser pura y testeable, normalizar las alternativas a una misma unidad y mostrar costo Binance/Binance Pay, costo en Bs, costo efectivo/USD, diferencia absoluta, porcentaje, recomendación, tasa, fuente, hora y comisiones/spread aplicados. También deberá validar valores vacíos, cero, negativos y tasas desactualizadas.

## Reporte mensual

Debe incluir total de ingresos y gastos, gasto por categoría/wallet/método de pago, comparación con el mes anterior, compras comparadas, ahorro estimado, saldo inicial/final y exportación futura a CSV/PDF.

## Verificación

- RLS probado con propietario, editor, viewer, usuario ajeno y usuario no autenticado.
- CRUD de wallets y permisos.
- `npm run lint` sin errores.
- `npm run build` exitoso.
- Pruebas unitarias del comparador, validaciones y agregaciones mensuales.
- PWA responsive validada en teléfono y escritorio.
- Rutas de debug y variables de entorno revisadas antes de desplegar.
