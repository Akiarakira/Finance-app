'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCustodyFund,
  deleteCustodyFund,
  updateCustodyFund,
  type CustodyFund,
} from '@/lib/actions/custody-funds';
import type { FinancialSpace } from '@/lib/actions/financial-spaces';

export type CustodyFundWithBalance = CustodyFund & { balance: number };

interface FundFormValues {
  spaceId: string;
  beneficiaryName: string;
  initialBalance: string;
  notes: string;
}

function emptyForm(defaultSpaceId: string): FundFormValues {
  return { spaceId: defaultSpaceId, beneficiaryName: '', initialBalance: '', notes: '' };
}

function FundFormFields({
  values,
  spaces,
  showInitialBalance,
  onChange,
}: {
  values: FundFormValues;
  spaces: FinancialSpace[];
  showInitialBalance: boolean;
  onChange: (patch: Partial<FundFormValues>) => void;
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
        Beneficiario
        <input required type="text" value={values.beneficiaryName} onChange={(event) => onChange({ beneficiaryName: event.target.value })} className={inputClass} placeholder="Ej. Mami" />
      </label>
      {showInitialBalance && (
        <label className="text-sm font-medium text-slate-700">
          Saldo inicial USD
          <input min="0" step="0.01" type="number" value={values.initialBalance} onChange={(event) => onChange({ initialBalance: event.target.value })} className={inputClass} placeholder="0.00" />
        </label>
      )}
      <label className="text-sm font-medium text-slate-700 md:col-span-2">
        Notas
        <input type="text" value={values.notes} onChange={(event) => onChange({ notes: event.target.value })} className={inputClass} placeholder="Opcional" />
      </label>
    </>
  );
}

export default function CustodyFundsManager({ funds, spaces }: { funds: CustodyFundWithBalance[]; spaces: FinancialSpace[] }) {
  const custodySpaces = spaces.filter((space) => space.is_active);
  const [createForm, setCreateForm] = useState<FundFormValues>(() => emptyForm(custodySpaces.find((space) => space.type === 'custody')?.id ?? custodySpaces[0]?.id ?? ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FundFormValues>(() => emptyForm(''));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCustodyFund({
        spaceId: createForm.spaceId,
        beneficiaryName: createForm.beneficiaryName,
        initialBalanceUsd: createForm.initialBalance ? Number(createForm.initialBalance) : 0,
        notes: createForm.notes || undefined,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo crear el fondo.');
        return;
      }

      setCreateForm(emptyForm(createForm.spaceId));
      router.refresh();
    });
  };

  const startEdit = (fund: CustodyFundWithBalance) => {
    setError(null);
    setEditingId(fund.id);
    setEditForm({ spaceId: fund.space_id, beneficiaryName: fund.beneficiary_name, initialBalance: '', notes: fund.notes ?? '' });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    startTransition(async () => {
      const result = await updateCustodyFund(editingId, {
        spaceId: editForm.spaceId,
        beneficiaryName: editForm.beneficiaryName,
        notes: editForm.notes || undefined,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar el fondo.');
        return;
      }

      setEditingId(null);
      router.refresh();
    });
  };

  const handleDelete = (fund: CustodyFundWithBalance) => {
    if (!window.confirm(`¿Eliminar el fondo de "${fund.beneficiary_name}"? Solo es posible si no tiene movimientos.`)) return;
    startTransition(async () => {
      const result = await deleteCustodyFund(fund.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar el fondo.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Fondos de custodia</h2>

      {custodySpaces.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Crea un espacio financiero antes de agregar fondos.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <FundFormFields values={createForm} spaces={custodySpaces} showInitialBalance onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
          <div className="flex items-end">
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Crear fondo'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {funds.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Aún no tienes fondos de custodia.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {funds.map((fund) => (
            <div key={fund.id} className="py-3">
              {editingId === fund.id ? (
                <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-6">
                  <FundFormFields values={editForm} spaces={custodySpaces} showInitialBalance={false} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
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
                      {fund.beneficiary_name}
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Custodia</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {fund.space_name ?? 'Sin espacio'} · Disponible: ${fund.balance.toFixed(2)} USD
                      {fund.notes && ` · ${fund.notes}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(fund)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(fund)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
