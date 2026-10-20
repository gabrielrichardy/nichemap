const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: "Preciso de uma conta comercial ou de criador?",
    answer:
      "Sim. O Nichemap só lê perfis comerciais ou de criador de conteúdo que estejam públicos. Contas pessoais ou privadas não aparecem no painel.",
  },
  {
    question: "Vocês pedem a senha do meu Instagram?",
    answer: "Não. Você entra só com a sua conta Google. Não pedimos login nem senha do Instagram.",
  },
  {
    question: "Posso trocar o @ depois de escolher?",
    answer:
      "Não. Depois de escolhido, o @ fica travado na sua conta, e um mesmo perfil não pode ser usado em duas contas.",
  },
  {
    question: "Os números são reais?",
    answer:
      "Sim, eles vêm da API oficial do Instagram. Se algum dado não estiver disponível, o painel avisa em vez de inventar um valor.",
  },
  {
    question: "Quanto custa?",
    answer:
      "O Básico é grátis. O Intermediário custa R$ 59,90 por mês ou R$ 599 por ano, e o Completo, R$ 99,90 por mês ou R$ 999 por ano.",
  },
  {
    question: "Como pago um plano?",
    answer: "Por enquanto, a ativação é feita pelo suporte. Não há cobrança automática no site.",
  },
  {
    question: "Posso excluir minha conta?",
    answer: "Sim. Em Minha conta, você exclui a sua conta e os dados ligados a ela.",
  },
];

export function LandingFaq() {
  return (
    <section id="perguntas" aria-labelledby="perguntas-titulo" className="py-12 space-y-6">
      <h2 id="perguntas-titulo" className="text-2xl font-bold tracking-tight text-slate-900">
        Perguntas frequentes
      </h2>
      <div className="divide-y divide-slate-200 rounded-2xl border border-slate-100 bg-white shadow-sm">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
