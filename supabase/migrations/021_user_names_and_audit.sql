-- ====================================================================
-- Миграция 021: Имя/Фамилия пользователей и Аудит (Цех, Линия, Запчасть)
-- ====================================================================

-- 1. Добавление полей first_name и last_name в profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT NULL;

-- 2. Вспомогательная функция проверки роли admin без рекурсии в RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- 3. Функция безопасного обновления профиля пользователя только администратором
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_email TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: only administrators can edit users';
  END IF;

  UPDATE public.profiles
  SET
    first_name = new_first_name,
    last_name = new_last_name,
    role = COALESCE(NULLIF(new_role, ''), role)
  WHERE id = target_user_id;

  IF new_email IS NOT NULL AND new_email <> '' THEN
    UPDATE public.profiles SET email = new_email WHERE id = target_user_id;
    UPDATE auth.users SET email = new_email WHERE id = target_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;

-- 4. Обновление триггера handle_new_user для сохранения first_name и last_name при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'user',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name);
  RETURN NEW;
END;
$$;

-- 5. Добавление полей аудита в workshops, lines, parts (nullable для существующих записей)
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. Триггерная функция для автоматической записи created_by/createdAt и updated_by/updatedAt
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL OR NEW.created_by = '' THEN
      NEW.created_by := COALESCE(auth.uid()::text, NEW.created_by);
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(auth.uid()::text, NEW.updated_by);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workshops_audit ON public.workshops;
CREATE TRIGGER trg_workshops_audit
  BEFORE INSERT OR UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_lines_audit ON public.lines;
CREATE TRIGGER trg_lines_audit
  BEFORE INSERT OR UPDATE ON public.lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_parts_audit ON public.parts;
CREATE TRIGGER trg_parts_audit
  BEFORE INSERT OR UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 7. Функция извлечения информации об авторе (с fallback на email и старые записи)
CREATE OR REPLACE FUNCTION public.get_user_audit_info(user_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF user_ref IS NULL OR TRIM(user_ref) = '' THEN
    RETURN NULL;
  END IF;

  -- Поиск по UUID (id профиля)
  IF user_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id, email, first_name, last_name INTO rec
    FROM public.profiles
    WHERE id = user_ref::uuid;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', rec.id,
        'email', rec.email,
        'first_name', rec.first_name,
        'last_name', rec.last_name,
        'display_name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', rec.last_name, rec.first_name)), ''), rec.email)
      );
    END IF;
  END IF;

  -- Поиск по email
  SELECT id, email, first_name, last_name INTO rec
  FROM public.profiles
  WHERE email = user_ref;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', rec.id,
      'email', rec.email,
      'first_name', rec.first_name,
      'last_name', rec.last_name,
      'display_name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', rec.last_name, rec.first_name)), ''), rec.email)
    );
  END IF;

  -- Fallback для старых записей, где сохранён только email или текст
  RETURN jsonb_build_object(
    'id', NULL,
    'email', user_ref,
    'first_name', NULL,
    'last_name', NULL,
    'display_name', user_ref
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_audit_info TO authenticated;

-- 8. Вычисляемые колонки аудита: доступны ТОЛЬКО администраторам (проверка на бэкенде)
-- Для цехов (workshops)
CREATE OR REPLACE FUNCTION public.created_by_user(w public.workshops)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(w.created_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.updated_by_user(w public.workshops)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(w.updated_by);
END;
$$;

-- Для линий (lines)
CREATE OR REPLACE FUNCTION public.created_by_user(l public.lines)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(l.created_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.updated_by_user(l public.lines)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(l.updated_by);
END;
$$;

-- Для запчастей (parts)
CREATE OR REPLACE FUNCTION public.created_by_user(p public.parts)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(p.created_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.updated_by_user(p public.parts)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(p.updated_by);
END;
$$;

GRANT EXECUTE ON FUNCTION public.created_by_user(public.workshops) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.workshops) TO authenticated;
GRANT EXECUTE ON FUNCTION public.created_by_user(public.lines) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.lines) TO authenticated;
GRANT EXECUTE ON FUNCTION public.created_by_user(public.parts) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.parts) TO authenticated;
