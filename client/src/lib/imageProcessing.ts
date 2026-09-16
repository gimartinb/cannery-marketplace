export function resizeImageForPreview(file: File, maxDimension = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
    if (file.size > 5 * 1024 * 1024) { reject(new Error("Images must be smaller than 5 MB.")); return; }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not process this image.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL("image/jpeg", 0.86);
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) { URL.revokeObjectURL(objectUrl); reject(error instanceof Error ? error : new Error("Image processing failed.")); }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("This image format is unsupported or damaged.")); };
    image.src = objectUrl;
  });
}
