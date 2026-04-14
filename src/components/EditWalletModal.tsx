'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wallet as WalletIcon, X, Edit2, Plus } from 'lucide-react';
import {
  grantWalletAccess,
  listWalletAccess,
  revokeWalletAccess,
  searchUsersForWalletAccess,
  updateWallet,
  updateWalletAccessRole,
} from '@/lib/actions/wallets';

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

interface SearchUserItem {
  id: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRole, setSearchRole] = useState<'editor' | 'viewer'>('viewer');
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
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
    setSearchQuery('');
    setSearchRole('viewer');
    setSearchResults([]);
    setAccessError(null);
    setAccessMessage(null);
  };

  const loadWalletAccess = () => {
    setAccessError(null);
    startAccessTransition(async () => {
      const result = await listWalletAccess(wallet.id);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudieron cargar los accesos.');
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

  const handleSearchUsers = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccessError(null);
    setAccessMessage(null);

    startAccessTransition(async () => {
      const result = await searchUsersForWalletAccess(wallet.id, searchQuery.trim());
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudieron buscar usuarios.');
        return;
      }

      setSearchResults(result.users ?? []);
      if ((result.users ?? []).length === 0) {
        setAccessMessage('No se encontraron usuarios disponibles para agregar.');
      }
    });
  };

  const handleGrantAccess = (targetUserId: string) => {
    setAccessError(null);
    setAccessMessage(null);

    startAccessTransition(async () => {
      const result = await grantWalletAccess(wallet.id, targetUserId, searchRole);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo agregar el acceso.');
        return;
      }

      setAccessMessage('Acceso agregado correctamente.');
      setSearchResults((prev) => prev.filter((user) => user.id !== targetUserId));
      loadWalletAccess();
      router.refresh();
    });
  };

  const handleUpdateRole = (targetUserId: string, role: 'editor' | 'viewer') => {
    setAccessError(null);
    setAccessMessage(null);

    startAccessTransition(async () => {
      const result = await updateWalletAccessRole(wallet.id, targetUserId, role);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo actualizar el rol.');
        return;
      }

      setAccessMessage('Rol actualizado correctamente.');
      loadWalletAccess();
      router.refresh();
    });
  };

  const handleRevokeAccess = (targetUserId: string) => {
    setAccessError(null);
    setAccessMessage(null);

    startAccessTransition(async () => {
      const result = await revokeWalletAccess(wallet.id, targetUserId);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo revocar el acceso.');
        return;
      }

      setAccessMessage('Acceso revocado correctamente.');
      loadWalletAccess();
      router.refresh();
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
                  <div className="mt-4 space-y-5">
                    <form onSubmit={handleSearchUsers} className="space-y-3">
                      <label className="text-sm font-medium text-slate-600">Buscar usuario por nombre o username</label>
                      <div className="flex gap-2">
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Ej. juan o @juan"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={searchRole}
                          onChange={(e) => setSearchRole(e.target.value as 'editor' | 'viewer')}
                          className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-70"
                          disabled={isAccessPending || searchQuery.trim().length < 2}
                        >
                          Buscar
                        </button>
                      </div>
                    </form>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Resultados</p>
                        {searchResults.map((user) => (
                          <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                            <span className="text-sm text-slate-700">{displayUserName(user)}</span>
                            <button
                              type="button"
                              onClick={() => handleGrantAccess(user.id)}
                              className="text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-70"
                              disabled={isAccessPending}
                            >
                              Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Usuarios con acceso</p>
                      {isAccessPending && accessList.length === 0 && (
                        <div className="text-sm text-slate-500">Cargando accesos...</div>
                      )}
                      {accessList.length === 0 && !isAccessPending && (
                        <div className="text-sm text-slate-500">Solo tú tienes acceso a esta wallet.</div>
                      )}

                      {accessList.map((entry) => {
                        const isOwner = entry.role === 'owner';
                        return (
                          <div key={entry.userId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 gap-3">
                            <span className="text-sm text-slate-700 flex-1">{displayUserName(entry)}</span>
                            {isOwner ? (
                              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Propietario</span>
                            ) : (
                              <>
                                <select
                                  value={entry.role}
                                  onChange={(e) => handleUpdateRole(entry.userId, e.target.value as 'editor' | 'viewer')}
                                  className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                                  disabled={isAccessPending}
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAccess(entry.userId)}
                                  className="text-sm px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                                  disabled={isAccessPending}
                                >
                                  Quitar
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {accessError && (
                      <div className="rounded-lg bg-red-50 text-red-600 px-3 py-2 text-sm">
                        {accessError}
                      </div>
                    )}

                    {accessMessage && (
                      <div className="rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
                        {accessMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
    </>
  );
}
