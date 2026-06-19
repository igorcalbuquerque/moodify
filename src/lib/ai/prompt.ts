/**
 * Provider-neutral prompt text. Every provider sends this same content; they
 * differ only in *how* they transmit it and *how* they enforce JSON output.
 * Keeping the wording here means prompt changes apply to all backends at once.
 */

import type { Taste } from "./types";

const TARGET_TRACK_COUNT = 25;

export function buildSystemPrompt(): string {
  return [
    "You are Moodify, an expert music curator that builds Spotify playlists from a person's described mood.",
    "",
    "Given a free-text mood/vibe (which may be in any language, e.g. English or Portuguese) and the listener's taste profile, you select real, existing songs that fit the mood and form a cohesive yet varied playlist.",
    "",
    "Rules:",
    `- Suggest about ${TARGET_TRACK_COUNT} tracks. Each must be a real song that exists on Spotify; give the exact track title and primary artist.`,
    "- Set `wantsNovelty` to true when the request asks for unfamiliar music or discovery (e.g. \"something new for me\", \"surprise me\", \"artists I don't know\", \"algo novo\", \"me surpreenda\").",
    "- When `wantsNovelty` is true: do NOT include any artist from the listener's top artists, and avoid their obvious hits. Still anchor to their taste by choosing stylistically adjacent artists and genres they are likely to enjoy but probably haven't heard.",
    "- When `wantsNovelty` is false: you may mix familiar favorites with fitting new picks.",
    "- Always honor the mood first; the taste profile guides style, not the theme.",
    "- Write a short, catchy `playlistName` and a `playlistDescription` of at most 280 characters.",
    "- `moodSummary` is one sentence describing how you interpreted the request.",
  ].join("\n");
}

export function buildUserPrompt(prompt: string, taste: Taste): string {
  const tasteBlock = JSON.stringify(
    {
      topArtists: taste.topArtists,
      topGenres: taste.topGenres,
      topTracks: taste.topTracks,
    },
    null,
    2,
  );

  return [
    "Mood request:",
    prompt.trim(),
    "",
    "Listener taste profile:",
    tasteBlock,
  ].join("\n");
}
