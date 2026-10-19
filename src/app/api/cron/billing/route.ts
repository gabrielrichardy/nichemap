import { NextRequest, NextResponse } from "next/server";
import { runBillingTick } from "@/lib/billing-sync";
import { isAuthorizedCron } from "@/lib/cron";
import { isDatabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

// Billing deadlines, called daily by Vercel Cron (vercel.json).
// Manual run: GET with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL não configurada." }, { status: 503 });
  }
  try {
    const result = await runBillingTick();
    logger.info(result, "Billing tick");
    return NextResponse.json(result, { status: result.changed || !result.failed ? 200 : 502 });
  } catch (err) {
    const message = (err as Error).message;
    logger.error({ error: message }, "Billing tick failed");
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
