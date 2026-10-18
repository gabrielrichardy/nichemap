import { describe, expect, it } from "vitest";
import { extractThemes } from "./themes";

describe("extractThemes", () => {
  it("finds the niche from what the posts talk about, without a fixed list", () => {
    const themes = extractThemes([
      "Automação com IA no WhatsApp para vender mais #automacao",
      "Como criei uma automação de atendimento com IA #automacao #produtividade",
      "Dica de produtividade: automação de tarefas repetitivas",
    ]);
    // "automação" and "#automacao" count as one topic, shown with the accented spelling.
    expect(themes[0]).toMatchObject({ label: "Automação", percent: 100 });
    expect(themes.find((t) => t.label === "Produtividade")?.percent).toBe(67);
    expect(themes.filter((t) => t.label.toLowerCase().includes("automa"))).toHaveLength(1);
  });

  it("ignores links, mentions, numbers and filler words", () => {
    const labels = extractThemes(["Confira o link na bio https://exemplo.com @parceiro 2026 para você"]).map(
      (t) => t.label,
    );
    expect(labels).toEqual([]);
  });

  it("drops one-off words when there are enough posts", () => {
    const captions = ["marketing digital", "marketing conteúdo", "marketing vendas", "marketing", "marketing"];
    expect(extractThemes(captions).map((t) => t.label)).toEqual(["Marketing"]);
  });

  it("shows a hashtag-only topic with its #", () => {
    expect(extractThemes(["#inteligenciaartificial"])[0].label).toBe("#inteligenciaartificial");
  });

  it("returns nothing when there are no captions", () => {
    expect(extractThemes([])).toEqual([]);
    expect(extractThemes(["", "   "])).toEqual([]);
  });
});
