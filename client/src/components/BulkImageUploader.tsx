import { useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Upload, X } from "lucide-react";
import { readGiftBoxes, saveGiftBoxes } from "@/lib/giftBoxes";
import { readVendors, saveVendors } from "@/lib/vendors";

type Match = { file: File; url: string; target: string; kind: "maker" | "gift"; width: number; height: number };

export function normalize(value: string) { return value.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
type ImageAudit = { id: string; timestamp: string; vendors: { slug: string; photoUrl?: string }[]; gifts: { slug: string; photoUrl?: string }[] };
function readImageAudit(): ImageAudit[] { try { return JSON.parse(localStorage.getItem("cannery-preview-image-audit") || "[]") as ImageAudit[]; } catch { return []; } }

function processImage(file: File, squareCrop: boolean): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) { reject(new Error("file is larger than 15 MB")); return; }
    const objectUrl = URL.createObjectURL(file);
    const source = new Image();
    source.onload = () => {
      try {
        const maxDimension = 1600;
        const cropSize = squareCrop ? Math.min(source.naturalWidth, source.naturalHeight) : Math.max(source.naturalWidth, source.naturalHeight);
        const scale = Math.min(1, maxDimension / cropSize);
        const outputWidth = Math.round((squareCrop ? cropSize : source.naturalWidth) * scale);
        const outputHeight = Math.round((squareCrop ? cropSize : source.naturalHeight) * scale);
        const canvas = document.createElement("canvas"); canvas.width = outputWidth; canvas.height = outputHeight;
        const context = canvas.getContext("2d"); if (!context) throw new Error("your browser could not create an image canvas");
        const sx = squareCrop ? (source.naturalWidth - cropSize) / 2 : 0;
        const sy = squareCrop ? (source.naturalHeight - cropSize) / 2 : 0;
        context.drawImage(source, sx, sy, squareCrop ? cropSize : source.naturalWidth, squareCrop ? cropSize : source.naturalHeight, 0, 0, outputWidth, outputHeight);
        const url = canvas.toDataURL("image/jpeg", .86);
        URL.revokeObjectURL(objectUrl);
        resolve({ url, width: source.naturalWidth, height: source.naturalHeight });
      } catch (error) { URL.revokeObjectURL(objectUrl); reject(error instanceof Error ? error : new Error("image processing failed")); }
    };
    source.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("format is not supported or the file is damaged")); };
    source.src = objectUrl;
  });
}

