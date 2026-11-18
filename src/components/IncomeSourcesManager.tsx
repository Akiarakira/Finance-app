'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createIncomeSource,
  deleteIncomeSource,
  setIncomeSourceActive,
  type IncomeFrequency,
  type IncomeSource,
  type IncomeType,
} from '@/lib/actions/income-sources';

const typeLabels: Record<IncomeType, string> = {
  fixed: 'Fijo',
  variable: 'Variable',
  mixed: 'Mixto',
};

const frequencyLabels: Record<IncomeFrequency, string> = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
  weekly: 'Semanal',
  custom: 'Otra',
};

const typeBadgeStyles: Record<IncomeType, string> = {
  fixed: 'bg-green-100 text-green-700',
  variable: 'bg-amber-100 text-amber-700',
  mixed: 'bg-sky-100 text-sky-700',
};

export default function IncomeSourcesManager({ sources }: { sources: IncomeSource[] }) {
  const [name, setName] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('fixed');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [variableAmount, setVariableAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('monthly');
  const [payDay, setPayDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const requiresExpected = incomeType !== 'variable';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createIncomeSource({
        name,
        incomeType,
        expectedAmountUsd: expectedAmount ? Number(expectedAmount) : null,
        variableComponentUsd: incomeType === 'mixed' && variableAmount ? Number(variableAmount) : null,
        frequency,
        payDayOfMonth: payDay ? Number(payDay) : null,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la fuente.');
        return;
      }

      setName('');
      setExpectedAmount('');
      setVariableAmount('');
      setPayDay('');
      router.refresh();
    });
  };

  const handleToggle = (source: IncomeSource) => {
    startTransition(async () => {
      const result = await setIncomeSourceActive(source.id, !source.is_active);
      if (!result.success) setError(result.error ?? 'No se pudo actualizar la fuente.');
      router.refresh();
    });
  };

  const handleDelete = (source: IncomeSource) => {
    if (!window.confirm(`¿Eliminar la fuente "${source.name}"? Los ingresos ya registrados conservarán sus datos.`)) return;
    startTransition(async () => {
      const result = await deleteIncomeSource(source.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar la fuente.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Fuentes de ingreso</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Nombre
          <input required type="text" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="Ej. Nómina, Freelance" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Tipo
          <select value={incomeType} onChange={(event) => setIncomeType(event.target.value as IncomeType)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="fixed">Fijo</option>
            <option value="variable">Variable</option>
            <option value="mixed">Mixto</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          {requiresExpected ? 'Monto esperado USD' : 'Estimado USD (opcional)'}
          <input required={requiresExpected} min="0.01" step="0.01" type="number" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="0.00" />
        </label>
        {incomeType === 'mixed' && (
          <label className="text-sm font-medium text-slate-700">
            Parte variable USD
            <input min="0" step="0.01" type="number" value={variableAmount} onChange={(event) => setVariableAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="0.00" />
          </label>
        )}
        <label className="text-sm font-medium text-slate-700">
          Frecuencia
          <select value={frequency} onChange={(event) => setFrequency(event.target.value as IncomeFrequency)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="monthly">Mensual</option>
            <option value="biweekly">Quincenal</option>
            <option value="weekly">Semanal</option>
            <option value="custom">Otra</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Día de cobro
          <input min="1" max="31" type="number" value={payDay} onChange={(event) => setPayDay(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="Opcional" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? 'Guardando...' : 'Agregar fuente'}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {sources.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Aún no tienes fuentes de ingreso. Crea la primera arriba.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {sources.map((source) => (
            <div key={source.id} className={`flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between ${!source.is_active ? 'opacity-50' : ''}`}>
              <div>
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  {source.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeStyles[source.income_type]}`}>
                    {typeLabels[source.income_type]}
                  </span>
                  {!source.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Pausada</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {source.expected_amount_usd != null ? `Esperado: $${Number(source.expected_amount_usd).toFixed(2)}` : 'Sin monto esperado'}
                  {source.income_type === 'mixed' && source.variable_component_usd != null && ` + $${Number(source.variable_component_usd).toFixed(2)} variable`}
                  {' · '}{frequencyLabels[source.frequency]}
                  {source.pay_day_of_month != null && ` · día ${source.pay_day_of_month}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleToggle(source)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  {source.is_active ? 'Pausar' : 'Activar'}
                </button>
                <button type="button" onClick={() => handleDelete(source)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
