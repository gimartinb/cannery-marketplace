# Hosting and owner-panel plan

## Recommended production hosting

The economical target is **Cloudflare Pages + Workers**. Cloudflare Pages can host the React frontend from Git, automatically rebuild after a content commit, provide deployment previews and rollbacks, and support a custom domain with HTTPS. Pages Functions run on Cloudflare Workers and can hold server-only Stripe, Airtable, and email secrets.

Cloudflare’s current Workers pricing documentation says the Free plan includes 100,000 requests per day and 10 ms CPU per invocation. The Workers Paid plan starts at $5 per month and includes higher usage allowances. Pages Functions are billed as Workers. Separate costs may apply for the domain, Airtable, Stripe processing, and transactional email.

Sources:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/workers/configuration/secrets/

## Why not make the current preview production yet?

The current WebDev preview is useful for review, but it is not yet the requested Git-backed CMS deployment. The new `/admin` screen is a **browser-local mockup**: it demonstrates the owner experience without creating accounts, changing DNS, committing to GitHub, or redeploying a public site.

The production Cloudflare/Decap phase still needs:

1. A business-owned GitHub repository.
2. Decap CMS configuration and a protected `/admin` login flow.
3. A content collection for vendors with name, category, bio, photo, social link, active/inactive, and featured fields.
4. An image storage/upload strategy compatible with the selected Git provider.
5. Cloudflare Pages connected to the repository with automatic builds.
6. Server-side functions for protected operations and any Airtable/Stripe integrations.
7. Independent backups for vendor content and operational data.

## Preview admin panel

Open `/admin` from the preview site. The preview demonstrates:

- Overview counts for vendors, gift boxes, and editable site sections.
- Vendor records with active/inactive status.
- New vendor form.
- Category dropdown.
- Bio, social link, and display-name fields.
- Browser-local image upload preview.
- Active and featured toggles.
- Mark inactive action.
- Editable home/about copy.
- Gift-box content review with Stripe source-of-truth guidance.
- A reset-demo control.

Changes are stored only in that browser’s local storage. The production version will replace those local saves with a Git commit and Cloudflare Pages rebuild.

## Viva Café mock vendor

The preview includes **VIVRA CAFÉ** as a mock vendor in the Coffee & Bakery category. The public profile was used only for descriptive positioning and attribution: Mexican coffee, matcha, pastries, “Café para vivir,” marranitos, and community pop-ups. Its public Instagram link is https://www.instagram.com/vivracafe/.

No third-party café image was copied into the preview because image-search results were for similarly named businesses rather than clearly verified Viva Café assets. The panel therefore shows an attributed branded placeholder and supports uploading an authorized image from the owner.
