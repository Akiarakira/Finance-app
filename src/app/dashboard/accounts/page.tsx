import { createClient } from '@/lib/supabase';
import { getOrCreatePersonalSpace, listFinancialSpaces } from '@/lib/actions/financial-spaces';
import { listAccounts } from '@/lib/actions/accounts';
import { listCustodyFunds } from '@/lib/actions/custody-funds';
import SpacesManager from '@/components/SpacesManager';
import AccountsManager from '@/components/AccountsManager';
import CustodyFundsManager from '@/components/CustodyFundsManager';

export default async function AccountsPage() {
  await getOrCreatePersonalSpace();

  const [spacesResult, accountsResult, fundsResult] = await Promise.all([
    listFinancialSpaces(),
    listAccounts(true),
    listCustodyFunds(),
  ]);

  const spaces = spacesResult.spaces ?? [];
  const accounts = accountsResult.accounts ?? [];
  const funds = fundsResult.funds ?? [];

  const balances = new Map<string, number>(accounts.map((account) => [account.id, account.current_balance]));
  const fundBalances = new Map<string, number>(funds.map((fund) => [fund.id, fund.current_balance_usd]));

  if (accounts.length > 0 || funds.length > 0) {
    const supabase = await createClient();
    const movementFilters: string[] = [];
    if (accounts.length > 0) movementFilters.push(`account_id.in.(${accounts.map((account) => account.id).join(',')})`);
    if (funds.length > 0) movementFilters.push(`custody_fund_id.in.(${funds.map((fund) => fund.id).join(',')})`);

    const { data: movements, error: movementsError } = await supabase
      .from('transactions')
      .select('account_id, custody_fund_id, type, amount')
      .or(movementFilters.join(','));

    if (movementsError) {
      console.error('Accounts page balances error:', movementsError.message);
    } else {
      for (const movement of movements ?? []) {
        const amount = Number(movement.amount) || 0;
        if (movement.account_id) {
          const current = balances.get(movement.account_id) ?? 0;
          balances.set(movement.account_id, movement.type === 'income' ? current + amount : current - amount);
        }
        if (movement.custody_fund_id) {
          const current = fundBalances.get(movement.custody_fund_id) ?? 0;
          fundBalances.set(movement.custody_fund_id, movement.type === 'income' ? current + amount : current - amount);
        }
      }
    }
  }

  const accountsWithBalance = accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? account.current_balance,
  }));
  const fundsWithBalance = funds.map((fund) => ({
    ...fund,
    balance: fundBalances.get(fund.id) ?? fund.current_balance_usd,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Espacios y cuentas</h1>
        <p className="text-slate-500">Organiza tu dinero por espacio financiero y administra tus cuentas.</p>
      </div>

      {(spacesResult.error || accountsResult.error || fundsResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {spacesResult.error ?? accountsResult.error ?? fundsResult.error}
        </div>
      )}

      <SpacesManager spaces={spaces} />
      <AccountsManager accounts={accountsWithBalance} spaces={spaces} />
      <CustodyFundsManager funds={fundsWithBalance} spaces={spaces} />
    </div>
  );
}
