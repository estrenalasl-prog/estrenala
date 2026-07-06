CREATE TABLE IF NOT EXISTS blog_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
  tpl_post text NOT NULL,
  tpl_index text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  titulo text NOT NULL,
  slug text NOT NULL,
  meta_descripcion text NOT NULL,
  md text NOT NULL,
  imagen_asset_id uuid NOT NULL,
  imagen_ext text NOT NULL,
  fecha text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);
