import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { hashPassword, verifyPassword } from "./credentialAuth";
import { vendorProfileSchema } from "../shared/vendorProfile";
import { parseVendorWorkbook } from "../client/src/components/VendorImportPanel";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const headers = ["name*","slug","category*","short_bio*","owner_bio","contact_email*","website_url","instagram_url","facebook_url","tiktok_url","cover_image_url","gallery_image_urls","featured","display_order","active"];
function workbookBuffer(rows: unknown[][]) { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); XLSX.utils.book_append_sheet(wb, ws, "Vendor Import"); return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer; }

describe("secure portal workflow", () => {
  it("hashes passwords with a random salt and verifies without storing plaintext", () => {
    const first = hashPassword("StrongPassword123"); const second = hashPassword("StrongPassword123");
    expect(first).not.toBe(second); expect(first).not.toContain("StrongPassword123"); expect(verifyPassword("StrongPassword123", first)).toBe(true); expect(verifyPassword("wrong", first)).toBe(false);
  });
  it("accepts matching social domains and rejects misleading links", () => {
    const base = { name: "Maker Studio", category: "Ceramics", shortBio: "A sufficiently detailed maker bio for public review.", contactEmail: "maker@example.com", galleryImageUrls: [], featured: false, displayOrder: 100, active: true };
    expect(vendorProfileSchema.safeParse({ ...base, instagramUrl: "https://instagram.com/maker" }).success).toBe(true);
    expect(vendorProfileSchema.safeParse({ ...base, instagramUrl: "https://example.com/not-instagram" }).success).toBe(false);
  });
  it("previews valid spreadsheet rows and blocks duplicate slugs", () => {
    const rows = parseVendorWorkbook(workbookBuffer([["Example Maker","example-maker","Ceramics","A sufficiently detailed maker bio for import.","","maker@example.com","","https://instagram.com/examplemaker","","","","","No",10,"Yes"]]), ["example-maker"]);
    expect(rows).toHaveLength(1); expect(rows[0].errors.join(" ")).toContain("already exists");
  });
  it("rejects admin and vendor actions without a credential session", async () => {
    const ctx = { user: null, req: { headers: {} }, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminPortal.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.vendorPortal.latest()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
