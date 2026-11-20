'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSavingsGoal,
  deleteSavingsGoal,
  listSavingsContributions,
  recordSavingsContribution,
  updateSavingsGoal,
  type SavingsContribution,
  type SavingsGoal,
} from '@/lib/actions/savings-goals';
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

const statusLabels: Record<SavingsGoal['status'], { label: string; className: string }> = {
  active: { label: 'Activa', className: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Pausada', className: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Completada', className: 'bg-blue-100 text-blue-700' },
};

interface GoalFormValues {
  spaceId: string;
  name: string;
  targetAmount: string;
  targetDate: string;
  frequency: IncomeFrequency | '';
  proposed: string;
}

function emptyForm(defaultSpaceId: string): GoalFormValues {
  return { spaceId: defaultSpaceId, name: '', targetAmount: '', targetDate: '', frequency: '', proposed: '' };
}

function GoalFormFields({ values, spaces, onChange }: { values: GoalFormValues; spaces: FinancialSpace[]; onChange: (patch: Partial<GoalFormValues>) => void }) {
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
        Nombre de la meta
        <input required type="text" value={values.name} onChange={(event) => onChange({ name: event.target.value })} className={inputClass} placeholder="Ej. Fondo emergencia" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Monto objetivo USD
        <input required min="0.01" step="0.01" type="number" value={values.targetAmount} onChange={(event) => onChange({ targetAmount: event.target.value })} className={inputClass} placeholder="0.00" />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Fecha objetivo
        <input type="date" value={values.targetDate} onChange={(event) => onChange({ targetDate: event.target.value })} className={inputClass} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Frecuencia de aporte
        <select value={values.frequency} onChange={(event) => onChange({ frequency: event.target.value as IncomeFrequency | '' })} className={inputClass}>
          <option value="">Sin definir</option>
          {Object.entries(frequencyLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Aporte propuesto USD
        <input min="0" step="0.01" type="number" value={values.proposed} onChange={(event) => onChange({ proposed: event.target.value })} className={inputClass} placeholder="0.00" />
      </label>
    </>
  );
}

function ContributePanel({ goal, wallets, accounts, onDone }: { goal: SavingsGoal; wallets: WalletOption[]; accounts: Account[]; onDone: () => void }) {
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [accountId, setAccountId] = useState('');
  const remaining = goal.target_amount_usd - goal.current_amount_usd;
  const [amount, setAmount] = useState(() => {
    const suggested = goal.proposed_contribution_usd > 0 ? goal.proposed_contribution_usd : remaining;
    return Math.min(suggested, remaining).toFixed(2);
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
      const result = await recordSavingsContribution({
        goalId: goal.id,
        walletId,
        accountId: accountId || null,
        amountUsd: Number(amount),
        contributionDate: date,
        notes: notes || undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'No se pudo registrar el aporte.');
        return;
      }
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 md:grid-cols-3">
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
        Monto USD (faltan ${remaining.toFixed(2)})
        <input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
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
        <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
          {isPending ? 'Registrando...' : 'Confirmar aporte'}
        </button>
        <button type="button" onClick={onDone} disabled={isPending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-60">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ContributionsHistory({ goalId }: { goalId: string }) {
  const [contributions, setContributions] = useState<SavingsContribution[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSavingsContributions(goalId).then((result) => {
      if (result.success) setContributions(result.contributions ?? []);
      else setError(result.error ?? 'Error cargando historial.');
    });
  }, [goalId]);

  if (error) return <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!contributions) return <p className="mt-3 text-sm text-slate-400">Cargando aportes...</p>;
  if (contributions.length === 0) return <p className="mt-3 text-sm text-slate-400">Sin aportes registrados.</p>;

  return (
    <ul className="mt-3 space-y-1 text-sm text-slate-600">
      {contributions.map((contribution) => (
        <li key={contribution.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span>{contribution.contribution_date}{contribution.notes ? ` · ${contribution.notes}` : ''}</span>
          <span className="font-semibold text-slate-800">${contribution.amount_usd.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

function suggestedContribution(goal: SavingsGoal): number | null {
  if (goal.proposed_contribution_usd > 0) return goal.proposed_contribution_usd;
  if (!goal.target_date) return null;
  const remaining = goal.target_amount_usd - goal.current_amount_usd;
  if (remaining <= 0) return null;
  const monthsLeft = Math.max(1, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000)));
  return remaining / monthsLeft;
}

export default function GoalsManager({ goals, spaces, wallets, accounts }: { goals: SavingsGoal[]; spaces: FinancialSpace[]; wallets: WalletOption[]; accounts: Account[] }) {
  const activeSpaces = spaces.filter((space) => space.is_active);
  const [createForm, setCreateForm] = useState<GoalFormValues>(() => emptyForm(activeSpaces[0]?.id ?? ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GoalFormValues>(() => emptyForm(''));
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toInput = (form: GoalFormValues) => ({
    spaceId: form.spaceId,
    name: form.name,
    targetAmountUsd: Number(form.targetAmount),
    targetDate: form.targetDate || null,
    contributionFrequency: form.frequency || null,
    proposedContributionUsd: form.proposed ? Number(form.proposed) : 0,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSavingsGoal(toInput(createForm));
      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la meta.');
        return;
      }
      setCreateForm(emptyForm(createForm.spaceId));
      router.refresh();
    });
  };

  const startEdit = (goal: SavingsGoal) => {
    setError(null);
    setContributingId(null);
    setEditingId(goal.id);
    setEditForm({
      spaceId: goal.space_id,
      name: goal.name,
      targetAmount: goal.target_amount_usd.toString(),
      targetDate: goal.target_date ?? '',
      frequency: goal.contribution_frequency ?? '',
      proposed: goal.proposed_contribution_usd ? goal.proposed_contribution_usd.toString() : '',
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateSavingsGoal(editingId, toInput(editForm));
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la meta.');
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  };

  const handleTogglePause = (goal: SavingsGoal) => {
    startTransition(async () => {
      const result = await updateSavingsGoal(goal.id, {
        spaceId: goal.space_id,
        name: goal.name,
        targetAmountUsd: goal.target_amount_usd,
        targetDate: goal.target_date,
        contributionFrequency: goal.contribution_frequency,
        proposedContributionUsd: goal.proposed_contribution_usd,
        status: goal.status === 'paused' ? 'active' : 'paused',
      });
      if (!result.success) setError(result.error ?? 'No se pudo cambiar el estado.');
      router.refresh();
    });
  };

  const handleDelete = (goal: SavingsGoal) => {
    if (!window.confirm(`¿Eliminar la meta "${goal.name}"? Solo es posible si no tiene aportes.`)) return;
    startTransition(async () => {
      const result = await deleteSavingsGoal(goal.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar la meta.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Metas de ahorro</h2>

      {activeSpaces.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Crea un espacio financiero antes de agregar metas.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-7">
          <GoalFormFields values={createForm} spaces={activeSpaces} onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))} />
          <div className="flex items-end">
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Crear meta'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {goals.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Aún no tienes metas de ahorro.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {goals.map((goal) => {
            const pct = goal.target_amount_usd > 0 ? Math.min(100, (goal.current_amount_usd / goal.target_amount_usd) * 100) : 0;
            const remaining = goal.target_amount_usd - goal.current_amount_usd;
            const suggested = suggestedContribution(goal);
            return (
              <div key={goal.id} className="py-3">
                {editingId === goal.id ? (
                  <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-7">
                    <GoalFormFields values={editForm} spaces={activeSpaces} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
                    <div className="flex items-end gap-2 md:col-span-3 lg:col-span-7">
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
                          {goal.name}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusLabels[goal.status].className}`}>{statusLabels[goal.status].label}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          {goal.space_name ?? 'Sin espacio'} · ${goal.current_amount_usd.toFixed(2)} de ${goal.target_amount_usd.toFixed(2)} · faltan ${remaining.toFixed(2)}
                          {goal.target_date && ` · meta ${goal.target_date}`}
                          {suggested !== null && goal.status === 'active' && ` · aporte sugerido ~$${suggested.toFixed(2)}${goal.contribution_frequency ? ` ${frequencyLabels[goal.contribution_frequency].toLowerCase()}` : '/mes'}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {goal.status === 'active' && (
                          <button type="button" onClick={() => { setContributingId(contributingId === goal.id ? null : goal.id); setEditingId(null); }} disabled={isPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
                            Aportar
                          </button>
                        )}
                        <button type="button" onClick={() => setHistoryId(historyId === goal.id ? null : goal.id)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                          Historial
                        </button>
                        {goal.status !== 'completed' && (
                          <button type="button" onClick={() => handleTogglePause(goal)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                            {goal.status === 'paused' ? 'Reanudar' : 'Pausar'}
                          </button>
                        )}
                        <button type="button" onClick={() => startEdit(goal)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDelete(goal)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{pct.toFixed(0)}% completado</p>
                  </div>
                )}
                {contributingId === goal.id && (
                  <ContributePanel goal={goal} wallets={wallets} accounts={accounts} onDone={() => setContributingId(null)} />
                )}
                {historyId === goal.id && <ContributionsHistory goalId={goal.id} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
