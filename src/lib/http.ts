/** Small helpers for building JSON responses, optionally setting cookies. */

interface JsonInit {
  status?: number;
  cookies?: string[];
}

export function json(data: unknown, init: JsonInit = {}): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const cookie of init.cookies ?? []) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}
