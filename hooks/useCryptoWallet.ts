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

interface CryptoPortfolioData {
  userData: {
    cryptoPortfolio: {
      assets: CryptoAsset[];
      nfts: NFTAsset[];
    };
  };
}

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

interface BuyCryptoVariables {
  ticker: string;
  usdAmount: number;
}


// ====================================================================================
// Data Fetching Service Layer
// ====================================================================================

/**
 * A generic fetcher for making GraphQL requests to the API gateway.
 * @param query The GraphQL query string.
 * @param variables Optional variables for the query or mutation.
 * @returns The data from the GraphQL response.
 */
async function fetchGraphQL<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    portfolio,
    assets: portfolio?.assets ?? [],
    nfts: portfolio?.nfts ?? [],
    isLoading,
    isError: isError || !!buyAssetError,
    error: combinedError,
    
    // Actions
    buyAsset,
    buyAssetAsync,
    isBuyingAsset,
    
    // Manual refetching
    refetchPortfolio: refetch,
  };
};
