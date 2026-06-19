/**
 * Anthropic (Claude) implementation of `MoodProvider`.
 *
 * Uses the official SDK's structured-output helper so the model is constrained
 * to the shared playlist schema, then re-validates the parsed result through
 * `validatePlan` to honor the same contract every provider obeys.
 *
 * Credentials are injected per request. If no API key is given, the bare client
 * falls back to an `ant auth login` profile (operator-machine use only).
 */

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { playlistPlanSchema, validatePlan } from "../schema";
import type { AiCredentials, MoodProvider, PlaylistPlan, Taste } from "../types";

const DEFAULT_MODEL = "claude-opus-4-8";

export class AnthropicProvider implements MoodProvider {
  readonly name = "anthropic";

  constructor(private readonly creds: AiCredentials) {}

  async buildPlaylistPlan(prompt: string, taste: Taste): Promise<PlaylistPlan> {
    const client = new Anthropic(this.creds.apiKey ? { apiKey: this.creds.apiKey } : {});

    // Structured outputs live under the beta namespace in the SDK; `.parse()`
    // sets the required beta header and parses the result for us.
    const response = await client.beta.messages.parse({
      model: this.creds.model || DEFAULT_MODEL,
      max_tokens: 8000,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(prompt, taste) }],
      output_format: betaZodOutputFormat(playlistPlanSchema),
    });

    if (!response.parsed_output) {
      throw new Error("Anthropic returned no structured playlist plan.");
    }

    return validatePlan(response.parsed_output);
  }
}
