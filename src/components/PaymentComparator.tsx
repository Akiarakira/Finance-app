'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTransaction, type WalletOption } from '@/lib/actions/transactions';
import { comparePaymentOptions, type PaymentOption } from '@/lib/compare-payment';

interface PaymentComparatorProps {
  initialBcvRate: number;
  initialBinanceRate: number;
  wallets: WalletOption[];
}

const money = (value: number, currency: 'USD' | 'VES') => new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: currency === 'VES' ? 'VES' : 'USD',
  maximumFractionDigits: 2,
}).format(value);

export default function PaymentComparator({ initialBcvRate, initialBinanceRate, wallets }: PaymentComparatorProps) {
  const [bcvCostVes, setBcvCostVes] = useState('');
  const [cashUsdCost, setCashUsdCost] = useState('');
  const [cashVesCost, setCashVesCost] = useState('');
  const [bcvRate, setBcvRate] = useState(String(initialBcvRate || ''));
  const [binanceRate, setBinanceRate] = useState(String(initialBinanceRate || ''));
  const [feePercent, setFeePercent] = useState('0');
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [selectedOptionId, setSelectedOptionId] = useState<PaymentOption['id']>('binance');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  const { comparison, error } = useMemo(() => {
    if (!bcvCostVes || !bcvRate || !binanceRate) return { comparison: null, error: null };
    try {
      return {
        comparison: comparePaymentOptions({
          bcvCostVes: Number(bcvCostVes),
          cashUsdCost: cashUsdCost ? Number(cashUsdCost) : undefined,
          cashVesCost: cashVesCost ? Number(cashVesCost) : undefined,
          bcvRate: Number(bcvRate),
          binanceRate: Number(binanceRate),
          feePercent: Number(feePercent || 0),
        }),
        error: null,
      };
    } catch (comparisonError) {
      return {
        comparison: null,
        error: comparisonError instanceof Error ? comparisonError.message : 'No se pudo calcular la comparación.',
      };
    }
  }, [bcvCostVes, cashUsdCost, cashVesCost, bcvRate, binanceRate, feePercent]);

  const handleSaveComparison = () => {
    if (!comparison || !walletId) return;
    const option = comparison.options.find((candidate) => candidate.id === selectedOptionId);
    if (!option) return;

    startSaving(async () => {
      const paymentMethod = option.id === 'binance' ? 'binance' : option.id === 'cash_usd' ? 'cash_usd' : 'bs';
      const currency = paymentMethod === 'cash_usd' || paymentMethod === 'binance' ? 'USD' : 'VES';
      const result = await createTransaction({
        walletId,
        type: 'expense',
        amount: currency === 'USD' ? option.usdCost : option.vesCost,
        currency,
        paymentMethod,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `Compra comparada: ${option.label}`,
        comparisonBcvUsd: Number(bcvCostVes) / Number(bcvRate),
        comparisonCashUsd: cashUsdCost ? Number(cashUsdCost) : null,
        comparisonCashVes: cashVesCost ? Number(cashVesCost) : null,
        comparisonBinanceRate: Number(binanceRate),
      });

      setSaveMessage(result.success ? 'Compra guardada como gasto.' : result.error ?? 'No se pudo guardar la compra.');
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Datos de la compra</h2>
        <p className="mt-1 text-sm text-slate-500">Ingresa el precio de referencia y las alternativas que te ofrecen.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Costo según BCV (Bs)
            <input type="number" min="0.01" step="0.01" value={bcvCostVes} onChange={(event) => setBcvCostVes(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" placeholder="Ej. 1000" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Costo en efectivo (USD)
            <input type="number" min="0" step="0.01" value={cashUsdCost} onChange={(event) => setCashUsdCost(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" placeholder="Opcional" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Costo en efectivo (Bs)
            <input type="number" min="0" step="0.01" value={cashVesCost} onChange={(event) => setCashVesCost(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" placeholder="Opcional" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tasa BCV (Bs/USD)
            <input type="number" min="0.01" step="0.0001" value={bcvRate} onChange={(event) => setBcvRate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tasa Binance (Bs/USDT)
            <input type="number" min="0.01" step="0.0001" value={binanceRate} onChange={(event) => setBinanceRate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Comisión Binance (%)
            <input type="number" min="0" step="0.01" value={feePercent} onChange={(event) => setFeePercent(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800" />
          </label>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {comparison && (
        <section className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-medium text-blue-700">Recomendación</p>
            <h2 className="mt-1 text-2xl font-bold text-blue-950">
              {comparison.recommended === 'tie' ? 'La diferencia es mínima' : comparison.options.find((option) => option.id === comparison.recommended)?.label}
            </h2>
            <p className="mt-2 text-sm text-blue-800">
              Diferencia máxima entre alternativas: {money(comparison.differenceUsd, 'USD')} ({comparison.differencePercent.toFixed(2)}%).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {comparison.options.filter((option) => option.available).map((option) => (
              <div key={option.id} className={`rounded-xl border p-5 ${option.id === comparison.recommended ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">{option.label}</h3>
                  {option.id === comparison.recommended && <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">Conviene</span>}
                </div>
                <p className="mt-4 text-2xl font-bold text-slate-900">{money(option.usdCost, 'USD')}</p>
                <p className="mt-1 text-sm text-slate-500">Equivalente: {money(option.vesCost, 'VES')}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-800">Guardar compra realizada</h3>
            <p className="mt-1 text-sm text-slate-500">Selecciona la wallet y la alternativa que finalmente usaste.</p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <select value={walletId} onChange={(event) => setWalletId(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800">
                {wallets.length === 0 && <option value="">No hay wallets disponibles</option>}
                {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
              </select>
              <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value as PaymentOption['id'])} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-800">
                {comparison.options.filter((option) => option.available).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <button type="button" onClick={handleSaveComparison} disabled={isSaving || !walletId} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-60">
                {isSaving ? 'Guardando...' : 'Guardar como gasto'}
              </button>
            </div>
            {saveMessage && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{saveMessage}</p>}
          </div>
          <p className="text-xs text-slate-500">Cálculo basado en tasa BCV {comparison.bcvRate.toFixed(4)}, Binance {comparison.binanceRate.toFixed(4)} y comisión Binance de {comparison.feePercent.toFixed(2)}%.</p>
        </section>
      )}
    </div>
  );
}
