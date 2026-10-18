import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { isDatabaseConfigured } from "@/lib/env";
import { collectDailySnapshots } from "@/lib/instagram";
import { logger } from "@/lib/logger";

// Called daily by Vercel Cron (vercel.json). Manual run: GET with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL não configurada." }, { status: 503 });
  }
  try {
    const result = await collectDailySnapshots();
    logger.info({ takenOn: result.takenOn, saved: result.saved.length, failed: result.failed }, "Daily snapshots");
    return NextResponse.json(result, { status: result.saved.length || !result.failed.length ? 200 : 502 });
  } catch (err) {
    const message = (err as Error).message;
    logger.error({ error: message }, "Daily snapshots failed");
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
