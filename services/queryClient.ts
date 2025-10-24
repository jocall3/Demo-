import { QueryClient } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';

/**
 * The URL of the federated GraphQL Gateway.
 * In a production environment, this should be sourced from environment variables
 * to allow for different configurations between development, staging, and production.
 */
const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql';

/**
 * Creates a singleton instance of the GraphQLClient from `graphql-request`.
 * This client will be used by React Query's default query function to
 * make all GraphQL requests to the Supergraph.
 *
 * In a real-world application, this would also be configured to handle
 * authentication by dynamically adding an 'Authorization' header with a JWT.
 */
export const gqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  // Example of how to add authentication headers:
  // headers: () => {
  //   // Assume a function `getAuthToken()` exists to retrieve the token from storage
  //   const token = getAuthToken();
  //   return {
  //     authorization: token ? `Bearer ${token}` : '',
  //   };
  // },
});

/**
 * A default query function for React Query, designed to work with `graphql-request`.
 * It establishes a convention for how GraphQL queries are structured within React Query's `queryKey`.
 *
 * The convention is: `useQuery({ queryKey: [queryDocument, variables] })`
 * - `queryDocument` (required): The GraphQL query or mutation as a string. Often created with a `gql` tag.
 * - `variables` (optional): An object containing the variables for the GraphQL operation.
 *
 * @param {object} context - The context object provided by React Query, containing the queryKey.
 * @returns A promise that resolves with the fetched data from the GraphQL endpoint.
 */
const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const [queryDocument, variables] = queryKey as [string, Record<string, any> | undefined];

  // This check ensures that the query key follows the established convention.
  if (typeof queryDocument !== 'string') {
    throw new Error(
      'The first element of the queryKey must be a GraphQL document string when using the default query function.'
    );
  }

  return gqlClient.request(queryDocument, variables);
};

/**
 * Creates and configures a single instance of QueryClient to be used throughout the application.
 * This instance is now configured with a default query function optimized for GraphQL,
 * streamlining data fetching across the entire app. The other default options are preserved
 * for robust caching and refetching behavior.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Set our new GraphQL-based function as the default for all `useQuery` calls.
      queryFn: defaultQueryFn,

      // --- Caching & Refetching Strategy ---
      staleTime: 1000 * 60 * 1, // Data is considered fresh for 1 minute.
      gcTime: 1000 * 60 * 10,  // Inactive queries are garbage collected after 10 minutes.
      retry: 1,                 // Retry failed requests once.
      refetchOnWindowFocus: true, // Refetch data when the user returns to the app.
      refetchOnReconnect: true,  // Refetch data on network reconnection.
    },
    mutations: {
      // For mutations, we will typically call gqlClient.request directly inside the mutation function,
      // as they are more varied than queries. A default function is less practical here.
      // Example: `useMutation({ mutationFn: (vars) => gqlClient.request(MY_MUTATION, vars) })`
    },
  },
});
