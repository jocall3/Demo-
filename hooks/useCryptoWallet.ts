import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CryptoAsset, NFTAsset } from '../types';

// ====================================================================================
// GraphQL Operations
// These should align with the federated supergraph schema.
// ====================================================================================

const GET_CRYPTO_PORTFOLIO_QUERY = `
  query GetUserCryptoPortfolio {
    userData {
      cryptoPortfolio {
        assets {
          ticker
          name
          value
          amount
          color
        }
        nfts {
          id
          name
          imageUrl
          contractAddress
        }
      }
    }
  }
`;

const BUY_CRYPTO_MUTATION = `
  mutation BuyCryptoAsset($ticker: String!, $usdAmount: Float!) {
    buyCrypto(ticker: $ticker, usdAmount: $usdAmount) {
      success
      transaction {
        id
        description
        amount
        date
      }
    }
  }
`;

// ====================================================================================
// Type Definitions for GraphQL Payloads
// ====================================================================================

/**
 * @interface CryptoPortfolioData
 * @description Defines the expected structure of the data returned by the `GET_CRYPTO_PORTFOLIO_QUERY`.
 */
interface CryptoPortfolioData {
  userData: {
    cryptoPortfolio: {
      assets: CryptoAsset[];
      nfts: NFTAsset[];
    };
  };
}

/**
 * @interface BuyCryptoResponse
 * @description Defines the expected structure of the data returned by the `BUY_CRYPTO_MUTATION`.
 */
interface BuyCryptoResponse {
  buyCrypto: {
    success: boolean;
    transaction: {
      id: string;
      description: string;
      amount: number;
      date: string;
    };
  };
}

/**
 * @interface BuyCryptoVariables
 * @description Defines the variables required for the `BUY_CRYPTO_MUTATION`.
 */
interface BuyCryptoVariables {
  ticker: string;
  usdAmount: number;
}


// ====================================================================================
// Data Fetching Service Layer
// ====================================================================================

/**
 * A generic fetcher for making GraphQL requests to the API gateway.
 *
 * @template T The expected type of the data returned by the GraphQL query.
 * @param {string} query The GraphQL query or mutation string.
 * @param {Record<string, any>} [variables] Optional variables for the operation.
 * @returns {Promise<T>} The data from the GraphQL response.
 * @throws {Error} If the network request fails or the GraphQL API returns errors.
 */
async function fetchGraphQL<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch('/graphql', { // The API Gateway endpoint
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // In a real app, an Authorization header would be added here
    body: JSON.stringify({ query, variables }),
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

// ====================================================================================
// Custom Hook: useCryptoWallet
// ====================================================================================

/**
 * Custom hook for managing crypto portfolio data using React Query and GraphQL.
 * It encapsulates all data fetching and state management logic for crypto assets,
 * providing a clean interface for UI components.
 *
 * @returns An object containing the portfolio data, loading/error states,
 *          and mutation functions for interacting with the wallet.
 */
export const useCryptoWallet = () => {
  const queryClient = useQueryClient();

  // --- QUERY: Fetch Crypto Portfolio ---
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CryptoPortfolioData, Error>({
    queryKey: ['cryptoPortfolio'],
    queryFn: () => fetchGraphQL<CryptoPortfolioData>(GET_CRYPTO_PORTFOLIO_QUERY),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // --- MUTATION: Buy Crypto Asset ---
  const {
    mutate: buyAsset,
    mutateAsync: buyAssetAsync,
    isPending: isBuyingAsset,
    error: buyAssetError,
  } = useMutation<BuyCryptoResponse, Error, BuyCryptoVariables>({
    mutationFn: (variables) => fetchGraphQL<BuyCryptoResponse>(BUY_CRYPTO_MUTATION, variables),
    onSuccess: () => {
      // When a purchase is successful, invalidate queries that might be affected.
      // This will trigger a refetch and update the UI with the latest data.
      queryClient.invalidateQueries({ queryKey: ['cryptoPortfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balanceSummary'] });
    },
    onError: (err) => {
      console.error("Failed to buy crypto asset:", err);
      // In a real app, a global error handler or toast notification system
      // would be used to display this error to the user.
    },
  });

  // --- DERIVED STATE & RETURN VALUE ---
  const portfolio = data?.userData?.cryptoPortfolio;
  const combinedError = error || buyAssetError;

  return {
    /** @property The raw portfolio object containing both assets and NFTs. */
    portfolio,
    /** @property An array of fungible crypto assets in the user's portfolio. Defaults to an empty array. */
    assets: portfolio?.assets ?? [],
    /** @property An array of non-fungible tokens (NFTs) in the user's portfolio. Defaults to an empty array. */
    nfts: portfolio?.nfts ?? [],
    /** @property A boolean indicating if the initial portfolio data is being fetched. */
    isLoading,
    /** @property A boolean indicating if there was an error during fetching or mutation. */
    isError: isError || !!buyAssetError,
    /** @property The error object if an error occurred. */
    error: combinedError,
    
    /** @function buyAsset - A function to initiate a crypto purchase. Takes an object with `ticker` and `usdAmount`. */
    buyAsset,
    /** @function buyAssetAsync - An async version of `buyAsset` that returns a promise. */
    buyAssetAsync,
    /** @property A boolean indicating if a crypto purchase mutation is in progress. */
    isBuyingAsset,
    
    /** @function refetchPortfolio - A function to manually refetch the crypto portfolio data. */
    refetchPortfolio: refetch,
  };
};
