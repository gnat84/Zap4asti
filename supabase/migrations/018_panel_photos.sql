-- Миграция: добавление полей для фото настроек панели
ALTER TABLE lines ADD COLUMN panel_photo_url TEXT;
ALTER TABLE lines ADD COLUMN panel_photo_urls JSONB;
