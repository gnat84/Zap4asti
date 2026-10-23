-- =============================================
-- ПОЛНЫЙ СБРОС AUTH TRIGGERS И POLICIES
-- Выполнить в Supabase SQL Editor
-- =============================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "pr_select" ON profiles;
DROP POLICY IF EXISTS "pr_insert" ON profiles;
DROP POLICY IF EXISTS "pr_update" ON profiles;
DROP POLICY IF EXISTS "pr_delete" ON profiles;

-- Удаляем старые триггеры и функции
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Новые политики — без ограничений на роль
CREATE POLICY "pr_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "pr_insert" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pr_update" ON profiles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "pr_delete" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Триггер
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

-- Профили для тех, у кого их нет
INSERT INTO public.profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Проверка что триггер работает
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
