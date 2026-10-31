// The invitation wording for "Copy invitation message" (pasting into a text).
// Emails the site sends use the editable templates in shared/emailTemplates.ts.
import { MAKER_PORTAL_URL } from "@shared/site";

const SIGNATURE = "The Cannery Marketplace\n7488 Monterey Road, Gilroy\n(408) 337-1620";

/** The plain text of the welcome message, also used by "Copy invitation". */
export function welcomeText(maker: { email: string; businessName?: string; fullName?: string }, note = "", listingReady = true) {
  const first = (maker.fullName || "").split(" ")[0] || "there";
  const business = maker.businessName || "your business";
  const portal = MAKER_PORTAL_URL;
  return `Hi ${first},\n\nWelcome to The Cannery Marketplace. We are excited to feature ${business} on our website.\n\n${note ? `${note}\n\n` : ""}To finish your listing:\n\n1. Go to ${portal}\n2. Enter this email address: ${maker.email}\n3. We will email you a one time code. Enter it to sign in (there is no password to remember).\n4. ${listingReady ? "Open your listing, add your photos and story, and" : "Add your listing with your photos and story, and"} click Send for review.\n\nEvery listing is reviewed before it goes live, which can take up to 72 hours. Reply to this email if you have any questions.\n\n${SIGNATURE}`;
}
