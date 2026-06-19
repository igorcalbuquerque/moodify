/** OAuth route handlers: login, callback, logout. */

import { config } from "@/config";
import { json, redirect } from "@/lib/http";
import { parseCookies, serializeCookie, deleteCookie } from "@/lib/cookies";
import { buildAuthorizeUrl, exchangeCodeForTokens } from "@/lib/spotify";
import { sessionCookies, clearSessionCookies } from "@/lib/session";
import { isConfigured } from "@/lib/settings";

const STATE_COOKIE = "moodify_oauth_state";

/** GET /api/auth/login — start the Spotify Authorization Code flow. */
export function login(): Response {
  if (!isConfigured()) return redirect(`${config.baseUrl}/?error=not_configured`);
  const state = crypto.randomUUID();
  const stateCookie = serializeCookie(STATE_COOKIE, state, { maxAge: 600 });
  return redirect(buildAuthorizeUrl(state), [stateCookie]);
}

/** GET /api/auth/callback — exchange the code for tokens and set the session. */
export async function callback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) return redirect(`${config.baseUrl}/?error=${encodeURIComponent(error)}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseCookies(request)[STATE_COOKIE];

  if (!code || !state || state !== expectedState) {
    return redirect(`${config.baseUrl}/?error=invalid_oauth_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    return redirect(`${config.baseUrl}/`, [
      ...sessionCookies(tokens),
      deleteCookie(STATE_COOKIE),
    ]);
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return redirect(`${config.baseUrl}/?error=auth_failed`);
  }
}

/** POST /api/auth/logout — clear the session. */
export function logout(): Response {
  return json({ ok: true }, { cookies: clearSessionCookies() });
}
