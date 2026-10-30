import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AnyTRPCRouter } from "@trpc/server";
import type { Env } from "./env";
import { handleMedia, handleReviewPhotoUpload, handleSiteImageUpload, handleVendorUpload } from "./media";
import { adminRouter, publicRouter, vendorRouter } from "./routers";
import { createContext } from "./trpc";
import { handlePage, robotsTxt, sitemapXml } from "./seo";
import { runStorageMaintenance } from "./usage";

// Route map. Cloudflare Access protects /api/admin/* and /api/vendor/* (plus the
// /admin and /maker-portal pages) before requests ever reach this Worker.
const TRPC_ENDPOINTS: Array<{ prefix: string; router: AnyTRPCRouter }> = [
  { prefix: "/api/admin/trpc", router: adminRouter },
  { prefix: "/api/vendor/trpc", router: vendorRouter },
  { prefix: "/api/trpc", router: publicRouter },
];

function withSecurityHeaders(response: Response): Response {
  const result = new Response(response.body, response);
  result.headers.set("X-Content-Type-Options", "nosniff");
  result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return result;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    for (const endpoint of TRPC_ENDPOINTS) {
      if (pathname === endpoint.prefix || pathname.startsWith(`${endpoint.prefix}/`)) {
        const response = await fetchRequestHandler({
          endpoint: endpoint.prefix,
          req: request,
          router: endpoint.router,
          createContext: () => createContext(env, request),
          onError: ({ path, error }) => {
            if (error.code === "INTERNAL_SERVER_ERROR") console.error(`tRPC ${path ?? "?"} failed`, error);
          },
        });
        response.headers.set("Cache-Control", "no-store");
        return withSecurityHeaders(response);
      }
    }

    if (pathname === "/api/vendor/upload") return withSecurityHeaders(await handleVendorUpload(request, env));
    if (pathname === "/api/review-photo") return withSecurityHeaders(await handleReviewPhotoUpload(request, env));
    if (pathname === "/api/admin/upload") return withSecurityHeaders(await handleSiteImageUpload(request, env));
    if (pathname.startsWith("/media/")) return handleMedia(request, env, decodeURIComponent(pathname.slice("/media/".length)), ctx);
    if (pathname.startsWith("/manus-storage/")) return handleMedia(request, env, decodeURIComponent(pathname.slice("/manus-storage/".length)), ctx);
    if (pathname.startsWith("/api/")) return withSecurityHeaders(Response.json({ error: "Not found" }, { status: 404 }));

    if (pathname === "/robots.txt") return robotsTxt(request);
    if (pathname === "/sitemap.xml") return sitemapXml(env);

    // Everything else is the React app. Pages get their own search and sharing tags.
    return withSecurityHeaders(await handlePage(request, env));
  },

  // Nightly job (see "triggers" in wrangler.jsonc): recount photo storage and
  // remove photos that no page uses anymore, to stay inside the free tier.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runStorageMaintenance(env, { removeUnused: true }).then((result) => console.log("Storage check", result)));
  },
} satisfies ExportedHandler<Env>;
