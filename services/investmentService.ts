import type { Asset, MarketMover } from '../types';

// The endpoint for the new Federated GraphQL Gateway
const GQL_ENDPOINT = '/graphql'; // This would typically come from an environment variable

/**
 * A generic helper function to execute GraphQL queries against the gateway.
 * @param query - The GraphQL query string.
 * @param variables - An optional object of variables for the query.
 * @returns The data from the GraphQL response.
 * @throws An error if the network request or GraphQL execution fails.
 */
async function graphqlRequest<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const response = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real app, an Authorization header with a JWT would be included
      // 'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  const { data, errors } = await response.json();

  if (errors) {
    // In a real app, you might want to log the full error object
    console.error('GraphQL Errors:', errors);
    throw new Error(errors[0]?.message || 'An error occurred during the GraphQL request.');
  }

  return data as T;
}

/**
 * GraphQL query to fetch the user's main investment portfolio.
 * This query fetches the assets array from the unified UserData type in the supergraph.
 */
const GET_INVESTMENT_PORTFOLIO_QUERY = `
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
 * Fetches the user's main investment portfolio from the GraphQL gateway.
 * @returns A promise that resolves to an array of Asset objects.
 */
export const getInvestmentPortfolio = async (): Promise<Asset[]> => {
  const data = await graphqlRequest<{ userData: { assets: Asset[] } }>(GET_INVESTMENT_PORTFOLIO_QUERY);
  return data.userData.assets;
};

/**
 * GraphQL query to fetch the top market movers.
 * This assumes a 'marketMovers' query is available on the supergraph.
 */
const GET_MARKET_MOVERS_QUERY = `
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
 * Fetches the top market movers for the day from the GraphQL gateway.
 * @returns A promise that resolves to an array of MarketMover objects.
 */
export const getMarketMovers = async (): Promise<MarketMover[]> => {
  const data = await graphqlRequest<{ marketMovers: MarketMover[] }>(GET_MARKET_MOVERS_QUERY);
  return data.marketMovers;
};

/**
 * GraphQL query to fetch social impact investments.
 * This assumes an 'impactInvestments' query is available on the supergraph,
 * which could be a query for assets with high ESG ratings.
 */
const GET_IMPACT_INVESTMENTS_QUERY = `
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

/**
 * Fetches a curated list of social impact (ESG) investment opportunities from the GraphQL gateway.
 * @returns A promise that resolves to an array of Asset objects representing impact investments.
 */
export const getImpactInvestments = async (): Promise<Asset[]> => {
  const data = await graphqlRequest<{ impactInvestments: Asset[] }>(GET_IMPACT_INVESTMENTS_QUERY);
  return data.impactInvestments;
};
