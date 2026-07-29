import worker from "./worker.js";
import { ensureGallerySchema } from "./gallery-schema.js";

function usesPersistentDatabase(pathname) {
  return pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname.startsWith("/gallery/") ||
    pathname === "/api/inquiry" ||
    pathname.startsWith("/api/studio/") ||
    pathname.startsWith("/api/client-gallery/");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSuffix(length = 5) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function strengthenGalleryCreateRequest(request, url) {
  if (request.method !== "POST" || url.pathname !== "/api/studio/galleries") return request;

  let data;
  try {
    data = await request.clone().json();
  } catch {
    return request;
  }

  if (String(data.slug || "").trim()) return request;
  const base = slugify(data.title) || "gallery";
  data.slug = `${base}-${randomSuffix()}`;

  const headers = new Headers(request.headers);
  headers.delete("Content-Length");
  return new Request(request, {
    headers,
    body: JSON.stringify(data)
  });
}

async function hideLockedGalleryMetadata(request, url, response) {
  if (request.method !== "GET" || !/^\/api\/client-gallery\/[a-z0-9-]+\/?$/.test(url.pathname)) return response;
  if (!(response.headers.get("Content-Type") || "").includes("application/json")) return response;

  let data;
  try {
    data = await response.clone().json();
  } catch {
    return response;
  }

  if (!data?.ok || data.unlocked || !data.gallery) return response;
  const headers = new Headers(response.headers);
  return new Response(JSON.stringify({
    ...data,
    gallery: {
      slug: data.gallery.slug,
      expiresAt: data.gallery.expiresAt
    }
  }), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (usesPersistentDatabase(url.pathname) && env.GALLERY_DB) {
      await ensureGallerySchema(env);
    }

    const effectiveRequest = await strengthenGalleryCreateRequest(request, url);
    const response = await worker.fetch(effectiveRequest, env, ctx);
    return hideLockedGalleryMetadata(effectiveRequest, url, response);
  },

  async scheduled(controller, env, ctx) {
    if (env.GALLERY_DB) await ensureGallerySchema(env);
    return worker.scheduled?.(controller, env, ctx);
  }
};
