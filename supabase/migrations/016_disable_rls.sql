-- =============================================
-- Отключить RLS на profiles
-- =============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (они не работают без RLS)
DROP POLICY IF EXISTS "pr_select" ON profiles;
DROP POLICY IF EXISTS "pr_insert" ON profiles;
DROP POLICY IF EXISTS "pr_update" ON profiles;
DROP POLICY IF EXISTS "pr_delete" ON profiles;

-- Пересоздаём триггер на всякий случай
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Профили для существующих пользователей
INSERT INTO public.profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
