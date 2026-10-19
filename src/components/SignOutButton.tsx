"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    router.push("/entrar");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
