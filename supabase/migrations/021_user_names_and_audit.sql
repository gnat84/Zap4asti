-- ====================================================================
-- Migration 021: User First/Last Names & Audit (Workshops, Lines, Parts)
-- ====================================================================

-- 1. Add first_name and last_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT NULL;

-- 2. Helper function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $body$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$body$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- 3. Function to safely update user profile (admin only)
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
AS $body$
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
$body$;

GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;

-- 4. Trigger to handle new users from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
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
$body$;

-- 5. Add audit columns to workshops, lines, parts
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS created_by TEXT NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. Trigger to automatically record audit timestamps & users
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
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
$body$;

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

-- 7. Function to fetch user audit display info (with fallback for legacy records)
CREATE OR REPLACE FUNCTION public.get_user_audit_info(user_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  rec RECORD;
  found_id UUID;
BEGIN
  IF user_ref IS NULL OR TRIM(user_ref) = '' THEN
    RETURN NULL;
  END IF;

  -- 1) Try lookup by UUID (if valid UUID string)
  BEGIN
    found_id := user_ref::uuid;
    SELECT id, email, first_name, last_name INTO rec
    FROM public.profiles
    WHERE id = found_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', rec.id,
        'email', rec.email,
        'first_name', rec.first_name,
        'last_name', rec.last_name,
        'display_name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', rec.last_name, rec.first_name)), ''), rec.email)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- user_ref is not a valid UUID, continue to email lookup
    NULL;
  END;

  -- 2) Try lookup by email in profiles
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

  -- 3) Fallback for legacy text/email records where user profile does not exist
  RETURN jsonb_build_object(
    'id', NULL,
    'email', user_ref,
    'first_name', NULL,
    'last_name', NULL,
    'display_name', user_ref
  );
END;
$body$;

GRANT EXECUTE ON FUNCTION public.get_user_audit_info TO authenticated;

-- 8. Computed columns for workshops
CREATE OR REPLACE FUNCTION public.created_by_user(w public.workshops)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(w.created_by);
END;
$body$;

CREATE OR REPLACE FUNCTION public.updated_by_user(w public.workshops)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(w.updated_by);
END;
$body$;

-- 9. Computed columns for lines
CREATE OR REPLACE FUNCTION public.created_by_user(l public.lines)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(l.created_by);
END;
$body$;

CREATE OR REPLACE FUNCTION public.updated_by_user(l public.lines)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(l.updated_by);
END;
$body$;

-- 10. Computed columns for parts
CREATE OR REPLACE FUNCTION public.created_by_user(p public.parts)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(p.created_by);
END;
$body$;

CREATE OR REPLACE FUNCTION public.updated_by_user(p public.parts)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  RETURN public.get_user_audit_info(p.updated_by);
END;
$body$;

GRANT EXECUTE ON FUNCTION public.created_by_user(public.workshops) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.workshops) TO authenticated;
GRANT EXECUTE ON FUNCTION public.created_by_user(public.lines) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.lines) TO authenticated;
GRANT EXECUTE ON FUNCTION public.created_by_user(public.parts) TO authenticated;
GRANT EXECUTE ON FUNCTION public.updated_by_user(public.parts) TO authenticated;
