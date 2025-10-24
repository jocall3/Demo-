import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Assumes the existence of a dedicated service for crypto-related API calls
import { getCryptoWallet, buyCryptoAsset } from '../services/cryptoService';
// Assumes these types are exported from the main types file
import { CryptoAsset, NFTAsset } from '../types';

/**
 * Represents the structure of the user's entire crypto portfolio,
 * combining fungible assets and non-fungible tokens (NFTs).
 * This type aligns with the data structure returned by the BFF's crypto endpoint.
 */
export interface CryptoPortfolio {
  assets: CryptoAsset[];
  nfts: NFTAsset[];
}

// Define a query key to be used for caching and invalidation by React Query.
const CRYPTO_WALLET_QUERY_KEY = ['cryptoWallet'];

/**
 * Custom hook for managing the user's crypto wallet data.
 * It uses @tanstack/react-query to fetch, cache, and update the crypto portfolio.
 * This hook acts as a selector, decoupling UI components from the
 * data fetching logic contained within the cryptoService.
 *
 * @returns An object containing the portfolio data, loading/error states,
 *          and mutation functions for interacting with the wallet.
 */
export const useCryptoWallet = () => {
  const queryClient = useQueryClient();

  // --- QUERIES ---

  // Query to fetch the entire crypto portfolio (assets and NFTs).
  const {
    data: portfolio,
    isLoading,
    isError,
    error,
  } = useQuery<CryptoPortfolio, Error>({
    queryKey: CRYPTO_WALLET_QUERY_KEY,
    queryFn: getCryptoWallet, // This function is defined in `services/cryptoService.ts`
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    refetchOnWindowFocus: true,
  });

  // --- MUTATIONS ---

  // Mutation for buying a crypto asset. It includes an optimistic update for a better UX.
  const { mutate: buyAsset, isPending: isBuyingAsset } = useMutation({
    mutationFn: ({ assetTicker, usdAmount }: { assetTicker: string; usdAmount: number }) =>
      buyCryptoAsset(assetTicker, usdAmount), // This function is defined in `services/cryptoService.ts`

    // When the mutation is called, optimistically update the UI
    onMutate: async (newPurchase) => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: CRYPTO_WALLET_QUERY_KEY });

      // Snapshot the previous value
      const previousPortfolio = queryClient.getQueryData<CryptoPortfolio>(CRYPTO_WALLET_QUERY_KEY);

      // Optimistically update to the new value
      if (previousPortfolio) {
        queryClient.setQueryData<CryptoPortfolio>(CRYPTO_WALLET_QUERY_KEY, (oldPortfolio) => {
          if (!oldPortfolio) return undefined;
          
          const updatedAssets = oldPortfolio.assets.map((asset) => {
            if (asset.ticker === newPurchase.assetTicker) {
              const currentPrice = asset.value > 0 && asset.amount > 0 ? asset.value / asset.amount : 0;
              const amountBought = currentPrice > 0 ? newPurchase.usdAmount / currentPrice : 0;
              return {
                ...asset,
                amount: asset.amount + amountBought,
                value: asset.value + newPurchase.usdAmount,
              };
            }
            return asset;
          });
          
          return { ...oldPortfolio, assets: updatedAssets };
        });
      }

      // Return a context object with the snapshotted value
      return { previousPortfolio };
    },

    // If the mutation fails, roll back to the previous state
    onError: (err, newPurchase, context) => {
      if (context?.previousPortfolio) {
        queryClient.setQueryData(CRYPTO_WALLET_QUERY_KEY, context.previousPortfolio);
      }
      // In a real app, you would show a toast notification for the error.
      console.error("Failed to buy asset:", err);
    },

    // Always refetch after the mutation is settled (either success or error) to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRYPTO_WALLET_QUERY_KEY });
    },
  });

  // --- RETURN VALUE ---
  // Expose the data and functionality to the UI components.
  // Using `?? []` provides a stable empty array to components, preventing errors during the initial loading state.
  return {
    portfolio,
    assets: portfolio?.assets ?? [],
    nfts: portfolio?.nfts ?? [],
    isLoading,
    isError,
    error,
    buyAsset,
    isBuyingAsset,
  };
};
