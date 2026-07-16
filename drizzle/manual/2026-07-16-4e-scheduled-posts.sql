CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  titulo text NOT NULL,
  slug text NOT NULL,
  meta_descripcion text NOT NULL,
  md text NOT NULL,
  imagen_asset_id uuid NOT NULL,
  publicar_en timestamptz NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  error_msg text,
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
