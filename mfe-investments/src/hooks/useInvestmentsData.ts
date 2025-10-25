import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
// In a true monorepo with a shared library, this import would be cleaner, e.g., '@demobank/types'.
// For this structure, we reference the root types file.
import type { Asset as InvestmentAsset, FinancialGoal } from '../../../types';

/**
 * A lightweight GraphQL client. In a real application, this would be a shared utility.
 * It assumes the GraphQL endpoint is at '/graphql' and will be proxied by the dev server or gateway.
 * @param query The GraphQL query string to execute.
 * @param variables Optional variables for the query.
 * @returns A promise that resolves with the `data` field of the GraphQL response.
 * @template T The expected type of the `data` field.
 */
async function graphqlFetcher<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real application, an authentication link in an Apollo Client or a fetch wrapper
      // would inject the Authorization header with a JWT from the auth context.
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.errors?.[0]?.message || `Network request failed with status ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors.map((e: { message: string }) => e.message).join('\n'));
  }
  return data;
}

/**
 * @const GET_INVESTMENTS_DATA_QUERY
 * @description GraphQL query to fetch all data required for the Investments view.
 * This includes the main portfolio, performance metrics, impact investments, related financial goals,
 * and the user's investor profile, all in a single network request to the supergraph.
 */
const GET_INVESTMENTS_DATA_QUERY = `
  query GetInvestmentsData {
    investmentPortfolio {
      totalValue
      dailyChange
      ytdPerformance
      assets {
        name
        value
        color
        performanceYTD
        description
        esgRating
        assetClass
        ticker
      }
      impactInvestments {
        name
        value
        color
        esgRating
        description
      }
    }
    financialGoals {
      id
      name
      targetAmount
      currentAmount
      iconName
    }
    userProfile {
      investorProfile
    }
  }
`;

/**
 * @interface InvestmentsDataResponse
 * @description Defines the expected shape of the data returned by the `GET_INVESTMENTS_DATA_QUERY`.
 */
interface InvestmentsDataResponse {
  investmentPortfolio: {
    totalValue: number;
    dailyChange: number;
    ytdPerformance: number;
    assets: InvestmentAsset[];
    impactInvestments: InvestmentAsset[];
  };
  financialGoals: FinancialGoal[];
  userProfile: {
    investorProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  };
}

/**
 * @hook useInvestmentsData
 * @description A custom TanStack Query hook to fetch all necessary data for the Investments MFE view from the GraphQL supergraph.
 *
 * This hook encapsulates all server state management for the investments feature, including:
 * - Fetching the user's investment portfolio, with total value and performance metrics.
 * - Retrieving a list of curated social impact investments (ESG).
 * - Getting related financial goals to display alongside investments.
 * - Fetching the user's determined investor profile.
 *
 * It centralizes data fetching, caching, and error handling for the entire Investments view,
 * adhering to the architectural directive of separating server state from UI state.
 *
 * @returns {object} The return value from `useQuery`, plus derived data for easier consumption by components.
 * @property {InvestmentAsset[]} portfolio - The user's portfolio of assets.
 * @property {InvestmentAsset[]} impactInvestments - A list of curated ESG investments.
 * @property {FinancialGoal[]} financialGoals - The user's financial goals.
 * @property {string} investorProfile - The user's risk profile.
 * @property {number} totalValue - The total value of the portfolio.
 * @property {number} dailyChange - The change in portfolio value over the last 24 hours.
 * @property {number} ytdPerformance - The year-to-date performance of the portfolio.
 * @property {boolean} isLoading - True if the query is in the 'loading' state.
 * @property {boolean} isError - True if the query has encountered an error.
 * @property {Error | null} error - The error object if the query failed.
 */
export const useInvestmentsData = () => {
  const queryResult = useQuery<InvestmentsDataResponse, Error>({
    queryKey: ['investmentsData'],
    queryFn: () => graphqlFetcher<InvestmentsDataResponse>(GET_INVESTMENTS_DATA_QUERY),
    staleTime: 1000 * 60 * 5, // Investment data doesn't need to be real-time, 5 min stale time is reasonable.
    refetchOnWindowFocus: false, // Prevents refetching on window focus, which can be excessive for this type of data.
  });

  // Use useMemo to process and memoize the derived data, preventing recalculation on every render.
  const processedData = useMemo(() => {
    const data = queryResult.data;
    if (!data) {
      // Return a default, empty state structure to prevent components from crashing on undefined data.
      return {
        portfolio: [],
        impactInvestments: [],
        financialGoals: [],
        investorProfile: 'Unknown',
        totalValue: 0,
        dailyChange: 0,
        ytdPerformance: 0,
      };
    }
    
    // Safely destructure and provide defaults from the fetched data.
    return {
      portfolio: data.investmentPortfolio?.assets || [],
      impactInvestments: data.investmentPortfolio?.impactInvestments || [],
      financialGoals: data.financialGoals || [],
      investorProfile: data.userProfile?.investorProfile || 'Moderate',
      totalValue: data.investmentPortfolio?.totalValue || 0,
      dailyChange: data.investmentPortfolio?.dailyChange || 0,
      ytdPerformance: data.investmentPortfolio?.ytdPerformance || 0,
    };
  }, [queryResult.data]);

  // Combine the original query result with our processed data for a comprehensive hook return value.
  return {
    ...queryResult,
    ...processedData,
  };
};
