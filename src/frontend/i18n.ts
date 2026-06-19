/**
 * Tiny dependency-free i18n for the UI. Two languages; the active one is
 * detected from the browser, persisted in localStorage, and switchable via the
 * header toggle. Components receive a `Dict` (`t`) of resolved strings.
 */

export type Lang = "en" | "pt";

export interface Dict {
  // header / shell
  tagline: string;
  loading: string;
  signOut: string;
  footer: string;
  otherLangLabel: string; // label shown on the toggle to switch language

  // main prompt
  promptLabel: string;
  promptPlaceholder: string;
  createBtn: string;
  buildingBtn: string;
  cmdEnterHint: string;
  curating: string;
  examples: string[];

  // landing
  landingText: string;
  connectBtn: string;
  landingHint: string;

  // per-user AI key (bring-your-own-key)
  aiKeyTitle: string;
  aiKeyHint: string;
  aiProviderField: string;
  aiKeyField: string;
  aiKeyPlaceholder: string;
  aiGetKey: string;
  aiModelField: string;
  aiModelPlaceholder: string;

  // result
  openInSpotify: string;
  freshBadge: string;
  notFound: (n: number) => string;

  // errors
  errNotConfigured: string;
  errSpotify: (code: string) => string;
  errGeneric: string;

  // setup
  setupTitle: string;
  setupIntro: string;
  setupStep1: string;
  setupStep1Desc: string;
  dashboardLinkLabel: string;
  setupStep1Tail: string;
  clientIdLabel: string;
  clientSecretLabel: string;
  savedKeepBlank: string;
  aiProviderLabel: string;
  anthropicKeyLabel: string;
  optionalTag: string;
  anthropicKeyPlaceholder: string;
  openaiKeyLabel: string;
  openaiModelLabel: string;
  ollamaModelLabel: string;
  saveContinue: string;
  saving: string;
  setupBothRequired: string;
}

const en: Dict = {
  tagline: "Describe your mood. Get a Spotify playlist made for it.",
  loading: "Loading…",
  signOut: "Sign out",
  footer: "By Igor Albuquerque · Powered by the Spotify Web API",
  otherLangLabel: "PT",

  promptLabel: "How are you feeling? What's the moment?",
  promptPlaceholder: "e.g. winding down after a long week, something warm and mellow…",
  createBtn: "Create playlist",
  buildingBtn: "Building your playlist…",
  cmdEnterHint: "Tip: press ⌘/Ctrl + Enter to generate.",
  curating: "Curating songs for your mood…",
  examples: [
    "Rainy Sunday morning, coffee and a book",
    "Gym beast mode, max energy",
    "Studying late, need focus but not boring",
    "Surprise me with new artists I've never heard, but my vibe",
  ],

  landingText:
    "Connect your Spotify account and Moodify will read your taste, then build a brand-new playlist that matches whatever mood you type in.",
  connectBtn: "Connect Spotify",
  landingHint: "We only use your taste to personalize playlists.",

  aiKeyTitle: "Your AI key",
  aiKeyHint:
    "Bring your own AI key — it's stored only in this browser and sent directly with your request. We never store it.",
  aiProviderField: "Provider",
  aiKeyField: "API key",
  aiKeyPlaceholder: "Paste your API key",
  aiGetKey: "Get a key →",
  aiModelField: "Model",
  aiModelPlaceholder: "default",

  openInSpotify: "Open in Spotify",
  freshBadge: "Fresh discoveries ✨",
  notFound: (n) => `${n} suggestion(s) weren't found on Spotify and were skipped.`,

  errNotConfigured: "Moodify isn't set up yet — finish setup below.",
  errSpotify: (code) => `Spotify sign-in failed (${code}). Please try again.`,
  errGeneric: "Something went wrong.",

  setupTitle: "Set up Moodify",
  setupIntro:
    "One-time setup by whoever runs this app. After this, anyone just clicks Connect Spotify.",
  setupStep1: "1 · Create a Spotify app",
  setupStep1Desc: "In the ",
  dashboardLinkLabel: "Spotify Developer Dashboard",
  setupStep1Tail: ", create an app and add this exact Redirect URI:",
  clientIdLabel: "Spotify Client ID",
  clientSecretLabel: "Spotify Client Secret",
  savedKeepBlank: "•••••• (saved — leave blank to keep)",
  aiProviderLabel: "2 · AI provider",
  anthropicKeyLabel: "Anthropic API key",
  optionalTag: "(optional)",
  anthropicKeyPlaceholder: "Leave blank to use `ant auth login` (browser)",
  openaiKeyLabel: "OpenAI API key",
  openaiModelLabel: "OpenAI model",
  ollamaModelLabel: "Ollama model",
  saveContinue: "Save & continue",
  saving: "Saving…",
  setupBothRequired: "Spotify Client ID and Secret are both required.",
};

