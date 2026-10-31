import { Crop, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type CropSettings = {
  /** Width divided by height of the frame the photo appears in, for example 4 / 3. */
  aspect: number;
  /** Width in pixels of the finished image. */
  outputWidth: number;
  /** Offer "show the whole image" (fits it inside the frame instead of filling it), for logos. */
  allowWholeImage?: boolean;
  /** Smallest source width that still looks sharp; zooming in past it shows a warning. */
  minSourceWidth?: number;
};

// The frame is drawn in a fixed coordinate space and scaled to fit the dialog,
// so the math below never depends on the screen size.
const VIEW_W = 480;
const BACKGROUND = "#ffffff";

type Props = { file: File | null; settings: CropSettings; onDone: (file: File) => void; onCancel: () => void; title?: string };

/** Lets a person drag and zoom a photo inside the exact frame shape it will appear in, then crops it in the browser ($0, no upload until done). */
export default function ImageCropDialog({ file, settings, onDone, onCancel, title }: Props) {
  const viewH = VIEW_W / settings.aspect;
  const frame = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [whole, setWhole] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) { setImage(null); return; }
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => { setImage(next); setWhole(false); setZoom(1); };
    next.onerror = () => onCancel();
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const natural = image ? { w: image.naturalWidth, h: image.naturalHeight } : { w: 1, h: 1 };
  const base = whole ? Math.min(VIEW_W / natural.w, viewH / natural.h) : Math.max(VIEW_W / natural.w, viewH / natural.h);
  const scale = base * zoom;
  const shown = { w: natural.w * scale, h: natural.h * scale };

  // Keeps the photo covering the frame (or centered when it is smaller than the frame).
  const clamp = (x: number, y: number) => ({
    x: shown.w <= VIEW_W ? (VIEW_W - shown.w) / 2 : Math.min(0, Math.max(VIEW_W - shown.w, x)),
    y: shown.h <= viewH ? (viewH - shown.h) / 2 : Math.min(0, Math.max(viewH - shown.h, y)),
  });

  // Center the photo when it loads or when switching between fill and whole image.
  useEffect(() => { setOffset({ x: (VIEW_W - shown.w) / 2, y: (viewH - shown.h) / 2 }); }, [image, whole]); // eslint-disable-line react-hooks/exhaustive-deps

  // The on screen frame can be narrower than VIEW_W (phones); track its width to convert drags.
  const [frameWidth, setFrameWidth] = useState(VIEW_W);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setFrameWidth(element.clientWidth || VIEW_W));
    observer.observe(element);
    return () => observer.disconnect();
  }, [image]);
  const ratio = () => VIEW_W / (frameWidth || VIEW_W);
  function onPointerDown(event: React.PointerEvent) {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current) return;
    const k = ratio();
    setOffset(clamp(drag.current.ox + (event.clientX - drag.current.x) * k, drag.current.oy + (event.clientY - drag.current.y) * k));
  }
  function changeZoom(next: number) {
    const value = Math.min(4, Math.max(1, next));
    // Zoom around the center of the frame.
    const centerX = (VIEW_W / 2 - offset.x) / scale;
    const centerY = (viewH / 2 - offset.y) / scale;
    const nextScale = base * value;
    setZoom(value);
    setOffset(clampFor(nextScale, VIEW_W / 2 - centerX * nextScale, viewH / 2 - centerY * nextScale));
  }
  function clampFor(s: number, x: number, y: number) {
    const w = natural.w * s, h = natural.h * s;
    return { x: w <= VIEW_W ? (VIEW_W - w) / 2 : Math.min(0, Math.max(VIEW_W - w, x)), y: h <= viewH ? (viewH - h) / 2 : Math.min(0, Math.max(viewH - h, y)) };
  }

  const sourceWidth = Math.round(Math.min(natural.w, VIEW_W / scale));
  const soft = !whole && settings.minSourceWidth ? sourceWidth < settings.minSourceWidth : false;

  async function finish() {
    if (!image || !file) return;
    const outW = settings.outputWidth;
    const outH = Math.round(outW / settings.aspect);
    const k = outW / VIEW_W;
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, outW, outH);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, offset.x * k, offset.y * k, shown.w * k, shown.h * k);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    onDone(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-framed.jpg`, { type: "image/jpeg" }));
  }

  return <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="crop-dialog">
      <DialogHeader>
        <DialogTitle>{title ?? "Frame your photo"}</DialogTitle>
        <DialogDescription>Drag the photo to position it and use the zoom buttons. This frame is exactly what shoppers will see.</DialogDescription>
      </DialogHeader>
      <div ref={frame} className="crop-frame" style={{ aspectRatio: `${settings.aspect}` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="crop-stage" style={{ width: VIEW_W, height: viewH, transform: `scale(${1 / ratio()})` }}>
          {image && <img src={image.src} alt="" draggable={false} style={{ width: shown.w, height: shown.h, transform: `translate(${offset.x}px, ${offset.y}px)` }} />}
        </div>
      </div>
      <div className="crop-controls">
        <button className="button-plain compact-button" type="button" aria-label="Zoom out" onClick={() => changeZoom(zoom - 0.15)} disabled={zoom <= 1}><Minus size={14} /></button>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Zoom" />
        <button className="button-plain compact-button" type="button" aria-label="Zoom in" onClick={() => changeZoom(zoom + 0.15)} disabled={zoom >= 4}><Plus size={14} /></button>
      </div>
      {settings.allowWholeImage && <label className="image-requirements-skip"><input type="checkbox" checked={whole} onChange={(event) => { setWhole(event.target.checked); setZoom(1); }} /> Show the whole image (best for logos), with white space around it</label>}
      {soft && <p className="form-error">You are zoomed in a lot, so this part of the photo may look blurry. Zoom out a little for a sharper result.</p>}
      <DialogFooter>
        <button className="button-plain" type="button" onClick={onCancel}>Cancel</button>
        <button className="button-primary" type="button" onClick={() => void finish()} disabled={!image}><Crop size={14} /> Use this framing</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
