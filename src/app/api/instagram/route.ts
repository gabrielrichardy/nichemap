import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, targetUsernameSchema } from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("target") || process.env.INSTAGRAM_TARGET_USERNAME || "biodev";
  // Accept "@perfil" as documented in the README; the Graph API wants the bare username.
  const target = targetUsernameSchema.safeParse(raw.trim().replace(/^@/, ""));
  if (!target.success) {
    return NextResponse.json(
      { error: "Perfil inválido: use só letras, números, ponto e sublinhado (até 30)." },
      { status: 400 },
    );
  }
  const data = await getDashboardData(target.data);
  return NextResponse.json(data);
}