const pt: Dict = {
  tagline: "Descreva seu humor. Receba uma playlist do Spotify feita para ele.",
  loading: "Carregando…",
  signOut: "Sair",
  footer: "By Igor Albuquerque · Usa a API Web do Spotify",
  otherLangLabel: "EN",

  promptLabel: "Como você está se sentindo? Qual é o momento?",
  promptPlaceholder: "ex.: relaxando depois de uma semana longa, algo quente e tranquilo…",
  createBtn: "Criar playlist",
  buildingBtn: "Montando sua playlist…",
  cmdEnterHint: "Dica: pressione ⌘/Ctrl + Enter para gerar.",
  curating: "Selecionando músicas para o seu humor…",
  examples: [
    "Domingo chuvoso de manhã, café e um livro",
    "Treino modo monstro, energia máxima",
    "Estudando até tarde, preciso de foco mas sem ser chato",
    "Me surpreenda com artistas novos que nunca ouvi, mas com a minha vibe",
  ],

  landingText:
    "Conecte sua conta do Spotify e o Moodify vai ler seu gosto e montar uma playlist nova que combina com o humor que você escrever.",
  connectBtn: "Conectar Spotify",
  landingHint: "Usamos seu gosto apenas para personalizar as playlists.",

  aiKeyTitle: "Sua chave de IA",
  aiKeyHint:
    "Use sua própria chave de IA — ela fica salva apenas neste navegador e é enviada direto com o seu pedido. Nunca guardamos a chave.",
  aiProviderField: "Provedor",
  aiKeyField: "Chave de API",
  aiKeyPlaceholder: "Cole sua chave de API",
  aiGetKey: "Pegue uma chave →",
  aiModelField: "Modelo",
  aiModelPlaceholder: "padrão",

  openInSpotify: "Abrir no Spotify",
  freshBadge: "Descobertas novas ✨",
  notFound: (n) => `${n} sugestão(ões) não foram encontradas no Spotify e foram puladas.`,

  errNotConfigured: "O Moodify ainda não foi configurado — conclua a configuração abaixo.",
  errSpotify: (code) => `Falha no login do Spotify (${code}). Tente novamente.`,
  errGeneric: "Algo deu errado.",

  setupTitle: "Configurar o Moodify",
  setupIntro:
    "Configuração única, feita por quem roda o app. Depois disso, qualquer pessoa só clica em Conectar Spotify.",
  setupStep1: "1 · Crie um app no Spotify",
  setupStep1Desc: "No ",
  dashboardLinkLabel: "Spotify Developer Dashboard",
  setupStep1Tail: ", crie um app e adicione exatamente este Redirect URI:",
  clientIdLabel: "Client ID do Spotify",
  clientSecretLabel: "Client Secret do Spotify",
  savedKeepBlank: "•••••• (salvo — deixe em branco para manter)",
  aiProviderLabel: "2 · Provedor de IA",
  anthropicKeyLabel: "Chave de API da Anthropic",
  optionalTag: "(opcional)",
  anthropicKeyPlaceholder: "Deixe em branco para usar `ant auth login` (navegador)",
  openaiKeyLabel: "Chave de API da OpenAI",
  openaiModelLabel: "Modelo OpenAI",
  ollamaModelLabel: "Modelo Ollama",
  saveContinue: "Salvar e continuar",
  saving: "Salvando…",
  setupBothRequired: "Client ID e Client Secret do Spotify são obrigatórios.",
};

export const dictionaries: Record<Lang, Dict> = { en, pt };

const STORAGE_KEY = "moodify_lang";

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "pt") return saved;
  } catch {
    /* localStorage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}
