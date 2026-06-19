/** GET /api/me — return the logged-in user's profile, or 401 if not logged in. */

import { json } from "@/lib/http";
import { requireSession, clearSessionCookies } from "@/lib/session";
import { getCurrentUser } from "@/lib/spotify";

export async function me(request: Request): Promise<Response> {
  const session = await requireSession(request);
  if (!session) return json({ authenticated: false }, { status: 401 });

  try {
    const user = await getCurrentUser(session.accessToken);
    return json(
      {
        authenticated: true,
        user: {
          id: user.id,
          displayName: user.display_name,
          image: user.images?.[0]?.url ?? null,
        },
      },
      { cookies: session.refreshedCookies },
    );
  } catch (err) {
    // Token is unusable (revoked, scopes changed, etc.) — clear the session.
    console.error("Failed to load profile:", err);
    return json({ authenticated: false }, { status: 401, cookies: clearSessionCookies() });
  }
}
