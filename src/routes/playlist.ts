/**
 * POST /api/playlist — the main agent endpoint.
 *
 * Flow:
 *   1. Read the user's taste (top artists, genres, tracks).
 *   2. Ask Claude to turn the mood prompt into a playlist plan.
 *   3. Resolve each suggested song to a real Spotify track via search.
 *   4. Create the playlist on the user's account and add the tracks.
 */

import { json } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { getMoodProvider, type AiCredentials, type AiProvider, type Taste } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import {
  getCurrentUser,
  getTopArtists,
  getTopTracks,
  searchTrack,
  createPlaylist,
  addTracksToPlaylist,
  type SpotifyTrack,
} from "@/lib/spotify";

type Lang = "en" | "pt";

const MESSAGES: Record<Lang, Record<string, string>> = {
  en: {
    describeMood: "Please describe your mood.",
    noneFound: "Couldn't find any of the suggested songs on Spotify. Try again.",
    generic: "Something went wrong while building your playlist.",
    needKey: "Add your own AI key in “Your AI key” to generate a playlist.",
  },
  pt: {
    describeMood: "Descreva o seu humor.",
    noneFound: "Não encontramos nenhuma das músicas sugeridas no Spotify. Tente de novo.",
    generic: "Algo deu errado ao montar a sua playlist.",
    needKey: "Adicione sua própria chave de IA em “Sua chave de IA” para gerar a playlist.",
  },
};

const PROVIDERS: AiProvider[] = ["anthropic", "openai", "ollama"];

/**
 * Resolve which provider/credentials to use. The end user's own key (sent in
 * the request, bring-your-own-key) wins; operator settings are a fallback so
 * the operator can still run it for themselves. Nothing here is persisted.
 */
function resolveAi(body: { aiProvider?: unknown; aiApiKey?: unknown; aiModel?: unknown }): {
  provider: AiProvider;
  creds: AiCredentials;
} {
  const s = getSettings();
  const provider = PROVIDERS.includes(body.aiProvider as AiProvider)
    ? (body.aiProvider as AiProvider)
    : s.aiProvider;

  const userKey = typeof body.aiApiKey === "string" ? body.aiApiKey.trim() : "";
  const userModel = typeof body.aiModel === "string" ? body.aiModel.trim() : "";

  const settingsKey =
    provider === "anthropic" ? s.anthropicApiKey : provider === "openai" ? s.openaiApiKey : "";
  const settingsModel =
    provider === "anthropic" ? s.anthropicModel : provider === "openai" ? s.openaiModel : s.ollamaModel;

  return {
    provider,
    creds: {
      apiKey: userKey || settingsKey,
      model: userModel || settingsModel,
      baseUrl: s.openaiBaseUrl,
      host: s.ollamaHost,
    },
  };
}

export async function createMoodPlaylist(request: Request): Promise<Response> {
  const session = await requireSession(request);
  if (!session) return json({ error: "Not authenticated." }, { status: 401 });

  const { accessToken, refreshedCookies } = session;

  let prompt: string;
  let lang: Lang = "en";
  let ai: { provider: AiProvider; creds: AiCredentials };
  try {
    const body = (await request.json()) as {
      prompt?: unknown;
      lang?: unknown;
      aiProvider?: unknown;
      aiApiKey?: unknown;
      aiModel?: unknown;
    };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (body.lang === "pt") lang = "pt";
    ai = resolveAi(body);
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const m = MESSAGES[lang];
  if (!prompt) {
    return json({ error: m.describeMood }, { status: 400 });
  }
  // Cloud providers need a key; Ollama (local) doesn't.
  if (ai.provider !== "ollama" && !ai.creds.apiKey) {
    return json({ error: m.needKey }, { status: 400, cookies: refreshedCookies });
  }

  try {
    // 1. Taste — fetched in parallel.
    const [user, artists, topTracks] = await Promise.all([
      getCurrentUser(accessToken),
      getTopArtists(accessToken),
      getTopTracks(accessToken),
    ]);
    const taste: Taste = {
      topArtists: artists.names,
      topGenres: artists.genres,
      topTracks,
    };

    // 2. Agent plan — using the caller's own AI credentials.
    const plan = await getMoodProvider(ai.provider, ai.creds).buildPlaylistPlan(prompt, taste);

    // 3. Resolve suggestions to real tracks (in parallel).
    const resolved = await Promise.all(
      plan.tracks.map((t) =>
        searchTrack(accessToken, t.title, t.artist).catch(() => null),
      ),
    );

    const knownArtists = new Set(taste.topArtists.map((a) => a.toLowerCase()));
    const seenUris = new Set<string>();
    const tracks: SpotifyTrack[] = [];
    const notFound: { title: string; artist: string }[] = [];

    plan.tracks.forEach((suggestion, i) => {
      const track = resolved[i];
      if (!track) {
        notFound.push(suggestion);
        return;
      }
      if (seenUris.has(track.uri)) return;

      // Safety net: enforce novelty even if the model slipped in a known artist.
      if (plan.wantsNovelty) {
        const fromKnown = track.artists.some((a) => knownArtists.has(a.name.toLowerCase()));
        if (fromKnown) return;
      }

      seenUris.add(track.uri);
      tracks.push(track);
    });

    if (tracks.length === 0) {
      return json(
        { error: m.noneFound },
        { status: 502, cookies: refreshedCookies },
      );
    }

    // 4. Create the playlist and add the tracks.
    //    Public so the embedded player (anonymous iframe context) can load it.
    const playlist = await createPlaylist(
      accessToken,
      user.id,
      plan.playlistName,
      `${plan.playlistDescription} · Made by Moodify`,
      true,
    );
    await addTracksToPlaylist(
      accessToken,
      playlist.id,
      tracks.map((t) => t.uri),
    );

    return json(
      {
        mood: plan.moodSummary,
        wantsNovelty: plan.wantsNovelty,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          url: playlist.external_urls.spotify,
          image: playlist.images?.[0]?.url ?? tracks[0]?.album.images?.[0]?.url ?? null,
        },
        tracks: tracks.map((t) => ({
          title: t.name,
          artist: t.artists.map((a) => a.name).join(", "),
          album: t.album.name,
          image: t.album.images?.[0]?.url ?? null,
          url: t.external_urls.spotify,
        })),
        notFound,
      },
      { cookies: refreshedCookies },
    );
  } catch (err) {
    console.error("Failed to create playlist:", err);
    return json(
      { error: m.generic },
      { status: 500, cookies: refreshedCookies },
    );
  }
}
