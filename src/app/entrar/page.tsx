import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { LegalFooter } from "@/components/LegalFooter";
import { getAuth } from "@/lib/auth";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Entrar · Nichemap" };

export default async function EntrarPage() {
  if (await getViewer()) redirect("/");
  const configured = getAuth() !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <main className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold">Nichemap</h1>
        </div>
        <p className="text-sm text-slate-600">
          Acompanhe seu perfil do Instagram, o conteúdo que mais funciona e o seu mercado em um só painel.
        </p>
        {configured ? (
          <GoogleSignInButton />
        ) : (
          <p role="status" className="text-sm text-slate-500">
            Login ainda não configurado.
          </p>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
