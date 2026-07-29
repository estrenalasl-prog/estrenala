import { pgTable, uuid, text, timestamp, jsonb, integer, unique, boolean } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  plan: text("plan").notNull().default("free"),
  usoJson: jsonb("uso_json").notNull().default({}),
  // Suscripción de Stripe (16). plan_estado: active | trialing | past_due |
  // canceled | '' (sin suscripción). plan_hasta = fin del periodo pagado.
  // Freno del cupo de certificados (19): cada dirección nueva pide uno a Let's
  // Encrypt y ese cupo semanal es COMPARTIDO por todos los clientes. El día se
  // guarda como AAAA-MM-DD para poder reiniciar el conteo sin ningún cron.
  cambiosDireccion: integer("cambios_direccion").notNull().default(0),
  cambiosDireccionDia: text("cambios_direccion_dia").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planEstado: text("plan_estado").notNull().default(""),
  planHasta: timestamp("plan_hasta", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull().default(""), // '' = sin contraseña (p. ej. alta por Google)
  googleSub: text("google_sub").unique(), // id de cuenta Google vinculada (6c)
  emailVerificadoAt: timestamp("email_verificado_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tokens de un solo uso (verificación de email, reset de contraseña, invitaciones).
// SIEMPRE se guarda el hash SHA-256 del token, nunca el token en claro.
export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  userId: uuid("user_id").references(() => users.id),
  tipo: text("tipo").notNull(), // verificacion | reset | invitacion
  tokenHash: text("token_hash").notNull().unique(),
  payloadJson: jsonb("payload_json"), // p. ej. { orgId, rol } en invitaciones
  expiraAt: timestamp("expira_at", { withTimezone: true }).notNull(),
  usadoAt: timestamp("usado_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rol: text("rol").notNull().default("owner"),
}, (t) => [unique().on(t.orgId, t.userId)]);

export const orgSettings = pgTable("org_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().unique().references(() => organizations.id),
  openrouterKey: text("openrouter_key").notNull().default(""), // '' = usar la del .env.local
  serpapiKey: text("serpapi_key").notNull().default(""),
  modeloIa: text("modelo_ia").notNull().default(""), // '' = modelo por defecto de la plataforma
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  nombre: text("nombre").notNull(),
  subdominio: text("subdominio").unique(),
  dominio: text("dominio").unique(),
  entryPath: text("entry_path").notNull(),
  currentSnapshotId: uuid("current_snapshot_id"),
  publishedSnapshotId: uuid("published_snapshot_id"),
  // «Que Google no la encuentre todavía»: se sirve con X-Robots-Tag en vez de
  // tocar el HTML del cliente. Por defecto false: publicar es querer que te vean.
  noIndexar: boolean("no_indexar").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  parentId: uuid("parent_id"),
  tipo: text("tipo").notNull(),
  storagePrefix: text("storage_prefix").notNull(),
  operacionesJson: jsonb("operaciones_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogTemplates = pgTable("blog_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique().references(() => projects.id),
  tplPost: text("tpl_post").notNull(),
  tplIndex: text("tpl_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogSettings = pgTable("blog_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique().references(() => projects.id),
  nicho: text("nicho").notNull().default(""),
  idioma: text("idioma").notNull().default("es"),
  modelo: text("modelo").notNull().default(""), // '' = modelo por defecto de la plataforma
  keywordsSemilla: text("keywords_semilla").notNull().default(""), // separadas por comas (radar 4c)
  // Piloto automático (4g)
  pilotoActivo: boolean("piloto_activo").notNull().default(false),
  pilotoCadaDias: integer("piloto_cada_dias").notNull().default(1), // 1 | 3 | 7
  pilotoHora: integer("piloto_hora").notNull().default(9), // hora local del servidor (0-23)
  pilotoPortada: text("piloto_portada").notNull().default("diseno"), // diseno | ia
  pilotoUltimoDia: text("piloto_ultimo_dia"), // YYYY-MM-DD local; también actúa de reclamo
  pilotoUltimoMsg: text("piloto_ultimo_msg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const articleDrafts = pgTable("article_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  keyword: text("keyword").notNull(),
  analisisJson: text("analisis_json"),
  planMd: text("plan_md"),
  investigacionMd: text("investigacion_md"),
  articuloMd: text("articulo_md"),
  linksHechos: integer("links_hechos").notNull().default(0),
  titulo: text("titulo"),
  slug: text("slug"),
  metaDescripcion: text("meta_descripcion"),
  estado: text("estado").notNull().default("pipeline"), // pipeline | revision | error
  errorMsg: text("error_msg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogKeywords = pgTable("blog_keywords", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  keyword: text("keyword").notNull(),
  fuente: text("fuente").notNull(), // trends | related
  crecimientoPct: integer("crecimiento_pct"),
  volumenAprox: integer("volumen_aprox"),
  relevancia: integer("relevancia").notNull().default(0),
  estado: text("estado").notNull().default("nueva"), // nueva | usada | descartada
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.projectId, t.keyword)]);

export const trendsCache = pgTable("trends_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  fecha: text("fecha").notNull(), // YYYY-MM-DD
  payload: text("payload").notNull(),
}, (t) => [unique().on(t.projectId, t.fecha)]);

export const scheduledPosts = pgTable("scheduled_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  titulo: text("titulo").notNull(),
  slug: text("slug").notNull(),
  metaDescripcion: text("meta_descripcion").notNull(),
  md: text("md").notNull(),
  imagenAssetId: uuid("imagen_asset_id").notNull(),
  publicarEn: timestamp("publicar_en", { withTimezone: true }).notNull(),
  estado: text("estado").notNull().default("pendiente"), // pendiente | publicando | publicado | error
  errorMsg: text("error_msg"),
  postId: uuid("post_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  titulo: text("titulo").notNull(),
  slug: text("slug").notNull(),
  metaDescripcion: text("meta_descripcion").notNull(),
  md: text("md").notNull(),
  imagenAssetId: uuid("imagen_asset_id").notNull(),
  imagenExt: text("imagen_ext").notNull(),
  fecha: text("fecha").notNull(), // YYYY-MM-DD, fijada al crear
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.projectId, t.slug)]);
