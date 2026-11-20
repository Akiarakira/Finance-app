'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInternalTransfer, deleteInternalTransfer, type InternalTransfer } from '@/lib/actions/transfers';
import type { Account } from '@/lib/actions/accounts';
import type { Currency } from '@/lib/actions/transactions';

const CURRENCIES: Currency[] = ['USD', 'USDT', 'VES', 'EUR'];

export default function TransfersManager({ transfers, accounts }: { transfers: InternalTransfer[]; accounts: Account[] }) {
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? '');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id ?? '');
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState<Currency>('USDT');
  const [destinationAmount, setDestinationAmount] = useState('');
  const [destinationCurrency, setDestinationCurrency] = useState<Currency>('VES');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInternalTransfer({
        sourceAccountId,
        destinationAccountId,
        sourceAmount: Number(sourceAmount),
        sourceCurrency,
        destinationAmount: Number(destinationAmount),
        destinationCurrency,
        transferDate: date,
        notes: notes || undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'No se pudo registrar la transferencia.');
        return;
      }
      setSourceAmount('');
      setDestinationAmount('');
      setNotes('');
      router.refresh();
    });
  };

  const handleDelete = (transfer: InternalTransfer) => {
    if (!window.confirm('¿Eliminar esta transferencia? El saldo de las cuentas se recalculará.')) return;
    startTransition(async () => {
      const result = await deleteInternalTransfer(transfer.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Transferencias entre cuentas</h2>

      {accounts.length < 2 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Necesitas al menos dos cuentas para transferir.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm font-medium text-slate-700">
            Cuenta origen
            <select required value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} className={inputClass}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Monto origen
            <input required min="0.0001" step="0.0001" type="number" value={sourceAmount} onChange={(event) => setSourceAmount(event.target.value)} className={inputClass} placeholder="0.00" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Moneda origen
            <select value={sourceCurrency} onChange={(event) => setSourceCurrency(event.target.value as Currency)} className={inputClass}>
              {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Cuenta destino
            <select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className={inputClass}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Monto recibido
            <input required min="0.0001" step="0.0001" type="number" value={destinationAmount} onChange={(event) => setDestinationAmount(event.target.value)} className={inputClass} placeholder="0.00" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Moneda destino
            <select value={destinationCurrency} onChange={(event) => setDestinationCurrency(event.target.value as Currency)} className={inputClass}>
              {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Fecha
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-3 lg:col-span-4">
            Notas
            <input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="Opcional" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Transferir'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {transfers.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Sin transferencias registradas.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {transfer.source_account_name ?? 'Cuenta'} → {transfer.destination_account_name ?? 'Cuenta'}
                </p>
                <p className="text-sm text-slate-500">
                  {transfer.transfer_date}
                  {transfer.exchange_rate !== null && ` · Tasa ${transfer.exchange_rate.toFixed(4)}`}
                  {transfer.notes && ` · ${transfer.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">
                  -{transfer.source_amount.toFixed(2)} {transfer.source_currency} → +{transfer.destination_amount.toFixed(2)} {transfer.destination_currency}
                </span>
                <button type="button" onClick={() => handleDelete(transfer)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
