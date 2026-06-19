/**
 * Moodify server — Bun.serve full-stack entry point.
 *
 * Serves the bundled React frontend at "/" and the JSON API under "/api/*".
 * Bun bundles ./index.html (and the TSX/CSS it imports) automatically.
 */

import { config } from "@/config";
import index from "./index.html";
import { login, callback, logout } from "@/routes/auth";
import { me } from "@/routes/me";
import { createMoodPlaylist } from "@/routes/playlist";
import { getSetup, postSetup } from "@/routes/setup";

const tls =
  config.tlsCert && config.tlsKey
    ? { cert: Bun.file(config.tlsCert), key: Bun.file(config.tlsKey) }
    : undefined;

const server = Bun.serve({
  port: config.port,
  hostname: config.hostname,
  ...(tls ? { tls } : {}),
  development: Bun.env.NODE_ENV !== "production",
  routes: {
    "/": index,

    "/api/setup": { GET: getSetup, POST: postSetup },

    "/api/auth/login": { GET: login },
    "/api/auth/callback": { GET: callback },
    "/api/auth/logout": { POST: logout },

    "/api/me": { GET: me },
    "/api/playlist": { POST: createMoodPlaylist },
  },
});

// Print the configured BASE_URL (not server.url, which says "localhost").
// You must use this exact host — it has to match the Spotify redirect URI,
// or the OAuth state cookie won't survive the round-trip (127.0.0.1 ≠ localhost).
console.log(`🎧 Moodify running at ${config.baseUrl}  (open this exact URL)`);
void server;
