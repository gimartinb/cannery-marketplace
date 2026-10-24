// Every editable piece of text on the public site, with its original wording.
// Owners edit these in the owner portal (Site text). Pages show the published
// version when there is one, otherwise the original below.
//
// Formatting owners can use:  *words*  show in gold italics (the accent in headings),
//                             a new line becomes a line break,
//                             {business} and {maker} fill in names on maker pages.

export type TextKind = "eyebrow" | "heading" | "paragraph" | "button" | "item" | "detail";

export const SITE_PAGES = [
  { id: "shared", label: "Every page: header, footer, and business details", path: "/" },
  { id: "home", label: "Home", path: "/" },
  { id: "about", label: "About", path: "/about" },
  { id: "makers", label: "Makers directory", path: "/vendors" },
  { id: "profile", label: "Maker profile pages", path: "/vendors" },
  { id: "become", label: "Become a vendor", path: "/become-a-vendor" },
  { id: "apply", label: "Maker application", path: "/apply" },
  { id: "contact", label: "Contact", path: "/contact" },
  { id: "gifts", label: "Gift boxes (hidden until turned on)", path: "/gifts" },
  { id: "corporate", label: "Corporate and custom gifts (hidden)", path: "/request-a-quote" },
] as const;
export type SitePageId = (typeof SITE_PAGES)[number]["id"];

export type SiteTextBlock = { key: string; page: SitePageId; label: string; kind: TextKind; original: string; maxChars: number };

const LIMITS: Record<TextKind, number> = { eyebrow: 60, heading: 140, button: 40, item: 180, paragraph: 900, detail: 120 };

type Entry = [key: string, label: string, kind: TextKind, original: string];
const page = (id: SitePageId, entries: Entry[]): SiteTextBlock[] => entries.map(([key, label, kind, original]) => ({ key: `${id}.${key}`, page: id, label, kind, original, maxChars: LIMITS[kind] }));

