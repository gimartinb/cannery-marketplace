import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { vendorProfileSchema } from "../shared/vendorProfile";
import { parseVendorWorkbook } from "../client/src/components/VendorImportPanel";
import { getAccessIdentity, isAdminEmail } from "../worker/access";
import { adminRouter, publicRouter, vendorRouter } from "../worker/routers";
import type { Env } from "../worker/env";
import type { TrpcContext } from "../worker/trpc";

const headers = ["name*","slug","category*","short_bio*","owner_bio","contact_email*","website_url","instagram_url","facebook_url","tiktok_url","cover_image_url","gallery_image_urls","featured","display_order","active"];
function workbookBuffer(rows: unknown[][]) { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); XLSX.utils.book_append_sheet(wb, ws, "Vendor Import"); return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer; }

const TEAM = "https://cannery.cloudflareaccess.com";
const AUD = "test-audience-tag";
const baseEnv = { DB: {} as D1Database, MEDIA: {} as R2Bucket, ASSETS: {} as Fetcher, ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ADMIN_EMAILS: "owner@example.com, second@example.com" } satisfies Env;

// A real signing key, served as the Access JWKS through a stubbed fetch, so the
// actual signature, issuer, audience, and expiry checks run.
const keys = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(keys.publicKey)), kid: "test-key", alg: "RS256" };
async function accessToken(claims: { email?: string; aud?: string; iss?: string; expiresIn?: string }, key = keys.privateKey) {
  return new SignJWT(claims.email ? { email: claims.email } : {})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(claims.iss ?? TEAM).setAudience(claims.aud ?? AUD).setIssuedAt().setExpirationTime(claims.expiresIn ?? "1h")
    .sign(key);
}
function requestWith(token?: string, url = "https://cannerymarket.com/api/admin/trpc/adminPortal.dashboard") {
  return new Request(url, { headers: token ? { "Cf-Access-Jwt-Assertion": token } : {} });
}

vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
  if (String(input) === `${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [jwk] });
  return new Response("unexpected fetch", { status: 500 });
}));
afterEach(() => vi.clearAllMocks());

describe("profile validation and import", () => {
  it("accepts matching social domains and rejects misleading links", () => {
    const base = { name: "Maker Studio", category: "Ceramics", shortBio: "A sufficiently detailed maker bio for public review.", contactEmail: "maker@example.com", galleryImageUrls: [], featured: false, displayOrder: 100, active: true };
    expect(vendorProfileSchema.safeParse({ ...base, instagramUrl: "https://instagram.com/maker" }).success).toBe(true);
    expect(vendorProfileSchema.safeParse({ ...base, instagramUrl: "https://example.com/not-instagram" }).success).toBe(false);
  });
  it("accepts new and legacy uploaded image paths but not arbitrary strings", () => {
    const base = { name: "Maker Studio", category: "Ceramics", shortBio: "A sufficiently detailed maker bio for public review.", contactEmail: "maker@example.com", galleryImageUrls: [], featured: false, displayOrder: 100, active: true };
    expect(vendorProfileSchema.safeParse({ ...base, coverImageUrl: "/media/vendor-1/mug_ab12cd34.jpg" }).success).toBe(true);
    expect(vendorProfileSchema.safeParse({ ...base, coverImageUrl: "/manus-storage/vendor-1/mug_ab12cd34.jpg" }).success).toBe(true);
    expect(vendorProfileSchema.safeParse({ ...base, coverImageUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("previews valid spreadsheet rows and blocks duplicate slugs", () => {
    const rows = parseVendorWorkbook(workbookBuffer([["Example Maker","example-maker","Ceramics","A sufficiently detailed maker bio for import.","","maker@example.com","","https://instagram.com/examplemaker","","","","","No",10,"Yes"]]), ["example-maker"]);
    expect(rows).toHaveLength(1); expect(rows[0].errors.join(" ")).toContain("already exists");
  });
});

describe("Cloudflare Access verification", () => {
  it("accepts a valid Access token and returns the lowercased email", async () => {
    const identity = await getAccessIdentity(requestWith(await accessToken({ email: "Owner@Example.com" })), baseEnv);
    expect(identity).toEqual({ email: "owner@example.com" });
  });
  it("rejects requests with no token", async () => {
    expect(await getAccessIdentity(requestWith(), baseEnv)).toBeNull();
  });
  it("rejects a token signed by a different key", async () => {
    const attacker = await generateKeyPair("RS256");
    expect(await getAccessIdentity(requestWith(await accessToken({ email: "owner@example.com" }, attacker.privateKey)), baseEnv)).toBeNull();
  });
  it("rejects a token for a different Access application or issuer", async () => {
    expect(await getAccessIdentity(requestWith(await accessToken({ email: "owner@example.com", aud: "other-app" })), baseEnv)).toBeNull();
    expect(await getAccessIdentity(requestWith(await accessToken({ email: "owner@example.com", iss: "https://evil.cloudflareaccess.com" })), baseEnv)).toBeNull();
  });
  it("rejects an expired token", async () => {
    expect(await getAccessIdentity(requestWith(await accessToken({ email: "owner@example.com", expiresIn: "-5m" })), baseEnv)).toBeNull();
  });
  it("denies everything when Access is not configured yet", async () => {
    const token = await accessToken({ email: "owner@example.com" });
    expect(await getAccessIdentity(requestWith(token), { ...baseEnv, ACCESS_TEAM_DOMAIN: "", ACCESS_AUD: "" })).toBeNull();
    expect(await getAccessIdentity(requestWith(token), { ...baseEnv, ACCESS_TEAM_DOMAIN: "https://example.com" })).toBeNull();
  });
  it("only honors the local development shortcut on localhost", async () => {
    const devEnv = { ...baseEnv, ENVIRONMENT: "development", DEV_AUTH_EMAIL: "owner@example.com" };
    expect(await getAccessIdentity(requestWith(undefined, "http://localhost:8787/api/admin/trpc/x"), devEnv)).toEqual({ email: "owner@example.com" });
    expect(await getAccessIdentity(requestWith(undefined, "https://cannery-marketplace.example.workers.dev/api/admin/trpc/x"), devEnv)).toBeNull();
  });
  it("matches the admin allow list exactly", () => {
    expect(isAdminEmail(baseEnv, "OWNER@example.com")).toBe(true);
    expect(isAdminEmail(baseEnv, "owner@example.com.evil.com")).toBe(false);
    expect(isAdminEmail(baseEnv, "vendor@example.com")).toBe(false);
  });
});

describe("endpoint separation", () => {
  const ctx = (token?: string): TrpcContext => ({ env: baseEnv, db: {} as TrpcContext["db"], request: requestWith(token) });

  it("rejects admin and vendor calls without an Access token", async () => {
    await expect(adminRouter.createCaller(ctx()).adminPortal.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(vendorRouter.createCaller(ctx()).vendorPortal.latest()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("rejects a verified email that is not on the owner list", async () => {
    const token = await accessToken({ email: "vendor@example.com" });
    await expect(adminRouter.createCaller(ctx(token)).adminPortal.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("lets an approved owner through", async () => {
    const token = await accessToken({ email: "second@example.com" });
    await expect(adminRouter.createCaller(ctx(token)).adminPortal.me()).resolves.toEqual({ email: "second@example.com" });
  });
  it("keeps admin and vendor procedures out of the public endpoint", () => {
    const publicPaths = Object.keys(publicRouter._def.procedures);
    expect(publicPaths.some((path) => path.startsWith("adminPortal.") || path.startsWith("vendorPortal."))).toBe(false);
  });
});
