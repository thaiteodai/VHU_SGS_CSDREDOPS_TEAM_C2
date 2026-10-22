import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

/**
 * Meme sourcing.
 *
 * Two sources:
 *  1. A curated, curated-on-purpose pack (server/data/meme-pack.json) that the
 *     team can extend with formats pulled from the Instagram community. Each
 *     entry points at a memegen template id, so no third-party image is ever
 *     vendored into this repo - only the caption and the attribution.
 *  2. A live pool of templates fetched from memegen.link, cached for 6h.
 *
 * Images are always rendered server-side and proxied through /api/memes/render
 * so the browser never talks to a third party directly, and so we can serve a
 * graceful fallback when the upstream API is unreachable.
 */

export interface MemeTemplate {
  id: string;
  name: string;
  lines: number;
  attribution?: string;
  source?: string;
}

interface MemegenTemplate {
  id: string;
  name: string;
  lines: number;
  blank?: string;
  example?: { url?: string };
  source?: string;
}

let cachedTemplates: MemeTemplate[] | null = null;
let cachedAt = 0;
let curated: MemeTemplate[] | null = null;

function curatedPackPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data/meme-pack.json"),
    path.resolve(process.cwd(), "../server/data/meme-pack.json"),
    path.resolve(process.cwd(), "server/data/meme-pack.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function getCuratedPack(): MemeTemplate[] {
  if (curated) return curated;
  try {
    const raw = fs.readFileSync(curatedPackPath(), "utf8");
    const parsed = JSON.parse(raw);
    curated = Array.isArray(parsed) ? parsed : parsed.templates ?? [];
  } catch {
    curated = [];
  }
  return curated!;
}

export async function getTemplatePool(): Promise<MemeTemplate[]> {
  const now = Date.now();
  if (cachedTemplates && now - cachedAt < config.meme.cacheTtlMs) return cachedTemplates;
  if (!config.meme.enabled) {
    cachedTemplates = getCuratedPack();
    cachedAt = now;
    return cachedTemplates;
  }
  try {
    const res = await fetch(`${config.meme.baseUrl}/templates`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`meme api ${res.status}`);
    const data = (await res.json()) as MemegenTemplate[];
    cachedTemplates = data.map((t) => ({
      id: t.id,
      name: t.name,
      lines: t.lines,
      source: t.source,
    }));
    cachedAt = now;
  } catch {
    if (!cachedTemplates) cachedTemplates = getCuratedPack();
  }
  return cachedTemplates;
}

/**
 * Deterministic choice so a given roast always shows the same meme.
 */
export function chooseTemplate(seed: number, pool: MemeTemplate[]): MemeTemplate | null {
  if (!pool.length) return null;
  const idx = Math.abs(Math.floor(seed)) % pool.length;
  return pool[idx];
}

export function renderUrl(templateId: string, top: string, bottom: string): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/\s+/g, "_"));
  return `${config.meme.baseUrl}/images/${encodeURIComponent(templateId)}/${enc(top)}/${enc(bottom)}.jpg`;
}

/**
 * Fetches a rendered meme image, with an on-disk cache so repeat views are
 * instant and the upstream API is not hammered.
 */
export async function fetchMemeImage(
  templateId: string,
  top: string,
  bottom: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!config.meme.enabled) return null;
  const url = renderUrl(templateId, top, bottom);
  const cacheDir = path.resolve(process.cwd(), "cache", "memes");
  const key = Buffer.from(`${templateId}|${top}|${bottom}`).toString("base64url").slice(0, 120);
  const cacheFile = path.join(cacheDir, `${key}.jpg`);

  try {
    if (fs.existsSync(cacheFile)) {
      return { buffer: fs.readFileSync(cacheFile), contentType: "image/jpeg" };
    }
  } catch {
    /* ignore cache read errors */
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, buffer);
    } catch {
      /* ignore cache write errors */
    }
    return { buffer, contentType: res.headers.get("content-type") ?? "image/jpeg" };
  } catch {
    return null;
  }
}
