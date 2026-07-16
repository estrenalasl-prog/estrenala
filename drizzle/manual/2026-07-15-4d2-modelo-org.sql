ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS modelo_ia text NOT NULL DEFAULT '';
-- Migración: el modelo por proyecto (4b2) más reciente pasa a ser el de la organización.
UPDATE org_settings SET modelo_ia = COALESCE(
  (SELECT modelo FROM blog_settings WHERE modelo <> '' ORDER BY updated_at DESC LIMIT 1), ''
) WHERE modelo_ia = '';
