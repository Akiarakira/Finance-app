'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBudgetCategory,
  deleteBudgetCategory,
  updateBudgetCategory,
  upsertMonthlyBudget,
  PILLAR_LABELS,
  type BudgetCategory,
  type BudgetPillar,
  type BudgetSummary,
} from '@/lib/actions/budget';
import type { FinancialSpace } from '@/lib/actions/financial-spaces';

const PILLAR_ORDER: BudgetPillar[] = ['needs', 'wants', 'savings'];

function CategoryFormFields({
  values,
  spaces,
  onChange,
}: {
  values: { spaceId: string; name: string; pillar: BudgetPillar; icon: string };
  spaces: FinancialSpace[];
  onChange: (patch: Partial<{ spaceId: string; name: string; pillar: BudgetPillar; icon: string }>) => void;
}) {
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800';
  return (
    <>
      <label className="text-sm font-medium text-slate-700">
        Espacio
        <select required value={values.spaceId} onChange={(event) => onChange({ spaceId: event.target.value })} className={inputClass}>
          <option value="" disabled>Selecciona un espacio</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>{space.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">
        Nombre
        <input required type="text" value={values.name} onChange={(event) => onChange({ name: event.target.value })} className={inputClass} placeholder="Ej. Mercado" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Pilar
        <select value={values.pillar} onChange={(event) => onChange({ pillar: event.target.value as BudgetPillar })} className={inputClass}>
          {PILLAR_ORDER.map((pillar) => (
            <option key={pillar} value={pillar}>{PILLAR_LABELS[pillar].name} ({PILLAR_LABELS[pillar].pct})</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Icono
        <input type="text" value={values.icon} onChange={(event) => onChange({ icon: event.target.value })} className={inputClass} placeholder="Opcional" />
      </label>
    </>
  );
}

function AssignedInput({ categoryId, month, assigned }: { categoryId: string; month: string; assigned: number }) {
  const [value, setValue] = useState(assigned ? assigned.toFixed(2) : '');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    const amount = value ? Number(value) : 0;
    if (Number.isNaN(amount) || amount < 0) return;
    startTransition(async () => {
      const result = await upsertMonthlyBudget(categoryId, month, amount);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      }
    });
  };

  return (
    <span className="flex items-center gap-1.5">
      <input
        min="0" step="0.01" type="number" value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800"
        placeholder="0.00"
      />
      <button type="button" onClick={handleSave} disabled={isPending} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
        {saved ? '✓' : 'Asignar'}
      </button>
    </span>
  );
}

export default function BudgetManager({ summary, spaces, month }: { summary: BudgetSummary; spaces: FinancialSpace[]; month: string }) {
  const activeSpaces = spaces.filter((space) => space.is_active);
  const [createForm, setCreateForm] = useState({ spaceId: activeSpaces[0]?.id ?? '', name: '', pillar: 'needs' as BudgetPillar, icon: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ spaceId: '', name: '', pillar: 'needs' as BudgetPillar, icon: '' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBudgetCategory({ ...createForm, icon: createForm.icon || undefined });
      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la categoría.');
        return;
      }
      setCreateForm({ ...createForm, name: '', icon: '' });
      router.refresh();
    });
  };

  const startEdit = (category: BudgetCategory) => {
    setError(null);
    setEditingId(category.id);
    setEditForm({ spaceId: category.space_id, name: category.name, pillar: category.pillar, icon: category.icon ?? '' });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBudgetCategory(editingId, { ...editForm, icon: editForm.icon || undefined });
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la categoría.');
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  };

  const handleDelete = (category: BudgetCategory) => {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteBudgetCategory(category.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar la categoría.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PILLAR_ORDER.map((pillar) => {
          const data = summary.pillars[pillar];
          const labels = PILLAR_LABELS[pillar];
          const spentPct = data.assigned > 0 ? Math.min(100, (data.spent / data.assigned) * 100) : 0;
          const overBudget = data.assigned > 0 && data.spent > data.assigned;
          return (
            <div key={pillar} className={`rounded-xl border p-5 shadow-sm ${labels.bg} ${labels.border}`}>
              <div className="flex items-baseline justify-between">
                <p className={`font-semibold ${labels.color}`}>{labels.name}</p>
                <p className="text-xs text-slate-400">objetivo {labels.pct} · ${data.target.toFixed(2)}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">${data.spent.toFixed(2)}</p>
              <p className="text-sm text-slate-500">gastado de ${data.assigned.toFixed(2)} asignado</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : pillar === 'needs' ? 'bg-sky-500' : pillar === 'wants' ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${spentPct}%` }} />
              </div>
              {overBudget && <p className="mt-1 text-xs font-medium text-red-600">Excedido por ${(data.spent - data.assigned).toFixed(2)}</p>}
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">Categorías del presupuesto</h2>

        {activeSpaces.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Crea un espacio financiero antes de agregar categorías.</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <CategoryFormFields values={createForm} spaces={activeSpaces} onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
            <div className="flex items-end">
              <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                {isPending ? 'Guardando...' : 'Crear categoría'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {summary.categories.length === 0 ? (
          <p className="py-6 text-center text-slate-400">Aún no tienes categorías. Crea una por cada gasto recurrente (Mercado, Salidas, Ahorro…).</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {summary.categories.map(({ category, assigned, spent }) => (
              <div key={category.id} className="py-3">
                {editingId === category.id ? (
                  <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-6">
                    <CategoryFormFields values={editForm} spaces={activeSpaces} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
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
                        {category.icon && <span>{category.icon}</span>}
                        {category.name}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILLAR_LABELS[category.pillar].bg} ${PILLAR_LABELS[category.pillar].color}`}>
                          {PILLAR_LABELS[category.pillar].name}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500">
                        {category.space_name ?? 'Sin espacio'} · Gastado ${spent.toFixed(2)} este mes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AssignedInput categoryId={category.id} month={month} assigned={assigned} />
                      <button type="button" onClick={() => startEdit(category)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(category)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
    </div>
  );
}
