-- Миграция: добавление полей для учётных данных
ALTER TABLE lines ADD COLUMN credentials_enabled BOOLEAN DEFAULT false;
ALTER TABLE lines ADD COLUMN credentials JSONB;