export const SITE_TEXT: SiteTextBlock[] = [
  ...page("shared", [
    ["nav.makers", "Menu: Makers", "button", "Makers"],
    ["nav.about", "Menu: About", "button", "About"],
    ["nav.gifts", "Menu: Gifts", "button", "Gifts"],
    ["nav.contact", "Menu: Contact", "button", "Contact"],
    ["nav.become", "Menu: Become a vendor", "button", "Become a vendor"],
    ["nav.login", "Menu: Maker login button", "button", "Maker login"],
    ["footer.tagline", "Footer: short description", "paragraph", "A dedicated space in Gilroy where local makers and artisans can share their handcrafted work."],
    ["business.addressLine1", "Business address, street", "detail", "7488 Monterey Road"],
    ["business.addressLine2", "Business address, city", "detail", "Gilroy, California 95020"],
    ["business.phone", "Business phone", "detail", "(408) 337-1620"],
    ["business.email", "Business email", "detail", "thecannerymarketplace@gmail.com"],
    ["hours.monday", "Hours: Monday", "detail", "Closed"],
    ["hours.tuesday", "Hours: Tuesday", "detail", "Closed"],
    ["hours.wednesday", "Hours: Wednesday", "detail", "11 AM to 6 PM"],
    ["hours.thursday", "Hours: Thursday", "detail", "11 AM to 7 PM"],
    ["hours.friday", "Hours: Friday", "detail", "11 AM to 7 PM"],
    ["hours.saturday", "Hours: Saturday", "detail", "11 AM to 7 PM"],
    ["hours.sunday", "Hours: Sunday", "detail", "11 AM to 6 PM"],
  ]),
  ...page("home", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "Gilroy, California"],
    ["hero.title", "Top banner: headline", "heading", "Made here. *Found by you.*"],
    ["hero.body", "Top banner: text", "paragraph", "Meet the people, products, and stories shaping Gilroy’s local maker community."],
    ["hero.primary", "Top banner: main button", "button", "Explore the makers"],
    ["hero.secondary", "Top banner: second button", "button", "Become a maker"],
    ["hero.cardLabel", "Top banner card: small label", "eyebrow", "Start with the story"],
    ["hero.cardText", "Top banner card: text", "item", "Local makers.\nDistinctive work."],
    ["hero.cardLink", "Top banner card: link", "button", "Browse every maker"],
    ["featured.eyebrow", "Featured makers: small label", "eyebrow", "Makers to discover"],
    ["featured.title", "Featured makers: heading", "heading", "Meet the people behind the *work.*"],
    ["featured.link", "Featured makers: link", "button", "See all makers"],
    ["products.eyebrow", "Product highlights: small label", "eyebrow", "Made by local hands"],
    ["products.title", "Product highlights: heading", "heading", "Find something with a *story.*"],
    ["products.body", "Product highlights: text", "paragraph", "Explore a few of the goods and flavors represented by makers at The Cannery, then step into each profile to learn who made them."],
    ["community.eyebrow", "Community: small label", "eyebrow", "A marketplace made by its community"],
    ["community.title", "Community: heading", "heading", "Made here. Backed here. *Built to last.*"],
    ["community.body", "Community: text", "paragraph", "Gilroy is shaped by makers, growers, doers, and neighbors who choose local. Every purchase keeps storefronts full, skills in motion, and opportunity close to home."],
    ["community.value1", "Community: point 1", "item", "Meet the person behind the work"],
    ["community.value2", "Community: point 2", "item", "Choose local goods with a story"],
    ["community.value3", "Community: point 3", "item", "Build a stronger downtown together"],
    ["intro.eyebrow", "Introduction: small label", "eyebrow", "The Cannery Marketplace"],
    ["intro.title", "Introduction: heading", "heading", "A home for *handcrafted* things."],
    ["intro.body", "Introduction: text", "paragraph", "The Cannery Marketplace gives local makers and artisans a dedicated place to share their work. Come for the maker stories, stay for the pleasure of discovering something distinctive and made close to home."],
    ["intro.link", "Introduction: link", "button", "Meet the local makers"],
    ["feature1.title", "Three features: first heading", "heading", "Meet the maker"],
    ["feature1.body", "Three features: first text", "item", "Learn who made each piece and what inspires their work."],
    ["feature2.title", "Three features: second heading", "heading", "Explore the craft"],
    ["feature2.body", "Three features: second text", "item", "Browse ceramics, paper goods, woodworking, food, and more."],
    ["feature3.title", "Three features: third heading", "heading", "Find something lasting"],
    ["feature3.body", "Three features: third text", "item", "Take home thoughtful work with a local story behind it."],
    ["story.eyebrow", "Photo story: small label", "eyebrow", "Shop local, naturally"],
    ["story.title", "Photo story: heading", "heading", "A place to *wander* awhile."],
    ["story.body", "Photo story: text", "paragraph", "Stop in when you are looking for something special, or simply because you would like to see what local hands have been making."],
    ["story.link", "Photo story: link", "button", "Explore the maker directory"],
    ["visit.eyebrow", "Visit us: small label", "eyebrow", "Plan your visit"],
    ["visit.title", "Visit us: heading", "heading", "Find us in *downtown Gilroy.*"],
    ["visit.directions", "Visit us: directions link", "button", "Get directions"],
    ["visit.hoursTitle", "Visit us: hours heading", "button", "Operating hours"],
  ]),
  ...page("about", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "About the marketplace"],
    ["hero.title", "Top banner: headline", "heading", "Created for the *makers* who make Gilroy shine."],
    ["hero.body", "Top banner: text", "paragraph", "The Cannery Marketplace brings together the pleasure of shopping local with a dedicated place for makers to share the work they care about."],
    ["story.eyebrow", "Our purpose: small label", "eyebrow", "Our purpose"],
    ["story.title", "Our purpose: heading", "heading", "Retail with a *local heart.*"],
    ["story.body1", "Our purpose: first paragraph", "paragraph", "The Cannery Marketplace in Gilroy is a dedicated space where local makers and artisans can showcase and sell their handcrafted products. It is designed to foster community and creativity while making room for the joy of a good find."],
    ["story.body2", "Our purpose: second paragraph", "paragraph", "Makers can rent small or large shelves or spaces to display their crafts, creating a varied shopping experience that changes as new work arrives."],
    ["story.quote", "Our purpose: quote", "paragraph", "“A dedicated space where local makers and artisans can showcase and sell their handcrafted products.”"],
    ["gallery.eyebrow", "Photo gallery: small label", "eyebrow", "Inside the Cannery"],
    ["gallery.title", "Photo gallery: heading", "heading", "A look *around.*"],
    ["cta.eyebrow", "Bottom band: small label", "eyebrow", "Share your craft"],
    ["cta.title", "Bottom band: heading", "heading", "Have something made to be discovered?"],
    ["cta.button", "Bottom band: button", "button", "Explore vendor space"],
  ]),
  ...page("makers", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "The maker directory"],
    ["hero.title", "Top banner: headline", "heading", "Meet the people behind the *good stuff.*"],
    ["hero.body", "Top banner: text", "paragraph", "Explore the local makers and artisans who bring their work to The Cannery Marketplace. Each profile is a small window into the hands and ideas behind what you find here."],
    ["list.eyebrow", "Directory: small label", "eyebrow", "Browse the shelves"],
    ["list.title", "Directory: heading", "heading", "Find a maker"],
    ["list.search", "Directory: search box hint", "button", "Search makers"],
    ["empty.title", "No results: heading", "heading", "No makers found"],
    ["empty.body", "No results: text", "item", "Try a different name, category, or keyword."],
    ["card.link", "Maker card: link", "button", "View profile"],
  ]),
  ...page("profile", [
    ["story.eyebrow", "Maker story: small label", "eyebrow", "Meet the maker"],
    ["story.titleWithName", "Maker story: heading when the maker's name is known", "heading", "Meet *{maker}.*"],
    ["story.title", "Maker story: heading without a name", "heading", "The person behind the *work.*"],
    ["work.eyebrow", "Photos: small label", "eyebrow", "A closer look"],
    ["work.title", "Photos: heading", "heading", "Made by *{business}.*"],
    ["work.note", "Photos: note", "item", "Approved photos submitted by the maker."],
    ["back", "Back link", "button", "All makers"],
    ["bottom.eyebrow", "Bottom: small label", "eyebrow", "Keep exploring"],
    ["bottom.title", "Bottom: heading", "heading", "There is more to *find.*"],
    ["bottom.button", "Bottom: button", "button", "Browse all makers"],
  ]),
  ...page("become", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "For local makers and artisans"],
    ["hero.title", "Top banner: headline", "heading", "Make room for your *work.*"],
    ["hero.body", "Top banner: text", "paragraph", "You make the meaningful things. We make it easier for the Gilroy community to discover them."],
    ["hero.primary", "Top banner: main button", "button", "Start the application"],
    ["hero.portal", "Top banner: maker portal button", "button", "Manage your profile"],
    ["hero.how", "Top banner: how it works button", "button", "See how it works"],
    ["intro.eyebrow", "Introduction: small label", "eyebrow", "A welcoming first step"],
    ["intro.title", "Introduction: heading", "heading", "A simple path from *maker* to marketplace."],
    ["intro.body", "Introduction: text", "paragraph", "The Cannery Marketplace gives local makers and artisans a place to showcase and sell their handcrafted products in Gilroy. You do not need to have every detail figured out before you reach out."],
    ["panel.eyebrow", "Side card: small label", "eyebrow", "Ready when you are"],
    ["panel.title", "Side card: heading", "heading", "Start with the maker application."],
    ["panel.body", "Side card: text", "item", "Share the basics, tell us what you make, and the marketplace team will help you understand the next step."],
    ["panel.button", "Side card: button", "button", "Open the application"],
    ["panel.note", "Side card: small note", "item", "About five minutes. You stay on this site the whole time."],
    ["how.eyebrow", "How it works: small label", "eyebrow", "How it works"],
    ["how.title", "How it works: heading", "heading", "From first hello to *your shelf.*"],
    ["how.body", "How it works: text", "item", "We designed the process to be clear, human, and easy to start."],
    ["step1.title", "Step 1: heading", "heading", "Tell us about your work"],
    ["step1.body", "Step 1: text", "paragraph", "Complete the short application with your maker story, product category, social links, and the kind of display space you are looking for."],
    ["step2.title", "Step 2: heading", "heading", "We review and connect"],
    ["step2.body", "Step 2: text", "paragraph", "The marketplace team reviews your application and follows up with questions, availability, and next steps. There is no pressure to commit before you have the details."],
    ["step3.title", "Step 3: heading", "heading", "Choose your space"],
    ["step3.body", "Step 3: text", "paragraph", "If it feels like a fit, we will discuss shelf or display space options, timing, presentation, and the practical details of bringing your products in."],
    ["step4.title", "Step 4: heading", "heading", "Set up and be discovered"],
    ["step4.body", "Step 4: text", "paragraph", "Bring your finished products and display materials. We will help you understand the rhythm of the marketplace and how shoppers can find your work."],
    ["prep.eyebrow", "Before you apply: small label", "eyebrow", "Before you apply"],
    ["prep.title", "Before you apply: heading", "heading", "A few things to *bring to the conversation.*"],
    ["prep.body", "Before you apply: text", "paragraph", "You can apply before everything is perfect. These details simply help the team understand how to support your work."],
    ["prep.listTitle", "Checklist: heading", "item", "Helpful to have ready:"],
    ["prep.item1", "Checklist: item 1", "item", "Your maker or brand name"],
    ["prep.item2", "Checklist: item 2", "item", "What you make and your product category"],
    ["prep.item3", "Checklist: item 3", "item", "A few product or display photos"],
    ["prep.item4", "Checklist: item 4", "item", "Your Instagram, TikTok, or Facebook link"],
    ["prep.item5", "Checklist: item 5", "item", "Approximate quantity and display space needs"],
    ["faq.eyebrow", "Questions: small label", "eyebrow", "Questions before applying?"],
    ["faq.title", "Questions: heading", "heading", "Let’s make the first step *comfortable.*"],
    ["faq.q1", "Question 1", "item", "Do I need professional photos?"],
    ["faq.a1", "Answer 1", "paragraph", "No. Clear phone photos are a helpful starting point."],
    ["faq.q2", "Question 2", "item", "What if I do not know which space I need?"],
    ["faq.a2", "Answer 2", "paragraph", "That is part of the conversation. The team can help you think through what fits your products."],
    ["faq.q3", "Question 3", "item", "Can I ask questions first?"],
    ["faq.a3", "Answer 3", "paragraph", "Yes."],
    ["faq.contact", "Answer 3: contact link", "button", "Contact the marketplace"],
    ["cta.eyebrow", "Bottom band: small label", "eyebrow", "Made something meaningful?"],
    ["cta.title", "Bottom band: heading", "heading", "Let the community find it."],
    ["cta.button", "Bottom band: button", "button", "Become a vendor"],
  ]),
  ...page("apply", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "For makers and artisans"],
    ["hero.title", "Top banner: headline", "heading", "Tell us about your *work.*"],
    ["hero.body", "Top banner: text", "paragraph", "Thank you for your interest in The Cannery Marketplace. If you are interested in becoming a member of the marketplace, please fill out the application below."],
    ["intro.eyebrow", "Introduction: small label", "eyebrow", "A curated makers market"],
    ["intro.title", "Introduction: heading", "heading", "We look for the people who *make it.*"],
    ["intro.body", "Introduction: first paragraph", "paragraph", "Please note that this is an application. Completing it does not guarantee a space in The Cannery Marketplace. Our team reviews the information you provide and will contact you about your product if it appears to be a good fit for our store."],
    ["intro.curated", "Introduction: second paragraph", "paragraph", "We are a “curated” makers market. This means you (the artist, maker, etc.) are the one making and creating your products rather than just “selling” them. We look for:"],
    ["criteria1", "We look for: item 1", "item", "High quality goods designed or made in Gilroy or nearby"],
    ["criteria2", "We look for: item 2", "item", "Beautiful branding"],
    ["criteria3", "We look for: item 3", "item", "Retail ready price points and packaging"],
    ["criteria4", "We look for: item 4", "item", "Can meet replenishment demand"],
    ["criteria5", "We look for: item 5", "item", "Unique, sustainable, and eco conscious"],
    ["intro.closing", "Introduction: closing line", "item", "Log your interest in working with us using the application form."],
    ["form.title", "Form: heading", "heading", "The Cannery Marketplace Maker Application"],
  ]),
  ...page("contact", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "Contact The Cannery Marketplace"],
    ["hero.title", "Top banner: headline", "heading", "Looking for something *special?*"],
    ["hero.body", "Top banner: text", "paragraph", "Find local makers, plan a visit to our Gilroy marketplace, or send the team a question."],
    ["intro.eyebrow", "Introduction: small label", "eyebrow", "Visit us in Gilroy"],
    ["intro.title", "Introduction: heading", "heading", "We would love to *hear from you.*"],
    ["intro.body", "Introduction: text", "paragraph", "Reach us directly or use the form for general questions about the marketplace and its makers."],
    ["map.eyebrow", "Map: small label", "eyebrow", "Find the marketplace"],
    ["map.title", "Map: heading", "heading", "Visit us on *Monterey Road.*"],
    ["map.body", "Map: text", "item", "Stay on this site to see where The Cannery Marketplace is located in Gilroy."],
    ["map.button", "Map: directions button", "button", "Get Google Maps directions"],
  ]),
  ...page("gifts", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "Send something made nearby"],
    ["hero.title", "Top banner: headline", "heading", "Gifts with a *local story.*"],
    ["hero.body", "Top banner: text", "paragraph", "Our gift boxes bring together thoughtful goods from the makers at The Cannery Marketplace."],
    ["catalog.eyebrow", "Gift boxes: small label", "eyebrow", "Gift boxes"],
    ["catalog.title", "Gift boxes: heading", "heading", "A good reason to *send a box.*"],
    ["catalog.buy", "Gift box: buy button", "button", "Buy this box"],
    ["catalog.ask", "Gift box: button when checkout is not set up", "button", "Ask about this box"],
    ["checkout.title", "Checkout note: heading", "item", "Secure checkout"],
    ["checkout.body", "Checkout note: text", "paragraph", "Buying a box opens our payment provider’s secure checkout page. Card details never pass through this website."],
    ["business.eyebrow", "Business gifting: small label", "eyebrow", "For business gifting"],
    ["business.title", "Business gifting: heading", "heading", "Sending more than a few?"],
    ["business.body", "Business gifting: text", "paragraph", "Corporate, client, and event gifts need a personal conversation. Tell us what you are planning, or build a custom box, and we will follow up with pricing and invoicing."],
    ["business.button", "Business gifting: button", "button", "Request a quote"],
    ["business.item1", "Business gifting: point 1", "item", "Custom boxes built from our makers"],
    ["business.item2", "Business gifting: point 2", "item", "Your logo, ribbon, and card message"],
    ["business.item3", "Business gifting: point 3", "item", "Invoices for bulk orders"],
    ["off.title", "When gift boxes are turned off: heading", "heading", "Gift boxes are *restocking.*"],
    ["off.body", "When gift boxes are turned off: text", "paragraph", "The catalog is currently unavailable. Please explore the local maker directory while this feature is paused."],
  ]),
  ...page("corporate", [
    ["hero.eyebrow", "Top banner: small label", "eyebrow", "Corporate and custom gifting"],
    ["hero.title", "Top banner: headline", "heading", "A thoughtful gift, *at scale.*"],
    ["hero.body", "Top banner: text", "paragraph", "Tell us what you are planning and we will work with you on quantities, a custom box, branding, timing, and pricing."],
    ["intro.eyebrow", "Introduction: small label", "eyebrow", "Let’s plan it together"],
    ["intro.title", "Introduction: heading", "heading", "Made local. *Made personal.*"],
    ["intro.body", "Introduction: text", "paragraph", "This form is for corporate gifts, client thank yous, event orders, and custom boxes that need special pricing or an invoice. We will reply by email to discuss the details."],
    ["intro.listTitle", "Checklist: heading", "item", "Helpful to know:"],
    ["intro.item1", "Checklist: item 1", "item", "How many gifts and your budget per gift"],
    ["intro.item2", "Checklist: item 2", "item", "When you need them and how they should arrive"],
    ["intro.item3", "Checklist: item 3", "item", "Any logo, ribbon, or card message"],
    ["intro.item4", "Checklist: item 4", "item", "The kinds of goods or makers you would like included"],
    ["form.title", "Form: heading", "heading", "Request a quote"],
    ["form.body", "Form: text", "item", "We will use this information to start the conversation."],
    ["form.note", "Form: small print", "paragraph", "This form starts a conversation. It does not collect payment or create an order. Please do not include confidential employee or customer information."],
  ]),
];

