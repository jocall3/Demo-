/**
 * services/transactionsService.ts
 *
 * RE-ARCHITECTED
 * This service layer has been completely refactored to align with the new federated GraphQL architecture.
 * It replaces direct REST API calls (`fetch`) with GraphQL queries and mutations executed by an Apollo Client.
 * This abstracts away the endpoint details and provides a typed, declarative way to interact with the Supergraph.
 */

import { ApolloClient, InMemoryCache, gql, ApolloError } from '@apollo/client';
import { Transaction } from '../types';

// ====================================================================================
// Apollo Client Initialization
// In a production application, this client would be initialized once in a dedicated
// file (e.g., `services/apolloClient.ts`) and exported for use across all services.
// It is defined here to keep this example self-contained as per the task requirements.
// ====================================================================================
const client = new ApolloClient({
  // The URI of the federated GraphQL Gateway. This should be configured via an environment variable.
  uri: import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql',
  cache: new InMemoryCache(),
  // Default options can be set here. Using 'no-cache' for fetchPolicy as React Query will handle caching.
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
    },
  },
});

// ====================================================================================
// GraphQL Queries
// ====================================================================================

/**
 * GraphQL query to fetch the user's transactions.
 * This query targets the `userData` field in the Supergraph, which is expected to resolve
 * based on the authenticated user's context provided by the gateway.
 */
const GET_TRANSACTIONS_QUERY = gql`
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

// ====================================================================================
// GraphQL Mutations
// ====================================================================================

/**
 * GraphQL mutation to send money.
 * This corresponds to the `sendMoney` mutation defined in the Supergraph schema.
 */
const SEND_MONEY_MUTATION = gql`
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
// These functions are designed to be used by React Query hooks.
// ====================================================================================

/**
 * Fetches a list of all transactions for the authenticated user from the GraphQL gateway.
 * The `userId` and `accountId` parameters from the previous REST implementation are no longer needed,
 * as authentication and user context are handled by the gateway and the `userData` resolver.
 *
 * @returns A promise that resolves to an array of Transaction objects.
 * @throws Will throw an ApolloError if the network request or GraphQL query fails.
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data } = await client.query({
      query: GET_TRANSACTIONS_QUERY,
    });

    // The data structure matches the query: { userData: { transactions: [...] } }
    return data?.userData?.transactions || [];
  } catch (error) {
    console.error("Failed to fetch transactions from GraphQL gateway:", error);
    // Re-throw the error so React Query's error handling can catch it.
    throw error as ApolloError;
  }
};

/**
 * Executes the `sendMoney` mutation via the GraphQL gateway.
 *
 * @param input - An object containing the recipient and amount for the transaction.
 * @returns A promise that resolves to the newly created Transaction object returned by the mutation.
 * @throws Will throw an ApolloError if the mutation fails.
 */
export const sendMoney = async (input: SendMoneyInput): Promise<Transaction> => {
  try {
    const { data } = await client.mutate({
      mutation: SEND_MONEY_MUTATION,
      variables: { input },
    });

    if (!data || !data.sendMoney) {
      throw new Error('Mutation did not return the expected transaction data.');
    }

    return data.sendMoney;
  } catch (error) {
    console.error("Send money mutation failed:", error);
    throw error as ApolloError;
  }
};
