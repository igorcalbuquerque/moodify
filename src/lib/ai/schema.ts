/**
 * The single source of truth for the shape of a playlist plan.
 *
 * Every provider — regardless of how it coaxes JSON out of its model —
 * validates its raw output through `validatePlan`, so callers always receive
 * an identical, validated `PlaylistPlan`. The hand-written JSON Schema mirror
 * is for providers (OpenAI, Ollama, ...) whose APIs accept a JSON Schema to
 * constrain the response; it is kept beside the Zod schema so the two stay
 * in sync without pulling in a zod-to-json-schema dependency.
 */

import { z } from "zod";
import type { PlaylistPlan } from "./types";

export const trackSuggestionSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
});

export const playlistPlanSchema = z.object({
  playlistName: z.string().min(1),
  playlistDescription: z.string(),
  moodSummary: z.string(),
  wantsNovelty: z.boolean(),
  tracks: z.array(trackSuggestionSchema),
});

/** Validate and narrow raw model output to a `PlaylistPlan`. Throws on mismatch. */
export function validatePlan(raw: unknown): PlaylistPlan {
  return playlistPlanSchema.parse(raw);
}

/**
 * JSON Schema equivalent of `playlistPlanSchema`, suitable for OpenAI
 * `response_format: { type: "json_schema" }` and Ollama's `format` field.
 * `additionalProperties: false` is required by strict JSON-schema modes.
 */
export const playlistPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "playlistName",
    "playlistDescription",
    "moodSummary",
    "wantsNovelty",
    "tracks",
  ],
  properties: {
    playlistName: { type: "string" },
    playlistDescription: { type: "string" },
    moodSummary: { type: "string" },
    wantsNovelty: { type: "boolean" },
    tracks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "artist"],
        properties: {
          title: { type: "string" },
          artist: { type: "string" },
        },
      },
    },
  },
} as const;
