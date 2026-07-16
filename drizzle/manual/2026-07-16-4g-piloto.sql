ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_activo boolean NOT NULL DEFAULT false;
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_cada_dias integer NOT NULL DEFAULT 1;
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_hora integer NOT NULL DEFAULT 9;
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_portada text NOT NULL DEFAULT 'diseno';
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_ultimo_dia text;
ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS piloto_ultimo_msg text;
