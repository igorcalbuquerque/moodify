/**
 * Session = the user's Spotify tokens, stored in HttpOnly cookies.
 *
 * Handlers call `requireSession(request)` to get a valid access token. If the
 * stored access token has expired, it is refreshed transparently and the
 * caller is told which cookies to re-set on the response.
 */

import { parseCookies, serializeCookie, deleteCookie } from "@/lib/cookies";
import { refreshAccessToken, type SpotifyTokens } from "@/lib/spotify";

const ACCESS = "moodify_access";
const REFRESH = "moodify_refresh";
const EXPIRES = "moodify_expires";

/** ~30 days; the refresh token is long-lived, the access token is not. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookies(tokens: SpotifyTokens): string[] {
  return [
    serializeCookie(ACCESS, tokens.accessToken, { maxAge: COOKIE_MAX_AGE }),
    serializeCookie(REFRESH, tokens.refreshToken, { maxAge: COOKIE_MAX_AGE }),
    serializeCookie(EXPIRES, String(tokens.expiresAt), { maxAge: COOKIE_MAX_AGE }),
  ];
}

export function clearSessionCookies(): string[] {
  return [deleteCookie(ACCESS), deleteCookie(REFRESH), deleteCookie(EXPIRES)];
}

function readTokens(request: Request): SpotifyTokens | null {
  const cookies = parseCookies(request);
  const accessToken = cookies[ACCESS];
  const refreshToken = cookies[REFRESH];
  const expiresAt = Number(cookies[EXPIRES]);
  if (!accessToken || !refreshToken || !expiresAt) return null;
  return { accessToken, refreshToken, expiresAt };
}

export interface ActiveSession {
  accessToken: string;
  /** Cookies that must be attached to the response (set when refreshed). */
  refreshedCookies: string[];
}

/**
 * Returns a valid session, refreshing the access token if needed.
 * Returns null when the user is not logged in.
 */
export async function requireSession(request: Request): Promise<ActiveSession | null> {
  const tokens = readTokens(request);
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt) {
    return { accessToken: tokens.accessToken, refreshedCookies: [] };
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  return {
    accessToken: refreshed.accessToken,
    refreshedCookies: sessionCookies(refreshed),
  };
}
