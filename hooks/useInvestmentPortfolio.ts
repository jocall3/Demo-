import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getInvestmentPortfolio } from '../services/portfolioService';
import { Asset } from '../types';

interface UseInvestmentPortfolioReturn {
  portfolio: Asset[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  totalValue: number;
  weightedPerformance: number;
}

/**
 * Custom hook for fetching and managing the user's investment portfolio data.
 *
 * This hook is part of the feature-sliced state management architecture. It uses
 * React Query to handle server state for the investment portfolio feature.
 * It abstracts away the data fetching logic (via the service layer), providing a
 * clean, declarative API for UI components to consume portfolio data.
 *
 * It also acts as a "selector", calculating derived state like total portfolio value
 * and weighted performance, centralizing this business logic away from components.
 *
 * @returns {UseInvestmentPortfolioReturn} The state of the investment portfolio query,
 * including the data, loading/error states, and derived values.
 */
export const useInvestmentPortfolio = (): UseInvestmentPortfolioReturn => {
  const {
    data: portfolio,
    isLoading,
    isError,
    error,
  } = useQuery<Asset[], Error>({
    // queryKey is a unique identifier for this query in the React Query cache.
    queryKey: ['investmentPortfolio'],
    // queryFn is the async function that fetches the data. It's imported from the service layer.
    queryFn: getInvestmentPortfolio,
    // staleTime defines how long the data is considered fresh. After this time,
    // it will be re-fetched in the background on the next render. (5 minutes)
    staleTime: 1000 * 60 * 5,
    // refetchOnWindowFocus can be disabled to prevent re-fetching every time the user tabs back.
    refetchOnWindowFocus: false,
  });

  // Calculate derived values from the fetched portfolio data using useMemo for optimization.
  // This logic is now centralized in the hook, not scattered across components.
  const { totalValue, weightedPerformance } = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return { totalValue: 0, weightedPerformance: 0 };
    }

    const total = portfolio.reduce((sum, asset) => sum + asset.value, 0);

    const weightedPerf =
      total > 0
        ? portfolio.reduce(
            (sum, asset) => sum + asset.value * (asset.performanceYTD || 0),
            0
          ) / total
        : 0;

    return { totalValue: total, weightedPerformance: weightedPerf };
  }, [portfolio]);

  return {
    portfolio,
    isLoading,
    isError,
    error: error || null,
    totalValue,
    weightedPerformance,
  };
};
