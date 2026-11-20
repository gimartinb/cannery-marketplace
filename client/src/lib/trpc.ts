import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../worker/routers";

export const trpc = createTRPCReact<AppRouter>();

/** Pages behind Cloudflare Access. They need a full page load so Access can run its sign in step. */
export const SECURE_PATHS = ["/admin", "/maker-portal"] as const;

/** Reload the current secure page through Cloudflare Access (shows the email code screen if needed). */
const ATTEMPT_KEY = "cannery-access-signin-attempt";

export function signInThroughAccess(path: string = window.location.pathname) {
  try { sessionStorage.setItem(ATTEMPT_KEY, String(Date.now())); } catch { /* storage unavailable */ }
  window.location.assign(path);
}

/** True if the visitor just tried to sign in (within a minute) and still is not signed in. */
export function signInJustFailed(): boolean {
  try { return Date.now() - Number(sessionStorage.getItem(ATTEMPT_KEY) || 0) < 60_000; } catch { return false; }
}

export function clearSignInAttempt() {
  try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* storage unavailable */ }
}

/** Ends the Cloudflare Access session, then returns home. */
export function signOutOfAccess() {
  window.location.assign("/cdn-cgi/access/logout");
}
