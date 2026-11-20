'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  upsertFinancialSettings,
  type BudgetBaseRule,
  type FinancialSettings,
  type ValuationCurrency,
  type ValuationRateSource,
} from '@/lib/actions/financial-settings';

const rateSourceLabels: Record<ValuationRateSource, string> = {
  bcv_usd: 'BCV (USD oficial)',
  binance_usdt: 'Binance P2P (USDT)',
  bcv_eur: 'BCV (EUR)',
  custom: 'Tasa personalizada',
};

const budgetRuleLabels: Record<BudgetBaseRule, string> = {
  fixed_only: 'Solo ingreso fijo garantizado',
  expected: 'Fijo esperado + variable esperado del mes',
  average: 'Fijo esperado + promedio variable (3 meses)',
};

export default function FinancialSettingsForm({ settings }: { settings: FinancialSettings }) {
  const [valuationCurrency, setValuationCurrency] = useState<ValuationCurrency>(settings.valuation_currency);
  const [rateSource, setRateSource] = useState<ValuationRateSource>(settings.valuation_rate_source);
  const [customRate, setCustomRate] = useState(settings.custom_rate?.toString() ?? '');
  const [budgetRule, setBudgetRule] = useState<BudgetBaseRule>(settings.budget_base_rule);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertFinancialSettings({
        valuationCurrency,
        valuationRateSource: rateSource,
        customRate: customRate ? Number(customRate) : null,
        budgetBaseRule: budgetRule,
        timezone,
      });
      if (!result.success) {
        setFeedback({ kind: 'error', text: result.error ?? 'No se pudieron guardar las preferencias.' });
        return;
      }
      setFeedback({ kind: 'ok', text: 'Preferencias guardadas.' });
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Preferencias financieras</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Moneda de valoración
          <select value={valuationCurrency} onChange={(event) => setValuationCurrency(event.target.value as ValuationCurrency)} className={inputClass}>
            <option value="USDT">USDT (referencia P2P)</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Referencia cambiaria
          <select value={rateSource} onChange={(event) => setRateSource(event.target.value as ValuationRateSource)} className={inputClass}>
            {Object.entries(rateSourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {rateSource === 'custom' && (
          <label className="text-sm font-medium text-slate-700">
            Tasa personalizada (VES por unidad)
            <input required min="0.000001" step="0.000001" type="number" value={customRate} onChange={(event) => setCustomRate(event.target.value)} className={inputClass} placeholder="Ej. 310.50" />
          </label>
        )}
        <label className="text-sm font-medium text-slate-700">
          Base del presupuesto 50-30-20
          <select value={budgetRule} onChange={(event) => setBudgetRule(event.target.value as BudgetBaseRule)} className={inputClass}>
            {Object.entries(budgetRuleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Zona horaria
          <input required type="text" value={timezone} onChange={(event) => setTimezone(event.target.value)} className={inputClass} placeholder="America/Caracas" />
        </label>
      </div>

      {feedback && (
        <p className={`mt-4 rounded-lg p-3 text-sm ${feedback.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {feedback.text}
        </p>
      )}

      <button type="submit" disabled={isPending} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
        {isPending ? 'Guardando...' : 'Guardar preferencias'}
      </button>
    </form>
  );
}
