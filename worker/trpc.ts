import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { checkAccess, isAdminEmail } from "./access";
import { createDb, getOrCreateVendorAccount, type Database } from "./db";
import type { Env } from "./env";

export type TrpcContext = { env: Env; db: Database; request: Request };

export function createContext(env: Env, request: Request): TrpcContext {
  return { env, db: createDb(env.DB), request };
}

// isDev false: never send server stack traces to browsers (tRPC cannot detect production on Workers).
const t = initTRPC.context<TrpcContext>().create({ transformer: superjson, isDev: false });

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

/** Any person Cloudflare Access verified. Their email becomes their vendor account. */
export const vendorProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { identity, reason } = await checkAccess(ctx.request, ctx.env);
  if (!identity) throw new TRPCError({ code: "UNAUTHORIZED", message: `Please sign in to the maker portal. (${reason})` });
  const account = await getOrCreateVendorAccount(ctx.db, identity.email);
  return next({ ctx: { ...ctx, email: identity.email, vendorAccount: account } });
});

/** Only emails on the ADMIN_EMAILS allow list. */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { identity, reason } = await checkAccess(ctx.request, ctx.env);
  if (!identity) throw new TRPCError({ code: "UNAUTHORIZED", message: `Please sign in as an administrator. (${reason})` });
  if (!isAdminEmail(ctx.env, identity.email)) throw new TRPCError({ code: "FORBIDDEN", message: "This email is not on the approved owner list." });
  return next({ ctx: { ...ctx, email: identity.email } });
});
