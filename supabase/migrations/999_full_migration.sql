-- =============================================
-- ПОЛНАЯ МИГРАЦИЯ: Cloud → Local Supabase
-- Выполнить на локальном Supabase в SQL Editor
-- =============================================

-- 0. Очистка
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS confirm_user_email(text) CASCADE;
DROP FUNCTION IF EXISTS delete_user_by_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS reset_user_password(uuid, text) CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Workshops
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

-- 4. Lines
CREATE TABLE lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  inventory_number TEXT,
  photo_url TEXT,
  photo_urls JSONB,
  file_url TEXT,
  file_urls JSONB,
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

-- 5. Parts
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

-- 6. Индексы
CREATE INDEX idx_lines_workshop ON lines(workshop_id);
CREATE INDEX idx_parts_line ON parts(line_id);
CREATE INDEX idx_parts_workshop ON parts(workshop_id);

-- 7. Триггер: автосоздание профиля
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

-- 8. Функция подтверждения email
CREATE OR REPLACE FUNCTION confirm_user_email(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users SET email_confirmed_at = now() WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Функция удаления пользователя
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM profiles WHERE id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Функция сброса пароля
CREATE OR REPLACE FUNCTION reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf', 10)), updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-files', 'parts-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Storage: authenticated upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'parts-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Storage: public read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'parts-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Storage: authenticated delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'parts-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12. Права
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parts TO authenticated;
