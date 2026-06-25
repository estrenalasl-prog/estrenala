import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { organizations, users, memberships } from "@/src/db/schema";

// IDs fijos de desarrollo (UUID v4 constantes).
const DEV_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEV_USER_ID = "00000000-0000-4000-8000-000000000002";
const DEV_EMAIL = "dev@wordclicks.local";

export async function getDevContext(): Promise<{ orgId: string; userId: string }> {
  await db.insert(organizations)
    .values({ id: DEV_ORG_ID, nombre: "Organización de desarrollo" })
    .onConflictDoNothing();
  await db.insert(users)
    .values({ id: DEV_USER_ID, email: DEV_EMAIL, nombre: "Dev" })
    .onConflictDoNothing();

  const m = await db.select().from(memberships)
    .where(eq(memberships.userId, DEV_USER_ID)).limit(1);
  if (!m[0]) {
    await db.insert(memberships)
      .values({ orgId: DEV_ORG_ID, userId: DEV_USER_ID, rol: "owner" })
      .onConflictDoNothing();
  }
  return { orgId: DEV_ORG_ID, userId: DEV_USER_ID };
}
