import { createRemoteJWKSet, jwtVerify } from "jose";
import { csv, type Env } from "./env";

// Cloudflare Access sits in front of /admin, /maker-portal, /api/admin and
// /api/vendor. It handles the email one-time code and then forwards a signed
// JWT on every request. We verify that JWT here as a second lock, so the
// Worker never trusts a request just because it arrived.
//
// Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

export type AccessIdentity = { email: string };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function teamOrigin(env: Env): string | null {
  const raw = (env.ACCESS_TEAM_DOMAIN || "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  const withScheme = raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.endsWith(".cloudflareaccess.com")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalRequest(request: Request): boolean {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function getAccessIdentity(request: Request, env: Env): Promise<AccessIdentity | null> {
  // Local development shortcut. Requires ENVIRONMENT=development AND a
  // localhost request, so it can never apply on workers.dev or the real domain.
  if (env.ENVIRONMENT === "development" && env.DEV_AUTH_EMAIL && isLocalRequest(request)) {
    return { email: env.DEV_AUTH_EMAIL.trim().toLowerCase() };
  }

  const origin = teamOrigin(env);
  const audiences = csv(env.ACCESS_AUD);
  if (!origin || audiences.length === 0) return null; // Not configured: deny everything.

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  let jwks = jwksCache.get(origin);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${origin}/cdn-cgi/access/certs`));
    jwksCache.set(origin, jwks);
  }

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: origin, audience: audiences });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export function isAdminEmail(env: Env, email: string): boolean {
  return csv(env.ADMIN_EMAILS).includes(email.toLowerCase());
}
