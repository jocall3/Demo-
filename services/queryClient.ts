/**
 * @file services/queryClient.ts
 * @description Configures and exports a singleton instance of the TanStack Query client.
 *
 * ARCHITECTURAL REFACTOR:
 * As per the directive to separate server and client state, this file establishes the central
 * configuration for TanStack Query (React Query). This client will be used by the `QueryClientProvider`
 * at the root of the application to manage all server state, including data fetching, caching,
 * and synchronization.
 *
 * The default options are configured to provide a sensible caching strategy out-of-the-box,
 * reducing redundant network requests and improving application performance and user experience.
 * This moves data fetching logic out of components and contexts into dedicated, reusable hooks.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * A singleton instance of the TanStack Query client.
 * This client is configured with default options for all queries and mutations
 * to ensure consistent behavior across the application.
 *
 * @property {object} defaultOptions - Default settings for queries and mutations.
 * @property {object} defaultOptions.queries - Default settings for all `useQuery` hooks.
 * @property {number} defaultOptions.queries.staleTime - The time in milliseconds after which a query is considered stale. Data will be served from the cache until this time is met, preventing refetches on component mount. Set to 5 minutes.
 * @property {number} defaultOptions.queries.gcTime - The time in milliseconds that inactive query data is kept in memory before being garbage collected. Renamed from `cacheTime` in v5. Set to 15 minutes.
 * @property {boolean} defaultOptions.queries.refetchOnWindowFocus - Automatically refetch queries when the window regains focus to ensure data freshness.
 * @property {number} defaultOptions.queries.retry - The number of times to retry a failed query before showing an error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes, reducing unnecessary network requests.
      staleTime: 1000 * 60 * 5,

      // Inactive queries and their data are garbage-collected after 15 minutes in the cache.
      gcTime: 1000 * 60 * 15,

      // Refetch data when the user focuses the window, ensuring data is up-to-date.
      refetchOnWindowFocus: true,

      // Retry failed requests up to 2 times with exponential backoff before marking the query as errored.
      retry: 2,
    },
  },
});
  // Optionally, a mutation cache can be configured for global mutation event handling.
  // mutationCache: new MutationCache({
  //   onError: (error) => {
  //     // Global error handling for mutations, e.g., logging to a service or showing a toast.
  //     console.error("A global mutation error occurred:", error);
  //   },
  // }),
});
