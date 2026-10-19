import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../worker/routers";

export const trpc = createTRPCReact<AppRouter>();

/** Pages behind Cloudflare Access. They need a full page load so Access can run its sign in step. */
export const SECURE_PATHS = ["/admin", "/maker-portal"] as const;

/** Reload the current secure page through Cloudflare Access (shows the email code screen if needed). */
export function signInThroughAccess(path: string = window.location.pathname) {
  window.location.assign(path);
}

/** Ends the Cloudflare Access session, then returns home. */
export function signOutOfAccess() {
  window.location.assign("/cdn-cgi/access/logout");
}
