/**
 * Spotify Web API client: OAuth (Authorization Code flow) plus the handful of
 * endpoints Moodify needs — reading the user's taste, searching for tracks,
 * and creating playlists.
 *
 * Note: this intentionally avoids the deprecated `/recommendations` and
 * audio-features endpoints. Track selection is done by the Claude agent
 * (see agent.ts); Spotify is used only to read taste and resolve/create.
 */

import { getSettings } from "@/lib/settings";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "playlist-modify-public",
  "playlist-modify-private",
];

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which `accessToken` expires. */
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

function basicAuthHeader(): string {
  const { spotifyClientId, spotifyClientSecret } = getSettings();
  const raw = `${spotifyClientId}:${spotifyClientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

/** Build the Spotify authorize URL the user is redirected to. */
export function buildAuthorizeUrl(state: string): string {
  const { spotifyClientId, spotifyRedirectUri } = getSettings();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: spotifyClientId,
    scope: SCOPES.join(" "),
    redirect_uri: spotifyRedirectUri,
    state,
    // Force Spotify to show the login/consent dialog instead of silently
    // re-authorizing — otherwise "sign out" looks broken (you're instantly
    // logged back in) and you can't switch accounts.
    show_dialog: "true",
  });
  return `${ACCOUNTS}/authorize?${params.toString()}`;
}

function toTokens(data: TokenResponse, fallbackRefresh?: string): SpotifyTokens {
  const refreshToken = data.refresh_token ?? fallbackRefresh;
  if (!refreshToken) throw new Error("Spotify token response missing refresh_token");
  return {
    accessToken: data.access_token,
    refreshToken,
    // Refresh slightly early (60s) to avoid edge-of-expiry failures.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getSettings().spotifyRedirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${await res.text()}`);
  return toTokens((await res.json()) as TokenResponse);
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${await res.text()}`);
  // Spotify may omit a new refresh_token; keep the existing one.
  return toTokens((await res.json()) as TokenResponse, refreshToken);
}

async function api<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Spotify API ${path} -> ${res.status}: ${await res.text()}`);
  }
  // Some endpoints (e.g. add-tracks) may return empty bodies.
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// --- Domain types (only the fields we use) ---

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images: { url: string }[];
}

export function getCurrentUser(accessToken: string): Promise<SpotifyUser> {
  return api<SpotifyUser>(accessToken, "/me");
}

export async function getTopArtists(
  accessToken: string,
  limit = 20,
): Promise<{ names: string[]; genres: string[] }> {
  const data = await api<{ items: { name: string; genres: string[] }[] }>(
    accessToken,
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
  );
  const names = data.items.map((a) => a.name);
  const genres = [...new Set(data.items.flatMap((a) => a.genres))];
  return { names, genres };
}

export async function getTopTracks(
  accessToken: string,
  limit = 20,
): Promise<{ title: string; artist: string }[]> {
  const data = await api<{ items: { name: string; artists: { name: string }[] }[] }>(
    accessToken,
    `/me/top/tracks?limit=${limit}&time_range=medium_term`,
  );
  return data.items.map((t) => ({
    title: t.name,
    artist: t.artists[0]?.name ?? "",
  }));
}

/** Resolve a "title by artist" suggestion to a real Spotify track, or null. */
export async function searchTrack(
  accessToken: string,
  title: string,
  artist: string,
): Promise<SpotifyTrack | null> {
  const q = `track:${title} artist:${artist}`;
  const params = new URLSearchParams({ q, type: "track", limit: "5" });
  const data = await api<{ tracks: { items: SpotifyTrack[] } }>(
    accessToken,
    `/search?${params.toString()}`,
  );
  const items = data.tracks.items;
  if (items.length === 0) return null;

  // Prefer a result whose artist matches; otherwise fall back to the top hit.
  const wanted = artist.toLowerCase();
  const match = items.find((t) =>
    t.artists.some((a) => a.name.toLowerCase() === wanted),
  );
  return match ?? items[0];
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic = false,
): Promise<SpotifyPlaylist> {
  return api<SpotifyPlaylist>(accessToken, `/users/${userId}/playlists`, {
    method: "POST",
    body: JSON.stringify({ name, description, public: isPublic }),
  });
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  // Spotify accepts up to 100 URIs per request.
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    await api(accessToken, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
  }
}
