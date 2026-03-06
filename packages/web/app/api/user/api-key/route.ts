import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is enterprise tier
  const userRows = await db
    .select({ tier: schema.users.tier })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user || user.tier !== "enterprise") {
    return NextResponse.json({ error: "API keys are available on the Enterprise plan" }, { status: 403 });
  }

  // Generate API key: dv_live_ + 32 random hex chars
  const apiKey = `dv_live_${randomBytes(16).toString("hex")}`;

  await db
    .update(schema.users)
    .set({ apiKey, updatedAt: new Date() })
    .where(eq(schema.users.id, session.user.id));

  return NextResponse.json({ apiKey });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ apiKey: schema.users.apiKey, tier: schema.users.tier })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    apiKey: user.apiKey ?? null,
    hasApiAccess: user.tier === "enterprise",
  });
}
