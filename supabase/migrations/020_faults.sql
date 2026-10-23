-- Миграция: таблица неисправностей линий
CREATE TABLE faults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id UUID REFERENCES lines(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES workshops(id),
  photo_url TEXT,
  photo_urls JSONB,
  symptoms TEXT NOT NULL,
  resolution TEXT,
  fault_date DATE,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_faults_line ON faults(line_id);
ALTER TABLE faults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ft_select" ON faults FOR SELECT TO authenticated USING (true);
CREATE POLICY "ft_insert" ON faults FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ft_update" ON faults FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ft_delete" ON faults FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON faults TO authenticated;
