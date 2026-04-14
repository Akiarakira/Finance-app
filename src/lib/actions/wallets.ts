'use server';

import { createClient, createAdminClient } from '@/lib/supabase';

interface CreateWalletResult {
  success: boolean;
  error?: string;
  wallet?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export async function listWalletAccess(walletId: string): Promise<WalletAccessResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const hasAccessManagementPermission = await canManageWalletAccess(supabase, walletId, user.id);
    if (!hasAccessManagementPermission) {
      return { success: false, error: 'No tienes permiso para gestionar accesos de esta wallet.' };
    }

    const { data: permissions, error: permissionsError } = await supabase
      .from('wallet_permissions')
      .select('user_id, role')
      .eq('wallet_id', walletId);

    if (permissionsError) {
      return { success: false, error: permissionsError.message || 'No se pudieron obtener los accesos.' };
    }

    const userIds = (permissions ?? []).map((p) => p.user_id);
    if (userIds.length === 0) {
      return { success: true, access: [] };
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      return { success: false, error: profilesError.message || 'No se pudieron obtener los perfiles.' };
    }

    const profilesMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const access: WalletAccessEntry[] = (permissions ?? []).map((permission) => {
      const profile = profilesMap.get(permission.user_id);
      return {
        userId: permission.user_id,
        role: permission.role,
        username: profile?.username ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      };
    });

    return { success: true, access };
  } catch (error) {
    console.error('listWalletAccess error:', error);
    return { success: false, error: 'Ocurrió un error obteniendo los accesos de la wallet.' };
  }
}

