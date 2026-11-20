import { createRemoteJWKSet, decodeJwt, errors as joseErrors, jwtVerify } from "jose";
import { csv, type Env } from "./env";

// Cloudflare Access sits in front of /admin, /maker-portal, /api/admin and
// /api/vendor. It handles the email one-time code and then forwards a signed
// JWT on every request. We verify that JWT here as a second lock, so the
// Worker never trusts a request just because it arrived.
//
// Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

export type AccessIdentity = { email: string };

/**
 * Why a request has no identity. Safe to show the visitor (it reveals nothing
 * about tokens) and it tells the site owner what to fix:
 *  - not_configured: ACCESS_TEAM_DOMAIN or ACCESS_AUD is blank or invalid in wrangler.jsonc
 *  - missing_token:  Cloudflare Access is not protecting this path, so no sign in reached the Worker
 *  - invalid_token:  a sign in arrived but failed verification (usually ACCESS_AUD does not match the Access app)
 */
export type AccessFailure = "not_configured" | "missing_token" | "invalid_token";
export type AccessCheck = { identity: AccessIdentity; reason?: undefined } | { identity: null; reason: AccessFailure; detail?: string };

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
  return (await checkAccess(request, env)).identity;
}

export async function checkAccess(request: Request, env: Env): Promise<AccessCheck> {
  // Local development shortcut. Requires ENVIRONMENT=development AND a
  // localhost request, so it can never apply on workers.dev or the real domain.
  if (env.ENVIRONMENT === "development" && env.DEV_AUTH_EMAIL && isLocalRequest(request)) {
    return { identity: { email: env.DEV_AUTH_EMAIL.trim().toLowerCase() } };
  }

  const origin = teamOrigin(env);
  const audiences = csv(env.ACCESS_AUD);
  if (!origin || audiences.length === 0) return { identity: null, reason: "not_configured" }; // Deny everything.

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { identity: null, reason: "missing_token" };

  let jwks = jwksCache.get(origin);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${origin}/cdn-cgi/access/certs`));
    jwksCache.set(origin, jwks);
  }

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: origin, audience: audiences });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return email ? { identity: { email } } : { identity: null, reason: "invalid_token" };
  } catch (error) {
    // A genuine sign in from an Access app whose tag is not in ACCESS_AUD. The
    // signature was already verified before this claim check failed, so the
    // tag is real. Tags are public identifiers, so showing it is safe and tells
    // the owner exactly which value to add.
    if (error instanceof joseErrors.JWTClaimValidationFailed && error.claim === "aud") {
      const aud = decodeJwt(token).aud;
      const received = (Array.isArray(aud) ? aud : [aud]).filter((value): value is string => typeof value === "string");
      console.warn(`Cloudflare Access sign in from an app not in ACCESS_AUD: ${received.join(",")}`);
      return { identity: null, reason: "invalid_token", detail: `this sign in came from Access app tag ${received.join(", ")}, which is not in ACCESS_AUD` };
    }
    // Visible in Workers Logs. Logs the verification error only, never the token.
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "unknown";
    console.warn(`Cloudflare Access token rejected: ${code}: ${error instanceof Error ? error.message : String(error)}`);
    return { identity: null, reason: "invalid_token" };
  }
}

export function isAdminEmail(env: Env, email: string): boolean {
  return csv(env.ADMIN_EMAILS).includes(email.toLowerCase());
}
