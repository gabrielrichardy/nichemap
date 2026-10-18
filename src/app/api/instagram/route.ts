import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, INVALID_TARGET_MESSAGE, resolveTarget } from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const target = resolveTarget(req.nextUrl.searchParams.get("target"));
  if (!target) {
    return NextResponse.json({ error: INVALID_TARGET_MESSAGE }, { status: 400 });
  }
  const data = await getDashboardData(target);
  return NextResponse.json(data);
}
