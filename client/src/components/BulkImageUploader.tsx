import { useMemo, useState } from "react";
import { Check, ImagePlus, Upload, X } from "lucide-react";
import { readGiftBoxes, saveGiftBoxes, type GiftBox } from "@/lib/giftBoxes";
import { readVendors, saveVendors, type Vendor } from "@/lib/vendors";

type Match = { file: File; url: string; target: string; kind: "maker" | "gift" };

export function normalize(value: string) { return value.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function BulkImageUploader() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const makers = useMemo(() => readVendors(), []);
  const gifts = useMemo(() => readGiftBoxes(), []);

  function inspect(files: FileList | null) {
    if (!files?.length) return;
    const nextMatches: Match[] = [];
    const nextUnmatched: string[] = [];
    Array.from(files).forEach((file) => {
      const normalized = normalize(file.name);
      const maker = makers.find((item) => normalized === item.slug || normalized === normalize(item.name));
      const gift = gifts.find((item) => normalized === item.slug || normalized === normalize(item.name));
      if (maker) { const reader = new FileReader(); reader.onload = () => setMatches((current) => [...current.filter((item) => item.target !== maker.slug), { file, url: String(reader.result), target: maker.slug, kind: "maker" }]); reader.readAsDataURL(file); }
      else if (gift) { const reader = new FileReader(); reader.onload = () => setMatches((current) => [...current.filter((item) => item.target !== gift.slug), { file, url: String(reader.result), target: gift.slug, kind: "gift" }]); reader.readAsDataURL(file); }
      else nextUnmatched.push(file.name);
    });
    setUnmatched(nextUnmatched);
    setMessage("");
  }

  function apply() {
    const vendorUpdates = new Map(matches.filter((item) => item.kind === "maker").map((item) => [item.target, item.url]));
    const giftUpdates = new Map(matches.filter((item) => item.kind === "gift").map((item) => [item.target, item.url]));
    saveVendors(makers.map((maker) => vendorUpdates.has(maker.slug) ? { ...maker, photoUrl: vendorUpdates.get(maker.slug) } : maker));
    saveGiftBoxes(gifts.map((gift) => giftUpdates.has(gift.slug) ? { ...gift, photoUrl: giftUpdates.get(gift.slug) } : gift));
    setMatches([]); setUnmatched([]); setMessage("Bulk images applied. Refresh the public directory or gift page to review.");
  }

  return <section className="bulk-image-uploader"><div className="bulk-image-heading"><div><p className="eyebrow"><ImagePlus size={14} /> Faster image management</p><h3>Bulk upload maker and gift images</h3><p>Name files to match a record, such as <code>vivra-cafe.jpg</code> or <code>thank-you-box.png</code>. Nothing is changed until you click Apply.</p></div><label className="upload-button"><Upload size={14} /> Select images<input type="file" accept="image/*" multiple onChange={(event) => inspect(event.target.files)} /></label></div>{matches.length > 0 && <div className="bulk-image-list">{matches.map((item) => <div className="bulk-image-item" key={`${item.kind}-${item.target}`}><img src={item.url} alt="" /><span><strong>{item.kind === "maker" ? makers.find((maker) => maker.slug === item.target)?.name : gifts.find((gift) => gift.slug === item.target)?.name}</strong><small>Matched from {item.file.name}</small></span><button type="button" className="icon-button" onClick={() => setMatches((current) => current.filter((match) => match.target !== item.target))}><X size={14} /></button></div>)}</div>}{unmatched.length > 0 && <p className="bulk-unmatched">{unmatched.length} file(s) did not match a maker or gift-box filename: {unmatched.join(", ")}</p>}{(matches.length > 0 || message) && <div className="bulk-image-actions">{message && <span><Check size={14} /> {message}</span>}{matches.length > 0 && <button type="button" className="button-primary" onClick={apply}>Apply {matches.length} image{matches.length === 1 ? "" : "s"}</button>}</div>}</section>;
}
