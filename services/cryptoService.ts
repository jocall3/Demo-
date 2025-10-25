/**
 * @file services/cryptoService.ts
 * @description Service layer for handling all GraphQL interactions related to cryptocurrency portfolios.
 *
 * ARCHITECTURAL REFACTOR:
 * This service is part of the transition to a centralized data-fetching layer for the frontend.
 * It encapsulates GraphQL queries and mutations for crypto-related data, providing a clean,
 * promise-based API for TanStack Query hooks (like `useCryptoWallet`) to consume. This decouples
 * the data-fetching logic from the component and hook layers.
 *
 * All functions interact with the federated GraphQL supergraph via a shared `graphqlRequest` helper.
 */

import { CryptoAsset, NFTAsset, Transaction } from '../types';

// ====================================================================================
// GraphQL Request Helper
// In a production application, this would be a shared utility.
// ====================================================================================

/**
 * A generic helper function to execute GraphQL queries and mutations against the API Gateway.
 * @param {string} query The GraphQL query or mutation string.
 * @param {V} [variables] An optional object of variables for the operation.
 * @returns {Promise<T>} The `data` field from the GraphQL response.
 * @throws An error if the network request or GraphQL execution fails.
 * @template T The expected type of the `data` object in the response.
 * @template V The type of the variables object.
 */
export async function graphqlRequest<T, V = Record<string, any>>(
  query: string,
  variables?: V,
): Promise<T> {
  const endpoint = import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real application, an authorization token would be retrieved and added here.
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.errors?.[0]?.message || `Network request failed with status ${response.status}`);
  }

  const jsonResponse = await response.json();
  if (jsonResponse.errors) {
    console.error('GraphQL Errors:', jsonResponse.errors);
    throw new Error(jsonResponse.errors.map((e: { message: string }) => e.message).join('\n'));
  }

  return jsonResponse.data;
}

// ====================================================================================
// GraphQL Operations & Types
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

interface GetCryptoPortfolioResponse {
  userData: {
    cryptoPortfolio: {
      assets: CryptoAsset[];
      nfts: NFTAsset[];
    };
  };
}

const BUY_CRYPTO_MUTATION = `
  mutation BuyCryptoAsset($ticker: String!, $usdAmount: Float!) {
    buyCrypto(ticker: $ticker, usdAmount: $usdAmount) {
      success
      transaction {
        id
        description
        amount
        date
        type
        category
      }
    }
  }
`;

interface BuyCryptoResponse {
  buyCrypto: {
    success: boolean;
    transaction: Transaction;
  };
}

// ====================================================================================
// Service Functions
// ====================================================================================

/**
 * @function getCryptoPortfolio
 * @description Fetches the user's entire cryptocurrency and NFT portfolio.
 * @returns {Promise<{ assets: CryptoAsset[]; nfts: NFTAsset[] }>} A promise that resolves to the user's crypto portfolio.
 */
export const getCryptoPortfolio = async (): Promise<{ assets: CryptoAsset[]; nfts: NFTAsset[] }> => {
  try {
    const data = await graphqlRequest<GetCryptoPortfolioResponse>(GET_CRYPTO_PORTFOLIO_QUERY);
    return data.userData.cryptoPortfolio || { assets: [], nfts: [] };
  } catch (error) {
    console.error("Failed to fetch crypto portfolio:", error);
    throw new Error("Could not retrieve your crypto portfolio. Please try again later.");
  }
};

/**
 * @function buyCryptoAsset
 * @description Executes a mutation to purchase a cryptocurrency asset.
 * @param {object} params - The parameters for the purchase.
 * @param {string} params.ticker - The ticker symbol of the crypto asset to buy (e.g., 'BTC').
 * @param {number} params.usdAmount - The amount in USD to spend on the purchase.
 * @returns {Promise<BuyCryptoResponse['buyCrypto']>} A promise that resolves to the result of the buy operation, including the new transaction.
 */
export const buyCryptoAsset = async ({ ticker, usdAmount }: { ticker: string; usdAmount: number }): Promise<BuyCryptoResponse['buyCrypto']> => {
  try {
    const data = await graphqlRequest<BuyCryptoResponse>(BUY_CRYPTO_MUTATION, { ticker, usdAmount });
    return data.buyCrypto;
  } catch (error) {
    console("Failed to execute buy transaction for ${ticker}:", error);
    throw new Error(`The purchase of ${ticker} could not be completed. Please try again.`);
  }
};
