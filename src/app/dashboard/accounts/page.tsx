import { createClient } from '@/lib/supabase';
import { getOrCreatePersonalSpace, listFinancialSpaces } from '@/lib/actions/financial-spaces';
import { listAccounts } from '@/lib/actions/accounts';
import SpacesManager from '@/components/SpacesManager';
import AccountsManager from '@/components/AccountsManager';

export default async function AccountsPage() {
  await getOrCreatePersonalSpace();

  const [spacesResult, accountsResult] = await Promise.all([
    listFinancialSpaces(),
    listAccounts(true),
  ]);

  const spaces = spacesResult.spaces ?? [];
  const accounts = accountsResult.accounts ?? [];

  const balances = new Map<string, number>(accounts.map((account) => [account.id, account.current_balance]));
  if (accounts.length > 0) {
    const supabase = await createClient();
    const { data: movements, error: movementsError } = await supabase
      .from('transactions')
      .select('account_id, type, amount')
      .in('account_id', accounts.map((account) => account.id));

    if (movementsError) {
      console.error('Accounts page balances error:', movementsError.message);
    } else {
      for (const movement of movements ?? []) {
        if (!movement.account_id) continue;
        const amount = Number(movement.amount) || 0;
        const current = balances.get(movement.account_id) ?? 0;
        balances.set(movement.account_id, movement.type === 'income' ? current + amount : current - amount);
      }
    }
  }

  const accountsWithBalance = accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? account.current_balance,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Espacios y cuentas</h1>
        <p className="text-slate-500">Organiza tu dinero por espacio financiero y administra tus cuentas.</p>
      </div>

      {(spacesResult.error || accountsResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {spacesResult.error ?? accountsResult.error}
        </div>
      )}

      <SpacesManager spaces={spaces} />
      <AccountsManager accounts={accountsWithBalance} spaces={spaces} />
    </div>
  );
}
