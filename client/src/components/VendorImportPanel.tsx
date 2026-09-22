import { useState } from "react";
import { AlertCircle, Check, Download, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { vendorProfileSchema, type VendorProfileInput } from "@shared/vendorProfile";

const TEMPLATE_URL = "/manus-storage/Vendor-Bulk-Import-Template_05308056.xlsx";
const EXPECTED = ["name*","slug","category*","short_bio*","owner_bio","contact_email*","website_url","instagram_url","facebook_url","tiktok_url","cover_image_url","gallery_image_urls","featured","display_order","active"];
export type ImportPreviewRow = { row: number; vendor: VendorProfileInput | null; errors: string[] };
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
  if (missing.length) return [{ row: 1, vendor: null, errors: [`Missing required columns: ${missing.join(", ")}`] }];
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const existing = new Set(existingSlugs.map((slug) => slug.toLowerCase()));
  const seen = new Set<string>();
  return matrix.slice(1).map((values, index) => {
    const value = (header: string) => (values as unknown[])[indexes[header]];
    const name = asText(value("name*"));
    if (!name && !(values as unknown[]).some((cell) => asText(cell))) return null;
    const slug = asText(value("slug")) || slugify(name);
    const galleryImageUrls = asText(value("gallery_image_urls")).split("|").map((url) => url.trim()).filter(Boolean);
    const candidate = { name, slug, category: asText(value("category*")), shortBio: asText(value("short_bio*")), ownerBio: asText(value("owner_bio")), contactEmail: asText(value("contact_email*")), websiteUrl: asText(value("website_url")), instagramUrl: asText(value("instagram_url")), facebookUrl: asText(value("facebook_url")), tiktokUrl: asText(value("tiktok_url")), coverImageUrl: asText(value("cover_image_url")), galleryImageUrls, featured: asBool(value("featured"), false), displayOrder: Number(asText(value("display_order")) || 100), active: asBool(value("active"), true) };
    const parsed = vendorProfileSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    if (existing.has(slug.toLowerCase())) errors.push(`Duplicate: ${slug} already exists.`);
    if (seen.has(slug.toLowerCase())) errors.push(`Duplicate: ${slug} appears more than once in this file.`);
    seen.add(slug.toLowerCase());
    return { row: index + 2, vendor: parsed.success ? parsed.data : null, errors };
  }).filter((row): row is ImportPreviewRow => Boolean(row));
}

export default function VendorImportPanel({ existingSlugs, onImported }: { existingSlugs: string[]; onImported: () => void }) {
  const [fileName, setFileName] = useState(""); const [rows, setRows] = useState<ImportPreviewRow[]>([]); const [confirmed, setConfirmed] = useState(false); const [message, setMessage] = useState("");
  const importer = trpc.adminPortal.bulkImport.useMutation({ onSuccess: (result) => { setMessage(`${result.imported} vendor${result.imported === 1 ? "" : "s"} imported successfully.`); setRows([]); setFileName(""); setConfirmed(false); onImported(); }, onError: (error) => setMessage(error.message) });
  const errors = rows.reduce((total, row) => total + row.errors.length, 0);
  async function selectFile(file?: File) { if (!file) return; setFileName(file.name); setMessage(""); setConfirmed(false); try { setRows(parseVendorWorkbook(await file.arrayBuffer(), existingSlugs)); } catch { setRows([{ row: 1, vendor: null, errors: ["This file could not be read. Use the provided .xlsx template."] }]); } }
  function confirmImport() { const vendors = rows.flatMap((row) => row.vendor && !row.errors.length ? [row.vendor] : []); if (!confirmed || errors || !vendors.length) return; importer.mutate({ vendors }); }
  return <section className="secure-admin-card"><div className="secure-card-heading"><div><p className="eyebrow">One-time setup tool</p><h2>Bulk vendor import</h2><p>Upload the prepared Excel file, fix any errors, preview the rows, and confirm before anything is added.</p></div><a className="button-plain" href={TEMPLATE_URL} download><Download size={14} /> Download template</a></div><label className="excel-drop"><FileSpreadsheet size={26} /><strong>{fileName || "Choose a completed .xlsx file"}</strong><span>Maximum 500 vendors. The original file is read in your browser and not retained.</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectFile(event.target.files?.[0])} /></label>{rows.length > 0 && <><div className={`import-summary ${errors ? "has-errors" : "ready"}`}>{errors ? <AlertCircle size={16} /> : <Check size={16} />}<strong>{rows.length} row{rows.length === 1 ? "" : "s"}</strong><span>{errors ? `${errors} error${errors === 1 ? "" : "s"} must be fixed before import.` : "Validation passed. Review the preview below."}</span></div><div className="import-preview-table"><table><thead><tr><th>Row</th><th>Vendor</th><th>Category</th><th>Email</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.vendor?.name || "—"}</td><td>{row.vendor?.category || "—"}</td><td>{row.vendor?.contactEmail || "—"}</td><td>{row.errors.length ? <span className="import-errors">{row.errors.join(" ")}</span> : <span className="import-ready">Ready</span>}</td></tr>)}</tbody></table></div><label className="import-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={Boolean(errors)} /><span>I reviewed the preview and confirm these vendors should be imported as approved profiles.</span></label><button className="button-primary" type="button" disabled={!confirmed || Boolean(errors) || importer.isPending} onClick={confirmImport}><Upload size={14} /> {importer.isPending ? "Importing…" : "Confirm import"}</button></>}{message && <p className="admin-result">{message}</p>}</section>;
}
