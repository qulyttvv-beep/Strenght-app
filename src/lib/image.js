// Image helpers: downscale + JPEG-encode photos so the local gallery stays small and AI uploads stay fast.
const loadBitmap = async (file) => {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
};

async function encode(src, max, quality) {
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', quality));
}

/** -> { full: Blob (<=1440px), thumb: Blob (<=360px), width, height } */
export async function processPhoto(file) {
  const bmp = await loadBitmap(file);
  const full = await encode(bmp, 1440, 0.82);
  const thumb = await encode(bmp, 360, 0.7);
  const out = { full, thumb, width: bmp.width || bmp.naturalWidth, height: bmp.height || bmp.naturalHeight };
  bmp.close?.();
  return out;
}

export const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
export const dataUrlToBlob = async (url) => (await fetch(url)).blob();

/** -> data URL downscaled for AI vision calls (default 1024px). */
export async function fileToAiDataUrl(file, max = 1024, quality = 0.8) {
  const bmp = await loadBitmap(file);
  const blob = await encode(bmp, max, quality);
  bmp.close?.();
  return blobToDataUrl(blob);
}
export async function blobToAiDataUrl(blob, max = 1024, quality = 0.8) { return fileToAiDataUrl(blob, max, quality); }

// Object-URL cache so list re-renders don't leak URLs.
const urlCache = new Map();
export function urlFor(key, blob) {
  if (!blob) return '';
  let u = urlCache.get(key);
  if (!u) { u = URL.createObjectURL(blob); urlCache.set(key, u); }
  return u;
}
export function dropUrl(key) { const u = urlCache.get(key); if (u) { URL.revokeObjectURL(u); urlCache.delete(key); } }
