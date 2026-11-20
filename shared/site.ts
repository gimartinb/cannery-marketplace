// The live address. Every link the site builds for people (emails, notifications,
// "review it" links) uses this, even when an owner works from the staging address.
export const SITE_URL = "https://cannerymarket.com";
export const ADMIN_URL = `${SITE_URL}/admin`;
export const MAKER_PORTAL_URL = `${SITE_URL}/maker-portal`;

// FormSubmit relays form notices to the owners' Gmail. The alias (from FormSubmit's
// activation email) keeps the Gmail address out of the page source, away from spammers.
export const OWNER_NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/93077e46884ce5481079b7b76eefc646";
