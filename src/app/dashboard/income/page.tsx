import TransactionPage from '@/components/TransactionPage';

export default async function IncomePage({ searchParams }: { searchParams: Promise<{ walletId?: string }> }) {
  const { walletId } = await searchParams;
  return <TransactionPage type="income" initialWalletId={walletId} />;
}
