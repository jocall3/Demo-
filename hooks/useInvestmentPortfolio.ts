import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Asset } from '../types';

// The GraphQL query to fetch investment assets from the supergraph.
const GET_INVESTMENT_ASSETS_QUERY = `
  query GetUserDataForPortfolio {
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
 * Interface for the expected GraphQL response structure for user assets.
 */
interface InvestmentDataResponse {
  userData: {
    assets: Asset[];
  };
}

/**
 * A generic fetcher for making GraphQL requests to the API gateway.
 * In a real-world application, this would likely be a shared utility.
 * @param query The GraphQL query string.
 * @returns The data from the GraphQL response.
 */
async function fetchGraphQL<T>(query: string): Promise<T> {
  // The GraphQL endpoint is assumed to be at '/graphql', as configured in the API gateway.
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real application, an Authorization header with a JWT would be sent.
      // e.g., 'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.errors?.[0]?.message || 'Network request failed');
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors.map((e: { message: string }) => e.message).join('\n'));
  }

  return result.data;
}

/**
 * Custom hook for fetching and managing investment portfolio data from the GraphQL supergraph.
 *
 * This hook replaces direct REST-like service calls with a GraphQL query. It uses
 * React Query to handle server state, caching, and background refetching.
 * It also calculates derived state (totalValue, weightedPerformance) from the fetched
 * asset data, providing a clean and ready-to-use data structure for UI components.
 *
 * @returns An object containing the processed portfolio data, loading states, and error information.
 */
export const useInvestmentPortfolio = () => {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<InvestmentDataResponse, Error>({
    queryKey: ['investmentPortfolio'],
    queryFn: () => fetchGraphQL<InvestmentDataResponse>(GET_INVESTMENT_ASSETS_QUERY),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Prevents refetching on window focus, suitable for less volatile data.
  });

  // Calculate derived values from the fetched portfolio data using useMemo for optimization.
  // This centralizes business logic away from the presentation component and provides a clean API.
  const { assets, totalValue, weightedPerformance } = useMemo(() => {
    const assetsData = data?.userData?.assets;

    if (!assetsData || assetsData.length === 0) {
      return { assets: [], totalValue: 0, weightedPerformance: 0 };
    }

    const totalValueCalc = assetsData.reduce((sum, asset) => sum + asset.value, 0);

    const weightedPerformanceCalc =
      totalValueCalc > 0
        ? assetsData.reduce(
            (sum, asset) => sum + asset.value * (asset.performanceYTD || 0),
            0
          ) / totalValueCalc
        : 0;

    return { assets: assetsData, totalValue: totalValueCalc, weightedPerformance: weightedPerformanceCalc };
  }, [data]);

  // Return a flattened, custom-shaped object that is convenient for the consuming component.
  // This abstracts away the nested `data` structure from React Query and matches component expectations.
  return {
    portfolio: assets,
    totalValue,
    weightedPerformance,
    isLoading,
    isError,
    error: error || null,
  };
};
