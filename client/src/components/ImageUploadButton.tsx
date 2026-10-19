import { CheckCircle2, Crop, ImagePlus, Info, Loader2 } from "lucide-react";
import ImageCropDialog from "@/components/ImageCropDialog";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyError } from "@/lib/notify";
import { checkImageSize, describeRequirement, IMAGE_REQUIREMENTS, MAX_IMAGE_MB, RECOMMENDED_DPI, type ImageSpot } from "@shared/imageRequirements";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
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

/** Checks type, file size, and pixel size. Returns the files that pass; explains each one that does not. */
export async function screenImages(files: File[], spot: ImageSpot) {
  const passed: File[] = [];
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { notifyError(`${file.name} is not a JPEG, PNG, or WebP image.`, "Photo not added"); continue; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { notifyError(`${file.name} is larger than ${MAX_IMAGE_MB} MB. Export a smaller copy and try again.`, "Photo not added"); continue; }
    try {
      const { width, height } = await readImageSize(file);
      const problem = checkImageSize(spot, width, height);
      if (problem) { notifyError(`${file.name}: ${problem}`, "Photo too small"); continue; }
      passed.push(file);
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
    <input ref={input} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple={multiple} hidden onChange={(event) => { void picked(event.target.files); event.currentTarget.value = ""; }} />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Photo requirements: {rule.label}</DialogTitle>
          <DialogDescription>Check your photo before uploading so it looks sharp on every screen.</DialogDescription>
        </DialogHeader>
        <ul className="image-requirements">
          <li><CheckCircle2 size={16} /><span><strong>Required:</strong> {describeRequirement(spot)}.</span></li>
          {rule.crop ? <li><Crop size={16} /><span><strong>Next step:</strong> {rule.shape}. Drag and zoom so it looks just right.</span></li> : <li><CheckCircle2 size={16} /><span><strong>Shape:</strong> {rule.shape}.</span></li>}
          <li><CheckCircle2 size={16} /><span><strong>Required:</strong> JPEG, PNG, or WebP, up to {MAX_IMAGE_MB} MB.</span></li>
          <li><Info size={16} /><span><strong>Nice to have:</strong> {RECOMMENDED_DPI} DPI, so the same photo also prints well. Screens only use the pixel size above.</span></li>
        </ul>
        <p className="image-requirements-note">Photos smaller than the required size are not uploaded, and you will see a message explaining why.</p>
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
