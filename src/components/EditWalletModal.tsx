'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wallet as WalletIcon, X, Edit2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { updateWallet, listWalletAccess } from '@/lib/actions/wallets';
import WalletAccessManager from './WalletAccessManager';

interface EditWalletModalProps {
  wallet: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface WalletAccessItem {
  userId: string;
  role: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export default function EditWalletModal({ wallet }: EditWalletModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [name, setName] = useState(wallet.name);
  const [description, setDescription] = useState(wallet.description || '');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessList, setAccessList] = useState<WalletAccessItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();
  const router = useRouter();

  const resetState = () => {
    setIsAccessOpen(false);
    setName(wallet.name);
    setDescription(wallet.description || '');
    setError(null);
    setSuccessMessage(null);
    setAccessList([]);
  };

  const loadWalletAccess = () => {
    startAccessTransition(async () => {
      const result = await listWalletAccess(wallet.id);
      if (!result.success) {
        console.error('Failed to load wallet access:', result.error);
        return;
      }
      setAccessList(result.access ?? []);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateWallet(wallet.id, name.trim(), description.trim());
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar la wallet.');
        return;
      }
      setSuccessMessage('Wallet actualizada exitosamente.');
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        resetState();
      }, 400);
    });
  };


  const displayUserName = (user: { fullName: string | null; username: string | null }) => {
    if (user.fullName && user.username) {
      return `${user.fullName} (@${user.username})`;
    }
    if (user.fullName) {
      return user.fullName;
    }
    if (user.username) {
      return `@${user.username}`;
    }
    return 'Usuario sin nombre';
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center gap-2"
      >
        <Edit2 size={14} />
        Editar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setIsOpen(false);
                resetState();
              }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <WalletIcon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Editar Wallet</h3>
                <p className="text-sm text-slate-500">Actualiza la información de tu wallet.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-slate-600">Nombre</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Wallet Principal"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional. Describe el propósito de la wallet"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 text-red-600 px-3 py-2 text-sm">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
                    {successMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setIsOpen(false);
                      resetState();
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 disabled:opacity-70"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Edit2 size={18} />
                        Actualizar Wallet
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccessOpen(!isAccessOpen);
                    if (!isAccessOpen) {
                      loadWalletAccess();
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                >
                  <span className="text-sm font-medium text-slate-700">Gestionar Accesos</span>
                  <Plus size={18} className={`text-slate-500 transition-transform ${isAccessOpen ? 'rotate-45' : ''}`} />
                </button>

                {isAccessOpen && (
                  <div className="mt-4">
                    <WalletAccessManager 
                      walletId={wallet.id} 
                      initialAccess={accessList.map(item => ({
                        id: item.userId,
                        username: item.username,
                        fullName: item.fullName,
                        avatarUrl: item.avatarUrl,
                        role: item.role as 'owner' | 'editor' | 'viewer'
                      }))}
                      onAccessChange={loadWalletAccess}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
    </>
  );
}
