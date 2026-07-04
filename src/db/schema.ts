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
