-- =============================================
-- Исправление создания пользователей
-- Выполнить в Supabase SQL Editor
-- =============================================

-- 1. Убрать старые политики на profiles
DROP POLICY IF EXISTS "pr_insert" ON profiles;
DROP POLICY IF EXISTS "pr_select" ON profiles;
DROP POLICY IF EXISTS "pr_update" ON profiles;
DROP POLICY IF EXISTS "pr_delete" ON profiles;

-- 2. Новые политики
CREATE POLICY "pr_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "pr_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "pr_update" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);
CREATE POLICY "pr_delete" ON profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Триггер — автосоздание профиля при signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. Профили для уже существующих пользователей без профиля
INSERT INTO profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
