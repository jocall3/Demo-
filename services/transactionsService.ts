import { Transaction } from '../types';

// The base URL for the banking API, pointing to our BFF.
// The '/api' prefix is handled by the Vite proxy in development.
const API_URL = '/api/banking';

/**
 * Fetches a list of transactions for a specific user from the BFF.
 * This function is designed to be used by a React Query hook (e.g., `useTransactions`).
 * 
 * @param userId The ID of the user whose transactions are to be fetched.
 * @param accountId Optional. If provided, fetches transactions only for this account.
 * @returns A promise that resolves to an array of Transaction objects.
 * @throws Will throw an error if the network request fails.
 */
export const getTransactions = async (userId: string, accountId?: string): Promise<Transaction[]> => {
    const url = new URL(`${API_URL}/transactions`);
    url.searchParams.append('userId', userId);
    
    if (accountId) {
        url.searchParams.append('accountId', accountId);
    }

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown API error occurred.' }));
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        // Here we assume the DTO from the BFF matches the frontend Transaction type.
        // In a more robust setup, we might perform a transformation/validation step.
        return data as Transaction[];
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        // Re-throw the error so React Query's error handling mechanisms can catch it.
        throw error;
    }
};

/**
 * NOTE: The following functions are placeholders to demonstrate how this service
 * could be expanded. The corresponding BFF endpoints would need to be implemented.
 */

/**
 * Fetches a single transaction by its ID.
 * @param transactionId The ID of the transaction to fetch.
 * @returns A promise that resolves to a single Transaction object.
 */
/*
export const getTransactionById = async (transactionId: string): Promise<Transaction> => {
    const response = await fetch(`${API_URL}/transactions/${transactionId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch transaction details.');
    }
    return await response.json();
};
*/

/**
 * Creates a new transaction.
 * @param newTransactionData Data for the new transaction, excluding the ID.
 * @returns A promise that resolves to the newly created Transaction object.
 */
/*
export const createTransaction = async (newTransactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTransactionData),
    });

    if (!response.ok) {
        throw new Error('Failed to create transaction.');
    }

    return await response.json();
};
*/
