'use client';

import { useState, useTransition } from 'react';
import { Search, Plus, User, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import { searchUsersForWalletAccess, grantWalletAccess, updateWalletAccessRole, revokeWalletAccess } from '@/lib/actions/wallets';

interface WalletUser {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

interface WalletAccessManagerProps {
  walletId: string;
  initialAccess?: WalletUser[];
  onAccessChange?: () => void;
}

export default function WalletAccessManager({ walletId, initialAccess = [], onAccessChange }: WalletAccessManagerProps) {
  const [accessList, setAccessList] = useState<WalletUser[]>(initialAccess);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WalletUser[]>([]);
  const [isSearching, isSearchingTransition] = useTransition();
  const [isUpdating, isUpdatingTransition] = useTransition();
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const handleSearchUsers = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccessError(null);
    setAccessMessage(null);

    console.log('WalletAccessManager: Starting user search with query:', searchQuery.trim(), 'walletId:', walletId);

    isSearchingTransition(async () => {
      console.log('WalletAccessManager: Calling searchUsersForWalletAccess...');
      const result = await searchUsersForWalletAccess(walletId, searchQuery.trim());
      console.log('WalletAccessManager: Search result:', result);
      
      if (!result.success) {
        console.log('WalletAccessManager: Search failed:', result.error);
        setAccessError(result.error ?? 'No se pudieron buscar usuarios.');
        return;
      }

      console.log('WalletAccessManager: Setting search results:', result.users);
      setSearchResults(result.users ?? []);
      if ((result.users ?? []).length === 0) {
        console.log('WalletAccessManager: No users found, showing message');
        setAccessMessage('No se encontraron usuarios disponibles para agregar.');
      }
    });
  };

  const handleGrantAccess = (targetUserId: string) => {
    setAccessError(null);
    setAccessMessage(null);

    isUpdatingTransition(async () => {
      const result = await grantWalletAccess(walletId, targetUserId, 'editor');
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo otorgar acceso.');
        return;
      }

      setAccessMessage('Acceso otorgado exitosamente.');
      setSearchResults(searchResults.filter(user => user.id !== targetUserId));
      onAccessChange?.();
    });
  };

  const handleUpdateRole = (targetUserId: string, newRole: 'editor' | 'viewer') => {
    setAccessError(null);
    setAccessMessage(null);

    isUpdatingTransition(async () => {
      const result = await updateWalletAccessRole(walletId, targetUserId, newRole);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo actualizar el rol.');
        return;
      }

      setAccessMessage('Rol actualizado exitosamente.');
      onAccessChange?.();
    });
  };

  const handleRevokeAccess = (targetUserId: string) => {
    setAccessError(null);
    setAccessMessage(null);

    isUpdatingTransition(async () => {
      const result = await revokeWalletAccess(walletId, targetUserId);
      if (!result.success) {
        setAccessError(result.error ?? 'No se pudo revocar el acceso.');
        return;
      }

      setAccessMessage('Acceso revocado exitosamente.');
      onAccessChange?.();
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Users */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Agregar Acceso</h4>
        <form onSubmit={handleSearchUsers} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {isSearching ? (
              <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Search size={16} />
            )}
            Buscar
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            {searchResults.map((user) => (
              <div key={user.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.fullName || user.username || 'Usuario'}
                    </p>
                    {user.username && user.fullName && (
                      <p className="text-xs text-slate-500">@{user.username}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleGrantAccess(user.id)}
                  disabled={isUpdating}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
                >
                  <Plus size={14} />
                  Agregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Access */}
      {accessList.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Accesos Actuales</h4>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            {accessList.map((user) => (
              <div key={user.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <User size={16} className="text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {user.fullName || user.username || 'Usuario'}
                      </p>
                      {user.username && user.fullName && (
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as 'editor' | 'viewer')}
                      disabled={isUpdating || user.role === 'owner'}
                      className="px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {user.role !== 'owner' && (
                      <button
                        onClick={() => handleRevokeAccess(user.id)}
                        disabled={isUpdating}
                        className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {accessError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {accessError}
        </div>
      )}
      {accessMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {accessMessage}
        </div>
      )}
    </div>
  );
}
