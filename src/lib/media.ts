import { MAX_IMAGE_BYTES } from "./limits";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

function supportsWebp(): boolean {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

/**
 * Valida e, se serve, comprime un'immagine nel browser.
 * - le GIF NON vengono ricodificate (si perderebbe l'animazione): solo controllo dei 3MB
 * - JPG/PNG/WebP vengono ridimensionati (lato max `maxDim`) e ricompressi finché stanno sotto 3MB
 */
export async function prepareImage(file: File, maxDim = 1920): Promise<File> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: formato non supportato (usa JPG, PNG, WebP o GIF).`);
  }

  if (file.type === "image/gif") {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name}: le GIF non possono superare 3MB (non vengono compresse per non perdere l'animazione).`);
    }
    return file;
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const longest = Math.max(bitmap.width, bitmap.height);

  // già piccola e leggera: la teniamo com'è
  if (longest <= maxDim && file.size <= 1_000_000) {
    bitmap.close();
    return file;
  }

  const mime = supportsWebp() ? "image/webp" : "image/jpeg";
  const ext = mime === "image/webp" ? "webp" : "jpg";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Il browser non supporta la compressione delle immagini.");
  }

  let dim = Math.min(maxDim, longest);
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, dim / longest);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await toBlob(canvas, mime, quality);
      if (blob && blob.size <= MAX_IMAGE_BYTES) {
        bitmap.close();
        const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
        return new File([blob], name, { type: mime });
      }
    }
    dim = Math.round(dim * 0.75); // ancora troppo pesante: rimpicciolisci e riprova
  }

  bitmap.close();
  throw new Error(`${file.name}: impossibile ridurla sotto i 3MB.`);
}
