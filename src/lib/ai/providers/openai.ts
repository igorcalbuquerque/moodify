/**
 * OpenAI-compatible implementation of `MoodProvider`.
 *
 * Uses raw HTTP (no SDK) against the Chat Completions API with a strict
 * `json_schema` response format. Because it targets the OpenAI-compatible
 * wire shape, it also works with Azure OpenAI, Together, Groq, OpenRouter,
 * and similar gateways by overriding the base URL / model in settings.
 */

import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { playlistPlanJsonSchema, validatePlan } from "../schema";
import type { AiCredentials, MoodProvider, PlaylistPlan, Taste } from "../types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements MoodProvider {
  readonly name = "openai";

  constructor(private readonly creds: AiCredentials) {}

  async buildPlaylistPlan(prompt: string, taste: Taste): Promise<PlaylistPlan> {
    if (!this.creds.apiKey) {
      throw new Error("OpenAI API key is not set.");
    }
    const baseUrl = (this.creds.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.creds.apiKey}`,
      },
      body: JSON.stringify({
        model: this.creds.model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(prompt, taste) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "playlist_plan",
            strict: true,
            schema: playlistPlanJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned no content.");
    }

    return validatePlan(JSON.parse(content));
  }
}
