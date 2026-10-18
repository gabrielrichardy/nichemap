import type { ThemeItem } from "./types";

// Common Portuguese and English words that say nothing about a niche.
const STOPWORDS = new Set(
  (
    "para pela pelo pelas pelos com sem sobre entre como mais menos muito muita muitos muitas " +
    "esse essa esses essas este esta estes estas isso isto aquele aquela aquilo onde quando " +
    "porque porquê pois então também ainda já mesmo mesma cada todo toda todos todas outro outra " +
    "outros outras qual quais quem nosso nossa nossos nossas vocês você seus suas meus minhas " +
    "dele dela deles delas eles elas nós aqui agora hoje ontem amanhã sempre nunca depois antes " +
    "ser ter fazer está estão estou foram foi era vai vamos pode podem deve devem tem têm tenho " +
    "seja sejam sendo sido fica ficar faz fazem quer querem sabe saber vem vindo veja vejam " +
    "dia dias vez vezes coisa coisas gente aqui alguém algum alguma alguns algumas nada tudo " +
    "link bio comenta comente compartilhe salve segue siga clique confira " +
    "that this with from your have just about what when where they them their there here will " +
    "would could should into than then also only more most some very been were being does"
  ).split(" "),
);

// "automação" and "#automacao" are the same topic.
const keyOf = (term: string) => term.normalize("NFD").replace(/\p{M}/gu, "");

const COLORS = ["#3B82F6", "#8B5CF6", "#22C55E", "#F59E0B", "#0EA5E9", "#EC4899"];

// Hashtags and words of 4+ letters, ignoring links and @mentions.
function termsOf(text: string): { term: string; hashtag: boolean }[] {
  const clean = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@[\w.]+/g, " ");
  return [...clean.matchAll(/#?[\p{L}\p{N}_]{4,}/gu)]
    .map((m) => ({ term: m[0].replace(/^#/, ""), hashtag: m[0].startsWith("#") }))
    .filter(({ term }) => !STOPWORDS.has(term) && !/^\d+$/.test(term));
}

// Topics the profile actually talks about: the terms present in the most posts.
// `percent` is the share of posts that mention the term (it does not add up to 100).
export function extractThemes(captions: string[], maxThemes = 6): ThemeItem[] {
  const posts = captions.filter((c) => c.trim());
  if (!posts.length) return [];

  const postsWithTerm = new Map<string, number>();
  const wordForm = new Map<string, string>(); // how the topic is written in plain text
  const hashtagForm = new Map<string, string>();
  for (const caption of posts) {
    const inThisPost = new Set<string>();
    for (const { term, hashtag } of termsOf(caption)) {
      const key = keyOf(term);
      // Prefer the accented spelling ("automação" over "automacao").
      const forms = hashtag ? hashtagForm : wordForm;
      if (!forms.has(key) || term !== key) forms.set(key, term);
      inThisPost.add(key);
    }
    for (const key of inThisPost) postsWithTerm.set(key, (postsWithTerm.get(key) ?? 0) + 1);
  }

  // With several posts, a term used once is noise; with few posts, every term counts.
  const minPosts = posts.length >= 5 ? 2 : 1;
  return [...postsWithTerm.entries()]
    .filter(([, count]) => count >= minPosts)
    .sort(
      ([a, ca], [b, cb]) =>
        cb - ca || Number(hashtagForm.has(b)) - Number(hashtagForm.has(a)) || a.localeCompare(b, "pt-BR"),
    )
    .slice(0, maxThemes)
    .map(([key, count], i) => {
      const word = wordForm.get(key);
      return {
        label: word ? word.charAt(0).toUpperCase() + word.slice(1) : `#${hashtagForm.get(key)}`,
        percent: Math.round((count / posts.length) * 100),
        color: COLORS[i % COLORS.length],
      };
    });
}
