"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate: data is considered fresh for 30s.
        // After that, a background refetch fires on the next mount/focus.
        staleTime: 30 * 1000,
        // Keep unused query data in cache for 5 minutes before GC.
        gcTime: 5 * 60 * 1000,
        // Retry once on failure (covers transient network blips).
        retry: 1,
        // Refetch when the browser tab regains focus — keeps list pages
        // current after the user switches tabs.
        refetchOnWindowFocus: true,
      },
    },
  });
}

// Browser singleton: create once, reuse on HMR / StrictMode double-mounts.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always fresh to avoid cross-request state sharing.
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
