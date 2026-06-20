export const CHAT_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
export const CHAT_IMAGE_TARGET_MAX_BYTES = 300 * 1024;

export function formatChatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image could not be compressed."));
    }, type, quality);
  });
}

export async function prepareChatAttachment(file: File) {
  if (!file.type.startsWith("image/")) {
    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error(`File must be ${formatChatFileSize(CHAT_ATTACHMENT_MAX_BYTES)} or smaller.`);
    }
    return file;
  }

  if (file.size <= CHAT_IMAGE_TARGET_MAX_BYTES) return file;

  const image = await loadImage(file);
  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * ratio));
  let height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression is not available.");

  for (const scale of [1, 0.85, 0.7, 0.55, 0.42, 0.32]) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.8, 0.68, 0.56, 0.44, 0.34]) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob.size <= CHAT_IMAGE_TARGET_MAX_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") || "photo";
        return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      }
    }
  }

  throw new Error(`Photo is too large to compress below ${formatChatFileSize(CHAT_IMAGE_TARGET_MAX_BYTES)}.`);
}
