import { useState } from "react";
import { AlertCircle, Check, Download, ExternalLink, FileSpreadsheet, Upload } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { describeIssue } from "@shared/friendlyErrors";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { ownerVendorSchema, type OwnerVendorInput } from "@shared/vendorProfile";

const TEMPLATE_URL = "/downloads/Vendor-Bulk-Import-Template.xlsx";
// Columns are matched by name, not position, in any order and any letter case,
// with or without the "*" marks. Older templates (without owner_name or
// login_email) still work, newer columns are picked up, and columns this version
// does not know are listed and ignored rather than rejected.
type ImportField = "name" | "slug" | "category" | "shortBio" | "ownerBio" | "ownerName" | "contactEmail" | "loginEmail" | "websiteUrl" | "instagramUrl" | "facebookUrl" | "tiktokUrl" | "coverImageUrl" | "galleryImageUrls" | "featured" | "displayOrder" | "active";
const COLUMN_ALIASES: Record<ImportField, string[]> = {
  name: ["name", "business_name", "vendor_name", "business"],
  slug: ["slug", "web_address", "url_name"],
  category: ["category"],
  shortBio: ["short_bio", "short_description", "description", "bio"],
  ownerBio: ["owner_bio", "about_the_maker", "about", "story"],
  ownerName: ["maker_full_name", "makers_full_name", "maker_name", "owner_name", "owner", "owner_full_name", "full_name"],
  contactEmail: ["contact_email", "email", "public_email"],
  loginEmail: ["login_email", "maker_login_email", "portal_email"],
  websiteUrl: ["website_url", "website", "site"],
  instagramUrl: ["instagram_url", "instagram", "ig"],
  facebookUrl: ["facebook_url", "facebook", "fb"],
  tiktokUrl: ["tiktok_url", "tiktok"],
  coverImageUrl: ["cover_image_url", "cover_image", "cover_photo", "cover"],
  galleryImageUrls: ["gallery_image_urls", "gallery_images", "gallery", "work_photos"],
  featured: ["featured"],
  displayOrder: ["display_order", "order", "sort_order"],
  active: ["active", "visible", "public"],
};
const REQUIRED_COLUMNS: ImportField[] = ["name", "category", "shortBio"];
const COLUMN_LABEL: Partial<Record<ImportField, string>> = { name: "name", category: "category", shortBio: "short_bio" };
export const normalizeHeader = (header: string) => header.toLowerCase().replace(/\*/g, "").replace(/\(.*?\)/g, "").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export type ImportPreviewRow = { row: number; vendor: OwnerVendorInput | null; errors: string[] };
export type ImportPreview = { rows: ImportPreviewRow[]; ignoredColumns: string[] };
type ImportResult = { imported: number; invited: number; makers: { name: string; slug: string; loginEmail: string | null }[] };
const asText = (value: unknown) => String(value ?? "").trim();
const asBool = (value: unknown, fallback: boolean) => { const normalized = asText(value).toLowerCase(); if (["yes","y","true","1","x","✓"].includes(normalized)) return true; if (["no","n","false","0"].includes(normalized)) return false; return fallback; };
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Reads any version of the import spreadsheet and checks every row. */
export function readVendorWorkbook(buffer: ArrayBuffer, existingSlugs: string[]): ImportPreview {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets["Vendor Import"] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [{ row: 1, vendor: null, errors: ["No worksheet was found."] }], ignoredColumns: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = (matrix[0] || []).map((cell) => asText(cell));
  const columns: Partial<Record<ImportField, number>> = {};
  const ignoredColumns: string[] = [];
  headers.forEach((header, index) => {
    if (!header) return;
    const key = normalizeHeader(header);
    const field = (Object.keys(COLUMN_ALIASES) as ImportField[]).find((candidate) => COLUMN_ALIASES[candidate].includes(key));
    if (field && columns[field] === undefined) columns[field] = index;
    else if (!field) ignoredColumns.push(header);
  });
  const missing = REQUIRED_COLUMNS.filter((field) => columns[field] === undefined);
  if (missing.length) return { rows: [{ row: 1, vendor: null, errors: [`The file is missing these columns: ${missing.map((field) => COLUMN_LABEL[field]).join(", ")}. Download the template and copy your rows into it.`] }], ignoredColumns };
  const existing = new Set(existingSlugs.map((slug) => slug.toLowerCase()));
  const seen = new Set<string>();
  const rows = matrix.slice(1).map((values, index) => {
    const value = (field: ImportField) => (columns[field] === undefined ? "" : asText((values as unknown[])[columns[field]!]));
    const name = value("name");
    if (!name && !(values as unknown[]).some((cell) => asText(cell))) return null;
    const slug = value("slug") || slugify(name);
    const loginEmail = value("loginEmail");
    const candidate = {
      name, slug, category: value("category"), shortBio: value("shortBio"), ownerBio: value("ownerBio"), ownerName: value("ownerName"),
      // A blank contact email falls back to the login email.
      contactEmail: value("contactEmail") || loginEmail, loginEmail,
      websiteUrl: value("websiteUrl"), instagramUrl: value("instagramUrl"), facebookUrl: value("facebookUrl"), tiktokUrl: value("tiktokUrl"),
      coverImageUrl: value("coverImageUrl"), galleryImageUrls: value("galleryImageUrls").split(/[|,\n]/).map((url) => url.trim()).filter(Boolean),
      featured: asBool(value("featured"), false), displayOrder: Number(value("displayOrder") || 100), active: asBool(value("active"), true),
    };
    const parsed = ownerVendorSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => describeIssue(issue as never));
    if (existing.has(slug.toLowerCase())) errors.push(`${name || slug} is already on the site. Remove this row or edit the existing listing.`);
    if (seen.has(slug.toLowerCase())) errors.push(`${name || slug} appears more than once in this file.`);
    seen.add(slug.toLowerCase());
    return { row: index + 2, vendor: parsed.success ? parsed.data : null, errors };
  }).filter((row): row is ImportPreviewRow => Boolean(row));
  return { rows, ignoredColumns };
}

