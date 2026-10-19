"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { confirmProfile, previewProfile, type ConfirmState, type PreviewState } from "@/app/perfil/actions";

const WARNING =
  "Essa escolha é definitiva. Depois de confirmar, sua conta fica ligada a este perfil e não pode ser trocada por você.";

function SupportLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
      Falar com o suporte no WhatsApp
    </a>
  );
}

export function ProfileLockForm({ supportUrl }: { supportUrl: string | null }) {
  const [lookup, lookupAction, looking] = useActionState<PreviewState, FormData>(previewProfile, {});
  const [confirm, confirmAction, confirming] = useActionState<ConfirmState, FormData>(confirmProfile, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmForm = useRef<HTMLFormElement>(null);
  const preview = lookup.preview;

  const openDialog = () => {
    // Native validation first: the terms checkbox is required.
    if (confirmForm.current?.reportValidity()) dialog.current?.showModal();
  };

  return (
    <div className="space-y-4">
      <form action={lookupAction} className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-slate-700">
          Seu @ no Instagram
        </label>
        <div className="flex gap-2">
          <input
            id="username"
            name="username"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@seuperfil"
            className="min-w-0 flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            disabled={looking}
            className="shrink-0 rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-60"
          >
            {looking ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {lookup.error && (
          <p role="alert" className="text-sm text-rose-600">
            {lookup.error}
          </p>
        )}
        {lookup.inUse && <SupportLink href={supportUrl} />}
      </form>

      {preview && (
        <form ref={confirmForm} action={confirmAction} className="space-y-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="username" value={preview.username} />
          <div className="flex items-center gap-3">
            {preview.pictureUrl ? (
              // External Instagram CDN image; next/image would need remotePatterns for it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.pictureUrl} alt={preview.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">
                {preview.name.replace("@", "").slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{preview.name}</p>
              <p className="text-sm text-slate-500">@{preview.username}</p>
              <p className="text-xs text-slate-400">{preview.followers.toLocaleString("pt-BR")} seguidores</p>
              {preview.source === "unofficial" && <p className="text-xs text-orange-700">Dados de fonte não oficial</p>}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" name="terms" required className="mt-0.5" />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="text-blue-600 underline">
                termos de uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="text-blue-600 underline">
                política de privacidade
              </Link>
              .
            </span>
          </label>
          <button
            type="button"
            onClick={openDialog}
            className="w-full rounded-xl bg-blue-600 text-white text-sm font-medium px-4 py-3 hover:bg-blue-700"
          >
            Sou eu
          </button>
          {confirm.error && (
            <p role="alert" className="text-sm text-rose-600">
              {confirm.error}
            </p>
          )}
          {confirm.inUse && <SupportLink href={supportUrl} />}

          <dialog
            ref={dialog}
            aria-labelledby="confirm-title"
            className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-slate-900/40"
          >
            <h2 id="confirm-title" className="font-semibold text-slate-900">
              Confirmar @{preview.username}?
            </h2>
            <p className="text-sm text-slate-600 mt-2">{WARNING}</p>
            <div className="flex gap-2 justify-end mt-5">
              <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl px-4 py-2 text-sm text-slate-600">
                Voltar
              </button>
              <button
                type="submit"
                disabled={confirming}
                onClick={() => dialog.current?.close()}
                className="rounded-xl bg-blue-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
              >
                {confirming ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </dialog>
        </form>
      )}
    </div>
  );
}
