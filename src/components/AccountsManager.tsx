'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAccount,
  deleteAccount,
  setAccountArchived,
  updateAccount,
  type Account,
  type AccountCurrency,
  type AccountType,
} from '@/lib/actions/accounts';
import type { FinancialSpace } from '@/lib/actions/financial-spaces';

export type AccountWithBalance = Account & { balance: number };

const typeLabels: Record<AccountType, string> = {
  binance: 'Binance',
  bank_ves: 'Banco (VES)',
  mobile_pay_ves: 'Pago móvil',
  digital_usd: 'Digital (USD)',
  foreign_bank: 'Banco extranjero',
  cash: 'Efectivo',
};

const currencyLabels: Record<AccountCurrency, string> = {
  USD: 'USD',
  USDT: 'USDT',
  VES: 'Bs',
  EUR: 'EUR',
};

interface AccountFormValues {
  spaceId: string;
  name: string;
  type: AccountType;
  currency: AccountCurrency;
  initialBalance: string;
}

function emptyForm(defaultSpaceId: string): AccountFormValues {
  return { spaceId: defaultSpaceId, name: '', type: 'cash', currency: 'USD', initialBalance: '' };
}

function toFormValues(account: AccountWithBalance): AccountFormValues {
  return {
    spaceId: account.space_id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: '',
  };
}

function AccountFormFields({
  values,
  spaces,
  showInitialBalance,
  onChange,
}: {
  values: AccountFormValues;
  spaces: FinancialSpace[];
  showInitialBalance: boolean;
  onChange: (patch: Partial<AccountFormValues>) => void;
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
        <input required type="text" value={values.name} onChange={(event) => onChange({ name: event.target.value })} className={inputClass} placeholder="Ej. Binance, BNC, Efectivo" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Tipo
        <select value={values.type} onChange={(event) => onChange({ type: event.target.value as AccountType })} className={inputClass}>
          <option value="binance">Binance</option>
          <option value="bank_ves">Banco (VES)</option>
          <option value="mobile_pay_ves">Pago móvil</option>
          <option value="digital_usd">Digital (USD)</option>
          <option value="foreign_bank">Banco extranjero</option>
          <option value="cash">Efectivo</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Moneda
        <select value={values.currency} onChange={(event) => onChange({ currency: event.target.value as AccountCurrency })} className={inputClass}>
          <option value="USD">USD</option>
          <option value="USDT">USDT</option>
          <option value="VES">Bs</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      {showInitialBalance && (
        <label className="text-sm font-medium text-slate-700">
          Saldo inicial
          <input min="0" step="0.01" type="number" value={values.initialBalance} onChange={(event) => onChange({ initialBalance: event.target.value })} className={inputClass} placeholder="0.00" />
        </label>
      )}
    </>
  );
}

export default function AccountsManager({ accounts, spaces }: { accounts: AccountWithBalance[]; spaces: FinancialSpace[] }) {
  const activeSpaces = spaces.filter((space) => space.is_active);
  const [createForm, setCreateForm] = useState<AccountFormValues>(() => emptyForm(activeSpaces[0]?.id ?? ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AccountFormValues>(() => emptyForm(''));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createAccount({
        spaceId: createForm.spaceId,
        name: createForm.name,
        type: createForm.type,
        currency: createForm.currency,
        initialBalance: createForm.initialBalance ? Number(createForm.initialBalance) : 0,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la cuenta.');
        return;
      }

      setCreateForm(emptyForm(createForm.spaceId));
      router.refresh();
    });
  };

  const startEdit = (account: AccountWithBalance) => {
    setError(null);
    setEditingId(account.id);
    setEditForm(toFormValues(account));
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    startTransition(async () => {
      const result = await updateAccount(editingId, {
        spaceId: editForm.spaceId,
        name: editForm.name,
        type: editForm.type,
        currency: editForm.currency,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la cuenta.');
        return;
      }

      setEditingId(null);
      router.refresh();
    });
  };

  const handleArchive = (account: AccountWithBalance) => {
    startTransition(async () => {
      const result = await setAccountArchived(account.id, account.is_active);
      if (!result.success) setError(result.error ?? 'No se pudo actualizar la cuenta.');
      router.refresh();
    });
  };

  const handleDelete = (account: AccountWithBalance) => {
    if (!window.confirm(`¿Eliminar la cuenta "${account.name}"? Solo es posible si no tiene movimientos ni fuentes vinculadas.`)) return;
    startTransition(async () => {
      const result = await deleteAccount(account.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar la cuenta.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Cuentas</h2>

      {activeSpaces.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Crea un espacio financiero antes de agregar cuentas.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <AccountFormFields values={createForm} spaces={activeSpaces} showInitialBalance onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
          <div className="flex items-end">
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Agregar cuenta'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {accounts.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Aún no tienes cuentas. Crea la primera arriba.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {accounts.map((account) => (
            <div key={account.id} className={`py-3 ${!account.is_active ? 'opacity-50' : ''}`}>
              {editingId === account.id ? (
                <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-6">
                  <AccountFormFields values={editForm} spaces={activeSpaces} showInitialBalance={false} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
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
                      {account.name}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {typeLabels[account.type]}
                      </span>
                      {!account.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Archivada</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {account.space_name ?? 'Sin espacio'} · {currencyLabels[account.currency]} · Balance: {account.balance.toFixed(2)} {account.currency}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(account)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleArchive(account)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      {account.is_active ? 'Archivar' : 'Reactivar'}
                    </button>
                    <button type="button" onClick={() => handleDelete(account)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
