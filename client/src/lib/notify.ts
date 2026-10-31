import { toast } from "sonner";

// One way to acknowledge every action across the site: a short pop up in the
// corner that confirms what happened, with an optional link to see the result.

export type NotifyLink = { label: string; href: string };

function openLink(link: NotifyLink) {
  if (link.href.startsWith("mailto:")) window.location.href = link.href;
  else if (/^https?:\/\//i.test(link.href)) window.open(link.href, "_blank", "noopener");
  else window.open(link.href, "_blank");
}

export function notifySuccess(message: string, options: { description?: string; link?: NotifyLink } = {}) {
  toast.success(message, {
    description: options.description,
    duration: options.link ? 9000 : 5000,
    action: options.link ? { label: options.link.label, onClick: () => openLink(options.link!) } : undefined,
  });
}

/** Turns any error into a sentence a person can act on. */
export function readableError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return fallback;
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return "We could not reach the site. Check your internet connection and try again.";
  if (/^\s*\[\s*\{/.test(raw)) return fallback; // raw validation output; the server normally rewrites these
  return raw;
}

export function notifyError(error: unknown, title = "That did not work") {
  toast.error(title, { description: readableError(error), duration: 10000 });
}

export function notifyInfo(message: string, description?: string) {
  toast(message, { description, duration: 5000 });
}
