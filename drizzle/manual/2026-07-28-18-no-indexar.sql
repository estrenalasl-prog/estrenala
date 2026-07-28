-- Interruptor por web: «Que Google no la encuentre todavía» (incremento 18).
-- Por defecto false: publicar es querer que te vean.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS no_indexar boolean NOT NULL DEFAULT false;
