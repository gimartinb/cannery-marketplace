import { CheckCircle2, Crop, ImagePlus, Info, Loader2 } from "lucide-react";
import ImageCropDialog from "@/components/ImageCropDialog";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyError, notifySuccess } from "@/lib/notify";
import { checkImageSize, describeRequirement, IMAGE_REQUIREMENTS, MAX_IMAGE_MB, RECOMMENDED_DPI, type ImageSpot } from "@shared/imageRequirements";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// The file picker offers every picture. iPhone HEIC photos and other formats (GIF, AVIF, BMP, TIFF where
// the browser can open them) are turned into a JPEG here before anything else happens.
const PICKER_ACCEPT = "image/*,.heic,.heif";
const isHeic = (file: File) => /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** Turns any picture into a JPEG, PNG, or WebP the site can store. */
export async function normalizeImageFile(file: File): Promise<File> {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    } catch { throw new Error(`${file.name} is an iPhone photo (HEIC) that could not be converted. On the iPhone, set Camera, Formats to Most Compatible, or send it as a screenshot.`); }
  }
  if (file.type && !file.type.startsWith("image/")) throw new Error(`${file.name} is not a picture.`);
  // Other picture formats: redraw as JPEG.
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`${file.name} could not be opened. Try saving it as a JPEG or PNG first.`)); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`${file.name} could not be converted.`);
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error(`${file.name} could not be converted.`);
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}
const SKIP_KEY = "cannery:image-requirements-seen";

// Remembered per spot, because each spot has its own size.
function seenRequirements(spot: ImageSpot) {
  try { return window.localStorage.getItem(`${SKIP_KEY}:${spot}`) === "yes"; } catch { return false; }
}
function rememberSeen(spot: ImageSpot) {
  try { window.localStorage.setItem(`${SKIP_KEY}:${spot}`, "yes"); } catch { /* private window: show it every time */ }
}

