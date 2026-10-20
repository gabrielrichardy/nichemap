import { Check } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { cn } from "@/lib/utils";

interface LandingPlan {
  name: string;
  price: string;
  yearly: string;
  items: string[];
  free: boolean;
  highlight?: boolean;
}

const PLANS: LandingPlan[] = [
  {
    name: "Básico",
    price: "Grátis",
    yearly: "Sem cobrança",
    items: ["Painel do perfil: seguidores, engajamento, publicações e nota", "Crescimento e tipos de conteúdo", "Temas do perfil", "Profile Scanner"],
    free: true,
  },
  {
    name: "Intermediário",
    price: "R$ 59,90 por mês",
    yearly: "ou R$ 599 por ano",
    items: ["Tudo do Básico", "Conteúdo: até 25 publicações recentes", "Relatórios para impressão e PDF"],
    free: false,
  },
  {
    name: "Completo",
    price: "R$ 99,90 por mês",
    yearly: "ou R$ 999 por ano",
    items: ["Tudo do Intermediário", "Market Radar: concorrentes e mercado", "Empresas", "Oportunidades"],
    free: false,
    highlight: true,
  },
];

export function LandingPlans({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section id="planos" aria-labelledby="planos-titulo" className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 id="planos-titulo" className="text-2xl font-bold tracking-tight text-slate-900">
          Planos
        </h2>
        <p className="text-sm text-slate-600">Comece no Básico grátis. Um plano pago libera mais seções quando você precisar.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={cn(
              "flex flex-col rounded-2xl border bg-white p-6 shadow-sm",
              plan.highlight ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-100",
            )}
          >
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold text-slate-900">{plan.price}</p>
            <p className="text-sm text-slate-500">{plan.yearly}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
              {plan.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              {plan.free ? (
                <GoogleSignInButton label="Começar grátis no Básico" />
              ) : (
                <>
                  <GoogleSignInButton label="Entrar com Google" variant="outline" />
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl px-4 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                    >
                      Falar com o suporte para ativar
                    </a>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        No plano anual você paga 10 meses e usa 12. Por enquanto, a ativação de um plano pago é feita pelo suporte: não há pagamento automático no site.
      </p>
    </section>
  );
}
