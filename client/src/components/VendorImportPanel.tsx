import { useState } from "react";
import { AlertCircle, Check, Download, ExternalLink, FileSpreadsheet, Upload } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { describeIssue } from "@shared/friendlyErrors";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { ownerVendorSchema, type OwnerVendorInput } from "@shared/vendorProfile";

const TEMPLATE_URL = "/downloads/Vendor-Bulk-Import-Template.xlsx";
const EXPECTED = ["name*","slug","category*","short_bio*","owner_bio","contact_email*","website_url","instagram_url","facebook_url","tiktok_url","cover_image_url","gallery_image_urls","featured","display_order","active"];
// Optional column: the maker email that may edit the listing. Older templates without it still work.
const LOGIN_EMAIL = "login_email";
export type ImportPreviewRow = { row: number; vendor: OwnerVendorInput | null; errors: string[] };
type ImportResult = { imported: number; invited: number; makers: { name: string; slug: string; loginEmail: string | null }[] };
const asText = (value: unknown) => String(value ?? "").trim();
const asBool = (value: unknown, fallback: boolean) => { const normalized = asText(value).toLowerCase(); if (["yes","true","1"].includes(normalized)) return true; if (["no","false","0"].includes(normalized)) return false; return fallback; };
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function parseVendorWorkbook(buffer: ArrayBuffer, existingSlugs: string[]): ImportPreviewRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets["Vendor Import"] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [{ row: 1, vendor: null, errors: ["No worksheet was found."] }];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = (matrix[0] || []).map(asText);
  const missing = EXPECTED.filter((header) => !headers.includes(header));
  if (missing.length) return [{ row: 1, vendor: null, errors: [`The file is missing these columns: ${missing.join(", ")}. Download the template and copy your rows into it.`] }];
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const existing = new Set(existingSlugs.map((slug) => slug.toLowerCase()));
  const seen = new Set<string>();
  return matrix.slice(1).map((values, index) => {
    const value = (header: string) => (values as unknown[])[indexes[header]];
    const name = asText(value("name*"));
    if (!name && !(values as unknown[]).some((cell) => asText(cell))) return null;
    const slug = asText(value("slug")) || slugify(name);
    const galleryImageUrls = asText(value("gallery_image_urls")).split("|").map((url) => url.trim()).filter(Boolean);
    const candidate = { name, slug, category: asText(value("category*")), shortBio: asText(value("short_bio*")), ownerBio: asText(value("owner_bio")), contactEmail: asText(value("contact_email*")), websiteUrl: asText(value("website_url")), instagramUrl: asText(value("instagram_url")), facebookUrl: asText(value("facebook_url")), tiktokUrl: asText(value("tiktok_url")), coverImageUrl: asText(value("cover_image_url")), galleryImageUrls, featured: asBool(value("featured"), false), displayOrder: Number(asText(value("display_order")) || 100), active: asBool(value("active"), true), loginEmail: LOGIN_EMAIL in indexes ? asText(value(LOGIN_EMAIL)) : "", ownerName: "owner_name" in indexes ? asText(value("owner_name")) : "" };
    const parsed = ownerVendorSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => describeIssue(issue as never));
    if (existing.has(slug.toLowerCase())) errors.push(`${name || slug} is already on the site. Remove this row or edit the existing listing.`);
    if (seen.has(slug.toLowerCase())) errors.push(`${name || slug} appears more than once in this file.`);
    seen.add(slug.toLowerCase());
    return { row: index + 2, vendor: parsed.success ? parsed.data : null, errors };
  }).filter((row): row is ImportPreviewRow => Boolean(row));
}

