# Hosting and owner panel plan

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 3.1 | 2026-10-18 | Gilbert Martin (with Claude) | Staging setup progress: D1 database and private R2 bucket created (R2 is not created automatically; added as setup step 2b), Workers Builds connected to GitHub (production branch `cloudflare` until the PR merges), deploy token `cannery-marketplace-builds` created with D1 edit. Email verification on the Cloudflare account is still pending, which blocks member invites and Zero Trust. |
| 3.0 | 2026-10-18 | Gilbert Martin (with Claude) | Moved the app to Cloudflare Workers, D1, and R2. Sign in for owners and vendors now uses Cloudflare Access email codes, with no passwords. Added GitOps deploys through Workers Builds and the DNS cutover plan. Replaces the Pages and Decap CMS plan in 2.0. |
| 2.1 | 2026-10-18 | Gilbert Martin | Added Google sign in for the owner panel (PR #1). Superseded by 3.0 before it was configured. |
| 2.0 | Earlier | Original build | Cloudflare Pages and Decap CMS proposal, browser only admin preview. |

## Current architecture (3.0)

| Piece | Before | Now |
|---|---|---|
| Server | Express on a Node host | Cloudflare Worker (`worker/`) |
| Database | MySQL | Cloudflare D1 (`drizzle/schema.ts`, migrations in `drizzle/d1`) |
| Images | S3 through the Manus storage proxy | Cloudflare R2, served at `/media/<key>` (old `/manus-storage/<key>` links still work) |
| Owner sign in | Username and password | Cloudflare Access email code, limited to `ADMIN_EMAILS` |
| Vendor sign in | Email and password | Cloudflare Access email code. Vendor accounts are created automatically from the verified email. |
| Deploys | Manual | GitOps: every push to GitHub builds and deploys through Workers Builds |

### How sign in works

Cloudflare Access sits in front of the private paths and sends the visitor a one time code by email. Only after that does the request reach the Worker, which verifies the signed Access token again as a second lock.

| Path | Who gets in |
|---|---|
| `/admin`, `/api/admin/*` | Only the emails in `ADMIN_EMAILS` |
| `/maker-portal`, `/api/vendor/*` | Any verified email (each becomes a vendor account) |
| Everything else | Public |

The Zero Trust free plan covers up to 50 people, which fits the owners plus roughly 48 vendors. Unused seats can be removed in the Zero Trust dashboard.

If the Access settings are blank or wrong, the Worker denies every owner and vendor request. That is the safe default.

### Cost

$0 a month on the free plans at this site's traffic. The only realistic upgrade is the $5 a month Workers Paid plan, if traffic ever outgrows the free tier.

## One time setup (staging)

Staging runs at the free `cannery-marketplace.<account>.workers.dev` address. The real domain does not change until the cutover below.

1. **Account access.** In the Cloudflare account owned by thecannerymarketplace@gmail.com, add gilbert.martin@gmail.com under Manage Account, then Members, as Super Administrator.
2. **Create the database.** Storage and Databases, then D1, then Create database. Name it `cannery-marketplace`. Copy its Database ID into `database_id` in `wrangler.jsonc` and commit.
2b. **Create the image bucket.** Storage and Databases, then R2 Object Storage. Enable R2 if asked (free tier, a card may be required). Create a bucket named exactly `cannery-marketplace-media`, location Automatic, storage class Standard. Leave public access off.
3. **Deploy token with database access.** The token Workers Builds creates by default cannot run D1 migrations. Create an API token from the "Edit Cloudflare Workers" template and add the permission Account, D1, Edit. Select that token in the Worker's build settings. Whoever creates the token pastes it directly into Cloudflare, never into chat or code.
4. **Connect GitHub (GitOps).** Workers and Pages, then Create, then Import a repository, then `gimartinb/cannery-marketplace`.
   * Production branch: `main`
   * Build command: `pnpm run build`
   * Deploy command: `pnpm run deploy` (applies D1 migrations, then deploys)
   * Non production branch deploy command: `pnpm run deploy:preview` (preview URL, no migrations)
   * Root directory: `/`
5. **Zero Trust.** Open Zero Trust, choose the free plan, and pick a team name. Under Settings, then Authentication, enable One time PIN.
6. **Lock staging.** On the Worker, under Settings, then Domains and Routes, enable Cloudflare Access for the `workers.dev` address. Limit the policy to the people testing staging. Copy the application's AUD tag.
7. **Tell the Worker about Access.** In `wrangler.jsonc`, set `ACCESS_TEAM_DOMAIN` to `https://<team>.cloudflareaccess.com` and `ACCESS_AUD` to the AUD tag. Commit, and the push redeploys.

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
