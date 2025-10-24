/**
 * services/investmentService.ts
 *
 * RE-ARCHITECTED
 * This service layer is responsible for all interactions with the GraphQL Supergraph for investment-related data.
 * It has been refactored to use Apollo Client, replacing the previous raw fetch-based implementation.
 * This aligns with the new architecture, providing a typed, declarative way to interact with the Supergraph.
 * These functions are intended to be consumed by feature-specific data hooks (e.g., useInvestmentPortfolio).
 */

import { ApolloClient, InMemoryCache, gql, ApolloError } from '@apollo/client';
import { Asset, MarketMover } from '../types';

// ====================================================================================
// Apollo Client Initialization
// This client is configured to communicate with the federated GraphQL Gateway.
// In a larger application, this would be a singleton instance shared across all services.
// ====================================================================================
const client = new ApolloClient({
  uri: import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql',
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache', // Caching is handled by React Query/TanStack Query in the hooks layer
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
 * GraphQL query to fetch the user's main investment portfolio.
 * This query fetches the assets array from the unified UserData type in the supergraph.
 */
const GET_INVESTMENT_PORTFOLIO_QUERY = gql`
  query GetInvestmentPortfolio {
    userData {
      assets {
        name
        value
        color
        performanceYTD
        esgRating
        description
      }
    }
  }
`;

/**
 * GraphQL query to fetch the top market movers.
 * This assumes a 'marketMovers' query is available on the supergraph.
 */
const GET_MARKET_MOVERS_QUERY = gql`
  query GetMarketMovers {
    marketMovers {
      ticker
      name
      change
      price
    }
  }
`;

/**
 * GraphQL query to fetch social impact investments.
 * This assumes an 'impactInvestments' query is available on the supergraph,
 * which could be a query for assets with high ESG ratings.
 */
const GET_IMPACT_INVESTMENTS_QUERY = gql`
  query GetImpactInvestments {
    impactInvestments {
      name
      value
      color
      performanceYTD
      esgRating
      description
    }
  }
`;

// ====================================================================================
// Service Functions
// ====================================================================================

/**
 * Fetches the user's main investment portfolio from the GraphQL gateway.
 * @returns A promise that resolves to an array of Asset objects.
 */
export const getInvestmentPortfolio = async (): Promise<Asset[]> => {
  try {
    const { data } = await client.query({
      query: GET_INVESTMENT_PORTFOLIO_QUERY,
    });
    return data?.userData?.assets || [];
  } catch (error) {
    console.error("Failed to fetch investment portfolio from GraphQL gateway:", error);
    throw error as ApolloError;
  }
};

/**
 * Fetches the top market movers for the day from the GraphQL gateway.
 * @returns A promise that resolves to an array of MarketMover objects.
 */
export const getMarketMovers = async (): Promise<MarketMover[]> => {
  try {
    const { data } = await client.query({
      query: GET_MARKET_MOVERS_QUERY,
    });
    return data?.marketMovers || [];
  } catch (error) {
    console.error("Failed to fetch market movers from GraphQL gateway:", error);
    throw error as ApolloError;
  }
};

/**
 * Fetches a curated list of social impact (ESG) investment opportunities from the GraphQL gateway.
 * @returns A promise that resolves to an array of Asset objects representing impact investments.
 */
export const getImpactInvestments = async (): Promise<Asset[]> => {
  try {
    const { data } = await client.query({
      query: GET_IMPACT_INVESTMENTS_QUERY,
    });
    return data?.impactInvestments || [];
  } catch (error) {
    console.error("Failed to fetch impact investments from GraphQL gateway:", error);
    throw error as ApolloError;
  }
};