export async function searchUsersForWalletAccess(walletId: string, query: string): Promise<SearchWalletUsersResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const hasAccessManagementPermission = await canManageWalletAccess(supabase, walletId, user.id);
    if (!hasAccessManagementPermission) {
      return { success: false, error: 'No tienes permiso para gestionar accesos de esta wallet.' };
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return { success: true, users: [] };
    }

    const { data: permissions } = await supabase
      .from('wallet_permissions')
      .select('user_id')
      .eq('wallet_id', walletId);

    const existingUserIds = new Set((permissions ?? []).map((permission) => permission.user_id));

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${normalizedQuery}%,full_name.ilike.%${normalizedQuery}%`)
      .limit(20);

    if (profilesError) {
      return { success: false, error: profilesError.message || 'No se pudieron buscar usuarios.' };
    }

    const users = (profiles ?? [])
      .filter((profile) => !existingUserIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        username: profile.username ?? null,
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
      }));

    return { success: true, users };
  } catch (error) {
    console.error('searchUsersForWalletAccess error:', error);
    return { success: false, error: 'Ocurrió un error buscando usuarios.' };
  }
}

export async function grantWalletAccess(
  walletId: string,
  targetUserId: string,
  role: 'editor' | 'viewer',
): Promise<WalletAccessMutationResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const hasAccessManagementPermission = await canManageWalletAccess(supabase, walletId, user.id);
    if (!hasAccessManagementPermission) {
      return { success: false, error: 'No tienes permiso para gestionar accesos de esta wallet.' };
    }

    if (targetUserId === user.id) {
      return { success: false, error: 'Ya eres el propietario de esta wallet.' };
    }

    const { error: upsertError } = await supabase.from('wallet_permissions').upsert(
      {
        wallet_id: walletId,
        user_id: targetUserId,
        role,
      },
      { onConflict: 'wallet_id,user_id' },
    );

    if (upsertError) {
      return { success: false, error: upsertError.message || 'No se pudo asignar el acceso.' };
    }

    return { success: true };
  } catch (error) {
    console.error('grantWalletAccess error:', error);
    return { success: false, error: 'Ocurrió un error asignando acceso a la wallet.' };
  }
}

export async function updateWalletAccessRole(
  walletId: string,
  targetUserId: string,
  role: 'editor' | 'viewer',
): Promise<WalletAccessMutationResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const hasAccessManagementPermission = await canManageWalletAccess(supabase, walletId, user.id);
    if (!hasAccessManagementPermission) {
      return { success: false, error: 'No tienes permiso para gestionar accesos de esta wallet.' };
    }

    const { data: existingPermission } = await supabase
      .from('wallet_permissions')
      .select('role')
      .eq('wallet_id', walletId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!existingPermission) {
      return { success: false, error: 'El usuario no tiene acceso asignado en esta wallet.' };
    }

    if (existingPermission.role === 'owner') {
      return { success: false, error: 'No puedes cambiar el rol del propietario.' };
    }

    const { error: updateError } = await supabase
      .from('wallet_permissions')
      .update({ role })
      .eq('wallet_id', walletId)
      .eq('user_id', targetUserId);

    if (updateError) {
      return { success: false, error: updateError.message || 'No se pudo actualizar el rol.' };
    }

    return { success: true };
  } catch (error) {
    console.error('updateWalletAccessRole error:', error);
    return { success: false, error: 'Ocurrió un error actualizando el rol del usuario.' };
  }
}

export async function revokeWalletAccess(walletId: string, targetUserId: string): Promise<WalletAccessMutationResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const hasAccessManagementPermission = await canManageWalletAccess(supabase, walletId, user.id);
    if (!hasAccessManagementPermission) {
      return { success: false, error: 'No tienes permiso para gestionar accesos de esta wallet.' };
    }

    const { data: existingPermission } = await supabase
      .from('wallet_permissions')
      .select('role')
      .eq('wallet_id', walletId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!existingPermission) {
      return { success: true };
    }

    if (existingPermission.role === 'owner') {
      return { success: false, error: 'No puedes eliminar el acceso del propietario.' };
    }

    const { error: deleteError } = await supabase
      .from('wallet_permissions')
      .delete()
      .eq('wallet_id', walletId)
      .eq('user_id', targetUserId);

    if (deleteError) {
      return { success: false, error: deleteError.message || 'No se pudo revocar el acceso.' };
    }

    return { success: true };
  } catch (error) {
    console.error('revokeWalletAccess error:', error);
    return { success: false, error: 'Ocurrió un error revocando acceso de la wallet.' };
  }
}

interface UpdateWalletResult {
  success: boolean;
  error?: string;
  wallet?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface DeleteWalletResult {
  success: boolean;
  error?: string;
}

interface WalletAccessEntry {
  userId: string;
  role: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

interface WalletAccessResult {
  success: boolean;
  error?: string;
  access?: WalletAccessEntry[];
}

interface SearchWalletUsersResult {
  success: boolean;
  error?: string;
  users?: Array<{
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  }>;
}

interface WalletAccessMutationResult {
  success: boolean;
  error?: string;
}

async function canManageWalletAccess(supabase: Awaited<ReturnType<typeof createClient>>, walletId: string, userId: string) {
  const { data: permission } = await supabase
    .from('wallet_permissions')
    .select('role')
    .eq('wallet_id', walletId)
    .eq('user_id', userId)
    .maybeSingle();

  if (permission?.role === 'owner') {
    return true;
  }

  const { data: walletOwnerRecord } = await supabase
    .from('wallets')
    .select('created_by')
    .eq('id', walletId)
    .maybeSingle();

  return walletOwnerRecord?.created_by === userId;
}

export async function createWallet(name: string, description: string): Promise<CreateWalletResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' });

    if (profileError) {
      console.error('createWallet profile upsert error:', profileError);
      return { success: false, error: 'No se pudo sincronizar el perfil del usuario.' };
    }

    const {
      data: wallet,
      error: walletError,
    } = await supabase
      .from('wallets')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (walletError || !wallet) {
      return { success: false, error: walletError?.message || 'No se pudo crear la wallet.' };
    }

    const { error: permissionError } = await supabase
      .from('wallet_permissions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        role: 'owner',
      });

    if (permissionError) {
      return { success: false, error: permissionError.message };
    }

    return {
      success: true,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        description: wallet.description ?? null,
      },
    };
  } catch (error) {
    console.error('createWallet error:', error);
    return { success: false, error: 'Ocurrió un error creando la wallet.' };
  }
}

export async function updateWallet(id: string, name: string, description: string): Promise<UpdateWalletResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    // Check if user has permission to edit this wallet
    const { data: permission, error: permissionError } = await supabase
      .from('wallet_permissions')
      .select('role')
      .eq('wallet_id', id)
      .eq('user_id', user.id)
      .single();

    if (permissionError || !permission) {
      return { success: false, error: 'No tienes permiso para editar esta wallet.' };
    }

    if (permission.role !== 'owner') {
      return { success: false, error: 'Solo el propietario puede editar la wallet.' };
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (walletError || !wallet) {
      return { success: false, error: walletError?.message || 'No se pudo actualizar la wallet.' };
    }

    return {
      success: true,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        description: wallet.description ?? null,
      },
    };
  } catch (error) {
    console.error('updateWallet error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la wallet.' };
  }
}

export async function deleteWallet(id: string): Promise<DeleteWalletResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    // Check permissions first using regular client
    const { data: permission, error: permissionError } = await supabase
      .from('wallet_permissions')
      .select('role')
      .eq('wallet_id', id)
      .eq('user_id', user.id)
      .single();

    if (permissionError || !permission) {
      const { data: walletOwnerRecord, error: walletOwnerError } = await supabase
        .from('wallets')
        .select('created_by')
        .eq('id', id)
        .single();

      if (walletOwnerError || !walletOwnerRecord || walletOwnerRecord.created_by !== user.id) {
        return { success: false, error: 'No tienes permiso para eliminar esta wallet.' };
      }
    } else if (permission.role !== 'owner') {
      return { success: false, error: 'Solo el propietario puede eliminar la wallet.' };
    }

    let deleteClient = supabase;
    let usingAdminClient = false;

    try {
      deleteClient = createAdminClient() as typeof supabase;
      usingAdminClient = true;
    } catch {
      usingAdminClient = false;
    }

    // First, try deleting wallet while owner permission row still exists.
    // Some RLS policies for wallets depend on wallet_permissions(owner).
    const { data: deletedWallets, error: walletDeleteError } = await deleteClient
      .from('wallets')
      .delete()
      .eq('id', id)
      .select('id');

    if (!walletDeleteError && (deletedWallets?.length ?? 0) > 0) {
      return { success: true };
    }

    if (!walletDeleteError && !usingAdminClient && (deletedWallets?.length ?? 0) === 0) {
      return {
        success: false,
        error:
          'No se pudo eliminar por políticas RLS. Configura DELETE policies en Supabase para wallets y wallet_permissions o agrega SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    // If direct wallet delete failed (e.g. FK restriction), try deleting permissions then retry.
    const { data: deletedPermissions, error: permDeleteError } = await deleteClient
      .from('wallet_permissions')
      .delete()
      .eq('wallet_id', id)
      .select('id');

    if (permDeleteError) {
      return { success: false, error: permDeleteError.message || 'No se pudieron eliminar los permisos.' };
    }

    if (!usingAdminClient && (deletedPermissions?.length ?? 0) === 0) {
      return {
        success: false,
        error:
          'No se pudo eliminar por políticas RLS. Configura DELETE policies en Supabase para wallets y wallet_permissions o agrega SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    const { data: deletedWalletsRetry, error: walletDeleteRetryError } = await deleteClient
      .from('wallets')
      .delete()
      .eq('id', id)
      .select('id');

    if (walletDeleteRetryError) {
      return { success: false, error: walletDeleteRetryError.message || 'No se pudo eliminar la wallet.' };
    }

    if (!usingAdminClient && (deletedWalletsRetry?.length ?? 0) === 0) {
      return {
        success: false,
        error:
          'No se pudo eliminar la wallet por RLS en wallets después de borrar permisos. Ajusta la policy de DELETE en wallets para permitir al creador (created_by = auth.uid()) o configura SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    // Verify deletion with visibility checks (RLS can hide deleted rows)
    const { data: checkWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!checkWallet) {
      return { success: true };
    }

    const { data: remainingPermission } = await supabase
      .from('wallet_permissions')
      .select('id')
      .eq('wallet_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!remainingPermission) {
      return { success: true };
    }

    return { success: false, error: 'No se pudo eliminar la wallet.' };
  } catch (error) {
    console.error('deleteWallet error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la wallet.' };
  }
}
