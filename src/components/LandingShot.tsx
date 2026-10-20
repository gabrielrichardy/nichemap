export type ShotKind = "numeros" | "posts" | "temas" | "mercado";

const DESCRIPTIONS: Record<ShotKind, string> = {
  numeros: "Exemplo ilustrativo: números do perfil, com dados fictícios",
  posts: "Exemplo ilustrativo: posts em destaque, com dados fictícios",
  temas: "Exemplo ilustrativo: temas e tipos de conteúdo, com dados fictícios",
  mercado: "Exemplo ilustrativo: concorrentes do mercado, com dados fictícios",
};

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${value}%` }} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Rows({ rows }: { rows: { label: string; detail: string; value: number }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl bg-white p-2.5 space-y-1.5">
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="text-slate-700">{row.label}</span>
            <span className="font-semibold text-slate-900">{row.detail}</span>
          </div>
          <Bar value={row.value} />
        </div>
      ))}
    </div>
  );
}

function Content({ kind }: { kind: ShotKind }) {
  if (kind === "numeros") {
    return (
      <>
        <p className="text-xs font-semibold text-slate-900">@seuperfil</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Kpi label="Seguidores" value="12,4 mil" />
          <Kpi label="Engajamento médio" value="3,8%" />
          <Kpi label="Publicações" value="214" />
          <Kpi label="Nota do perfil" value="72" />
        </div>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {[40, 48, 44, 60, 58, 72, 80].map((height, index) => (
            <div key={index} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${height}%` }} />
          ))}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Crescimento de seguidores</p>
      </>
    );
  }
  if (kind === "posts") {
    return (
      <>
        <p className="mb-2 text-xs font-semibold text-slate-900">Posts em destaque</p>
        <Rows
          rows={[
            { label: "Carrossel", detail: "2,4× a média", value: 90 },
            { label: "Reel", detail: "1,9× a média", value: 72 },
            { label: "Foto", detail: "1,2× a média", value: 50 },
          ]}
        />
      </>
    );
  }
  if (kind === "temas") {
    return (
      <>
        <p className="mb-2 text-xs font-semibold text-slate-900">Temas do perfil</p>
        <Rows
          rows={[
            { label: "Receitas", detail: "38%", value: 38 },
            { label: "Bastidores", detail: "27%", value: 27 },
            { label: "Promoções", detail: "18%", value: 18 },
          ]}
        />
        <p className="mb-2 mt-3 text-xs font-semibold text-slate-900">Tipos de conteúdo</p>
        <Rows
          rows={[
            { label: "Foto", detail: "45%", value: 45 },
            { label: "Vídeo", detail: "35%", value: 35 },
          ]}
        />
      </>
    );
  }
  return (
    <>
      <p className="mb-2 text-xs font-semibold text-slate-900">Mercado · plano Completo</p>
      <Rows
        rows={[
          { label: "Concorrente A", detail: "4,1%", value: 82 },
          { label: "Concorrente B", detail: "3,2%", value: 64 },
          { label: "Concorrente C", detail: "2,6%", value: 52 },
        ]}
      />
    </>
  );
}

export function LandingShot({ kind, className }: { kind: ShotKind; className?: string }) {
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={DESCRIPTIONS[kind]}
        className="relative mx-auto w-full max-w-[280px] rounded-[2rem] border-[6px] border-slate-900 bg-[#F5F6FA] p-4 pt-8 shadow-xl"
      >
        <span className="absolute right-3 top-2.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          Exemplo
        </span>
        <div aria-hidden="true">
          <Content kind={kind} />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-500">Exemplo com dados fictícios</figcaption>
    </figure>
  );
}