/** Rows only (kept for existing callers and tests). */
export function parseVendorWorkbook(buffer: ArrayBuffer, existingSlugs: string[]): ImportPreviewRow[] {
  return readVendorWorkbook(buffer, existingSlugs).rows;
}

export default function VendorImportPanel({ existingSlugs, onImported }: { existingSlugs: string[]; onImported: () => void }) {
  const [fileName, setFileName] = useState(""); const [rows, setRows] = useState<ImportPreviewRow[]>([]); const [ignored, setIgnored] = useState<string[]>([]); const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importer = trpc.adminPortal.bulkImport.useMutation({
    onSuccess: (data) => {
      setResult(data); setRows([]); setFileName(""); setConfirmed(false); onImported();
      notifySuccess(`${data.imported} maker${data.imported === 1 ? "" : "s"} imported`, { description: data.invited ? `${data.invited} login email${data.invited === 1 ? " was" : "s were"} added to Maker access.` : "They are live on the Makers page now.", link: { label: "View makers page", href: "/vendors" } });
    },
    onError: (error) => notifyError(error, "Import did not finish. Nothing was added."),
  });
  const errors = rows.reduce((total, row) => total + row.errors.length, 0);
  async function selectFile(file?: File) {
    if (!file) return;
    setFileName(file.name); setResult(null); setConfirmed(false);
    try {
      const preview = readVendorWorkbook(await file.arrayBuffer(), existingSlugs);
      const parsed = preview.rows;
      setRows(parsed); setIgnored(preview.ignoredColumns);
      const problems = parsed.reduce((total, row) => total + row.errors.length, 0);
      if (problems) notifyError(`${problems} problem${problems === 1 ? "" : "s"} found. Each one is listed next to its row below.`, "Fix the spreadsheet first");
      else notifySuccess(`${parsed.length} row${parsed.length === 1 ? "" : "s"} ready to import`, { description: "Review the preview, then confirm." });
    } catch {
      setRows([{ row: 1, vendor: null, errors: ["This file could not be read. Save it as an Excel .xlsx file using the template."] }]);
      notifyError("This file could not be read. Save it as an Excel .xlsx file using the template.", "File not read");
    }
  }
  function confirmImport() { const vendors = rows.flatMap((row) => row.vendor && !row.errors.length ? [row.vendor] : []); if (!confirmed || errors || !vendors.length) return; importer.mutate({ vendors }); }
  return <section className="secure-admin-card"><div className="secure-card-heading"><div><p className="eyebrow">One-time setup tool</p><h2>Bulk vendor import</h2><p>Upload the prepared Excel file, fix any errors, preview the rows, and confirm before anything is added. Any version of the template works. Fill in the optional login_email column to connect each listing to the maker who will edit it, and type social accounts as @handles or links.</p></div><a className="button-plain" href={TEMPLATE_URL} download><Download size={14} /> Download template</a></div>
    {result && <div className="import-result" role="status"><div className="import-summary ready"><Check size={16} /><strong>Import complete</strong><span>{result.imported} maker{result.imported === 1 ? "" : "s"} added and live on the site.{result.invited ? ` ${result.invited} login email${result.invited === 1 ? "" : "s"} added to Maker access.` : ""}</span></div><ul className="import-result-list">{result.makers.map((maker) => <li key={maker.slug}><a href={`/vendors/${maker.slug}`} target="_blank" rel="noreferrer">{maker.name} <ExternalLink size={12} /></a><small>{maker.loginEmail ? `Login: ${maker.loginEmail}` : "No login email. Connect one in Maker access."}</small></li>)}</ul><div className="review-actions"><a className="button-plain" href="/vendors" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View makers page</a><button className="button-plain" type="button" onClick={() => setResult(null)}>Import another file</button></div></div>}
    {!result && <label className="excel-drop"><FileSpreadsheet size={26} /><strong>{fileName || "Choose a completed .xlsx file"}</strong><span>Maximum 500 vendors. The original file is read in your browser and not retained.</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>}
    {rows.length > 0 && ignored.length > 0 && <p className="form-hint">These columns are not used by this version and were skipped: {ignored.join(", ")}.</p>}{rows.length > 0 && <><div className={`import-summary ${errors ? "has-errors" : "ready"}`}>{errors ? <AlertCircle size={16} /> : <Check size={16} />}<strong>{rows.length} row{rows.length === 1 ? "" : "s"}</strong><span>{errors ? `${errors} problem${errors === 1 ? "" : "s"} must be fixed in the spreadsheet before import. Fix them, save, and choose the file again.` : "Validation passed. Review the preview below."}</span></div><div className="import-preview-table"><table><thead><tr><th>Row</th><th>Vendor</th><th>Category</th><th>Login email</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.vendor?.name || "Not readable"}</td><td>{row.vendor?.category || ""}</td><td>{row.vendor?.loginEmail || "None"}</td><td>{row.errors.length ? <span className="import-errors">{row.errors.join(" ")}</span> : <span className="import-ready">Ready</span>}</td></tr>)}</tbody></table></div><label className="import-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={Boolean(errors)} /><span>I reviewed the preview and confirm these vendors should be imported as approved profiles.</span></label><button className="button-primary" type="button" disabled={!confirmed || Boolean(errors) || importer.isPending} onClick={confirmImport}><Upload size={14} /> {importer.isPending ? "Importing…" : "Confirm import"}</button></>}
  </section>;
}
