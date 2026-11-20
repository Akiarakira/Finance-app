'use server';

import { createClient } from '@/lib/supabase';

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'binance' | 'bs' | 'cash_usd' | 'other';
export type Currency = 'USD' | 'USDT' | 'VES' | 'EUR';

export interface WalletOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface TransactionRecord {
  id: string;
  wallet_id: string;
  created_by: string;
  created_by_name: string | null;
  created_by_email: string | null;
  tag_id: string | null;
  type: TransactionType;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  description: string | null;
  transaction_date: string;
  category_name: string | null;
  income_source_id: string | null;
  income_source_name: string | null;
  account_id: string | null;
  account_name: string | null;
  custody_fund_id: string | null;
  custody_fund_name: string | null;
  space_id: string | null;
  space_name: string | null;
}

export interface TransactionInput {
  walletId: string;
  categoryId?: string | null;
  incomeSourceId?: string | null;
  accountId?: string | null;
  custodyFundId?: string | null;
  type: TransactionType;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  description?: string;
  transactionDate: string;
  comparisonBcvUsd?: number | null;
  comparisonCashUsd?: number | null;
  comparisonCashVes?: number | null;
  comparisonBinanceRate?: number | null;
}

export async function listAccessibleWallets(): Promise<{ success: boolean; wallets?: WalletOption[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { success: false, error: 'Debes iniciar sesión para continuar.' };
    }

    const { data: permissions, error: permissionsError } = await supabase
      .from('wallet_permissions')
      .select('wallet_id')
      .eq('user_id', authData.user.id);

    if (permissionsError) {
      return { success: false, error: permissionsError.message };
    }

    const permittedIds = (permissions ?? []).map((permission) => permission.wallet_id);
    const query = supabase.from('wallets').select('id, name').order('created_at', { ascending: false });
    const { data: wallets, error: walletsError } = permittedIds.length > 0
      ? await query.in('id', permittedIds)
      : await query.eq('created_by', authData.user.id);

    if (walletsError) {
      return { success: false, error: walletsError.message };
    }

    return { success: true, wallets: wallets ?? [] };
  } catch (error) {
    console.error('listAccessibleWallets error:', error);
    return { success: false, error: 'No se pudieron cargar las wallets.' };
  }
}

export async function listCategories(walletId?: string): Promise<{ success: boolean; categories?: CategoryOption[]; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase.from('tags').select('id, name').order('name');
    if (walletId) query = query.eq('wallet_id', walletId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, categories: data ?? [] };
  } catch (error) {
    console.error('listCategories error:', error);
    return { success: false, error: 'No se pudieron cargar las categorías.' };
  }
}

export async function createCategory(name: string, walletId?: string | null): Promise<{ success: boolean; category?: CategoryOption; error?: string }> {
  const normalizedName = name.trim();
  if (!normalizedName) return { success: false, error: 'El nombre de la categoría es obligatorio.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear categorías.' };

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: normalizedName, wallet_id: walletId })
      .select('id, name')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear la categoría.' };
    return { success: true, category: data };
  } catch (error) {
    console.error('createCategory error:', error);
    return { success: false, error: 'Ocurrió un error creando la categoría.' };
  }
}

export async function createTransaction(input: TransactionInput): Promise<{ success: boolean; transaction?: { id: string }; error?: string }> {
  if (!input.walletId || !input.transactionDate || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, error: 'Wallet, fecha y un monto mayor que cero son obligatorios.' };
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para registrar movimientos.' };

    let accountSpaceId: string | null = null;
    if (input.accountId) {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, space_id')
        .eq('id', input.accountId)
        .maybeSingle();

      if (accountError) return { success: false, error: accountError.message };
      if (!account) return { success: false, error: 'La cuenta seleccionada no existe o no tienes acceso a ella.' };
      accountSpaceId = account.space_id;
    }

    if (input.custodyFundId) {
      const { data: fund, error: fundError } = await supabase
        .from('custody_funds')
        .select('id, space_id')
        .eq('id', input.custodyFundId)
        .maybeSingle();

      if (fundError) return { success: false, error: fundError.message };
      if (!fund) return { success: false, error: 'El fondo de custodia seleccionado no existe o no tienes acceso.' };
      if (!accountSpaceId) accountSpaceId = fund.space_id;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        wallet_id: input.walletId,
        created_by: authData.user.id,
        tag_id: input.categoryId || null,
        income_source_id: input.type === 'income' ? input.incomeSourceId || null : null,
        account_id: input.accountId || null,
        space_id: accountSpaceId,
        custody_fund_id: input.custodyFundId || null,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        payment_method: input.paymentMethod,
        description: input.description?.trim() || null,
        transaction_date: input.transactionDate,
        comparison_bcv_usd: input.comparisonBcvUsd ?? null,
        comparison_cash_usd: input.comparisonCashUsd ?? null,
        comparison_cash_ves: input.comparisonCashVes ?? null,
        comparison_binance_rate: input.comparisonBinanceRate ?? null,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo registrar el movimiento.' };
    return { success: true, transaction: data };
  } catch (error) {
    console.error('createTransaction error:', error);
    return { success: false, error: 'Ocurrió un error registrando el movimiento.' };
  }
}

