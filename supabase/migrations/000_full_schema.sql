-- =============================================
-- Полная схема БД «Учёт запчастей»
-- Запускать ПОСЛЕ DROP SCHEMA public CASCADE
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Роли пользователей
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles read" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles admin update" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Цеха
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshops read" ON workshops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workshops insert" ON workshops FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshops update" ON workshops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Workshops admin delete" ON workshops FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Линии
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

CREATE POLICY "Lines read" ON lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lines insert" ON lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Lines update" ON lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Lines admin delete" ON lines FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Запчасти
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

CREATE POLICY "Parts read" ON parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Parts insert" ON parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Parts update" ON parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Parts admin delete" ON parts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Индексы
CREATE INDEX idx_lines_workshop ON lines(workshop_id);
CREATE INDEX idx_parts_line ON parts(line_id);
CREATE INDEX idx_parts_workshop ON parts(workshop_id);

-- 6. Триггер — автосоздание profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Профили для существующих пользователей
INSERT INTO profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 7. Права для authenticated роли на все таблицы
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parts TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
