'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  };

  return (
    <button onClick={handleLogout} disabled={isPending} className="flex w-full items-center gap-3 rounded-lg p-3 text-red-500 transition-all hover:bg-red-50 disabled:opacity-60">
      <span aria-hidden="true">↪</span>
      <span>{isPending ? 'Cerrando...' : 'Cerrar Sesión'}</span>
    </button>
  );
}
