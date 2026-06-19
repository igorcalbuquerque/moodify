/** Typed client for the Moodify JSON API. */

export interface Profile {
  id: string;
  displayName: string | null;
  image: string | null;
}

export interface PlaylistTrack {
  title: string;
  artist: string;
  album: string;
  image: string | null;
  url: string;
}

export interface PlaylistResult {
  mood: string;
  wantsNovelty: boolean;
  playlist: { id: string; name: string; url: string; image: string | null };
  tracks: PlaylistTrack[];
  notFound: { title: string; artist: string }[];
}

export interface SetupStatus {
  configured: boolean;
  spotify: { hasClientId: boolean; hasClientSecret: boolean; redirectUri: string };
  ai: {
    provider: "anthropic" | "openai" | "ollama";
    hasAnthropicKey: boolean;
    anthropicModel: string;
    hasOpenaiKey: boolean;
    openaiModel: string;
    openaiBaseUrl: string;
    ollamaHost: string;
    ollamaModel: string;
  };
}

export async function fetchSetup(): Promise<SetupStatus> {
  const res = await fetch("/api/setup");
  return (await res.json()) as SetupStatus;
}

export async function saveSetup(payload: Record<string, string>): Promise<SetupStatus> {
  const res = await fetch("/api/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Save failed.");
  return data as SetupStatus;
}

export async function fetchProfile(): Promise<Profile | null> {
  const res = await fetch("/api/me");
  if (!res.ok) return null;
  const data = (await res.json()) as { authenticated: boolean; user?: Profile };
  return data.authenticated && data.user ? data.user : null;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export type AiProvider = "anthropic" | "openai" | "ollama";

export interface AiClientSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

const AI_STORAGE_KEY = "moodify_ai";

export function loadAiSettings(fallbackProvider: AiProvider): AiClientSettings {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AiClientSettings;
  } catch {
    /* ignore */
  }
  return { provider: fallbackProvider, apiKey: "", model: "" };
}

export function saveAiSettings(value: AiClientSettings): void {
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function createPlaylist(
  prompt: string,
  lang: "en" | "pt",
  ai: AiClientSettings,
): Promise<PlaylistResult> {
  const res = await fetch("/api/playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      lang,
      aiProvider: ai.provider,
      aiApiKey: ai.apiKey,
      aiModel: ai.model,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  }
  return data as PlaylistResult;
}
