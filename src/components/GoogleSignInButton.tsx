"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  variant?: "solid" | "outline";
}

export function GoogleSignInButton({ label = "Entrar com Google", variant = "solid" }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (error) {
      setError("Não foi possível entrar com o Google. Tente novamente.");
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className={cn(
          "w-full rounded-xl text-sm font-medium px-4 py-3 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          variant === "solid"
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
        )}
      >
        {pending ? "Abrindo o Google..." : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
