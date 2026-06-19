# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Moodify is a mobile-first web app: a user describes a mood in free text (any
language) and gets a real Spotify playlist created on their account. Asking for
something *new to them* makes the agent recommend unfamiliar artists anchored to
their taste.

## Commands

- `bun install` — install dependencies
- `bun run dev` — hot-reload dev server (`bun --hot src/server.ts`)
- `bun run start` — production server
- `bun run typecheck` — `tsc --noEmit` (the only automated check; there is no test suite)

After changing `.env` or TLS settings, **fully restart** `bun run dev` — `--hot`
reloads modules but does not re-read env or re-bind the server (port/TLS/host).

## Architecture

Bun-native full-stack on a single `Bun.serve` (`src/server.ts`): it serves the
JSON API under `/api/*` and the React 19 frontend at `/`, which Bun bundles
automatically from `src/index.html` → `src/frontend/main.tsx` (TSX + CSS).

**The agent flow (the core idea).** The LLM is the song *selector*, not Spotify.
`src/routes/playlist.ts` orchestrates: read the user's taste (top
artists/genres/tracks) → ask the model for a structured `PlaylistPlan` of real
songs → resolve each suggestion to a real track via Spotify *search* → create
the playlist and add tracks. We deliberately **do not** use Spotify's deprecated
`/recommendations` or audio-features endpoints. Novelty is enforced twice: in the
agent prompt, and as a server-side filter that drops tracks by known top artists.

**Provider-agnostic AI (`src/lib/ai/`).** Everything imports `getMoodProvider(provider, creds)`
and the shared types — never a vendor SDK directly. Each backend
(`providers/anthropic.ts`, `openai.ts`, `ollama.ts`) returns the same
`PlaylistPlan`, validated against the single Zod contract in `schema.ts`
(`anthropic` uses SDK structured outputs; the others use the hand-written JSON
Schema mirror). Adding a backend = one file in `providers/` + one `case` in
`index.ts`; nothing else changes.

**Bring-your-own-key.** AI credentials are **per request**, not global. The end
user enters their own key in the "Your AI key" panel; it lives only in their
browser `localStorage` and is sent in the playlist request body, used
transiently, and **never persisted server-side**. `playlist.ts` `resolveAi()`
prefers the user's key and falls back to operator settings only if present — so
to distribute without the operator's account, leave the operator AI key blank.

**Two config layers.** `src/config.ts` = static, always-available, env-only
(`BASE_URL`, `PORT`, `HOST`, `SSL_CERT_FILE`/`SSL_KEY_FILE`); the server boots
even when unconfigured. `src/lib/settings.ts` = runtime store persisted to
`.moodify.json`, holding the *operator's* Spotify app credentials and AI
provider/model defaults. Resolution order is defaults → env vars → store file.
This is what powers the **in-browser setup screen** (`/api/setup`,
`src/frontend/Setup.tsx`): the operator configures credentials from the browser
with no `.env` editing. Secrets are never returned — only `has*` booleans via
`publicStatus()`.

**Two roles.** *Operator* (runs the server): sets the Spotify *app* credentials
once (setup screen or `.env`). *End user* (per browser): does Spotify OAuth and
supplies their own AI key. Sessions are the user's Spotify tokens in HttpOnly
cookies (`src/lib/session.ts`), refreshed transparently; `requireSession()`
returns any cookies that must be re-set on the response.

**i18n.** `src/frontend/i18n.ts` holds two dictionaries (en, pt) with a header
toggle, browser auto-detect, and `localStorage` persistence. The active `lang`
is also sent to `/api/playlist` so server-side user-facing errors are localized.

## Critical gotchas

- **Anthropic SDK is version-pinned (`@anthropic-ai/sdk` 0.71.x).** Structured
  outputs are `client.beta.messages.parse({ ..., output_format: betaZodOutputFormat(schema) })`
  with the helper imported from `@anthropic-ai/sdk/helpers/beta/zod` — **not**
  `helpers/zod`, not `output_config.format`. Adaptive thinking is not in this
  version's beta types, so it's omitted. Requires **Zod v4** (the helper calls
  `z.toJSONSchema`); Zod 3 will fail at runtime.
- **`localhost` ≠ `127.0.0.1` for OAuth.** The browser must open the app at the
  exact host in `BASE_URL`, which must match the Spotify redirect URI exactly, or
  the OAuth state cookie is dropped (`invalid_oauth_state`). The startup log
  prints `BASE_URL` for this reason.
- **LAN/HTTPS sharing.** Spotify only allows `http` redirect URIs for loopback
  (`127.0.0.1`); any other host needs HTTPS. Set `SSL_CERT_FILE`/`SSL_KEY_FILE`
  (+ `BASE_URL`/redirect to the LAN IP). `BASE_URL` starting with `https://` flips
  cookies to `Secure`. While the Spotify app is in Development Mode, only
  allow-listed accounts can log in (max 25).
- `.moodify.json` and `certs/` contain secrets and are gitignored.

## Conventions

Follow Clean Code; keep modules small and single-purpose (see the master
`../CLAUDE.md`). Use the SDK's typed helpers rather than reimplementing them.
This is a Bun project — never reach for npm or Next.js.
