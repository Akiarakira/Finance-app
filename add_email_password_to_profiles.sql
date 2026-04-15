-- SQL para agregar columnas de email y password a la tabla profiles
-- NOTA: Supabase maneja la autenticación a través de auth.users, no necesitamos almacenar passwords en profiles

-- Opción 1: Agregar solo email a profiles (recomendado)
-- El email ya está disponible en auth.users, pero podemos sincronizarlo para facilitar consultas
ALTER TABLE profiles 
ADD COLUMN email TEXT;

-- Actualizar emails existentes desde auth.users
UPDATE profiles 
SET email = au.email 
FROM auth.users au 
WHERE profiles.id = au.id;

-- Crear trigger para mantener sincronizado el email
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = NEW.email;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger después de insertar/actualizar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- Opción 2: Si realmente quieres almacenar contraseña (NO RECOMENDADO)
-- ¡Esto es inseguro! Supabase ya maneja la autenticación de forma segura
-- ALTER TABLE profiles ADD COLUMN password_hash TEXT;
-- ALTER TABLE profiles ADD COLUMN salt TEXT;

-- Para verificar la estructura actual de la tabla profiles
-- \d profiles

-- Para ver usuarios actuales y sus emails
-- SELECT p.*, au.email FROM profiles p LEFT JOIN auth.users au ON p.id = au.id;
