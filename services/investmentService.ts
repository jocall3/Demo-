import axios from 'axios';
import type { Asset, MarketMover } from '../types';

const API_BASE_URL = '/api/investments';

/**
 * A wrapper for axios to handle common API request logic and error handling.
 * This abstracts the data fetching mechanism from the service functions.
 */
const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    try {
      const response = await axios.get<T>(`${API_BASE_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      console.error(`API Error fetching ${endpoint}:`, error);
      // In a real application, this error would be handled more gracefully,
      // potentially by a global error handler or passed to React Query's error state.
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch data from the server.');
      }
      throw new Error('An unexpected error occurred.');
    }
  },
};

/**
 * Fetches the user's main investment portfolio from the BFF.
 * The BFF would aggregate this from various sources (e.g., Plaid, other brokerages).
 * @returns A promise that resolves to an array of Asset objects.
 */
export const getInvestmentPortfolio = async (): Promise<Asset[]> => {
  return api.get<Asset[]>('/portfolio');
};

/**
 * Fetches the top market movers for the day from the BFF.
 * The BFF would source this from a real-time market data provider API.
 * @returns A promise that resolves to an array of MarketMover objects.
 */
export const getMarketMovers = async (): Promise<MarketMover[]> => {
  return api.get<MarketMover[]>('/market-movers');
};

/**
 * Fetches a curated list of social impact (ESG) investment opportunities from the BFF.
 * @returns A promise that resolves to an array of Asset objects representing impact investments.
 */
export const getImpactInvestments = async (): Promise<Asset[]> => {
  return api.get<Asset[]>('/impact');
};

// Future service functions can be added here, for example:
// - getAssetDetails(ticker: string)
// - executeTrade(tradeOrder: TradeOrder)
// - getPortfolioHistory(timeframe: string)
