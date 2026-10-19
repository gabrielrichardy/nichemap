import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

function handle(req: Request) {
  const auth = getAuth();
  if (!auth) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  return auth.handler(req);
}

export const GET = handle;
export const POST = handle;
