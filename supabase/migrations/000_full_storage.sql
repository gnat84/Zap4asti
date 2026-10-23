-- =============================================
-- Storage bucket: parts-files
-- Выполните ПОСЛЕ 000_full_schema.sql
-- Если SQL не работает — создайте бакет вручную:
--   Storage → New bucket → Name: parts-files → Public: ON
-- =============================================

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
