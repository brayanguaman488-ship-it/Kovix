import fs from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await fs.readFile(new URL('./assets-manifest.json', import.meta.url), 'utf8'));

async function download(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; KOVPAYPreview/1.0)',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error(`Unexpected content-type: ${contentType}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { bytes, contentType };
  } finally {
    clearTimeout(timer);
  }
}

let ok = 0;
let failed = 0;

for (const asset of manifest.assets) {
  const target = path.resolve(asset.filename);
  await fs.mkdir(path.dirname(target), { recursive: true });

  let existingSize = 0;
  try { existingSize = (await fs.stat(target)).size; } catch {}
  if (existingSize >= (asset.minBytes || 1)) {
    console.log(`[assets] keep ${asset.id}: ${existingSize} bytes`);
    ok++;
    continue;
  }

  let saved = false;
  for (const url of asset.urls) {
    try {
      console.log(`[assets] fetch ${asset.id} <- ${url}`);
      const { bytes, contentType } = await download(url);
      if (bytes.length < (asset.minBytes || 1)) {
        throw new Error(`file too small: ${bytes.length} bytes`);
      }
      await fs.writeFile(target, bytes);
      console.log(`[assets] saved ${asset.id}: ${bytes.length} bytes (${contentType})`);
      saved = true;
      ok++;
      break;
    } catch (error) {
      console.warn(`[assets] source failed for ${asset.id}: ${error.message}`);
    }
  }

  if (!saved) {
    console.error(`[assets] FAILED ${asset.id}`);
    failed++;
  }
}

console.log(`[assets] complete: ${ok} ready, ${failed} unavailable`);
// Do not block the preview if a manufacturer CDN temporarily refuses a request.
process.exit(0);
