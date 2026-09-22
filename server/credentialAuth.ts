import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { deleteCredentialSession, getCredentialSessionByHash, insertCredentialSession } from "./db";

export const CREDENTIAL_COOKIE = "cannery_credentials";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SETUP_TOKEN_HASH = process.env.ADMIN_SETUP_TOKEN_HASH || "47ccee2907b659b1b50a8e5ba6a49fa663cb7dd80e66dba4c88f144165b8df60";

function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
function secureRequest(req: Request) { const forwarded = req.headers["x-forwarded-proto"]; return req.protocol === "https" || (typeof forwarded === "string" && forwarded.split(",").some((item) => item.trim() === "https")); }

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expected] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export function verifySetupToken(token: string) {
  const actual = Buffer.from(sha256(token));
  const expected = Buffer.from(SETUP_TOKEN_HASH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createCredentialSession(res: Response, req: Request, accountType: "admin" | "vendor", accountId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await insertCredentialSession({ tokenHash: sha256(token), accountType, accountId, expiresAt });
  res.cookie(CREDENTIAL_COOKIE, token, { httpOnly: true, secure: secureRequest(req), sameSite: "lax", path: "/", maxAge: SESSION_MS });
}

export async function readCredentialSession(req: Request) {
  const token = parse(req.headers.cookie || "")[CREDENTIAL_COOKIE];
  if (!token) return null;
  return (await getCredentialSessionByHash(sha256(token))) || null;
}

export async function clearCredentialSession(req: Request, res: Response) {
  const token = parse(req.headers.cookie || "")[CREDENTIAL_COOKIE];
  if (token) await deleteCredentialSession(sha256(token));
  res.clearCookie(CREDENTIAL_COOKIE, { httpOnly: true, secure: secureRequest(req), sameSite: "lax", path: "/" });
}
