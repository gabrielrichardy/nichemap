import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LegalFooter } from "@/components/LegalFooter";
import { ProfileLockForm } from "@/components/ProfileLockForm";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Seu perfil · Nichemap" };

export default async function PerfilPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (viewer.isAdmin || viewer.instagramUsername) redirect("/");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <main className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Qual é o seu perfil?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Digite o @ da sua conta comercial ou de criador. Não pedimos senha nem acesso ao Instagram.
          </p>
        </div>
        <ProfileLockForm />
      </main>
      <LegalFooter />
    </div>
  );
}
