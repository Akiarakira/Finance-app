'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTransaction, type CategoryOption, type Currency, type PaymentMethod, type TransactionType, type WalletOption } from '@/lib/actions/transactions';
import type { IncomeSource } from '@/lib/actions/income-sources';
import type { Account } from '@/lib/actions/accounts';

interface TransactionFormProps {
  type: TransactionType;
  wallets: WalletOption[];
  categories: CategoryOption[];
  incomeSources?: IncomeSource[];
  accounts?: Account[];
  initialWalletId?: string;
}

const incomeTypeLabels: Record<IncomeSource['income_type'], string> = {
  fixed: 'Fijo',
  variable: 'Variable',
  mixed: 'Mixto',
};

export default function TransactionForm({ type, wallets, categories, incomeSources = [], accounts = [], initialWalletId }: TransactionFormProps) {
  const selectedWalletId = initialWalletId && wallets.some((wallet) => wallet.id === initialWalletId)
    ? initialWalletId
    : wallets[0]?.id ?? '';
  const [walletId, setWalletId] = useState(selectedWalletId);
  const [categoryId, setCategoryId] = useState('');
  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('other');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isIncome = type === 'income';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createTransaction({
        walletId,
        categoryId: categoryId || null,
        incomeSourceId: incomeSourceId || null,
        accountId: accountId || null,
        type,
        amount: Number(amount),
        currency,
        paymentMethod,
        description,
        transactionDate,
      });

      if (!result.success) {
        setError(result.error ?? 'No se pudo guardar el movimiento.');
        return;
      }

      setAmount('');
      setDescription('');
      setMessage(isIncome ? 'Ingreso registrado.' : 'Gasto registrado.');
      router.refresh();
    });
  };

  if (wallets.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Crea o comparte una wallet antes de registrar movimientos.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Wallet
          <select value={walletId} onChange={(event) => setWalletId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Monto
          <input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="0.00" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Moneda
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="USD">USD</option>
            <option value="USDT">USDT</option>
            <option value="VES">Bs</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Fecha
          <input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" />
        </label>
        {accounts.length > 0 && (
          <label className="text-sm font-medium text-slate-700">
            Cuenta
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
              <option value="">Sin cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
          </label>
        )}
        {isIncome && (
          <label className="text-sm font-medium text-slate-700">
            Fuente de ingreso
            <select value={incomeSourceId} onChange={(event) => setIncomeSourceId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
              <option value="">Sin fuente</option>
              {incomeSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({incomeTypeLabels[source.income_type]})
                </option>
              ))}
            </select>
            {incomeSourceId && (() => {
              const source = incomeSources.find((item) => item.id === incomeSourceId);
              return source?.expected_amount_usd != null && (
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  Esperado: ${Number(source.expected_amount_usd).toFixed(2)} USD
                </span>
              );
            })()}
          </label>
        )}
        <label className="text-sm font-medium text-slate-700">
          Categoría
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="">Sin categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Método de pago
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="binance">Binance / Binance Pay</option>
            <option value="bs">Bolívares</option>
            <option value="cash_usd">Efectivo USD</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Descripción
          <input type="text" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="Ej. Supermercado" />
        </label>
      </div>

      {(error || message) && <p className={`mt-4 rounded-lg p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error ?? message}</p>}
      <button type="submit" disabled={isPending} className={`mt-4 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60 ${isIncome ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
        {isPending ? 'Guardando...' : isIncome ? 'Registrar ingreso' : 'Registrar gasto'}
      </button>
    </form>
  );
}
