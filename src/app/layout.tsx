import type { Metadata } from "next";
import "./globals.css";

async function getMetaVerification(): Promise<string | undefined> {
  const code = process.env.META_VERIFICATION_CODE?.trim();
  return code ? code : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const metaVerification = await getMetaVerification();
  return {
    title: "Nichemap",
    description:
      "Painel de inteligência para social media analisar perfis, conteúdos e mercado.",
    other: metaVerification
      ? {
          "facebook-domain-verification": metaVerification,
        }
      : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-[#F5F6FA] text-slate-900">{children}</body>
    </html>
  );
}
