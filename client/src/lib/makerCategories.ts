import { MAKER_CATEGORIES } from "@shared/makerListing";
import { trpc } from "@/lib/trpc";

/** The category list makers pick from, as the owners manage it, with "Other" last. */
export function useMakerCategories(): string[] {
  const { data } = trpc.directory.makerCategories.useQuery(undefined, { staleTime: 5 * 60_000 });
  return [...(data ?? MAKER_CATEGORIES.filter((name) => name !== "Other")), "Other"];
}
