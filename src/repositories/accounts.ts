import { and, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { users, organizations, memberships, authTokens } from "@/src/db/schema";

export type UserRow = {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  googleSub: string | null;
  emailVerificadoAt: string | null;
};

export type MembershipInfo = { orgId: string; rol: string };
export type MiembroRow = { userId: string; email: string; nombre: string; rol: string };
export type OrgResumen = { orgId: string; nombre: string; rol: string };

export type TokenRow = {
  id: string;
  email: string;
  userId: string | null;
  tipo: string;
  payloadJson: unknown;
  expiraAt: string;
  usadoAt: string | null;
};

export interface AccountStore {
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(userId: string): Promise<UserRow | null>;
  getUserByGoogleSub(googleSub: string): Promise<UserRow | null>;
  getMembershipByUser(userId: string): Promise<MembershipInfo | null>;
  // Rol del usuario en UNA organización concreta (para validar la org activa).
  getMembership(orgId: string, userId: string): Promise<MembershipInfo | null>;
  // Alta atómica: usuario + su propia organización + membership de propietario.
  crearCuenta(input: {
    nombre: string; email: string; passwordHash: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }>;
  // Alta por Google: sin contraseña, con el email ya verificado (lo verificó Google).
  crearCuentaGoogle(input: {
    nombre: string; email: string; googleSub: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }>;
  vincularGoogle(userId: string, googleSub: string): Promise<void>;

  // Tokens de un solo uso (verificación, reset, invitación).
  crearToken(input: {
    email: string; userId: string | null; tipo: string; tokenHash: string;
    payloadJson?: unknown; expiraAt: Date;
  }): Promise<void>;
  getTokenPorHash(tokenHash: string): Promise<TokenRow | null>;
  marcarTokenUsado(id: string): Promise<void>;
  // Invalida los tokens vivos del mismo tipo para un email (un reset a la vez).
  invalidarTokens(email: string, tipo: string): Promise<void>;

  marcarEmailVerificado(userId: string): Promise<void>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
}

function toUserRow(r: typeof users.$inferSelect): UserRow {
  return {
    id: r.id,
    email: r.email,
    nombre: r.nombre,
    passwordHash: r.passwordHash,
    googleSub: r.googleSub,
    emailVerificadoAt: r.emailVerificadoAt ? r.emailVerificadoAt.toISOString() : null,
  };
}

export class DrizzleAccountStore implements AccountStore {
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const r = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return r[0] ? toUserRow(r[0]) : null;
  }

  async getUserById(userId: string): Promise<UserRow | null> {
    const r = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return r[0] ? toUserRow(r[0]) : null;
  }

  async getUserByGoogleSub(googleSub: string): Promise<UserRow | null> {
    const r = await db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
    return r[0] ? toUserRow(r[0]) : null;
  }

  async getMembershipByUser(userId: string): Promise<MembershipInfo | null> {
    const r = await db
      .select({ orgId: memberships.orgId, rol: memberships.rol })
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    return r[0] ?? null;
  }

  async getMembership(orgId: string, userId: string): Promise<MembershipInfo | null> {
    const r = await db
      .select({ orgId: memberships.orgId, rol: memberships.rol })
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
      .limit(1);
    return r[0] ?? null;
  }

  // ---- Equipo (fuera del interfaz AccountStore; las rutas usan el singleton) ----

  async getOrg(orgId: string): Promise<{ id: string; nombre: string } | null> {
    const r = await db.select({ id: organizations.id, nombre: organizations.nombre })
      .from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return r[0] ?? null;
  }

  async listOrgsDeUsuario(userId: string): Promise<OrgResumen[]> {
    return db
      .select({ orgId: organizations.id, nombre: organizations.nombre, rol: memberships.rol })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(eq(memberships.userId, userId))
      .orderBy(organizations.createdAt);
  }

  async listMiembros(orgId: string): Promise<MiembroRow[]> {
    return db
      .select({ userId: users.id, email: users.email, nombre: users.nombre, rol: memberships.rol })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, orgId))
      .orderBy(users.nombre);
  }

  async crearMembership(orgId: string, userId: string, rol: string): Promise<void> {
    await db.insert(memberships).values({ orgId, userId, rol }).onConflictDoNothing();
  }

  async cambiarRol(orgId: string, userId: string, rol: string): Promise<void> {
    await db.update(memberships).set({ rol })
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  }

  async quitarMiembro(orgId: string, userId: string): Promise<void> {
    await db.delete(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  }

  async contarPropietarios(orgId: string): Promise<number> {
    const r = await db.select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.rol, "owner")));
    return r.length;
  }

  async crearCuenta(input: {
    nombre: string; email: string; passwordHash: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }> {
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId, email: input.email, nombre: input.nombre, passwordHash: input.passwordHash,
      });
      await tx.insert(organizations).values({ id: orgId, nombre: input.orgNombre });
      await tx.insert(memberships).values({ orgId, userId, rol: "owner" });
    });
    return { userId, orgId };
  }

  async crearCuentaGoogle(input: {
    nombre: string; email: string; googleSub: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }> {
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId, email: input.email, nombre: input.nombre,
        googleSub: input.googleSub, emailVerificadoAt: new Date(),
      });
      await tx.insert(organizations).values({ id: orgId, nombre: input.orgNombre });
      await tx.insert(memberships).values({ orgId, userId, rol: "owner" });
    });
    return { userId, orgId };
  }

  async vincularGoogle(userId: string, googleSub: string): Promise<void> {
    await db.update(users).set({ googleSub }).where(eq(users.id, userId));
  }

  async crearToken(input: {
    email: string; userId: string | null; tipo: string; tokenHash: string;
    payloadJson?: unknown; expiraAt: Date;
  }): Promise<void> {
    await db.insert(authTokens).values({
      email: input.email, userId: input.userId, tipo: input.tipo,
      tokenHash: input.tokenHash, payloadJson: input.payloadJson ?? null, expiraAt: input.expiraAt,
    });
  }

  async getTokenPorHash(tokenHash: string): Promise<TokenRow | null> {
    const r = await db.select().from(authTokens).where(eq(authTokens.tokenHash, tokenHash)).limit(1);
    const t = r[0];
    if (!t) return null;
    return {
      id: t.id, email: t.email, userId: t.userId, tipo: t.tipo, payloadJson: t.payloadJson,
      expiraAt: t.expiraAt.toISOString(), usadoAt: t.usadoAt ? t.usadoAt.toISOString() : null,
    };
  }

  async marcarTokenUsado(id: string): Promise<void> {
    await db.update(authTokens).set({ usadoAt: new Date() }).where(eq(authTokens.id, id));
  }

  async invalidarTokens(email: string, tipo: string): Promise<void> {
    await db.update(authTokens).set({ usadoAt: new Date() })
      .where(and(eq(authTokens.email, email), eq(authTokens.tipo, tipo)));
  }

  async marcarEmailVerificado(userId: string): Promise<void> {
    await db.update(users).set({ emailVerificadoAt: new Date() }).where(eq(users.id, userId));
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }
}

// Tipo concreto (no el interfaz): así las rutas de equipo ven también los
// métodos que quedan fuera de AccountStore (listMiembros, invitaciones, etc.).
export const accountStore = new DrizzleAccountStore();
