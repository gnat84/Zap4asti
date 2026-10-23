GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parts TO authenticated;
