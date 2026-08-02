import { and, eq, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { users, organizations, memberships, authTokens, orgSettings } from "@/src/db/schema";

export type UserRow = {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  googleSub: string | null;
  emailVerificadoAt: string | null;
  /** Nulo mientras no lo elija a mano: entonces manda la landing o su navegador. */
  idioma: string | null;
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
  setIdioma(userId: string, idioma: string): Promise<void>;
}

function toUserRow(r: typeof users.$inferSelect): UserRow {
  return {
    id: r.id,
    email: r.email,
    nombre: r.nombre,
    passwordHash: r.passwordHash,
    googleSub: r.googleSub,
    emailVerificadoAt: r.emailVerificadoAt ? r.emailVerificadoAt.toISOString() : null,
    idioma: r.idioma,
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

  async getOrg(orgId: string): Promise<{ id: string; nombre: string; plan: string } | null> {
    const r = await db.select({ id: organizations.id, nombre: organizations.nombre, plan: organizations.plan })
      .from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return r[0] ?? null;
  }

  // Plan del espacio (para los límites). Ante cualquier duda, "free".
  async getPlan(orgId: string): Promise<string> {
    const r = await db.select({ plan: organizations.plan })
      .from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return r[0]?.plan ?? "free";
  }

  async setPlan(orgId: string, plan: string): Promise<void> {
    await db.update(organizations).set({ plan }).where(eq(organizations.id, orgId));
  }

  /**
   * Apunta un cambio de dirección del día y dice si cabía dentro del límite.
   *
   * Va en UNA sola sentencia a propósito: leer-y-luego-escribir permitiría que
   * dos peticiones a la vez pasaran ambas el control. La condición del WHERE es
   * la que frena: o el día es otro (y el conteo se reinicia a 1), o queda hueco.
   */
  async registrarCambioDireccion(orgId: string, dia: string, limite: number): Promise<boolean> {
    const r = await db.update(organizations)
      .set({
        cambiosDireccion: sql`CASE WHEN ${organizations.cambiosDireccionDia} = ${dia} THEN ${organizations.cambiosDireccion} + 1 ELSE 1 END`,
        cambiosDireccionDia: dia,
      })
      .where(and(
        eq(organizations.id, orgId),
        or(ne(organizations.cambiosDireccionDia, dia), lt(organizations.cambiosDireccion, limite)),
      ))
      .returning({ id: organizations.id });
    return r.length > 0;
  }

  // ---- Suscripción de Stripe (16) ----

  async getSuscripcion(orgId: string): Promise<{
    plan: string; estado: string; customerId: string | null; subscriptionId: string | null; hasta: string | null;
  } | null> {
    const r = await db.select({
      plan: organizations.plan,
      estado: organizations.planEstado,
      customerId: organizations.stripeCustomerId,
      subscriptionId: organizations.stripeSubscriptionId,
      hasta: organizations.planHasta,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const o = r[0];
    if (!o) return null;
    return { ...o, hasta: o.hasta ? o.hasta.toISOString() : null };
  }

  async setSuscripcion(orgId: string, s: {
    plan: string; estado: string; customerId: string | null; subscriptionId: string | null; hasta: Date | null;
  }): Promise<void> {
    await db.update(organizations).set({
      plan: s.plan,
      planEstado: s.estado,
      // El customer se conserva si el evento no lo trae (nunca se pierde el hilo
      // con Stripe: hace falta para el portal de cliente).
      ...(s.customerId ? { stripeCustomerId: s.customerId } : {}),
      stripeSubscriptionId: s.subscriptionId,
      planHasta: s.hasta,
    }).where(eq(organizations.id, orgId));
  }

  async setStripeCustomer(orgId: string, customerId: string): Promise<void> {
    await db.update(organizations).set({ stripeCustomerId: customerId }).where(eq(organizations.id, orgId));
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

  // Cede la propiedad de forma atómica: sube al destino a owner y baja al origen a
  // editor. Se sube PRIMERO al destino → nunca hay un instante sin propietario.
  async aplicarTransferencia(orgId: string, deUserId: string, aUserId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(memberships).set({ rol: "owner" })
        .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, aUserId)));
      await tx.update(memberships).set({ rol: "editor" })
        .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, deUserId)));
    });
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

  async contarMiembros(orgId: string): Promise<number> {
    const r = await db.select({ userId: memberships.userId })
      .from(memberships).where(eq(memberships.orgId, orgId));
    return r.length;
  }

  // Borra un espacio VACÍO de proyectos (el dominio ya los borró antes): ajustes,
  // memberships y la organización, en transacción. Fuera del interfaz AccountStore.
  async eliminarEspacio(orgId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(orgSettings).where(eq(orgSettings.orgId, orgId));
      await tx.delete(memberships).where(eq(memberships.orgId, orgId));
      await tx.delete(organizations).where(eq(organizations.id, orgId));
    });
  }

  // Borra el usuario: sus memberships restantes (espacios con otros propietarios),
  // sus tokens y la fila users. En transacción. Fuera del interfaz AccountStore.
  async eliminarUsuario(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(memberships).where(eq(memberships.userId, userId));
      await tx.delete(authTokens).where(eq(authTokens.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
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

  async setNombre(userId: string, nombre: string): Promise<void> {
    await db.update(users).set({ nombre }).where(eq(users.id, userId));
  }

  async setEmail(userId: string, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, userId));
  }

  async setIdioma(userId: string, idioma: string): Promise<void> {
    await db.update(users).set({ idioma }).where(eq(users.id, userId));
  }
}

// Tipo concreto (no el interfaz): así las rutas de equipo ven también los
// métodos que quedan fuera de AccountStore (listMiembros, invitaciones, etc.).
export const accountStore = new DrizzleAccountStore();
