CREATE TABLE IF NOT EXISTS blog_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  keyword text NOT NULL,
  fuente text NOT NULL,
  crecimiento_pct integer,
  volumen_aprox integer,
  relevancia integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'nueva',
  discovered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, keyword)
);
CREATE TABLE IF NOT EXISTS trends_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  fecha text NOT NULL,
  payload text NOT NULL,
  UNIQUE (project_id, fecha)
);
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS keywords_semilla text NOT NULL DEFAULT '';
