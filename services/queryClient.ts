import { QueryClient } from '@tanstack/react-query';

/**
 * Creates and configures a single instance of QueryClient to be used throughout the application.
 * This ensures a consistent caching and data fetching behavior for React Query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * staleTime: The time in milliseconds after data is considered stale.
       * For financial data, a shorter staleTime ensures data is refreshed more frequently.
       * We'll set it to 1 minute. After this time, new mounts or interactions will trigger a refetch.
       */
      staleTime: 1000 * 60 * 1, // 1 minute

      /**
       * gcTime: (Garbage Collection Time) The duration in milliseconds that unused/inactive
       * data remains in memory. When a query's data is no longer being used, it will be
       * garbage collected after this time. The default is 5 minutes. A longer time can be
       * useful for data that might be revisited.
       */
      gcTime: 1000 * 60 * 10, // 10 minutes

      /**
       * retry: The number of times a failed query will be retried before displaying an error.
       * Setting it to 1 provides a balance between handling transient network errors and
       * failing quickly for persistent issues.
       */
      retry: 1,

      /**
       * refetchOnWindowFocus: Automatically refetch data when the user focuses the window.
       * This is a great default for keeping financial data fresh.
       */
      refetchOnWindowFocus: true,

      /**
       * refetchOnReconnect: Automatically refetch data when the user reconnects to the network.
       */
      refetchOnReconnect: true,
    },
    mutations: {
      // We can define default mutation options here if needed in the future.
      // For example, a default onError handler for logging.
    },
  },
});
