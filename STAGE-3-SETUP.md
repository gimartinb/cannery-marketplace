# Stage 3 setup and launch decisions

## What is ready in the preview

The site now includes a sample gift-box catalog at `/gifts` and a corporate/bulk **Request a Quote** page at `/request-a-quote`. The quote form delivers inquiries to `thecannerymarketplace@gmail.com` through the same hosted form service used by the general contact page. It does not take payment or create an order.

The sample catalog uses placeholder product names, prices, and artwork so the owner can review the experience before real products are entered.

## Recommended payment method

I recommend **Stripe Checkout or Stripe Payment Links**. Stripe hosts the payment page, which keeps card data out of custom website code. The owner can manage products, prices, shipping rates, and payment records in Stripe’s dashboard. This is the simplest fit for a small catalog that may grow over time.

## Required decisions before live checkout

The following decisions must be made by the marketplace owner:

1. **Stripe account ownership.** Open or designate the business Stripe account that should receive funds. The account owner should complete Stripe’s identity and business verification directly with Stripe.
2. **Live product catalog.** Replace the three sample boxes with approved product names, prices, descriptions, photos, and inventory/availability rules.
3. **Shipping policy.** Decide where gift boxes can ship, which shipping methods are offered, and whether rates are flat-rate, free above a threshold, or calculated another way.
4. **Sales tax.** Decide where the business must collect sales tax and whether Stripe Tax or another tax workflow will be used. This is a business and tax-compliance decision, not something the website should guess.
5. **Returns and fulfillment.** Provide the customer-facing return, cancellation, fulfillment, and damaged-package policies.
6. **Notifications.** Confirm which email address should receive new orders, quote requests, and fulfillment alerts.

## PCI and card-data handling

With Stripe-hosted Checkout or Payment Links, payment-card entry happens on Stripe’s hosted page rather than in this site’s custom code. That reduces the site’s card-data exposure, but the business still needs to follow Stripe’s onboarding requirements and keep its account, policies, and operational handling compliant. The owner should confirm the final setup with Stripe and their tax or legal adviser where appropriate.

## What I will do after the account decision

Once the Stripe account, products, shipping rules, tax approach, and policies are approved, the implementation can connect each catalog item to a Stripe-hosted checkout URL. I will not request, store, or display secret API keys in the browser. A live payment test should be performed in Stripe’s test mode before any public launch.
