import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { checkAccess, isAdminEmail } from "./access";
import { createDb, getOrCreateVendorAccount, isInvitedMaker, type Database } from "./db";
import type { Env } from "./env";
import { describeIssues, type IssueLike } from "../shared/friendlyErrors";

export type TrpcContext = { env: Env; db: Database; request: Request };

export function createContext(env: Env, request: Request): TrpcContext {
  return { env, db: createDb(env.DB), request };
}

// isDev false: never send server stack traces to browsers (tRPC cannot detect production on Workers).
// Validation problems are rewritten as plain sentences ("Short description needs at least 20 characters.").
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  isDev: false,
  errorFormatter({ shape, error }) {
    const cause = error.cause as { issues?: IssueLike[] } | undefined;
    if (error.code === "BAD_REQUEST" && cause && Array.isArray(cause.issues)) return { ...shape, message: describeIssues(cause.issues) };
    // Our own friendly writing helper messages pass through; anything unexpected is replaced.
    if (error.code === "INTERNAL_SERVER_ERROR" && !(error.cause === undefined && error.message.startsWith("The writing helper"))) return { ...shape, message: "Something went wrong on our side. Please try again in a moment." };
    return shape;
  },
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

export const NOT_INVITED_MESSAGE = "This email has not been invited to the maker portal yet. Please ask The Cannery Marketplace to add it.";

/** A verified email on the maker guest list (or an owner). Their email becomes their vendor account. */
export const vendorProcedure = t.procedure.use(async ({ ctx, next }) => {
  const check = await checkAccess(ctx.request, ctx.env);
  const identity = check.identity;
  if (!identity) throw new TRPCError({ code: "UNAUTHORIZED", message: `Please sign in to the maker portal. (${check.reason}${check.detail ? `: ${check.detail}` : ""})` });
  if (!isAdminEmail(ctx.env, identity.email) && !(await isInvitedMaker(ctx.db, identity.email))) throw new TRPCError({ code: "FORBIDDEN", message: NOT_INVITED_MESSAGE });
  const account = await getOrCreateVendorAccount(ctx.db, identity.email);
  return next({ ctx: { ...ctx, email: identity.email, vendorAccount: account } });
});

/** Only emails on the ADMIN_EMAILS allow list. */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const check = await checkAccess(ctx.request, ctx.env);
  const identity = check.identity;
  if (!identity) throw new TRPCError({ code: "UNAUTHORIZED", message: `Please sign in as an administrator. (${check.reason}${check.detail ? `: ${check.detail}` : ""})` });
  if (!isAdminEmail(ctx.env, identity.email)) throw new TRPCError({ code: "FORBIDDEN", message: "This email is not on the approved owner list." });
  return next({ ctx: { ...ctx, email: identity.email } });
});
