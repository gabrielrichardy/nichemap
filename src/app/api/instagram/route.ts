import { NextRequest, NextResponse } from "next/server";
import { dashboardOptionsFor, failureMessage } from "@/lib/dashboard";
import { getDashboardData, INVALID_TARGET_MESSAGE } from "@/lib/instagram";
import { getViewer, targetFor } from "@/lib/viewer";

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  if (!viewer.isAdmin && !viewer.instagramUsername) {
    return NextResponse.json({ error: "Escolha seu perfil para continuar." }, { status: 403 });
  }
  const target = targetFor(viewer, req.nextUrl.searchParams.get("target"));
  if (!target) {
    return NextResponse.json({ error: INVALID_TARGET_MESSAGE }, { status: 400 });
  }
  const data = await getDashboardData(target, dashboardOptionsFor(viewer));
  if ("failure" in data) return NextResponse.json({ error: failureMessage(data) }, { status: 503 });
  return NextResponse.json(data);
}
