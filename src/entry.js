import worker from "./worker.js";
import { ensureGallerySchema } from "./gallery-schema.js";

function usesGalleryPortal(pathname) {
  return pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname.startsWith("/gallery/") ||
    pathname.startsWith("/api/studio/") ||
    pathname.startsWith("/api/client-gallery/");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (usesGalleryPortal(url.pathname) && env.GALLERY_DB) {
      await ensureGallerySchema(env);
    }
    return worker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    if (env.GALLERY_DB) await ensureGallerySchema(env);
    return worker.scheduled?.(controller, env, ctx);
  }
};