export default function BulkImageUploader() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [imageAudit, setImageAudit] = useState<ImageAudit[]>(readImageAudit);
  const [squareCrop, setSquareCrop] = useState(true);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const makers = useMemo(() => readVendors(), []);
  const gifts = useMemo(() => readGiftBoxes(), []);

  async function inspect(files: FileList | File[]) {
    if (!files?.length) return;
    const nextUnmatched: string[] = []; const nextInvalid: string[] = []; const nextMatches: Match[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { nextInvalid.push(`${file.name} · not an image`); continue; }
      const normalized = normalize(file.name);
      const maker = makers.find((item) => normalized === item.slug || normalized === normalize(item.name));
      const gift = gifts.find((item) => normalized === item.slug || normalized === normalize(item.name));
      if (!maker && !gift) { nextUnmatched.push(file.name); continue; }
      try {
        const processed = await processImage(file, squareCrop);
        if (processed.width < 400 || processed.height < 400) { nextInvalid.push(`${file.name} · ${processed.width}×${processed.height}, minimum is 400×400`); continue; }
        nextMatches.push({ file, url: processed.url, width: processed.width, height: processed.height, target: maker?.slug || gift!.slug, kind: maker ? "maker" : "gift" });
      } catch (error) { nextInvalid.push(`${file.name} · ${error instanceof Error ? error.message : "could not be processed"}`); }
    }
    setMatches(nextMatches); setUnmatched(nextUnmatched); setInvalid(nextInvalid); setMessage("");
  }

  function apply() {
    const vendorUpdates = new Map(matches.filter((item) => item.kind === "maker").map((item) => [item.target, item.url]));
    const giftUpdates = new Map(matches.filter((item) => item.kind === "gift").map((item) => [item.target, item.url]));
    try {
      const batch: ImageAudit = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), vendors: makers.filter((maker) => vendorUpdates.has(maker.slug)).map((maker) => ({ slug: maker.slug, photoUrl: maker.photoUrl })), gifts: gifts.filter((gift) => giftUpdates.has(gift.slug)).map((gift) => ({ slug: gift.slug, photoUrl: gift.photoUrl })) };
      const nextAudit = [batch, ...imageAudit].slice(0, 10); localStorage.setItem("cannery-preview-image-audit", JSON.stringify(nextAudit)); setImageAudit(nextAudit);
      saveVendors(makers.map((maker) => vendorUpdates.has(maker.slug) ? { ...maker, photoUrl: vendorUpdates.get(maker.slug) } : maker));
      saveGiftBoxes(gifts.map((gift) => giftUpdates.has(gift.slug) ? { ...gift, photoUrl: giftUpdates.get(gift.slug) } : gift));
      setMatches([]); setUnmatched([]); setInvalid([]); setMessage("Bulk images applied. Refresh the public directory or gift page to review.");
    } catch { setMessage("The browser could not save these images. Try fewer or smaller files, or use the production media library."); }
  }

  function undoLastImageBatch() { const batch = imageAudit[0]; if (!batch) return; const vendorMap = new Map(batch.vendors.map((item) => [item.slug, item.photoUrl])); const giftMap = new Map(batch.gifts.map((item) => [item.slug, item.photoUrl])); saveVendors(makers.map((maker) => vendorMap.has(maker.slug) ? { ...maker, photoUrl: vendorMap.get(maker.slug) } : maker)); saveGiftBoxes(gifts.map((gift) => giftMap.has(gift.slug) ? { ...gift, photoUrl: giftMap.get(gift.slug) } : gift)); const nextAudit = imageAudit.slice(1); localStorage.setItem("cannery-preview-image-audit", JSON.stringify(nextAudit)); setImageAudit(nextAudit); setMessage("Undid the last image batch."); }

  return <section className="bulk-image-uploader"><div className="bulk-image-heading"><div><p className="eyebrow"><ImagePlus size={14} /> Faster image management</p><h3>Bulk upload maker and gift images</h3><p>Name files to match a record, such as <code>vivra-cafe.jpg</code> or <code>thank-you-box.png</code>. Nothing changes until you click Apply.</p></div><label className={`upload-button bulk-dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void inspect(event.dataTransfer.files); }}><Upload size={14} /> Drop images or browse<input ref={inputRef} type="file" accept="image/*" multiple onChange={(event) => { void inspect(event.target.files || []); if (inputRef.current) inputRef.current.value = ""; }} /></label></div><div className="bulk-options"><label><input type="checkbox" checked={squareCrop} onChange={(event) => setSquareCrop(event.target.checked)} /> Center-crop to square for maker and gift cards</label><span>Images are resized to a maximum of 1600px and compressed before preview.</span></div>{matches.length > 0 && <div className="bulk-image-list">{matches.map((item) => <div className="bulk-image-item" key={`${item.kind}-${item.target}`}><img src={item.url} alt="" /><span><strong>{item.kind === "maker" ? makers.find((maker) => maker.slug === item.target)?.name : gifts.find((gift) => gift.slug === item.target)?.name}</strong><small>Matched from {item.file.name} · {item.width}×{item.height}</small></span><button type="button" className="icon-button" onClick={() => setMatches((current) => current.filter((match) => match.target !== item.target))}><X size={14} /></button></div>)}</div>}{unmatched.length > 0 && <p className="bulk-unmatched">{unmatched.length} file(s) did not match a maker or gift-box filename: {unmatched.join(", ")}</p>}{invalid.length > 0 && <p className="bulk-invalid">{invalid.length} file(s) need attention: {invalid.join(", ")}</p>}{(matches.length > 0 || message || imageAudit.length > 0) && <div className="bulk-image-actions">{message && <span><Check size={14} /> {message}</span>}{matches.length > 0 && <button type="button" className="button-primary" onClick={apply}>Apply {matches.length} image{matches.length === 1 ? "" : "s"}</button>}{imageAudit.length > 0 && <button type="button" className="button-plain" onClick={undoLastImageBatch}><X size={14} /> Undo last image batch</button>}</div>}<p className="bulk-storage-note">Preview storage: browser only. Production workflow: upload to the approved CMS/media library, create a preview deployment, then publish after review.</p></section>;
}
