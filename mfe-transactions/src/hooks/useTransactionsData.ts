/**
 * @file mfe-transactions/src/hooks/useTransactionsData.ts
 * @description Custom hook for fetching and managing transaction data for the Transactions MFE.
 *
 * ARCHITECTURAL REFACTOR:
 * This hook is a direct implementation of the "Separate Server and Client State" directive.
 * It replaces the transaction-related logic from the monolithic `DataContext` and the old `hooks/useTransactions.ts`.
 *
 * Responsibilities:
 * 1.  Uses TanStack Query (`useQuery`) to manage the server state for transactions.
 * 2.  Encapsulates the GraphQL query required to fetch transaction data from the federated gateway.
 * 3.  Provides a clean, declarative API for components within the Transactions MFE to access transaction data,
 *     including loading and error states.
 * 4.  Centralizes data fetching logic, making components purely presentational.
 */

import { useQuery } from '@tanstack/react-query';
// Assuming a shared types package/library is available in the monorepo.
import { Transaction } from '../../../types';

// ===================================================================================
// GraphQL Layer
// ===================================================================================

const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql';

/**
 * @const GET_TRANSACTIONS_QUERY
 * @description GraphQL query to fetch all user transactions via the `userData` root query.
 * This query is designed to be consumed by the federated API Gateway.
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
 * @interface TransactionsQueryResponse
 * @description Defines the expected shape of the data returned from the GraphQL query.
 */
interface TransactionsQueryResponse {
  userData: {
    transactions: Transaction[];
  };
}

/**
 * @function fetchTransactions
 * @description Asynchronously fetches all transactions for the user from the GraphQL gateway.
 * This function is designed to be used as the `queryFn` for TanStack Query.
 * @returns {Promise<Transaction[]>} A promise that resolves to an array of all user transactions.
 * @throws {Error} If the network request or GraphQL execution fails.
 */
const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // NOTE: In a real app, an Authorization header would be added here by a shared
      // utility that retrieves the JWT from the authentication context (e.g., Auth0).
    },
    body: JSON.stringify({ query: GET_TRANSACTIONS_QUERY }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.message || `GraphQL request failed with status ${response.status}`);
  }

  const jsonResponse = await response.json();
  if (jsonResponse.errors) {
    throw new Error(jsonResponse.errors.map((e: { message: string }) => e.message).join('\n'));
  }

  const transactions = jsonResponse.data?.userData?.transactions;
  if (!transactions) {
    throw new Error("Invalid data structure returned from GraphQL API: expected `data.userData.transactions`");
  }

  return transactions;
};

// ===================================================================================
// Custom Hook
// ===================================================================================

/**
 * @hook useTransactionsData
 * @description Custom hook to fetch and manage the server state for financial transactions.
 * It utilizes TanStack Query (`useQuery`) to handle caching, background refetching, and state management,
 * abstracting all data-fetching logic away from UI components.
 *
 * @returns {object} An object containing the transaction data, loading states, and error information from TanStack Query.
 * @property {Transaction[]} transactions - A memoized and always-defined array of transactions. Empty during initial fetch.
 * @property {boolean} isLoading - True while the initial fetch is in progress.
 * @property {boolean} isError - True if the data fetching resulted in an error.
 * @property {Error | null} error - The error object if an error occurred, otherwise null.
 * @property {() => void} refetch - A function to manually trigger a refetch of the transaction data.
 */
export const useTransactionsData = () => {
  const { data, isLoading, isError, error, refetch } = useQuery<Transaction[], Error>({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    // Configuration to optimize for financial data that doesn't change every second.
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes.
    refetchOnWindowFocus: true, // Refetch when the user returns to the app tab.
    retry: 1, // Attempt to refetch once on failure before showing an error.
  });

  return {
    transactions: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
  };
};
