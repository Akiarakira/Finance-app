-- Corrige la recursión infinita entre las policies de wallets
-- y wallet_permissions.
-- Ejecutar completo en Supabase.

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_permissions ENABLE ROW LEVEL SECURITY;

-- Elimina las policies anteriores de ambas tablas para evitar que una
-- policy antigua siga consultando la otra tabla de forma recursiva.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('wallets', 'wallet_permissions')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  END LOOP;
END $$;

-- Estas funciones son SECURITY DEFINER y consultan las tablas sin volver
-- a evaluar sus policies RLS. Así se evita la recursión wallets <-> permisos.
CREATE OR REPLACE FUNCTION public.is_wallet_owner(target_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wallets
    WHERE wallets.id = target_wallet_id
      AND wallets.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_wallet_permission(target_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wallet_permissions
    WHERE wallet_permissions.wallet_id = target_wallet_id
      AND wallet_permissions.user_id = auth.uid()
  );
$$;

-- Policies de wallets: no consultan directamente wallet_permissions.
CREATE POLICY "Wallet owners and members can view wallets"
ON public.wallets FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_wallet_permission(id)
);

CREATE POLICY "Authenticated users can create their wallets"
ON public.wallets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Wallet owners can update wallets"
ON public.wallets FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Wallet owners can delete wallets"
ON public.wallets FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- Policies de permisos: no consultan directamente wallets.
CREATE POLICY "Users can view their wallet permissions"
ON public.wallet_permissions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_wallet_owner(wallet_id)
);

CREATE POLICY "Wallet owners can grant permissions"
ON public.wallet_permissions FOR INSERT TO authenticated
WITH CHECK (public.is_wallet_owner(wallet_id));

CREATE POLICY "Wallet owners can update permissions"
ON public.wallet_permissions FOR UPDATE TO authenticated
USING (public.is_wallet_owner(wallet_id))
WITH CHECK (public.is_wallet_owner(wallet_id));

CREATE POLICY "Wallet owners can revoke permissions"
ON public.wallet_permissions FOR DELETE TO authenticated
USING (public.is_wallet_owner(wallet_id));

-- Verificación rápida después de ejecutar el script.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('wallets', 'wallet_permissions')
ORDER BY tablename, policyname;
