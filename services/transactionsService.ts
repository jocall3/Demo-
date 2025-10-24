/**
 * services/transactionsService.ts
 *
 * RE-ARCHITECTED
 * This service layer is refactored to align with the new federated GraphQL architecture
 * and the application's primary data-fetching strategy using TanStack Query.
 * It replaces direct API client implementations with a standardized, fetch-based GraphQL request helper.
 * This provides a clean, promise-based interface for React Query hooks to consume.
 */

import { Transaction } from '../types';

// The endpoint for the new Federated GraphQL Gateway.
const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql';

// ====================================================================================
// GraphQL Request Helper
// In a production application, this would be a shared utility. It is defined here
// to maintain consistency with other service files in the current architecture.
// ====================================================================================

/**
 * A generic helper function to execute GraphQL queries against the gateway.
 * @param query - The GraphQL query string.
 * @param variables - An optional object of variables for the query.
 * @returns The data from the GraphQL response.
 * @throws An error if the network request or GraphQL execution fails.
 */
async function graphqlRequest<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Auth headers would be added here in a real application.
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.errors?.[0]?.message || `Network request failed with status ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    console.error('GraphQL Errors:', errors);
    throw new Error(errors[0]?.message || 'An error occurred during the GraphQL request.');
  }

  return data;
}

// ====================================================================================
// GraphQL Operations
// ====================================================================================

/**
 * GraphQL query to fetch the user's transactions from the Supergraph.
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
 * GraphQL mutation to send money.
 */
const SEND_MONEY_MUTATION = `
  mutation SendMoney($input: SendMoneyInput!) {
    sendMoney(input: $input) {
      id
      type
      category
      description
      amount
      date
    }
  }
`;

interface SendMoneyInput {
  recipient: string;
  amount: number;
}

// ====================================================================================
// Service Functions
// ====================================================================================

/**
 * Fetches a list of all transactions for the authenticated user from the GraphQL gateway.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await graphqlRequest<{ userData: { transactions: Transaction[] } }>(GET_TRANSACTIONS_QUERY);
    return response?.userData?.transactions || [];
  } catch (error) {
    console.error("Failed to fetch transactions from GraphQL gateway:", error);
    // Re-throw the error so that React Query can handle it.
    throw error;
  }
};

/**
 * Executes the `sendMoney` mutation via the GraphQL gateway.
 * @param input - An object containing the recipient and amount.
 * @returns A promise that resolves to the newly created Transaction object.
 */
export const sendMoney = async (input: SendMoneyInput): Promise<Transaction> => {
  try {
    const response = await graphqlRequest<{ sendMoney: Transaction }>(SEND_MONEY_MUTATION, { input });

    if (!response?.sendMoney) {
      throw new Error('Mutation did not return the expected transaction data.');
    }

    return response.sendMoney;
  } catch (error) {
    console.error("Send money mutation failed:", error);
    throw error;
  }
};
