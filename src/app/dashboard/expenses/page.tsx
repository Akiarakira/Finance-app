import TransactionPage from '@/components/TransactionPage';

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ walletId?: string }> }) {
  const { walletId } = await searchParams;
  return <TransactionPage type="expense" initialWalletId={walletId} />;
}
