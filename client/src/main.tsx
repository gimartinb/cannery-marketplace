import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, type TRPCLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import type { AppRouter } from "../../worker/routers";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

// Each group of procedures has its own endpoint. Cloudflare Access guards the
// /api/admin and /api/vendor paths, so admin and vendor calls never share a URL
// with the public site.
function batchLink(url: string): TRPCLink<AppRouter> {
  return httpBatchLink({
    url,
    transformer: superjson,
    fetch(input, init) {
      return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
    },
  });
}

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.path.startsWith("adminPortal."),
      true: batchLink("/api/admin/trpc"),
      false: splitLink({
        condition: (op) => op.path.startsWith("vendorPortal."),
        true: batchLink("/api/vendor/trpc"),
        false: batchLink("/api/trpc"),
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
