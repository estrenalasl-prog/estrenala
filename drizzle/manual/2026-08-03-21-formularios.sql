-- Recoger los envios de los formularios de las webs publicadas (incremento 21).
--
-- El agujero que tapa: casi toda web hecha con IA trae su «Contacto» con su
-- formulario, y ese formulario no envia nada. El modelo escribe el marcado
-- bonito y deja el `action` vacio porque no tiene servidor al que apuntar.
--
-- El interruptor nace APAGADO a proposito. Encenderlo hace que la plataforma
-- empiece a guardar datos de TERCEROS —quien rellena el formulario no es cliente
-- nuestro, es cliente de nuestro cliente— y eso lo decide el dueno de la web.
-- Mientras este apagado, su web se sirve exactamente como la subio.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS recoge_formularios boolean NOT NULL DEFAULT false;

-- Sin `references` a nada del visitante: aqui no hay cuentas, entra cualquiera
-- de internet. Lo que se guarda son los campos tal cual los mando, acotados en
-- src/forms/recibir.ts (tope de campos, de largo y de envios por hora).
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  pagina text NOT NULL,
  form_indice integer NOT NULL,
  datos jsonb NOT NULL,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- La bandeja se lee SIEMPRE por proyecto y por fecha descendente (lo ultimo,
-- arriba). Sin este indice cada visita recorre la tabla entera, y esta es la que
-- mas va a crecer de todas: una fila por cada persona que escriba a cualquier
-- cliente.
CREATE INDEX IF NOT EXISTS form_submissions_project_fecha
  ON form_submissions (project_id, created_at DESC);
