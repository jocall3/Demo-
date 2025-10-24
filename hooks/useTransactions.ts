import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Transaction } from '../types';

// ====================================================================================
// Data Fetching Service Layer (GraphQL)
// As per the new architecture, all data fetching is directed to a single GraphQL endpoint.
// This function encapsulates the query and network request logic.
// ====================================================================================

const GQL_ENDPOINT = '/graphql'; // The single endpoint for the GraphQL supergraph

/**
 * GraphQL query to fetch all user transactions via the `userData` root query.
 * This aligns with the architectural directive to fetch all data for a view
 * declaratively in a single network request.
 */
const GET_TRANSACTIONS_QUERY = `
  query GetUserTransactions {
    userData {
      transactions {
        id
        type
        category
        description
        amount
        date
        carbonFootprint
      }
    }
  }
`;

/**
 * Fetches all transactions from the BFF's GraphQL endpoint.
 * @returns A promise that resolves to an array of all user transactions.
 */
const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GET_TRANSACTIONS_QUERY }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.message || `GraphQL request failed with status ${response.status}`);
  }

  const jsonResponse = await response.json();
  if (jsonResponse.errors) {
    throw new Error(jsonResponse.errors.map((e: any) => e.message).join('\n'));
  }

  const transactions = jsonResponse.data?.userData?.transactions;
  if (!transactions) {
    throw new Error("Invalid data structure returned from GraphQL API: expected `data.userData.transactions`");
  }

  return transactions;
};

// ====================================================================================
// Custom Hook: useTransactions
// Refactored to use the new GraphQL supergraph.
// ====================================================================================

/**
 * Custom hook to fetch financial transactions for the current user.
 * It leverages React Query to handle caching, background refetching, and server state management,
 * abstracting all data-fetching logic away from the UI components.
 *
 * NOTE: The previous filtering by `accountId` has been removed as it is not
 * supported by the new `userData` GraphQL query. The schema would need to be updated
 * to re-introduce server-side filtering capabilities.
 * 
 * @returns An object containing the transaction data, loading states, and error information from React Query.
 */
export const useTransactions = () => {
  // The query key uniquely identifies this query in the React Query cache.
  const queryKey = ['transactions'];

  const query = useQuery<Transaction[], Error>({
    queryKey,
    queryFn: fetchTransactions,
    
    // --- React Query Configuration ---
    // Configure the behavior of this query to optimize user experience for financial data.
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes, preventing unnecessary refetches.
    refetchOnWindowFocus: true, // Automatically refetch when the user returns to the app.
    retry: 1, // Attempt to refetch once on failure before showing an error.
  });

  return {
    ...query,
    // Provide a convenient, non-nullable alias for the data, which is useful for components
    // to avoid checking for `undefined` before mapping over the array.
    transactions: query.data ?? [],
  };
};
