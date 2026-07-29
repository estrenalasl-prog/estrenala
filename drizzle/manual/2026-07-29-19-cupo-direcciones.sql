-- Freno del cupo de certificados de Let's Encrypt (incremento 19): cuántas
-- direcciones nuevas ha estrenado hoy cada espacio.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cambios_direccion integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cambios_direccion_dia text NOT NULL DEFAULT '';
