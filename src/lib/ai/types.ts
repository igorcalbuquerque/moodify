/**
 * Provider-agnostic contract for Moodify's single LLM operation: turning a
 * user's mood prompt plus their listening taste into a structured playlist plan.
 *
 * Nothing in this file references any vendor SDK. The rest of the app depends
 * only on these types and on `MoodProvider`, so swapping backends never reaches
 * past this boundary.
 */

export type AiProvider = "anthropic" | "openai" | "ollama";

export interface TrackSuggestion {
  title: string;
  artist: string;
}

export interface Taste {
  /** Names of the artists the user listens to most. */
  topArtists: string[];
  /** Genres derived from the user's top artists. */
  topGenres: string[];
  /** A sample of the user's most-played tracks, for stylistic anchoring. */
  topTracks: TrackSuggestion[];
}

export interface PlaylistPlan {
  playlistName: string;
  playlistDescription: string;
  /** The model's interpretation of the requested mood/vibe. */
  moodSummary: string;
  /** True when the user asked for unfamiliar music ("something new for me"). */
  wantsNovelty: boolean;
  tracks: TrackSuggestion[];
}

/**
 * The only LLM capability the app needs. Implementations live in
 * `providers/` and each owns its own SDK/transport and JSON-enforcement
 * mechanism, but every one returns the same validated `PlaylistPlan`.
 */
export interface MoodProvider {
  /** Stable identifier, e.g. "anthropic" — used for logging/diagnostics. */
  readonly name: string;
  buildPlaylistPlan(prompt: string, taste: Taste): Promise<PlaylistPlan>;
}

/**
 * Per-request credentials. Supplied by the end user (bring-your-own-key) so the
 * operator's account is never used, with operator settings as a fallback.
 * Never persisted server-side.
 */
export interface AiCredentials {
  apiKey?: string;
  model?: string;
  baseUrl?: string; // OpenAI-compatible base URL
  host?: string; // Ollama host
}
