/**
 * Setup routes — let the operator configure credentials from the browser,
 * so no `.env` editing is required.
 *
 *   GET  /api/setup  → non-secret status (what's set, the redirect URI, etc.)
 *   POST /api/setup  → persist provided fields (blank fields are ignored, so
 *                      secrets are never accidentally wiped)
 */

import { json } from "@/lib/http";
import {
  publicStatus,
  updateSettings,
  isConfigured,
  type Settings,
  type AiProvider,
} from "@/lib/settings";

export function getSetup(): Response {
  return json(publicStatus());
}

/**
 * Decide whether a setup-write is allowed. Once the app is configured, the
 * setup endpoint is locked so a visitor on the network can't overwrite the
 * operator's config. To re-enable remote (re)configuration, set
 * MOODIFY_SETUP_TOKEN and send it as the `x-setup-token` header.
 */
function setupWriteAllowed(request: Request): boolean {
  const token = Bun.env.MOODIFY_SETUP_TOKEN;
  if (token) return request.headers.get("x-setup-token") === token;
  return !isConfigured(); // first-run setup only; locked afterwards
}

const STRING_FIELDS: Exclude<keyof Settings, "aiProvider">[] = [
  "spotifyClientId",
  "spotifyClientSecret",
  "spotifyRedirectUri",
  "anthropicApiKey",
  "anthropicModel",
  "openaiApiKey",
  "openaiModel",
  "openaiBaseUrl",
  "ollamaHost",
  "ollamaModel",
];

const PROVIDERS: AiProvider[] = ["anthropic", "openai", "ollama"];

export async function postSetup(request: Request): Promise<Response> {
  if (!setupWriteAllowed(request)) {
    return json(
      {
        error:
          "Setup is locked. Moodify is already configured. To change settings, " +
          "edit/remove .moodify.json on the host (then restart), or set " +
          "MOODIFY_SETUP_TOKEN and send it as the x-setup-token header.",
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<Settings> = {};

  // Only persist non-empty strings — keeps existing secrets intact when a
  // field is left blank in the form.
  for (const key of STRING_FIELDS) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      patch[key] = value.trim();
    }
  }

  if (typeof body.aiProvider === "string") {
    if (!PROVIDERS.includes(body.aiProvider as AiProvider)) {
      return json({ error: `Unknown AI provider "${body.aiProvider}".` }, { status: 400 });
    }
    patch.aiProvider = body.aiProvider as AiProvider;
  }

  updateSettings(patch);
  return json(publicStatus());
}
