CREATE TABLE IF NOT EXISTS blog_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
  nicho text NOT NULL DEFAULT '',
  idioma text NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS article_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  keyword text NOT NULL,
  analisis_json text,
  plan_md text,
  investigacion_md text,
  articulo_md text,
  links_hechos integer NOT NULL DEFAULT 0,
  titulo text,
  slug text,
  meta_descripcion text,
  estado text NOT NULL DEFAULT 'pipeline',
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
