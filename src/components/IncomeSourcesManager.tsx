'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createIncomeSource,
  deleteIncomeSource,
  setIncomeSourceActive,
  updateIncomeSource,
  type IncomeFrequency,
  type IncomeSource,
  type IncomeSourceInput,
  type IncomeType,
} from '@/lib/actions/income-sources';
import type { Account } from '@/lib/actions/accounts';

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

interface SourceFormValues {
  name: string;
  incomeType: IncomeType;
  expectedAmount: string;
  variableAmount: string;
  frequency: IncomeFrequency;
  payDay: string;
  destinationAccountId: string;
}

const emptyForm: SourceFormValues = {
  name: '',
  incomeType: 'fixed',
  expectedAmount: '',
  variableAmount: '',
  frequency: 'monthly',
  payDay: '',
  destinationAccountId: '',
};

function toFormValues(source: IncomeSource): SourceFormValues {
  return {
    name: source.name,
    incomeType: source.income_type,
    expectedAmount: source.expected_amount_usd != null ? String(source.expected_amount_usd) : '',
    variableAmount: source.variable_component_usd != null ? String(source.variable_component_usd) : '',
    frequency: source.frequency,
    payDay: source.pay_day_of_month != null ? String(source.pay_day_of_month) : '',
    destinationAccountId: source.destination_account_id ?? '',
  };
}

function toInput(values: SourceFormValues): IncomeSourceInput {
  return {
    name: values.name,
    incomeType: values.incomeType,
    expectedAmountUsd: values.expectedAmount ? Number(values.expectedAmount) : null,
    variableComponentUsd: values.incomeType === 'mixed' && values.variableAmount ? Number(values.variableAmount) : null,
    frequency: values.frequency,
    payDayOfMonth: values.payDay ? Number(values.payDay) : null,
    destinationAccountId: values.destinationAccountId || null,
  };
}

function SourceFormFields({ values, accounts, onChange }: { values: SourceFormValues; accounts: Account[]; onChange: (patch: Partial<SourceFormValues>) => void }) {
  const requiresExpected = values.incomeType !== 'variable';
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800';
  return (
    <>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">
        Nombre
        <input required type="text" value={values.name} onChange={(event) => onChange({ name: event.target.value })} className={inputClass} placeholder="Ej. Nómina, Freelance" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Tipo
        <select value={values.incomeType} onChange={(event) => onChange({ incomeType: event.target.value as IncomeType })} className={inputClass}>
          <option value="fixed">Fijo</option>
          <option value="variable">Variable</option>
          <option value="mixed">Mixto</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        {requiresExpected ? 'Monto esperado USD' : 'Estimado USD (opcional)'}
        <input required={requiresExpected} min="0.01" step="0.01" type="number" value={values.expectedAmount} onChange={(event) => onChange({ expectedAmount: event.target.value })} className={inputClass} placeholder="0.00" />
      </label>
      {values.incomeType === 'mixed' && (
        <label className="text-sm font-medium text-slate-700">
          Parte variable USD
          <input min="0" step="0.01" type="number" value={values.variableAmount} onChange={(event) => onChange({ variableAmount: event.target.value })} className={inputClass} placeholder="0.00" />
        </label>
      )}
      <label className="text-sm font-medium text-slate-700">
        Frecuencia
        <select value={values.frequency} onChange={(event) => onChange({ frequency: event.target.value as IncomeFrequency })} className={inputClass}>
          <option value="monthly">Mensual</option>
          <option value="biweekly">Quincenal</option>
          <option value="weekly">Semanal</option>
          <option value="custom">Otra</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Día de cobro
        <input min="1" max="31" type="number" value={values.payDay} onChange={(event) => onChange({ payDay: event.target.value })} className={inputClass} placeholder="Opcional" />
      </label>
      {accounts.length > 0 && (
        <label className="text-sm font-medium text-slate-700">
          Cuenta destino
          <select value={values.destinationAccountId} onChange={(event) => onChange({ destinationAccountId: event.target.value })} className={inputClass}>
            <option value="">Sin cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

export default function IncomeSourcesManager({ sources, accounts = [] }: { sources: IncomeSource[]; accounts?: Account[] }) {
  const [createForm, setCreateForm] = useState<SourceFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SourceFormValues>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createIncomeSource(toInput(createForm));

      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la fuente.');
        return;
      }

      setCreateForm(emptyForm);
      router.refresh();
    });
  };

  const startEdit = (source: IncomeSource) => {
    setError(null);
    setEditingId(source.id);
    setEditForm(toFormValues(source));
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    startTransition(async () => {
      const result = await updateIncomeSource(editingId, toInput(editForm));

      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la fuente.');
        return;
      }

      setEditingId(null);
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
        <SourceFormFields values={createForm} accounts={accounts} onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
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
            <div key={source.id} className={`py-3 ${!source.is_active ? 'opacity-50' : ''}`}>
              {editingId === source.id ? (
                <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-6">
                  <SourceFormFields values={editForm} accounts={accounts} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
                  <div className="flex items-end gap-2 md:col-span-3 lg:col-span-6">
                    <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                      {isPending ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} disabled={isPending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-60">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
                      {source.destination_account_name && ` · Destino: ${source.destination_account_name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(source)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleToggle(source)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      {source.is_active ? 'Pausar' : 'Activar'}
                    </button>
                    <button type="button" onClick={() => handleDelete(source)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
