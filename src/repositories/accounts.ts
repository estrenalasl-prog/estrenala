import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { users, organizations, memberships } from "@/src/db/schema";

export type UserRow = {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  googleSub: string | null;
  emailVerificadoAt: string | null;
};

export type MembershipInfo = { orgId: string; rol: string };

export interface AccountStore {
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(userId: string): Promise<UserRow | null>;
  getMembershipByUser(userId: string): Promise<MembershipInfo | null>;
  // Alta atómica: usuario + su propia organización + membership de propietario.
  crearCuenta(input: {
    nombre: string; email: string; passwordHash: string; orgNombre: string;
  }): Promise<{ userId: string; orgId: string }>;
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
}

export const accountStore: AccountStore = new DrizzleAccountStore();
