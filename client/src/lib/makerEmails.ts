// Prefilled emails the owners send from their own email app, so replies come
// back to the marketplace inbox. Free: no email service involved.

const SIGNATURE = "The Cannery Marketplace\n7488 Monterey Road, Gilroy\n(408) 337-1620";

function mailto(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The plain text of the welcome message, also used by "Copy invitation". */
export function welcomeText(maker: { email: string; businessName?: string; fullName?: string }, note = "", listingReady = true) {
  const first = (maker.fullName || "").split(" ")[0] || "there";
  const business = maker.businessName || "your business";
  const portal = `${window.location.origin}/maker-portal`;
  return `Hi ${first},\n\nWelcome to The Cannery Marketplace. We would love to have ${business} on our shelves.\n\n${note ? `${note}\n\n` : ""}Your maker space is ready${listingReady ? `, and we started your listing for ${business}` : ""}. To finish it:\n\n1. Go to ${portal}\n2. Enter this email address: ${maker.email}\n3. We will email you a one time code. Enter it to sign in (there is no password to remember).\n4. ${listingReady ? "Open your listing, add your photos and story, and" : "Add your listing with your photos and story, and"} click Send for review.\n\nEvery listing is reviewed before it goes live, which can take up to 72 hours. Reply to this email if you have any questions.\n\n${SIGNATURE}`;
}

export function welcomeEmailLink(maker: { email: string; businessName?: string; fullName?: string }, note = "", listingReady = true) {
  return mailto(maker.email, `Welcome to The Cannery Marketplace${maker.businessName ? `, ${maker.businessName}` : ""}`, welcomeText(maker, note, listingReady));
}

export function declineEmailLink(applicant: { email: string; businessName: string; fullName: string }, note = "") {
  const first = applicant.fullName.split(" ")[0] || "there";
  return mailto(applicant.email, `Your vendor interest form: ${applicant.businessName}`, `Hi ${first},\n\nThank you for sharing ${applicant.businessName} with The Cannery Marketplace. We reviewed your vendor interest form, and we are not able to offer a space right now.\n\n${note ? `${note}\n\n` : ""}We keep every form on file and may reach out if that changes.\n\n${SIGNATURE}`);
}

export function replyEmailLink(applicant: { email: string; businessName: string; fullName: string }, note = "") {
  const first = applicant.fullName.split(" ")[0] || "there";
  return mailto(applicant.email, `Your vendor interest form: ${applicant.businessName}`, `Hi ${first},\n\nThank you for your vendor interest form for ${applicant.businessName}.\n\n${note ? `${note}\n\n` : ""}${SIGNATURE}`);
}