/** Reads an image's pixel size in the browser, without uploading it. */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} could not be opened. It may be damaged or in an unsupported format.`)); };
    image.src = url;
  });
}

// Photos of any size are resized here, in the browser, before they upload. That is free:
// nothing runs on Cloudflare, and the smaller files also use less of the free storage.
const MAX_SOURCE_MB = 40;
// Below this the photo is still used, with a heads up that it may look blurry.
const SMALLEST_SIDE = 400;

/** Shrinks a large photo to fit the spot and to stay under the upload limit. Keeps PNG for transparency. */
export async function fitImageFile(file: File, maxDimension: number): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`${file.name} could not be opened.`)); img.src = url; });
    const keepPng = file.type === "image/png";
    let dimension = Math.min(maxDimension, Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = dimension / Math.max(image.naturalWidth, image.naturalHeight);
      if (scale >= 1 && file.size <= MAX_IMAGE_MB * 1024 * 1024) return file;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * Math.min(1, scale)));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * Math.min(1, scale)));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = keepPng ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, keepPng ? undefined : 0.88));
      if (blob && blob.size <= MAX_IMAGE_MB * 1024 * 1024) return new File([blob], file.name.replace(/\.[^.]+$/, keepPng ? ".png" : ".jpg"), { type });
      dimension = Math.round(dimension * 0.8);
    }
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Checks each photo and resizes it when needed: big photos are made smaller, small photos are
 * accepted and enlarged to fit (with a heads up that they may look a little soft). Only photos
 * that are truly tiny, or not an image, are turned away.
 */
export async function screenImages(files: File[], spot: ImageSpot) {
  const passed: File[] = [];
  const rule = IMAGE_REQUIREMENTS[spot];
  const maxDimension = Math.max(2400, rule.minWidth, rule.minHeight);
  for (const original of files) {
    if (original.size > MAX_SOURCE_MB * 1024 * 1024) { notifyError(`${original.name} is larger than ${MAX_SOURCE_MB} MB.`, "Photo not added"); continue; }
    try {
      const file = await normalizeImageFile(original);
      const { width, height } = await readImageSize(file);
      if (Math.min(width, height) < SMALLEST_SIDE) notifySuccess(`${file.name} is very small (${width} x ${height})`, { description: "We will enlarge it to fit, but it will look blurry. A larger photo will look much better." });
      else if (checkImageSize(spot, width, height)) notifySuccess(`${file.name} is a little small`, { description: "We will enlarge it to fit. It may look slightly soft on big screens." });
      // Framed spots are resized by the framing step; the others are resized here.
      passed.push(rule.crop ? file : await fitImageFile(file, maxDimension));
    } catch (error) { notifyError(error, "Photo not added"); }
  }
  return passed;
}

type Props = {
  spot: ImageSpot;
  onFiles: (files: File[]) => void | Promise<void>;
  children?: ReactNode;
  multiple?: boolean;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Upload button that first shows the size requirements for this spot (required
 * pixel size, 300 DPI nice to have), then rejects images that are too small.
 */
export default function ImageUploadButton({ spot, onFiles, children, multiple, busy, disabled, className = "button-plain upload-button" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  // Photos waiting to be framed, and the ones already framed in this round.
  const [queue, setQueue] = useState<File[]>([]);
  const framed = useRef<File[]>([]);
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const rule = IMAGE_REQUIREMENTS[spot];

  function start() {
    if (busy || disabled) return;
    if (seenRequirements(spot)) input.current?.click();
    else setOpen(true);
  }

  function choose() {
    if (dontShow) rememberSeen(spot);
    setOpen(false);
    input.current?.click();
  }

  async function picked(list: FileList | null) {
    const files = Array.from(list || []);
    if (!files.length) return;
    const passed = await screenImages(files, spot);
    if (!passed.length) return;
    if (!rule.crop) { await onFiles(passed); return; }
    framed.current = [];
    setQueue(passed);
  }

  // Moves to the next photo; when none are left, hands the framed photos on.
  function advance(result: File | null) {
    if (result) framed.current.push(result);
    setQueue((current) => {
      const rest = current.slice(1);
      if (!rest.length && framed.current.length) { const done = framed.current; framed.current = []; void onFiles(done); }
      return rest;
    });
  }

  return <>
    <button className={className} type="button" onClick={start} disabled={disabled} aria-busy={busy}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {children ?? "Upload photo"}
    </button>
    <input ref={input} type="file" accept={PICKER_ACCEPT} multiple={multiple} hidden onChange={(event) => { void picked(event.target.files); event.currentTarget.value = ""; }} />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Photo requirements: {rule.label}</DialogTitle>
          <DialogDescription>Check your photo before uploading so it looks sharp on every screen.</DialogDescription>
        </DialogHeader>
        <ul className="image-requirements">
          <li><CheckCircle2 size={16} /><span><strong>Best:</strong> {describeRequirement(spot)}. Larger photos are resized for you.</span></li>
          {rule.crop ? <li><Crop size={16} /><span><strong>Next step:</strong> {rule.shape}. Drag and zoom so it looks just right.</span></li> : <li><CheckCircle2 size={16} /><span><strong>Shape:</strong> {rule.shape}.</span></li>}
          <li><CheckCircle2 size={16} /><span><strong>Format:</strong> any photo, including iPhone photos, up to {MAX_SOURCE_MB} MB.</span></li>
          <li><Info size={16} /><span><strong>Nice to have:</strong> {RECOMMENDED_DPI} DPI, so the same photo also prints well. Screens only use the pixel size above.</span></li>
        </ul>
        <p className="image-requirements-note">Photos that are a little small are enlarged to fit, and may look slightly soft. Very small photos (under {SMALLEST_SIDE} pixels on a side) are still used, but will look blurry.</p>
        <label className="image-requirements-skip"><input type="checkbox" checked={dontShow} onChange={(event) => setDontShow(event.target.checked)} /> Do not show this again for this kind of photo on this device</label>
        <DialogFooter>
          <button className="button-plain" type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button className="button-primary" type="button" onClick={choose}><ImagePlus size={14} /> Choose photo{multiple ? "s" : ""}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {rule.crop && <ImageCropDialog file={queue[0] ?? null} settings={{ ...rule.crop, minSourceWidth: Math.min(rule.minWidth, rule.minHeight * rule.crop.aspect) }} title={queue.length > 1 ? `Frame your photo (${queue.length} left)` : "Frame your photo"} onDone={(file) => advance(file)} onCancel={() => advance(null)} />}
  </>;
}
