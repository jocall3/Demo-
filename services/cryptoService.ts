/**
 * services/cryptoService.ts
 *
 * This service layer is responsible for all interactions with the BFF's crypto-related endpoints.
 * It abstracts away the details of the API calls (endpoints, headers, error handling)
 * and provides a clean, typed interface for the application's data-fetching hooks (e.g., useCryptoWallet).
 */

import { CryptoAsset, NFTAsset, VirtualCard } from '../types';

// NOTE: In a fully refactored architecture, this interface would be moved to the global `types.ts` file.
export interface WalletInfo {
  address: string;
  balance: number; // e.g., in ETH
}

// This interface combines all data related to the user's crypto holdings and wallet state.
export interface CryptoPortfolio {
  assets: CryptoAsset[];
  nfts: NFTAsset[];
  walletInfo: WalletInfo | null;
}

// The base URL for the BFF's crypto API endpoints.
// In a Vite app, '/api' is proxied to the BFF during development.
const API_BASE_URL = '/api/crypto';

/**
 * A reusable helper function to handle API responses. It checks for network errors,
 * parses the JSON body, and throws a standardized error for non-ok responses.
 * @param response - The Fetch API Response object.
 * @returns The parsed JSON data.
 * @throws An error with a message from the API or a generic error message.
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown API error occurred.' }));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

/**
 * Fetches the user's entire crypto portfolio from the BFF.
 * This includes fungible assets (like BTC, ETH), non-fungible tokens (NFTs), and wallet information.
 *
 * @returns A promise that resolves to the user's complete crypto portfolio.
 */
export const getCryptoPortfolio = async (): Promise<CryptoPortfolio> => {
  const response = await fetch(`${API_BASE_URL}/portfolio`);
  return handleResponse<CryptoPortfolio>(response);
};

/**
 * Sends a request to the BFF to issue a new virtual card linked to the user's crypto balance.
 * The BFF handles the secure integration with a card issuer (e.g., Marqeta).
 *
 * @returns A promise that resolves to the new virtual card's details.
 */
export const issueVirtualCard = async (): Promise<VirtualCard> => {
  const response = await fetch(`${API_BASE_URL}/virtual-card/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<VirtualCard>(response);
};

/**
 * Defines the expected response from the crypto purchase endpoint.
 */
export interface BuyCryptoResponse {
  success: boolean;
  transactionId: string;
  amountBought: number;
  assetTicker: string;
}

/**
 * Sends a request to the BFF to facilitate a crypto purchase via an on-ramp provider.
 * The BFF handles the secure integration with a service like Stripe.
 *
 * @param usdAmount - The amount in USD to purchase.
 * @param cryptoTicker - The ticker of the cryptocurrency to buy (e.g., "ETH").
 * @returns A promise that resolves to an object confirming the transaction details.
 */
export const buyCrypto = async (usdAmount: number, cryptoTicker: string): Promise<BuyCryptoResponse> => {
  const response = await fetch(`${API_BASE_URL}/on-ramp/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usdAmount, cryptoTicker }),
  });
  return handleResponse<BuyCryptoResponse>(response);
};

/**
 * Sends a request to the BFF to connect a user's external wallet (e.g., MetaMask).
 * The BFF would store the public address securely associated with the user's profile
 * and return the latest state.
 *
 * @param address - The public wallet address to connect.
 * @param signature - A signed message to prove ownership of the address.
 * @returns A promise that resolves to the updated wallet information.
 */
export const connectWallet = async (address: string, signature: string): Promise<WalletInfo> => {
  const response = await fetch(`${API_BASE_URL}/wallet/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  });
  return handleResponse<WalletInfo>(response);
};

/**
 * Sends a request to the BFF to mint a new NFT.
 * This is a simplified representation; a real-world scenario would be more complex.
 * The BFF would interact with a minting service or a smart contract directly.
 *
 * @param name - The name of the NFT.
 * @param imageUrl - The image URL for the NFT's metadata.
 * @returns A promise that resolves to the details of the newly minted NFT.
 */
export const mintNFT = async (name: string, imageUrl: string): Promise<NFTAsset> => {
  const response = await fetch(`${API_BASE_URL}/nft/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      imageUrl,
      description: `A unique NFT minted through Demo Bank.`,
    }),
  });
  return handleResponse<NFTAsset>(response);
};
