/**
 * Runtime settings store — credentials the operator provides via the in-app
 * setup screen (or via environment variables).
 *
 * Resolution order (later wins): built-in defaults → environment variables →
 * persisted store file. So a fresh `.env` still works, but the setup screen
 * (which writes the store) takes precedence and needs no file editing.
 *
 * The store file holds secrets, so it is gitignored and never sent to the
 * client — only booleans/non-secret fields are exposed (see `publicStatus`).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { config } from "@/config";
import type { AiProvider } from "@/lib/ai/types";

export type { AiProvider };

export interface Settings {
  spotifyClientId: string;
  spotifyClientSecret: string;
  spotifyRedirectUri: string;
  aiProvider: AiProvider;
  anthropicApiKey: string; // empty → rely on `ant auth login` profile
  anthropicModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  ollamaHost: string;
  ollamaModel: string;
}

const STORE_PATH = `${process.cwd()}/.moodify.json`;

function defaults(): Settings {
  return {
    spotifyClientId: "",
    spotifyClientSecret: "",
    spotifyRedirectUri: `${config.baseUrl}/api/auth/callback`,
    aiProvider: "anthropic",
    anthropicApiKey: "",
    anthropicModel: "claude-opus-4-8",
    openaiApiKey: "",
    openaiModel: "gpt-4o",
    openaiBaseUrl: "https://api.openai.com/v1",
    ollamaHost: "http://127.0.0.1:11434",
    ollamaModel: "llama3.1",
  };
}

function fromEnv(): Partial<Settings> {
  const env = Bun.env;
  const out: Partial<Settings> = {};
  if (env.SPOTIFY_CLIENT_ID) out.spotifyClientId = env.SPOTIFY_CLIENT_ID;
  if (env.SPOTIFY_CLIENT_SECRET) out.spotifyClientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (env.SPOTIFY_REDIRECT_URI) out.spotifyRedirectUri = env.SPOTIFY_REDIRECT_URI;
  if (env.AI_PROVIDER) out.aiProvider = env.AI_PROVIDER as AiProvider;
  if (env.ANTHROPIC_API_KEY) out.anthropicApiKey = env.ANTHROPIC_API_KEY;
  if (env.ANTHROPIC_MODEL) out.anthropicModel = env.ANTHROPIC_MODEL;
  if (env.OPENAI_API_KEY) out.openaiApiKey = env.OPENAI_API_KEY;
  if (env.OPENAI_MODEL) out.openaiModel = env.OPENAI_MODEL;
  if (env.OPENAI_BASE_URL) out.openaiBaseUrl = env.OPENAI_BASE_URL;
  if (env.OLLAMA_HOST) out.ollamaHost = env.OLLAMA_HOST;
  if (env.OLLAMA_MODEL) out.ollamaModel = env.OLLAMA_MODEL;
  return out;
}

function readStore(): Partial<Settings> {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<Settings>;
  } catch {
    return {};
  }
}

let cache: Settings | null = null;

export function getSettings(): Settings {
  if (!cache) cache = { ...defaults(), ...fromEnv(), ...readStore() };
  return cache;
}

/** Persist a partial update (only the provided keys) and refresh the cache. */
export function updateSettings(patch: Partial<Settings>): Settings {
  const store = { ...readStore(), ...patch };
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  cache = null;
  return getSettings();
}

/** True once the unavoidable operator credential (the Spotify app) is present. */
export function isConfigured(): boolean {
  const s = getSettings();
  return Boolean(s.spotifyClientId && s.spotifyClientSecret);
}

/** Non-secret view of the current settings, safe to send to the browser. */
export function publicStatus() {
  const s = getSettings();
  return {
    configured: isConfigured(),
    spotify: {
      hasClientId: Boolean(s.spotifyClientId),
      hasClientSecret: Boolean(s.spotifyClientSecret),
      redirectUri: s.spotifyRedirectUri,
    },
    ai: {
      provider: s.aiProvider,
      hasAnthropicKey: Boolean(s.anthropicApiKey),
      anthropicModel: s.anthropicModel,
      hasOpenaiKey: Boolean(s.openaiApiKey),
      openaiModel: s.openaiModel,
      openaiBaseUrl: s.openaiBaseUrl,
      ollamaHost: s.ollamaHost,
      ollamaModel: s.ollamaModel,
    },
  };
}
