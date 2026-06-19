/**
 * Static, always-available configuration (host + port).
 *
 * Credentials (Spotify, AI provider) are NOT here — they can be set at runtime
 * via the in-app setup screen, so they live in the settings store (settings.ts).
 * That lets the server boot even before it has been configured.
 */

export const config = {
  baseUrl: Bun.env.BASE_URL ?? "http://127.0.0.1:3000",
  port: Number(Bun.env.PORT ?? 3000),
  // Bind to all interfaces so other devices on the LAN can reach it.
  hostname: Bun.env.HOST ?? "0.0.0.0",
  // Optional HTTPS: set both to serve TLS (required for LAN sharing, since
  // Spotify only allows http redirect URIs for loopback 127.0.0.1).
  tlsCert: Bun.env.SSL_CERT_FILE ?? "",
  tlsKey: Bun.env.SSL_KEY_FILE ?? "",
} as const;

/** Cookies should only be marked `Secure` when actually served over HTTPS. */
export const useSecureCookies = config.baseUrl.startsWith("https://");
