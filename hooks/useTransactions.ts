import { useQuery } from '@tanstack/react-query';
import type { Transaction } from '../types';

// ====================================================================================
// Data Fetching Service Layer
// In a larger application, this fetching logic would reside in a dedicated
// `services/bankingService.ts` file to separate data fetching from hooks.
// It is co-located here to provide a complete, self-contained implementation for this task.
// ====================================================================================

const API_BASE_URL = '/api'; // Vite proxy handles redirecting this to the BFF

interface GetTransactionsParams {
  accountId?: string;
}

/**
 * Fetches transactions from the BFF API endpoint.
 * This function encapsulates the actual network request.
 * @param params - Optional parameters for the transaction query, such as `accountId`.
 * @returns A promise that resolves to an array of transactions.
 */
const getTransactions = async (params: GetTransactionsParams = {}): Promise<Transaction[]> => {
  const { accountId } = params;

  // In a real application, the userId would be retrieved from an authentication context
  // (e.g., a Redux store or an auth hook) rather than being hardcoded.
  const userId = 'user-123';

  const url = new URL(`${API_BASE_URL}/banking/transactions`);
  url.searchParams.append('userId', userId);

  if (accountId) {
    url.searchParams.append('accountId', accountId);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.message || 'Failed to fetch transactions');
  }

  return response.json();
};

// ====================================================================================
// Custom Hook: useTransactions
// This hook acts as the interface between UI components and the React Query cache.
// ====================================================================================

/**
 * Custom hook to fetch financial transactions for the current user.
 * It leverages React Query to handle caching, background refetching, and server state management,
 * abstracting all data-fetching logic away from the UI components.
 * 
 * @param {GetTransactionsParams} params - Optional parameters for filtering transactions, such as `accountId`.
 * @returns An object containing the transaction data, loading states, and error information from React Query.
 */
export const useTransactions = (params: GetTransactionsParams = {}) => {
  const { accountId } = params;

  // The query key is an array that uniquely identifies this query for caching purposes.
  // When `accountId` changes, React Query will automatically trigger a refetch.
  const queryKey = ['transactions', { accountId }];

  const query = useQuery<Transaction[], Error>({
    queryKey: queryKey,
    
    // The query function is the async function that fetches the data.
    // It calls our abstracted service layer function.
    queryFn: () => getTransactions({ accountId }),
    
    // --- React Query Configuration ---
    // Configure the behavior of this query to optimize user experience.
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes, preventing unnecessary refetches.
    refetchOnWindowFocus: true, // Automatically refetch when the user returns to the app.
    retry: 1, // Attempt to refetch once on failure before showing an error.
  });

  return {
    ...query,
    // Provide a convenient, non-nullable alias for the data.
    transactions: query.data ?? [],
  };
};