export const SITE_TEXT_BY_KEY = new Map(SITE_TEXT.map((block) => [block.key, block]));
export const siteTextOriginal = (key: string) => SITE_TEXT_BY_KEY.get(key)?.original ?? "";

/** Problems with a piece of text, or null when it can be saved. */
export function siteTextProblem(key: string, text: string): string | null {
  const block = SITE_TEXT_BY_KEY.get(key);
  if (!block) return "That text is not on the site anymore.";
  const value = text.trim();
  if (!value) return "Text cannot be empty. Use Restore original to go back to the original wording.";
  if (value.length > block.maxChars) return `Keep this under ${block.maxChars} characters (now ${value.length}).`;
  if (/<\s*\/?\s*[a-z]/i.test(value)) return "Remove the < > tags. Use *stars* around words for gold italics.";
  return null;
}

export type TextPiece = { text: string; em: boolean; br?: boolean };

/** Splits text into plain and *accent* pieces with line breaks, after filling in {names}. */
export function parseSiteText(text: string, vars: Record<string, string> = {}): TextPiece[] {
  const filled = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name] : match));
  const pieces: TextPiece[] = [];
  filled.split(/(\*[^*\n]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const em = chunk.length > 2 && chunk.startsWith("*") && chunk.endsWith("*");
    const body = em ? chunk.slice(1, -1) : chunk;
    body.split("\n").forEach((line, index) => {
      if (index > 0) pieces.push({ text: "", em: false, br: true });
      if (line) pieces.push({ text: line, em });
    });
  });
  return pieces;
}

/** The same text without formatting marks, for attributes like placeholders. */
export function plainSiteText(text: string, vars: Record<string, string> = {}) {
  return parseSiteText(text, vars).map((piece) => (piece.br ? " " : piece.text)).join("");
}
