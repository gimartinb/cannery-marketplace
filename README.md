# The Cannery Marketplace

The website for [The Cannery Marketplace](https://cannerymarket.com), a curated makers market at 7488 Monterey Road in Gilroy, California. Shoppers discover local makers and their stories. Makers manage their own listings. The owners run everything from a private dashboard.

It runs entirely on Cloudflare's free plan, so hosting costs **$0 a month**, with built in limits that keep it that way.

> **Staging:** https://cannery-marketplace.thecannerymarketplace.workers.dev (hidden from search engines)
> **Production:** cannerymarket.com, after the DNS cutover described in [HOSTING-AND-ADMIN-PLAN.md](HOSTING-AND-ADMIN-PLAN.md)

## What the site does

**For shoppers**
* Home page with featured makers and scheduled "Find something with a story" highlights
* Maker directory with search, category filter, and 10, 25, or 50 makers per page
* A profile page for every maker: photos, story, owner, and social links
* About page with an "Inside the Cannery" photo gallery
* Contact form that keeps visitors on the site
* Vendor interest form at `/apply`, which replaces the old Google Form

**For makers** (`/maker-portal`)
* Sign in with a one time code sent by email, with no passwords
* Edit every listing tied to their email, or add a new one
* Frame each photo in its exact shape before uploading
* Free AI writing help: "Improve my writing" and "Write it for me"
* Every change is reviewed by the owners before it goes live (up to 72 hours)

**For the owners** (`/admin`)
* Applications: review vendor interest forms, then approve and invite in one click
* Review queue: approve, request changes, or reject maker submissions
* Published vendors: edit any listing, bulk assign login emails, show or hide, feature
* Maker access: who can sign in, and which listings each email can edit
* Site images, home highlights with start and end dates, photo gallery, gift boxes
* Spreadsheet import for many makers at once
* A "Free plan usage" card showing AI use, photo storage, and uploads

## How it is built

| Piece | Technology |
|---|---|
| Website | React, TypeScript, Vite, served as static files by Cloudflare |
| Server | One Cloudflare Worker (`worker/`) with tRPC endpoints |
| Database | Cloudflare D1 (SQLite) through Drizzle ORM |
| Photos | Cloudflare R2, served at `/media/<key>` and cached at Cloudflare's edge |
| Sign in | Cloudflare Access email codes, checked again by the Worker |
| AI writing help | Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8-fast`) |
| Email | FormSubmit for the contact form and new application alerts |
| Search | Page titles, descriptions, and structured data written into the HTML by the Worker; generated `sitemap.xml` and `robots.txt` |
| Deploys | GitOps through Cloudflare Workers Builds: every push to GitHub builds, migrates, and deploys |

## Repository layout

```
client/            React app (pages, components, styles)
  src/pages/       One file per page: Home, Vendors, VendorProfile, Apply, MakerPortal, SecureAdmin, ...
  src/components/  Shared pieces and the dashboard panels
  public/          Static files: default images, icons, import template
worker/            Cloudflare Worker
  index.ts         Routes requests (API, uploads, photos, pages, sitemap, nightly job)
  routers.ts       tRPC endpoints: public, maker (/api/vendor), owner (/api/admin)
  db.ts            Database queries
  access.ts        Cloudflare Access sign in checks
  media.ts         Photo uploads and delivery
  seo.ts           Search and sharing tags, sitemap, robots.txt
  aiWriting.ts     AI writing help
  usage.ts         Free tier guardrails and the nightly storage job
shared/            Rules used by both browser and server (validation, categories, image sizes)
drizzle/           Database schema and migrations (drizzle/d1)
tests/             Vitest tests
```

## Working on it locally

You need Node.js 20 or newer and pnpm.

```bash
pnpm install
cp .dev.vars.example .dev.vars   # signs you in locally as DEV_AUTH_EMAIL, localhost only
pnpm db:migrate:local            # creates the local database
pnpm build
pnpm dev:offline                 # http://localhost:8787, no Cloudflare login needed
```

`pnpm dev:offline` runs everything except the AI writing help. To include it, run `npx wrangler login` once and use `pnpm dev` instead (Workers AI only runs on Cloudflare's network).

Rebuild with `pnpm build` after changing files in `client/`, then restart the local server.

### Useful commands

| Command | What it does |
|---|---|
| `pnpm test` | Runs the tests |
| `pnpm check` | Type checks the website and the Worker |
| `pnpm build` | Builds the website into `dist/public` |
| `pnpm db:generate` | Creates a migration after you change `drizzle/schema.ts` |
| `pnpm db:migrate:local` | Applies migrations to the local database |

## Deploying

Push to the production branch on GitHub and Cloudflare does the rest: it builds the site, applies any new database migrations, and deploys the Worker. Other branches get a preview version without touching the database.

The deploy token in the Worker's build settings needs the "Edit Cloudflare Workers" permissions plus **Account, D1, Edit** and **Account, Workers AI, Edit**.

Settings that are safe to keep in code (Access team domain, audience tags, owner emails) live in `wrangler.jsonc`. There are no secrets in this repository.

## Staying on the free plan

| Service | Free allowance | What the site does |
|---|---|---|
| Workers AI | 10,000 neurons a day | Pauses makers at 70% and owners at 85%, plus a daily limit per person |
| R2 photo storage | 10 GB and 1 million uploads a month | Pauses uploads at 9 GB or 900,000 uploads; a nightly job removes photos nothing uses |
| Workers, D1, Zero Trust | Generous daily limits | Cannot charge on the Free plan |

A Cloudflare budget alert emails the owners if any usage based charge ever appears.

## More documentation

* **[HOSTING-AND-ADMIN-PLAN.md](HOSTING-AND-ADMIN-PLAN.md)** is the main, current document: architecture, one time setup, sign in, guardrails, the DNS cutover checklist, and a revision history of every change.
* `VENDOR-GUIDE.md`, `STAGE-1-REVIEW.md`, `STAGE-3-SETUP.md`, and `RESEARCH-SOURCES.md` are from earlier stages of the project and are kept for history. Where they disagree with the plan, the plan is correct.

## Contact

The Cannery Marketplace, 7488 Monterey Road, Gilroy, CA 95020 · (408) 337-1620 · thecannerymarketplace@gmail.com
