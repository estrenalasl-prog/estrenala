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
  getMembershipByUser(userId: string): Promise<MembershipInfo | null>;
  // Alta atómica: usuario + su propia organización + membership de propietario.
  crearCuenta(input: {
    nombre: string; email: string; passwordHash: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }>;

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

  async getMembershipByUser(userId: string): Promise<MembershipInfo | null> {
    const r = await db
      .select({ orgId: memberships.orgId, rol: memberships.rol })
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    return r[0] ?? null;
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

export const accountStore: AccountStore = new DrizzleAccountStore();
