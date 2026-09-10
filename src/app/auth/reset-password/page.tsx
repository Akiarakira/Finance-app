'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setSessionReady(true);
      if (!data.session) setError('El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo.');
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setSessionReady(true);
      if (session) setError(null);
    });

    loadSession();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!hasSession) {
      setError('No hay una sesión de recuperación activa. Solicita un nuevo enlace desde el inicio de sesión.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Contraseña actualizada. Redirigiendo al dashboard...');
    setTimeout(() => router.push('/dashboard'), 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Cambiar contraseña</h1>
          <p className="mt-2 text-sm text-slate-500">Crea una nueva contraseña para tu cuenta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            minLength={6}
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border bg-slate-50 p-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <input
            required
            minLength={6}
            type="password"
            placeholder="Repite la contraseña"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="w-full rounded-lg border bg-slate-50 p-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

          <button type="submit" disabled={loading || !sessionReady} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {loading || !sessionReady ? <Loader2 className="animate-spin" size={18} /> : null}
            {!sessionReady ? 'Verificando enlace...' : loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
