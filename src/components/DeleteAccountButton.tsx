"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteMyAccount, type BillingActionState } from "@/app/conta/actions";

function ConfirmDelete() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-xl bg-rose-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
      {pending ? "Excluindo..." : "Excluir conta"}
    </button>
  );
}

export function DeleteAccountButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, remove] = useActionState<BillingActionState>(() => deleteMyAccount(), {});
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
      >
        Excluir minha conta
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-slate-900/40"
      >
        <h2 id="delete-title" className="font-semibold text-slate-900">
          Excluir sua conta?
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Excluir sua conta apaga seus dados e libera o perfil. Não dá para desfazer.
        </p>
        {state.error && (
          <p role="alert" className="text-sm text-rose-600 mt-2">
            {state.error}
          </p>
        )}
        <form action={remove} className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl px-4 py-2 text-sm text-slate-600">
            Voltar
          </button>
          <ConfirmDelete />
        </form>
      </dialog>
    </>
  );
}