export async function listTransactions(type?: TransactionType): Promise<{ success: boolean; transactions?: TransactionRecord[]; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('transactions')
      .select('id, wallet_id, created_by, tag_id, income_source_id, account_id, custody_fund_id, space_id, type, amount, currency, payment_method, description, transaction_date, tag:tags(name), income_source:income_sources(name), account:accounts(name), custody_fund:custody_funds(beneficiary_name), space:financial_spaces(name)')
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const creatorIds = [...new Set((data ?? []).map((item) => item.created_by))];
    const { data: creators } = creatorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, username, email').in('id', creatorIds)
      : { data: [] };
    const creatorsMap = new Map((creators ?? []).map((creator) => [creator.id, creator]));

    const transactions = (data ?? []).map((item) => {
      const tag = Array.isArray(item.tag) ? item.tag[0] : item.tag;
      const incomeSource = Array.isArray(item.income_source) ? item.income_source[0] : item.income_source;
      const account = Array.isArray(item.account) ? item.account[0] : item.account;
      const custodyFund = Array.isArray(item.custody_fund) ? item.custody_fund[0] : item.custody_fund;
      const space = Array.isArray(item.space) ? item.space[0] : item.space;
      const creator = creatorsMap.get(item.created_by);
      return {
        ...item,
        amount: Number(item.amount),
        category_name: tag?.name ?? null,
        income_source_name: incomeSource?.name ?? null,
        account_name: account?.name ?? null,
        custody_fund_name: custodyFund?.beneficiary_name ?? null,
        space_name: space?.name ?? null,
        created_by_name: creator?.full_name || creator?.username || null,
        created_by_email: creator?.email ?? null,
      } as TransactionRecord;
    });

    return { success: true, transactions };
  } catch (error) {
    console.error('listTransactions error:', error);
    return { success: false, error: 'No se pudieron cargar los movimientos.' };
  }
}

export async function getMonthlySummary(month: string): Promise<{
  success: boolean;
  summary?: {
    income: number;
    expenses: number;
    balance: number;
    byCategory: Array<{ name: string; amount: number }>;
    byPaymentMethod: Array<{ name: string; amount: number }>;
  };
  error?: string;
}> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, error: 'El mes no tiene un formato válido.' };

  try {
    const supabase = await createClient();
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, payment_method, custody_fund_id, tag:tags(name)')
      .gte('transaction_date', start)
      .lt('transaction_date', end);

    if (error) return { success: false, error: error.message };

    let income = 0;
    let expenses = 0;
    const categoryTotals = new Map<string, number>();
    const paymentTotals = new Map<string, number>();

    for (const item of data ?? []) {
      // Los movimientos de custodia no son ingreso ni gasto del hogar.
      if (item.custody_fund_id) continue;
      const amount = Number(item.amount) || 0;
      if (item.type === 'income') income += amount;
      if (item.type === 'expense') expenses += amount;
      if (item.type !== 'expense') continue;

      const tag = Array.isArray(item.tag) ? item.tag[0] : item.tag;
      const categoryName = tag?.name ?? 'Sin categoría';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + amount);
      paymentTotals.set(item.payment_method, (paymentTotals.get(item.payment_method) ?? 0) + amount);
    }

    return {
      success: true,
      summary: {
        income,
        expenses,
        balance: income - expenses,
        byCategory: [...categoryTotals.entries()].map(([name, amount]) => ({ name, amount })),
        byPaymentMethod: [...paymentTotals.entries()].map(([name, amount]) => ({ name, amount })),
      },
    };
  } catch (error) {
    console.error('getMonthlySummary error:', error);
    return { success: false, error: 'No se pudo generar el resumen mensual.' };
  }
}
