/**
 * Provider selection. The rest of the app imports `getMoodProvider()` and the
 * shared types from here — never a vendor SDK directly. Adding a backend is a
 * new file in `providers/` plus one `case` below.
 *
 * Credentials are passed in per request (bring-your-own-key), so the provider
 * is constructed fresh each call with whatever key the caller resolved.
 */

import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";
import type { AiCredentials, AiProvider, MoodProvider } from "./types";

export type {
  AiCredentials,
  AiProvider,
  MoodProvider,
  PlaylistPlan,
  Taste,
  TrackSuggestion,
} from "./types";

export function getMoodProvider(provider: AiProvider, creds: AiCredentials): MoodProvider {
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(creds);
    case "openai":
      return new OpenAIProvider(creds);
    case "ollama":
      return new OllamaProvider(creds);
    default:
      throw new Error(
        `Unknown AI provider "${provider}". Supported: anthropic, openai, ollama.`,
      );
  }
}
