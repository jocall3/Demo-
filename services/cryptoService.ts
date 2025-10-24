/**
 * services/cryptoService.ts
 *
 * This service layer is responsible for all interactions with the GraphQL Supergraph for crypto-related data.
 * It abstracts away the details of GraphQL queries and mutations, providing a clean, typed interface
 * for the application's data-fetching hooks (e.g., useCryptoWallet).
 */

import { CryptoAsset, NFTAsset, VirtualCard } from '../types';

// The GraphQL endpoint, which is the single entry point for all data fetching via the API gateway.
const GRAPHQL_API_URL = '/graphql';

// --- Type Definitions for GraphQL Responses ---
// These define the shape of the data expected from the GraphQL API.
// In a full-fledged setup, these might be auto-generated from the schema.

// NOTE: In a fully refactored architecture, these interfaces would be moved to the global `types.ts` file.
export interface WalletInfo {
  address: string;
  balance: number; // e.g., in ETH
}

export interface CryptoPortfolio {
  assets: CryptoAsset[];
  nfts: NFTAsset[];
  walletInfo: WalletInfo | null;
}

interface UserDataResponse {
  userData: {
    cryptoPortfolio: CryptoPortfolio;
  };
}

interface IssueCardResponse {
  issueVirtualCard: VirtualCard;
}

export interface BuyCryptoResponse {
  success: boolean;
  transactionId: string;
  amountBought: number;
  assetTicker: string;
}

interface BuyCryptoMutationResponse {
  buyCrypto: BuyCryptoResponse;
}

interface ConnectWalletResponse {
  connectWallet: WalletInfo;
}

interface MintNFTResponse {
  mintNFT: NFTAsset;
}

// --- Generic GraphQL Request Helper ---

/**
 * A generic function to execute GraphQL queries or mutations against the Supergraph.
 * It handles the fetch request, JSON serialization, and basic error handling.
 *
 * @param query The GraphQL query or mutation string.
 * @param variables Optional variables for the GraphQL operation.
 * @returns A promise that resolves to the data from the GraphQL response.
 * @throws An error if the network request fails or if the GraphQL response contains errors.
 */
async function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(GRAPHQL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real application, an authorization header would be included here.
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
    // In a real app, you might handle different error types more gracefully.
    throw new Error(errors[0].message || 'An error occurred in the GraphQL API.');
  }

  return data;
}

// --- GraphQL Operations (Queries and Mutations) ---

const GET_CRYPTO_PORTFOLIO_QUERY = `
  query GetCryptoPortfolio {
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
        walletInfo {
          address
          balance
        }
      }
    }
  }
`;

const ISSUE_VIRTUAL_CARD_MUTATION = `
  mutation IssueVirtualCard {
    issueVirtualCard {
      cardNumber
      cvv
      expiry
      holderName
    }
  }
`;

const BUY_CRYPTO_MUTATION = `
  mutation BuyCrypto($usdAmount: Float!, $cryptoTicker: String!) {
    buyCrypto(usdAmount: $usdAmount, cryptoTicker: $cryptoTicker) {
      success
      transactionId
      amountBought
      assetTicker
    }
  }
`;

const CONNECT_WALLET_MUTATION = `
  mutation ConnectWallet($address: String!, $signature: String!) {
    connectWallet(address: $address, signature: $signature) {
      address
      balance
    }
  }
`;

const MINT_NFT_MUTATION = `
  mutation MintNFT($name: String!, $imageUrl: String!) {
    mintNFT(name: $name, imageUrl: $imageUrl) {
      id
      name
      imageUrl
      contractAddress
    }
  }
`;

// --- Exported Service Functions ---

/**
 * Fetches the user's entire crypto portfolio using GraphQL.
 * This function is designed to be used by React Query's `useQuery`.
 * @returns A promise that resolves to the user's complete crypto portfolio.
 */
export const getCryptoPortfolio = async (): Promise<CryptoPortfolio> => {
  const data = await graphqlRequest<UserDataResponse>(GET_CRYPTO_PORTFOLIO_QUERY);
  return data.userData.cryptoPortfolio;
};

/**
 * Executes a mutation to issue a new virtual card.
 * @returns A promise that resolves to the new virtual card's details.
 */
export const issueVirtualCard = async (): Promise<VirtualCard> => {
  const data = await graphqlRequest<IssueCardResponse>(ISSUE_VIRTUAL_CARD_MUTATION);
  return data.issueVirtualCard;
};

/**
 * Executes a mutation to buy a crypto asset.
 * @param usdAmount - The amount in USD to purchase.
 * @param cryptoTicker - The ticker of the cryptocurrency to buy.
 * @returns A promise that resolves to the transaction confirmation.
 */
export const buyCrypto = async (usdAmount: number, cryptoTicker: string): Promise<BuyCryptoResponse> => {
  const data = await graphqlRequest<BuyCryptoMutationResponse>(BUY_CRYPTO_MUTATION, {
    usdAmount,
    cryptoTicker,
  });
  return data.buyCrypto;
};

/**
 * Executes a mutation to connect an external crypto wallet.
 * @param address - The public wallet address.
 * @param signature - A signed message proving ownership.
 * @returns A promise that resolves to the connected wallet's information.
 */
export const connectWallet = async (address: string, signature: string): Promise<WalletInfo> => {
  const data = await graphqlRequest<ConnectWalletResponse>(CONNECT_WALLET_MUTATION, {
    address,
    signature,
  });
  return data.connectWallet;
};

/**
 * Executes a mutation to mint a new NFT.
 * @param name - The name of the NFT.
 * @param imageUrl - The URL for the NFT's image.
 * @returns A promise that resolves to the newly minted NFT's details.
 */
export const mintNFT = async (name: string, imageUrl: string): Promise<NFTAsset> => {
  const data = await graphqlRequest<MintNFTResponse>(MINT_NFT_MUTATION, {
    name,
    imageUrl,
  });
  return data.mintNFT;
};
