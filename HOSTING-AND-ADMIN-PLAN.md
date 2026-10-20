# Hosting and owner panel plan

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 4.3 | 2026-10-19 | Gilbert Martin (with Claude) | AI writing helper restored ("Help me improve this" on the maker short description; Cloudflare Workers AI, free 10,000 neurons a day, about 800 suggestions; 15 per maker per day; table `ai_usage` recreated in migration 0008). The Workers Builds token now includes Account, Workers AI, Edit. |
| 4.2 | 2026-10-19 | Gilbert Martin (with Claude) | Vendor interest form moved onto the site at /apply (replaces the Google Form, same questions and choices). Every answer is required except the website, with at least one social link; US phone check; spam honeypot and a limit of 5 forms per connection per day. Submissions are saved in D1 (table `maker_applications`, migration 0007), shown in a new Applications tab (New, Invited, Declined, Archived), and emailed to the marketplace inbox through FormSubmit. "Approve and invite" adds the applicant to Maker access and opens a prefilled welcome email. Applicants see an on site confirmation; an automatic confirmation email to applicants is planned after cutover with Resend (free: 3,000 a month, 100 a day). Google Form tab removed from the dashboard. |
| 4.1 | 2026-10-19 | Gilbert Martin (with Claude) | AI description helper removed for now (table dropped in migration 0006). SEO: the Worker now writes each page's title, description, canonical link, social preview tags, and structured data (LocalBusiness, WebSite, maker ProfilePage, breadcrumbs) into the HTML; unknown pages and makers return a real 404; trailing slashes redirect; robots.txt and sitemap.xml are generated from the database; staging (workers.dev) is marked noindex so only cannerymarket.com is indexed. Added favicon, app icons, and web manifest. Mobile: owner dashboard fits phones, larger tap targets, 12 px minimum text and 16 px form fields on phones, darker gray text for contrast, no layout shift while pages load. Lighthouse (mobile, local): accessibility 100 on all tested pages, performance 93 to 97, layout shift 0. |
| 4.0 | 2026-10-19 | Gilbert Martin (with Claude) | Photos: every maker photo frame on the site is now 4:3 (work photos square), and after choosing a photo people frame it in that exact shape with drag and zoom, with "show the whole image" for logos. Minimums lowered to 800 x 600 (cover) and 800 x 800 (work). Listings gain a required owner name (shown as "Meet" and the name; optional owner_name import column); the maker portal shows the login email read only. Makers can choose Other and type their own category, which the owner keeps or switches when approving. "Help me improve this" on the short description uses Cloudflare Workers AI (free 10,000 neurons a day, about 800 suggestions; 15 per maker per day; table `ai_usage`, migration 0005). |
| 3.9 | 2026-10-19 | Gilbert Martin (with Claude) | Bulk update in Published vendors: tick several listings (or select all matching a search) and assign one login email, remove the login email, show or hide, or feature or unfeature them in one step. Moving a listing away from another email asks for confirmation first. |
| 3.8 | 2026-10-19 | Gilbert Martin (with Claude) | Listings tied to maker login emails (`vendor_profiles.loginEmail`, migration 0004): owners connect listings in Maker access, in the listing editor, or with the optional `login_email` import column, and one email can own several listings. Owners can edit any listing directly. Maker portal lists every listing for the signed in email, uses a category list, requires every field except the website plus at least one social link, and states the 72 hour review time. Review queue adds "Email the maker". Home highlights can promote a maker or be custom, with start and end dates (the 3 newest live cards show). Every image upload shows its required pixel size first (300 DPI nice to have) and rejects smaller images. Confirmation and error pop ups across the dashboard and portal, with links to see the result. |
| 3.7 | 2026-10-19 | Gilbert Martin (with Claude) | One button system across the site: gold for main actions, dark green for other actions, red for remove or delete, all with white text; outlined white buttons over photos unchanged. Fixes unreadable upload buttons in the dashboard. |
| 3.6 | 2026-10-19 | Gilbert Martin (with Claude) | Owner managed Home highlights (up to 3 cards with optional photo and maker link) and an About page "Inside the Cannery" gallery (up to 12 photos with captions and ordering). Tables `product_highlights` and `gallery_photos` (migration 0003). The 6 sample makers are provided as an import spreadsheet for the test site only. |
| 3.5 | 2026-10-19 | Gilbert Martin (with Claude) | Maker login button added to the header. Contact form validates full name, email, and an optional US phone number (area code and 7 digit number), and sends through FormSubmit's AJAX endpoint with a pop up confirmation instead of leaving the site. |
| 3.4 | 2026-10-18 | Gilbert Martin (with Claude) | Maker portal guest list: owners invite makers by email from the new Maker access tab (table `maker_invites`, migration 0002), so no Cloudflare dashboard work is needed per maker. The Makers Access app allows everyone to request a code; the Worker only lets invited emails (and owners) in. |
| 3.3 | 2026-10-18 | Gilbert Martin (with Claude) | Makers page loads 10, 25, or 50 makers at a time with a Show more button; mock preview profiles removed from public pages. Images cached at Cloudflare's edge. Sign in failures now report a reason (not_configured, missing_token, invalid_token). Staging Access moves to path based apps (/admin, /maker-portal, and their APIs) instead of the whole site. |
| 3.2 | 2026-10-18 | Gilbert Martin (with Claude) | Owners can now replace the logo and site photos from the dashboard (Site images tab). Replacements are stored in R2 and listed in the new `site_images` table; built-in defaults ship in `client/public/images` and "Reset to original" restores them. Cloudflare Access turned on for staging (team `cannery`). |
| 3.1 | 2026-10-18 | Gilbert Martin (with Claude) | Staging setup progress: D1 database and private R2 bucket created (R2 is not created automatically; added as setup step 2b), Workers Builds connected to GitHub (production branch `cloudflare` until the PR merges), deploy token `cannery-marketplace-builds` created with D1 edit. Email verification on the Cloudflare account is still pending, which blocks member invites and Zero Trust. |
| 3.0 | 2026-10-18 | Gilbert Martin (with Claude) | Moved the app to Cloudflare Workers, D1, and R2. Sign in for owners and vendors now uses Cloudflare Access email codes, with no passwords. Added GitOps deploys through Workers Builds and the DNS cutover plan. Replaces the Pages and Decap CMS plan in 2.0. |
| 2.1 | 2026-10-18 | Gilbert Martin | Added Google sign in for the owner panel (PR #1). Superseded by 3.0 before it was configured. |
| 2.0 | Earlier | Original build | Cloudflare Pages and Decap CMS proposal, browser only admin preview. |

## Current architecture (3.0)

| Piece | Before | Now |
|---|---|---|
| Server | Express on a Node host | Cloudflare Worker (`worker/`) |
| Database | MySQL | Cloudflare D1 (`drizzle/schema.ts`, migrations in `drizzle/d1`) |
| Images | S3 through the Manus storage proxy | Cloudflare R2, served at `/media/<key>` (old `/manus-storage/<key>` links still work). Site photos: built-in defaults in `client/public/images`, owner replacements in R2 under `site/` |
| Owner sign in | Username and password | Cloudflare Access email code, limited to `ADMIN_EMAILS` |
| Vendor sign in | Email and password | Cloudflare Access email code, limited to emails the owners invite in the Maker access tab. Vendor accounts are created automatically on first sign in. |
| Deploys | Manual | GitOps: every push to GitHub builds and deploys through Workers Builds |

### How sign in works

Cloudflare Access sits in front of the private paths and sends the visitor a one time code by email. Only after that does the request reach the Worker, which verifies the signed Access token again as a second lock.

| Path | Who gets in |
|---|---|
| `/admin`, `/api/admin/*` | Only the emails in `ADMIN_EMAILS` |
| `/maker-portal`, `/api/vendor/*` | Emails on the Maker access list. Each sees the listings tied to their email. |
| Everything else | Public |

The Zero Trust free plan covers up to 50 people, which fits the owners plus roughly 48 vendors. Unused seats can be removed in the Zero Trust dashboard.

If the Access settings are blank or wrong, the Worker denies every owner and vendor request. That is the safe default.

### Cost

$0 a month on the free plans at this site's traffic. Workers AI (the maker description helper) is free up to 10,000 neurons a day; past that, requests fail until the next day and nothing is billed on the Free plan.  The only realistic upgrade is the $5 a month Workers Paid plan, if traffic ever outgrows the free tier.

## One time setup (staging)

Staging runs at the free `cannery-marketplace.<account>.workers.dev` address. The real domain does not change until the cutover below.

1. **Account access.** In the Cloudflare account owned by thecannerymarketplace@gmail.com, add gilbert.martin@gmail.com under Manage Account, then Members, as Super Administrator.
2. **Create the database.** Storage and Databases, then D1, then Create database. Name it `cannery-marketplace`. Copy its Database ID into `database_id` in `wrangler.jsonc` and commit.
2b. **Create the image bucket.** Storage and Databases, then R2 Object Storage. Enable R2 if asked (free tier, a card may be required). Create a bucket named exactly `cannery-marketplace-media`, location Automatic, storage class Standard. Leave public access off.
3. **Deploy token with database and AI access.** The token Workers Builds creates by default cannot run D1 migrations or deploy the AI binding. Create an API token from the "Edit Cloudflare Workers" template and add the permissions Account, D1, Edit and Account, Workers AI, Edit. Select that token in the Worker's build settings. Whoever creates the token pastes it directly into Cloudflare, never into chat or code.
4. **Connect GitHub (GitOps).** Workers and Pages, then Create, then Import a repository, then `gimartinb/cannery-marketplace`.
   * Production branch: `main`
   * Build command: `pnpm run build`
   * Deploy command: `pnpm run deploy` (applies D1 migrations, then deploys)
   * Non production branch deploy command: `pnpm run deploy:preview` (preview URL, no migrations)
   * Root directory: `/`
5. **Zero Trust.** Open Zero Trust, choose the free plan, and pick a team name. Under Settings, then Authentication, enable One time PIN.
6. **Lock the private pages on staging.** In Zero Trust, under Access controls, then Applications, add two self hosted applications on the `workers.dev` hostname: Owners (paths `admin` and `api/admin`, policy allowing only the `ADMIN_EMAILS`) and Makers (paths `maker-portal` and `api/vendor`, policy Allow, Include Everyone; the site's own guest list, managed in the Maker access tab, decides who actually gets in). Under Zero Trust Settings, turn on removing inactive users from seats so the 50 free seats are recycled. Copy both AUD tags. Leave Worker level Access off so public pages stay open.
7. **Tell the Worker about Access.** In `wrangler.jsonc`, set `ACCESS_TEAM_DOMAIN` to `https://<team>.cloudflareaccess.com` and `ACCESS_AUD` to the AUD tags, comma separated. Commit, and the push redeploys.

## Who can edit which listing

Every listing has one login email. The maker who signs in with that email sees and edits that listing in the maker portal; one email can have several listings. Owners set it in any of three places:

* Maker access tab: add the email, and pick the listing in "Connect to a listing", or use "Connect a listing" on an existing email.
* Published vendors tab: Edit, then Login email. To assign several at once, tick the listings, type the email in the bulk bar, and click Assign email.
* Vendor import spreadsheet: the optional `login_email` column.

Setting a login email also adds it to Maker access. Maker changes go to the Review queue, where owners approve, request changes, or reject, and can open a prefilled email to the maker. Approval can take up to 72 hours, which the portal tells makers.

## Moving existing data

Export the vendor profiles, submissions, and settings from the current database, and the uploaded images from the current storage. Then load them into D1 and R2. Image paths saved as `/manus-storage/...` keep working without edits, because the Worker serves that path from R2 too.

## Cutover to cannerymarket.com (last step)

Do this only after staging has been tested end to end.

1. Add `cannerymarket.com` to Cloudflare on the Free plan. Compare the DNS records it imports against GoDaddy's, especially any email records.
2. In GoDaddy, replace the nameservers with the two Cloudflare provides. The domain stays registered and billed at GoDaddy.
3. On the Worker, add `cannerymarket.com` (and `www`) as a Custom Domain.
4. In Zero Trust, create two Access applications on the real domain:
   * Owners: paths `/admin` and `/api/admin`, policy allowing only the `ADMIN_EMAILS`.
   * Vendors: paths `/maker-portal` and `/api/vendor`, policy allowing everyone with email verification.
5. Add both AUD tags to `ACCESS_AUD` (comma separated, alongside the staging tag), commit, and let it redeploy.
6. Test owner and vendor sign in on the real domain, then retire the old host.
7. Vendor interest form: point any store QR codes at https://cannerymarket.com/apply, then in the old Google Form turn off "Accepting responses" with a message linking to the new form. Optional: create a free Resend account, add its DNS records in Cloudflare, and turn on the applicant confirmation email.
8. Search: in Google Search Console (free), add the domain property cannerymarket.com, verify it with the DNS record it gives you (add it in Cloudflare DNS), and submit https://cannerymarket.com/sitemap.xml. Do the same in Bing Webmaster Tools (it can import from Google). Claim or update the Google Business Profile for 7488 Monterey Road and set its website to https://cannerymarket.com.

## Local development

```
cp .dev.vars.example .dev.vars
pnpm install
pnpm db:migrate:local
pnpm dev
```

`.dev.vars` signs you in as `DEV_AUTH_EMAIL` on `localhost` only, so the portals work without Cloudflare Access. It is ignored by Git and has no effect on any deployed site.

## Viva Café mock vendor

The preview includes **VIVRA CAFÉ** as a mock vendor in the Coffee & Bakery category. The public profile was used only for descriptive positioning and attribution: Mexican coffee, matcha, pastries, "Café para vivir," marranitos, and community pop ups. Its public Instagram link is https://www.instagram.com/vivracafe/.

No third party café image was copied into the preview because image search results were for similarly named businesses rather than clearly verified Viva Café assets. The panel therefore shows an attributed branded placeholder and supports uploading an authorized image from the owner.

## Sources

* https://developers.cloudflare.com/workers/platform/pricing/
* https://developers.cloudflare.com/d1/platform/pricing/
* https://developers.cloudflare.com/r2/pricing/
* https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
* https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
