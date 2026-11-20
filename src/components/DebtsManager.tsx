'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createLiability,
  deleteLiability,
  listLiabilityPayments,
  recordLiabilityPayment,
  updateLiability,
  type Liability,
  type LiabilityPayment,
} from '@/lib/actions/liabilities';
import type { FinancialSpace } from '@/lib/actions/financial-spaces';
import type { Account } from '@/lib/actions/accounts';
import type { WalletOption } from '@/lib/actions/transactions';
import type { IncomeFrequency } from '@/lib/actions/income-sources';

const frequencyLabels: Record<IncomeFrequency, string> = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
  weekly: 'Semanal',
  custom: 'Otro',
};

interface DebtFormValues {
  spaceId: string;
  creditorName: string;
  totalAmount: string;
  installmentAmount: string;
  installmentFrequency: IncomeFrequency;
  dueDay: string;
  notes: string;
}

function emptyForm(defaultSpaceId: string): DebtFormValues {
  return { spaceId: defaultSpaceId, creditorName: '', totalAmount: '', installmentAmount: '', installmentFrequency: 'monthly', dueDay: '', notes: '' };
}

function DebtFormFields({ values, spaces, showTotal, onChange }: { values: DebtFormValues; spaces: FinancialSpace[]; showTotal: boolean; onChange: (patch: Partial<DebtFormValues>) => void }) {
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
        Acreedor
        <input required type="text" value={values.creditorName} onChange={(event) => onChange({ creditorName: event.target.value })} className={inputClass} placeholder="Ej. Préstamo Juan" />
      </label>
      {showTotal && (
        <label className="text-sm font-medium text-slate-700">
          Monto total USD
          <input required min="0.01" step="0.01" type="number" value={values.totalAmount} onChange={(event) => onChange({ totalAmount: event.target.value })} className={inputClass} placeholder="0.00" />
        </label>
      )}
      <label className="text-sm font-medium text-slate-700">
        Cuota USD
        <input min="0" step="0.01" type="number" value={values.installmentAmount} onChange={(event) => onChange({ installmentAmount: event.target.value })} className={inputClass} placeholder="0.00" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Frecuencia
        <select value={values.installmentFrequency} onChange={(event) => onChange({ installmentFrequency: event.target.value as IncomeFrequency })} className={inputClass}>
          {Object.entries(frequencyLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Día de vencimiento
        <input min="1" max="31" type="number" value={values.dueDay} onChange={(event) => onChange({ dueDay: event.target.value })} className={inputClass} placeholder="Opcional" />
      </label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">
        Notas
        <input type="text" value={values.notes} onChange={(event) => onChange({ notes: event.target.value })} className={inputClass} placeholder="Opcional" />
      </label>
    </>
  );
}

function PaymentPanel({ liability, wallets, accounts, onDone }: { liability: Liability; wallets: WalletOption[]; accounts: Account[]; onDone: () => void }) {
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState(() => {
    const suggested = liability.installment_amount_usd > 0 ? liability.installment_amount_usd : liability.current_balance_usd;
    return Math.min(suggested, liability.current_balance_usd).toFixed(2);
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal text-slate-800';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await recordLiabilityPayment({
        liabilityId: liability.id,
        walletId,
        accountId: accountId || null,
        amountUsd: Number(amount),
        paymentDate: date,
        notes: notes || undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'No se pudo registrar el pago.');
        return;
      }
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-3">
      <label className="text-sm font-medium text-slate-700">
        Wallet de salida
        <select required value={walletId} onChange={(event) => setWalletId(event.target.value)} className={inputClass}>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Cuenta vinculada
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}>
          <option value="">Sin cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Monto USD (saldo ${liability.current_balance_usd.toFixed(2)})
        <input required min="0.01" max={liability.current_balance_usd} step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Fecha
        <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
      </label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">
        Notas
        <input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="Opcional" />
      </label>
      {error && <p className="md:col-span-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2 md:col-span-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {isPending ? 'Registrando...' : 'Confirmar pago'}
        </button>
        <button type="button" onClick={onDone} disabled={isPending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-60">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function PaymentsHistory({ liabilityId }: { liabilityId: string }) {
  const [payments, setPayments] = useState<LiabilityPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLiabilityPayments(liabilityId).then((result) => {
      if (result.success) setPayments(result.payments ?? []);
      else setError(result.error ?? 'Error cargando historial.');
    });
  }, [liabilityId]);

  if (error) return <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!payments) return <p className="mt-3 text-sm text-slate-400">Cargando pagos...</p>;
  if (payments.length === 0) return <p className="mt-3 text-sm text-slate-400">Sin pagos registrados.</p>;

  return (
    <ul className="mt-3 space-y-1 text-sm text-slate-600">
      {payments.map((payment) => (
        <li key={payment.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span>{payment.payment_date}{payment.notes ? ` · ${payment.notes}` : ''}</span>
          <span className="font-semibold text-slate-800">${payment.amount_usd.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DebtsManager({ liabilities, spaces, wallets, accounts }: { liabilities: Liability[]; spaces: FinancialSpace[]; wallets: WalletOption[]; accounts: Account[] }) {
  const activeSpaces = spaces.filter((space) => space.is_active);
  const [createForm, setCreateForm] = useState<DebtFormValues>(() => emptyForm(activeSpaces[0]?.id ?? ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DebtFormValues>(() => emptyForm(''));
  const [payingId, setPayingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toInput = (form: DebtFormValues) => ({
    spaceId: form.spaceId,
    creditorName: form.creditorName,
    totalInitialAmountUsd: Number(form.totalAmount),
    installmentAmountUsd: form.installmentAmount ? Number(form.installmentAmount) : 0,
    installmentFrequency: form.installmentFrequency,
    dueDayOfMonth: form.dueDay ? Number(form.dueDay) : null,
    notes: form.notes || undefined,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createLiability(toInput(createForm));
      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la deuda.');
        return;
      }
      setCreateForm(emptyForm(createForm.spaceId));
      router.refresh();
    });
  };

  const startEdit = (liability: Liability) => {
    setError(null);
    setPayingId(null);
    setEditingId(liability.id);
    setEditForm({
      spaceId: liability.space_id,
      creditorName: liability.creditor_name,
      totalAmount: liability.total_initial_amount_usd.toString(),
      installmentAmount: liability.installment_amount_usd ? liability.installment_amount_usd.toString() : '',
      installmentFrequency: liability.installment_frequency,
      dueDay: liability.due_day_of_month?.toString() ?? '',
      notes: liability.notes ?? '',
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateLiability(editingId, toInput(editForm));
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la deuda.');
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  };

  const handleDelete = (liability: Liability) => {
    if (!window.confirm(`¿Eliminar la deuda con "${liability.creditor_name}"? Solo es posible si no tiene pagos.`)) return;
    startTransition(async () => {
      const result = await deleteLiability(liability.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar la deuda.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Deudas externas</h2>

      {activeSpaces.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Crea un espacio financiero antes de registrar deudas.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <DebtFormFields values={createForm} spaces={activeSpaces} showTotal onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
          <div className="flex items-end">
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Crear deuda'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {liabilities.length === 0 ? (
        <p className="py-6 text-center text-slate-400">No tienes deudas registradas.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {liabilities.map((liability) => {
            const paidPct = liability.total_initial_amount_usd > 0
              ? Math.min(100, ((liability.total_initial_amount_usd - liability.current_balance_usd) / liability.total_initial_amount_usd) * 100)
              : 0;
            return (
              <div key={liability.id} className="py-3">
                {editingId === liability.id ? (
                  <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-6">
                    <DebtFormFields values={editForm} spaces={activeSpaces} showTotal={false} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
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
                  <div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="flex items-center gap-2 font-medium text-slate-800">
                          {liability.creditor_name}
                          {liability.is_settled
                            ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Saldada</span>
                            : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Activa</span>}
                        </p>
                        <p className="text-sm text-slate-500">
                          {liability.space_name ?? 'Sin espacio'} · Resta ${liability.current_balance_usd.toFixed(2)} de ${liability.total_initial_amount_usd.toFixed(2)}
                          {liability.installment_amount_usd > 0 && ` · Cuota $${liability.installment_amount_usd.toFixed(2)} ${frequencyLabels[liability.installment_frequency].toLowerCase()}`}
                          {liability.due_day_of_month && ` · Vence día ${liability.due_day_of_month}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!liability.is_settled && (
                          <button type="button" onClick={() => { setPayingId(payingId === liability.id ? null : liability.id); setEditingId(null); }} disabled={isPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
                            Pagar
                          </button>
                        )}
                        <button type="button" onClick={() => setHistoryId(historyId === liability.id ? null : liability.id)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                          Historial
                        </button>
                        <button type="button" onClick={() => startEdit(liability)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDelete(liability)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{paidPct.toFixed(0)}% pagado</p>
                  </div>
                )}
                {payingId === liability.id && (
                  <PaymentPanel liability={liability} wallets={wallets} accounts={accounts} onDone={() => setPayingId(null)} />
                )}
                {historyId === liability.id && <PaymentsHistory liabilityId={liability.id} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