export default function VendorImportPanel({ existingSlugs, onImported }: { existingSlugs: string[]; onImported: () => void }) {
  const [fileName, setFileName] = useState(""); const [rows, setRows] = useState<ImportPreviewRow[]>([]); const [confirmed, setConfirmed] = useState(false);
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
      const parsed = parseVendorWorkbook(await file.arrayBuffer(), existingSlugs);
      setRows(parsed);
      const problems = parsed.reduce((total, row) => total + row.errors.length, 0);
      if (problems) notifyError(`${problems} problem${problems === 1 ? "" : "s"} found. Each one is listed next to its row below.`, "Fix the spreadsheet first");
      else notifySuccess(`${parsed.length} row${parsed.length === 1 ? "" : "s"} ready to import`, { description: "Review the preview, then confirm." });
    } catch {
      setRows([{ row: 1, vendor: null, errors: ["This file could not be read. Save it as an Excel .xlsx file using the template."] }]);
      notifyError("This file could not be read. Save it as an Excel .xlsx file using the template.", "File not read");
    }
  }
  function confirmImport() { const vendors = rows.flatMap((row) => row.vendor && !row.errors.length ? [row.vendor] : []); if (!confirmed || errors || !vendors.length) return; importer.mutate({ vendors }); }
  return <section className="secure-admin-card"><div className="secure-card-heading"><div><p className="eyebrow">One-time setup tool</p><h2>Bulk vendor import</h2><p>Upload the prepared Excel file, fix any errors, preview the rows, and confirm before anything is added. Fill in the optional login_email column to connect each listing to the maker who will edit it.</p></div><a className="button-plain" href={TEMPLATE_URL} download><Download size={14} /> Download template</a></div>
    {result && <div className="import-result" role="status"><div className="import-summary ready"><Check size={16} /><strong>Import complete</strong><span>{result.imported} maker{result.imported === 1 ? "" : "s"} added and live on the site.{result.invited ? ` ${result.invited} login email${result.invited === 1 ? "" : "s"} added to Maker access.` : ""}</span></div><ul className="import-result-list">{result.makers.map((maker) => <li key={maker.slug}><a href={`/vendors/${maker.slug}`} target="_blank" rel="noreferrer">{maker.name} <ExternalLink size={12} /></a><small>{maker.loginEmail ? `Login: ${maker.loginEmail}` : "No login email. Connect one in Maker access."}</small></li>)}</ul><div className="review-actions"><a className="button-plain" href="/vendors" target="_blank" rel="noreferrer"><ExternalLink size={14} /> View makers page</a><button className="button-plain" type="button" onClick={() => setResult(null)}>Import another file</button></div></div>}
    {!result && <label className="excel-drop"><FileSpreadsheet size={26} /><strong>{fileName || "Choose a completed .xlsx file"}</strong><span>Maximum 500 vendors. The original file is read in your browser and not retained.</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>}
    {rows.length > 0 && <><div className={`import-summary ${errors ? "has-errors" : "ready"}`}>{errors ? <AlertCircle size={16} /> : <Check size={16} />}<strong>{rows.length} row{rows.length === 1 ? "" : "s"}</strong><span>{errors ? `${errors} problem${errors === 1 ? "" : "s"} must be fixed in the spreadsheet before import. Fix them, save, and choose the file again.` : "Validation passed. Review the preview below."}</span></div><div className="import-preview-table"><table><thead><tr><th>Row</th><th>Vendor</th><th>Category</th><th>Login email</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.vendor?.name || "Not readable"}</td><td>{row.vendor?.category || ""}</td><td>{row.vendor?.loginEmail || "None"}</td><td>{row.errors.length ? <span className="import-errors">{row.errors.join(" ")}</span> : <span className="import-ready">Ready</span>}</td></tr>)}</tbody></table></div><label className="import-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={Boolean(errors)} /><span>I reviewed the preview and confirm these vendors should be imported as approved profiles.</span></label><button className="button-primary" type="button" disabled={!confirmed || Boolean(errors) || importer.isPending} onClick={confirmImport}><Upload size={14} /> {importer.isPending ? "Importing…" : "Confirm import"}</button></>}
  </section>;
}
