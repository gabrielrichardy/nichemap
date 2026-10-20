import { Boxes, LineChart, Store, Target, UserRound } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { LandingFaq } from "@/components/LandingFaq";
import { LandingPlans } from "@/components/LandingPlans";
import { LandingShot } from "@/components/LandingShot";
import { LegalFooter } from "@/components/LegalFooter";

const STEPS = [
  {
    title: "Veja seus números",
    text: "Seguidores, engajamento, publicações e a nota do seu perfil em uma tela só.",
    kind: "numeros" as const,
  },
  {
    title: "Descubra o que funciona",
    text: "Os 5 posts com mais curtidas e quanto cada um ficou acima da média do seu perfil.",
    kind: "posts" as const,
  },
  {
    title: "Entenda seus temas",
    text: "Os assuntos que mais aparecem nas suas legendas e hashtags, e o tipo de conteúdo que você mais publica.",
    kind: "temas" as const,
  },
  {
    title: "Compare com o mercado",
    text: "Veja como concorrentes do seu nicho se saem e onde há oportunidades. Disponível no plano Completo.",
    kind: "mercado" as const,
  },
];

const AUDIENCE = [
  { icon: Store, title: "Empresas", text: "Quem cuida das redes sociais de uma empresa e precisa mostrar resultados." },
  { icon: UserRound, title: "Marca pessoal", text: "Quem gerencia a própria presença e quer entender o que está funcionando." },
  { icon: Target, title: "Quem decide pelo celular", text: "Quem quer acompanhar tudo no celular, sem planilhas nem posts soltos." },
];

export function Landing({ whatsapp }: { whatsapp: string | null }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <a href="#topo" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Boxes className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold text-slate-900">Nichemap</span>
        </a>
        <nav aria-label="Principal" className="flex items-center gap-4 text-sm">
          <a href="#planos" className="text-slate-600 hover:text-slate-900">
            Planos
          </a>
          <a href="/entrar" className="font-medium text-blue-700 hover:text-blue-800">
            Entrar
          </a>
        </nav>
      </header>

      <main id="topo" className="mx-auto max-w-5xl space-y-16 px-4 pb-6">
        <section className="grid items-center gap-10 pt-6 md:grid-cols-2 md:pt-12">
          <div className="min-w-0 space-y-5">
            <p className="text-sm font-medium text-blue-700">Painel de análise de Instagram</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Descubra o que faz o seu Instagram crescer
            </h1>
            <p className="text-base text-slate-600">
              O Nichemap reúne em um painel para celular os números do seu perfil, os posts que mais funcionam e os temas que
              você mais publica. Sem planilha e sem olhar post por post.
            </p>
            <div className="space-y-3 sm:flex sm:gap-3 sm:space-y-0">
              <div className="sm:flex-1">
                <GoogleSignInButton />
              </div>
              <div className="sm:flex-1">
                <GoogleSignInButton label="Começar grátis no Básico" variant="outline" />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Só funciona com conta comercial ou de criador pública. Não pedimos sua senha do Instagram.
            </p>
          </div>
          <LandingShot kind="numeros" />
        </section>

        <section aria-labelledby="como-titulo" className="space-y-8">
          <div className="space-y-2">
            <h2 id="como-titulo" className="text-2xl font-bold tracking-tight text-slate-900">
              O que você vê no painel
            </h2>
            <p className="text-sm text-slate-600">Cada parte do painel responde a uma pergunta sobre o seu perfil.</p>
          </div>
          {STEPS.map((step, index) => (
            <article key={step.title} className="grid items-center gap-6 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-blue-700">Passo {index + 1}</p>
                <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.text}</p>
              </div>
              <LandingShot kind={step.kind} />
            </article>
          ))}
          <p className="text-xs text-slate-500">As telas são ilustrações com dados fictícios.</p>
        </section>

        <section aria-labelledby="para-quem-titulo" className="space-y-6">
          <h2 id="para-quem-titulo" className="text-2xl font-bold tracking-tight text-slate-900">
            Para quem é
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-violet-600" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <LandingPlans whatsapp={whatsapp} />

        <LandingFaq />

        <section aria-labelledby="final-titulo" className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm sm:p-10">
          <LineChart className="mx-auto h-8 w-8 text-blue-600" aria-hidden="true" />
          <h2 id="final-titulo" className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Veja o painel do seu perfil
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Entre com o Google, escolha o seu @ e comece no Básico, que é grátis.
          </p>
          <div className="mx-auto mt-6 max-w-sm">
            <GoogleSignInButton />
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
