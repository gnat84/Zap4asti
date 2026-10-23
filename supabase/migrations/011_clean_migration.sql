-- =============================================
-- ЧИСТАЯ МИГРАЦИЯ: Учёт запчастей
-- Удалит всё старое и создаст заново
-- =============================================

-- 0. Удаляем старые объекты
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS confirm_user_email(text) CASCADE;
DROP FUNCTION IF EXISTS delete_user_by_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS reset_user_password(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_user_by_admin(text, text) CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 2. Profiles (роли пользователей)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pr_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "pr_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pr_update" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "pr_delete" ON profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 3. Workshops (цеха)
-- =============================================
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select" ON workshops FOR SELECT TO authenticated USING (true);
CREATE POLICY "ws_insert" ON workshops FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ws_update" ON workshops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ws_delete" ON workshops FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 4. Lines (линии)
-- =============================================
CREATE TABLE lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  inventory_number TEXT,
  photo_url TEXT,
  manufacturer_label TEXT,
  manufacturer_photo_url TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ln_select" ON lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "ln_insert" ON lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ln_update" ON lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ln_delete" ON lines FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 5. Parts (запчасти)
-- =============================================
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  photo_urls JSONB,
  file_url TEXT,
  file_urls JSONB,
  link TEXT,
  in_stock BOOLEAN DEFAULT true,
  inventory_number TEXT,
  storage_location TEXT,
  workshop_id UUID REFERENCES workshops(id),
  line_id UUID REFERENCES lines(id) ON DELETE CASCADE,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_select" ON parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "pt_insert" ON parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pt_update" ON parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pt_delete" ON parts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 6. Индексы
-- =============================================
CREATE INDEX idx_lines_workshop ON lines(workshop_id);
CREATE INDEX idx_parts_line ON parts(line_id);
CREATE INDEX idx_parts_workshop ON parts(workshop_id);

-- =============================================
-- 7. Триггер: автосоздание профиля
-- =============================================
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

-- Профили для уже существующих
INSERT INTO profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 8. Функция подтверждения email
-- =============================================
CREATE OR REPLACE FUNCTION confirm_user_email(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE email = user_email AND email_confirmed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. Функция удаления пользователя
-- =============================================
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID AS $$
DECLARE cr TEXT;
BEGIN
  SELECT role INTO cr FROM profiles WHERE id = auth.uid();
  IF cr IS NULL OR cr != 'admin' THEN
    RAISE EXCEPTION 'Only admin can delete users';
  END IF;
  DELETE FROM profiles WHERE id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. Функция сброса пароля
-- =============================================
CREATE OR REPLACE FUNCTION reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
DECLARE cr TEXT; h TEXT;
BEGIN
  SELECT role INTO cr FROM profiles WHERE id = auth.uid();
  IF cr IS NULL OR cr != 'admin' THEN
    RAISE EXCEPTION 'Only admin can reset passwords';
  END IF;
  h := crypt(new_password, gen_salt('bf', 10));
  UPDATE auth.users SET encrypted_password = h, updated_at = now() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
