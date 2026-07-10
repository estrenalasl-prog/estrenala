import { pgTable, uuid, text, timestamp, jsonb, integer, unique } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  plan: text("plan").notNull().default("free"),
  usoJson: jsonb("uso_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rol: text("rol").notNull().default("owner"),
}, (t) => [unique().on(t.orgId, t.userId)]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  nombre: text("nombre").notNull(),
  subdominio: text("subdominio").unique(),
  dominio: text("dominio").unique(),
  entryPath: text("entry_path").notNull(),
  currentSnapshotId: uuid("current_snapshot_id"),
  publishedSnapshotId: uuid("published_snapshot_id"),
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
