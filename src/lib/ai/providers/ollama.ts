/**
 * Ollama (local models) implementation of `MoodProvider`.
 *
 * Uses raw HTTP against a local Ollama server, passing the shared JSON Schema
 * in the `format` field so the model is constrained to valid playlist JSON.
 * Lets the project run fully offline / vendor-free.
 */

import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { playlistPlanJsonSchema, validatePlan } from "../schema";
import type { AiCredentials, MoodProvider, PlaylistPlan, Taste } from "../types";

const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1";

export class OllamaProvider implements MoodProvider {
  readonly name = "ollama";

  constructor(private readonly creds: AiCredentials) {}

  async buildPlaylistPlan(prompt: string, taste: Taste): Promise<PlaylistPlan> {
    const host = (this.creds.host || DEFAULT_HOST).replace(/\/$/, "");

    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.creds.model || DEFAULT_MODEL,
        stream: false,
        format: playlistPlanJsonSchema,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(prompt, taste) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) {
      throw new Error("Ollama returned no content.");
    }

    return validatePlan(JSON.parse(content));
  }
}
