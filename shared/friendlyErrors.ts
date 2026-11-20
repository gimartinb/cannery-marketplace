// Turns validation problems into sentences an owner or maker can act on,
// instead of raw messages like "shortBio: String must contain at least 20 character(s)".

const FIELD_LABELS: Record<string, string> = {
  name: "Business name",
  ownerName: "Maker's full name",
  slug: "Web address name",
  category: "Category",
  shortBio: "Short description",
  ownerBio: "About the maker",
  contactEmail: "Contact email",
  loginEmail: "Login email",
  websiteUrl: "Website",
  instagramUrl: "Instagram link",
  facebookUrl: "Facebook link",
  tiktokUrl: "TikTok link",
  coverImageUrl: "Cover photo",
  galleryImageUrls: "Gallery photos",
  featured: "Featured",
  displayOrder: "Display order",
  active: "Visible on site",
  title: "Title",
  description: "Description",
  imageUrl: "Photo",
  makerSlug: "Maker link",
  startsAt: "Start date",
  endsAt: "End date",
  alt: "Image description",
  caption: "Caption",
  emails: "Email list",
  email: "Email",
  note: "Review note",
  vendors: "Spreadsheet rows",
};

export type IssueLike = { path: (string | number)[]; message: string; code?: string; minimum?: number | bigint; maximum?: number | bigint; type?: string };

export function fieldLabel(path: (string | number)[]) {
  const named = [...path].reverse().find((part): part is string => typeof part === "string");
  if (!named) return "This entry";
  return FIELD_LABELS[named] || named.replace(/([A-Z])/g, " $1").replace(/^./, (first) => first.toUpperCase());
}

/** One readable sentence for one validation problem. */
export function describeIssue(issue: IssueLike) {
  const label = fieldLabel(issue.path);
  const row = issue.path[0] === "vendors" && typeof issue.path[1] === "number" ? `Row ${issue.path[1] + 2}: ` : "";
  if (issue.code === "too_small" && issue.type === "string") return `${row}${label} needs at least ${issue.minimum} characters.`;
  if (issue.code === "too_big" && issue.type === "string") return `${row}${label} can be at most ${issue.maximum} characters.`;
  if (issue.code === "too_big" && issue.type === "array") return `${row}${label} can have at most ${issue.maximum} items.`;
  if (issue.code === "too_small" && issue.type === "array") return `${row}${label} needs at least ${issue.minimum} item${Number(issue.minimum) === 1 ? "" : "s"}.`;
  if (issue.code === "invalid_string" && /email/i.test(issue.message)) return `${row}${label} must be a valid email address, like name@example.com.`;
  if (issue.code === "invalid_type") return `${row}${label} is missing or in the wrong format.`;
  if (/^(Invalid|Required|String must|Number must|Expected)/.test(issue.message)) return `${row}${label}: ${issue.message.replace(/^String must contain/, "must contain").toLowerCase()}.`;
  return `${row}${label}: ${issue.message.replace(/\.$/, "")}.`;
}

/** Several problems joined into one message, capped so a pop up stays readable. */
export function describeIssues(issues: IssueLike[], max = 4) {
  const lines = Array.from(new Set(issues.map(describeIssue)));
  const shown = lines.slice(0, max).join(" ");
  return lines.length > max ? `${shown} And ${lines.length - max} more.` : shown;
}
