-- SQL para debuggear la búsqueda de usuarios
-- Ejecuta estas consultas en el editor SQL de Supabuse

-- 1. Ver todos los perfiles existentes
SELECT 
  id,
  username,
  full_name,
  email,
  avatar_url,
  created_at
FROM profiles 
ORDER BY created_at DESC;

-- 2. Buscar específicamente el usuario andreinadibrigida8@gmail.com
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.email,
  au.email as auth_email,
  au.created_at as auth_created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'andreinadibrigida8@gmail.com';

-- 3. Probar la búsqueda por username (simula lo que hace la app)
SELECT 
  id,
  username,
  full_name,
  avatar_url
FROM profiles
WHERE username.ilike('%andreina%') OR full_name.ilike('%andreina%')
LIMIT 20;

-- 4. Probar búsqueda por email (si lo agregaste)
SELECT 
  id,
  username,
  full_name,
  email,
  avatar_url
FROM profiles
WHERE email.ilike('%andreina%')
LIMIT 20;

-- 5. Ver si hay wallets y permisos creados
SELECT 
  w.id,
  w.name,
  w.created_by,
  wp.user_id,
  wp.role,
  p.username,
  p.full_name
FROM wallets w
LEFT JOIN wallet_permissions wp ON w.id = wp.wallet_id
LEFT JOIN profiles p ON wp.user_id = p.id
ORDER BY w.created_at DESC;

-- 6. Verificar si el usuario tiene wallets
SELECT 
  w.id,
  w.name,
  w.created_at
FROM wallets w
WHERE w.created_by = (
  SELECT id FROM auth.users WHERE email = 'andreinadibrigida8@gmail.com'
);

-- 7. Contar total de usuarios en el sistema
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as with_username,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_full_name,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
FROM profiles;
