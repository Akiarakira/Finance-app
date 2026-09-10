export interface PaymentComparisonInput {
  bcvCostVes: number;
  cashUsdCost?: number;
  cashVesCost?: number;
  bcvRate: number;
  binanceRate: number;
  feePercent?: number;
}

export interface PaymentOption {
  id: 'bcv' | 'binance' | 'cash_usd' | 'cash_ves';
  label: string;
  usdCost: number;
  vesCost: number;
  available: boolean;
}

export interface PaymentComparisonResult {
  options: PaymentOption[];
  recommended: PaymentOption['id'] | 'tie';
  differenceUsd: number;
  differencePercent: number;
  bcvRate: number;
  binanceRate: number;
  feePercent: number;
}

export function comparePaymentOptions(input: PaymentComparisonInput): PaymentComparisonResult {
  const feePercent = input.feePercent ?? 0;
  if (!Number.isFinite(input.bcvCostVes) || input.bcvCostVes <= 0) throw new Error('El costo BCV debe ser mayor que cero.');
  if (!Number.isFinite(input.bcvRate) || input.bcvRate <= 0) throw new Error('La tasa BCV debe ser mayor que cero.');
  if (!Number.isFinite(input.binanceRate) || input.binanceRate <= 0) throw new Error('La tasa Binance debe ser mayor que cero.');
  if (!Number.isFinite(feePercent) || feePercent < 0) throw new Error('La comisión no puede ser negativa.');

  const feeMultiplier = 1 + feePercent / 100;
  const options: PaymentOption[] = [
    {
      id: 'bcv',
      label: 'Pagar en Bs según BCV',
      usdCost: input.bcvCostVes / input.bcvRate,
      vesCost: input.bcvCostVes,
      available: true,
    },
    {
      id: 'binance',
      label: 'Binance / Binance Pay',
      usdCost: (input.bcvCostVes / input.binanceRate) * feeMultiplier,
      vesCost: input.bcvCostVes * feeMultiplier,
      available: true,
    },
    {
      id: 'cash_usd',
      label: 'Efectivo USD',
      usdCost: input.cashUsdCost ?? 0,
      vesCost: (input.cashUsdCost ?? 0) * input.bcvRate,
      available: input.cashUsdCost !== undefined && input.cashUsdCost > 0,
    },
    {
      id: 'cash_ves',
      label: 'Efectivo Bs',
      usdCost: (input.cashVesCost ?? 0) / input.binanceRate,
      vesCost: input.cashVesCost ?? 0,
      available: input.cashVesCost !== undefined && input.cashVesCost > 0,
    },
  ];

  const availableOptions = options.filter((option) => option.available);
  const cheapest = Math.min(...availableOptions.map((option) => option.usdCost));
  const winners = availableOptions.filter((option) => Math.abs(option.usdCost - cheapest) < 0.005);
  const mostExpensive = Math.max(...availableOptions.map((option) => option.usdCost));

  return {
    options,
    recommended: winners.length > 1 ? 'tie' : winners[0].id,
    differenceUsd: Math.max(0, mostExpensive - cheapest),
    differencePercent: cheapest > 0 ? Math.max(0, ((mostExpensive - cheapest) / cheapest) * 100) : 0,
    bcvRate: input.bcvRate,
    binanceRate: input.binanceRate,
    feePercent,
  };
}
