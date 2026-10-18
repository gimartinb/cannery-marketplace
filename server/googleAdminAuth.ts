import { randomBytes } from "node:crypto";
import { parse } from "cookie";
import type { Express, Request, Response } from "express";
import { createCredentialSession } from "./credentialAuth";
import { upsertAdminGoogleAccount } from "./db";

const STATE_COOKIE = "cannery_g_state";
const STATE_MS = 10 * 60 * 1000;

function secureRequest(req: Request) {
  const forwarded = req.headers["x-forwarded-proto"];
  return req.protocol === "https" || (typeof forwarded === "string" && forwarded.split(",").some((item) => item.trim() === "https"));
}

function allowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function redirectUri(req: Request): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const host = req.headers.host;
  return `${secureRequest(req) ? "https" : "http"}://${host}/api/auth/google/callback`;
}

export function registerGoogleAdminAuth(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.redirect("/admin?error=google_not_configured");
      return;
    }
    const state = randomBytes(24).toString("hex");
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: secureRequest(req),
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: STATE_MS,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const cookieState = parse(req.headers.cookie || "")[STATE_COOKIE];
    const queryState = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    res.clearCookie(STATE_COOKIE, { httpOnly: true, secure: secureRequest(req), sameSite: "lax", path: "/api/auth/google" });

    if (!clientId || !clientSecret) {
      res.redirect("/admin?error=google_not_configured");
      return;
    }
    if (!code || !cookieState || !queryState || cookieState !== queryState) {
      res.redirect("/admin?error=google_failed");
      return;
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) throw new Error("Token exchange failed");
      const tokens = (await tokenResponse.json()) as { access_token?: string };
      if (!tokens.access_token) throw new Error("No access token returned");

      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileResponse.ok) throw new Error("Could not read Google profile");
      const profile = (await profileResponse.json()) as { sub?: string; email?: string; email_verified?: boolean };
      const email = (profile.email || "").trim().toLowerCase();
      if (!profile.sub || !email || !profile.email_verified) {
        res.redirect("/admin?error=google_failed");
        return;
      }

      if (!allowedEmails().includes(email)) {
        res.redirect("/admin?error=google_not_allowed");
        return;
      }

      const account = await upsertAdminGoogleAccount(profile.sub, email);
      await createCredentialSession(res, req, "admin", account.id);
      res.redirect("/admin");
    } catch (error) {
      console.error("Google admin sign-in failed", error);
      res.redirect("/admin?error=google_failed");
    }
  });
}
