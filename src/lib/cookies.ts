/**
 * Minimal, dependency-free cookie parsing and serialization for Bun request
 * handlers. Handlers read cookies from the incoming `Request` and attach any
 * cookies to set via the `Set-Cookie` response header.
 */

import { useSecureCookies } from "@/config";

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie");
  if (!header) return {};

  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export interface CookieOptions {
  maxAge?: number; // seconds
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const {
    maxAge,
    path = "/",
    httpOnly = true,
    sameSite = "Lax",
  } = options;

  const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) segments.push("HttpOnly");
  if (useSecureCookies) segments.push("Secure");
  if (maxAge !== undefined) segments.push(`Max-Age=${maxAge}`);
  return segments.join("; ");
}

/** Build a cookie string that immediately expires (deletes) a cookie. */
export function deleteCookie(name: string): string {
  return serializeCookie(name, "", { maxAge: 0 });
}
