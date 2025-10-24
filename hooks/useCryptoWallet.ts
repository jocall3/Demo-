import { useQuery, useMutation, gql } from '@apollo/client';
import { useCallback } from 'react';
import { CryptoAsset, NFTAsset } from '../types';

// These types would ideally be auto-generated from the GraphQL schema
export interface CryptoPortfolioPayload {
  cryptoPortfolio: {
    assets: CryptoAsset[];
    nfts: NFTAsset[];
  };
}

export interface BuyCryptoPayload {
  buyCrypto: {
    success: boolean;
    // Assuming the mutation returns a transaction, as per a reasonable schema design
    transaction: {
      id: string;
      description: string;
      amount: number;
    };
  };
}

export interface BuyCryptoInput {
  ticker: string;
  usdAmount: number;
}

export interface BuyCryptoMutationVars {
  input: BuyCryptoInput;
}

// GraphQL Operations
const GET_CRYPTO_PORTFOLIO = gql`
  query GetCryptoPortfolio {
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
`;

const BUY_CRYPTO_ASSET_MUTATION = gql`
  mutation BuyCryptoAsset($input: BuyCryptoInput!) {
    buyCrypto(input: $input) {
      success
      transaction {
        id
        description
        amount
      }
    }
  }
`;

/**
 * Custom hook for managing the user's crypto wallet data using Apollo Client.
 * It aligns with the new federated GraphQL architecture by replacing REST-based
 * data fetching with GraphQL queries and mutations.
 *
 * @returns An object containing the portfolio data, loading/error states,
 *          and mutation functions for interacting with the wallet.
 */
export const useCryptoWallet = () => {
  // --- QUERIES ---
  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery<CryptoPortfolioPayload>(GET_CRYPTO_PORTFOLIO);

  // --- MUTATIONS ---
  const [buyAssetMutation, { loading: isBuyingAsset, error: buyAssetError }] = useMutation<
    BuyCryptoPayload,
    BuyCryptoMutationVars
  >(BUY_CRYPTO_ASSET_MUTATION, {
    // Refetch the portfolio query after the mutation completes to ensure the UI is up-to-date.
    refetchQueries: [{ query: GET_CRYPTO_PORTFOLIO }],
    // Await refetching to ensure cache is updated before proceeding.
    awaitRefetchQueries: true,
    onError: (err) => {
      // In a real app, you would show a toast notification for the error.
      console.error("Failed to buy asset:", err);
    },
  });

  /**
   * A wrapper around the Apollo mutation function to provide a more convenient API
   * consistent with the previous implementation (which used React Query's `mutate`).
   */
  const buyAsset = useCallback(
    async ({ assetTicker, usdAmount }: { assetTicker: string; usdAmount: number }) => {
      return buyAssetMutation({
        variables: {
          input: {
            ticker: assetTicker,
            usdAmount,
          },
        },
      });
    },
    [buyAssetMutation]
  );

  // --- RETURN VALUE ---
  // Expose a consistent API to the UI components.
  const portfolio = data?.cryptoPortfolio;

  return {
    portfolio,
    assets: portfolio?.assets ?? [],
    nfts: portfolio?.nfts ?? [],
    isLoading,
    isError: !!error || !!buyAssetError,
    error: error || buyAssetError || null,
    buyAsset,
    isBuyingAsset,
    refetchPortfolio: refetch,
  };
};
