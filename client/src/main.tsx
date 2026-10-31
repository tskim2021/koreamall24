import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { initSentry } from "@/lib/sentry";
import "./index.css";

// Initialize Sentry
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global cache settings: reduce API request frequency
      staleTime: 1000 * 60 * 5,  // 5 minutes - data stays fresh, no refetch on re-mount
      gcTime: 1000 * 60 * 10,     // 10 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch just because user switches tabs
      refetchOnMount: false,       // Don't refetch if data is still fresh
      // Retry on transient errors (server restart/HMR, network blip, sandbox URL change)
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        if (error instanceof Error) {
          // Never retry on rate limit errors (429 Too many requests from proxy)
          if (error.message.includes("Too many r")) return false;
          // Retry on network errors (Failed to fetch, sandbox URL change)
          if (error.message.includes("Failed to fetch")) return true;
          // Retry on HTML response during server restart (Service Unavailable, 503, etc.)
          if (error.message.includes("Unexpected token")) return true;
          // Retry on Service Unavailable
          if (error.message.includes("Service Unavailable")) return true;
        }
        return false;
      },
      retryDelay: (attemptIndex: number) => Math.min(1500 * 2 ** attemptIndex, 8000),
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  
  // 결제 진행 중이면 리다이렉트 차단
  if ((window as any).__PAYMENT_IN_PROGRESS__) {
    return;
  }

  // Use setTimeout(0) to defer redirect after React finishes current render cycle.
  // Without this, simultaneous wouter navigation + window.location.href causes
  // "NotFoundError: removeChild" because React tries to unmount nodes that are
  // already removed by the forced full-page reload.
  setTimeout(() => {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== "/login" && !(window as any).__PAYMENT_IN_PROGRESS__) {
      window.location.href = getLoginUrl(currentPath);
    }
  }, 0);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    // Suppress noisy rate-limit errors in console (dev proxy limitation, not a real error)
    if (error instanceof Error && error.message.includes("Too many r")) return;
    // Suppress transient Service Unavailable / JSON parse errors (server cold start)
    if (error instanceof Error && (
      error.message.includes("Service Unavailable") ||
      (error.message.includes("Unexpected token") && error.message.includes("Service"))
    )) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (error instanceof Error && error.message.includes("Too many r")) return;
    if (error instanceof Error && (
      error.message.includes("Service Unavailable") ||
      (error.message.includes("Unexpected token") && error.message.includes("Service"))
    )) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
