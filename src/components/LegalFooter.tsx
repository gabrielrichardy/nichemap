import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="text-xs text-slate-400 flex gap-4 justify-center py-6 print:hidden">
      <Link href="/privacidade" className="hover:text-slate-600 underline-offset-2 hover:underline">
        Política de privacidade
      </Link>
      <Link href="/termos" className="hover:text-slate-600 underline-offset-2 hover:underline">
        Termos de uso
      </Link>
    </footer>
  );
}
