/**
 * Provides functions for interacting with a backend API to create, retrieve, update, and delete user financial goals.
 * This service layer abstracts API calls from the UI components.
 */

// Define the Goal type directly within this service file for now.
// In a larger application, this would typically be imported from a central `types.ts` file (e.g., `../../../types`).
export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    dueDate: string; // ISO date string, e.g., "YYYY-MM-DD"
    status: 'active' | 'completed' | 'on_hold' | 'cancelled';
    category: string;
    createdAt: string; // ISO date string
    description?: string;
}

// Base URL for the goals API. Uses an environment variable for flexibility.
// Falls back to a default localhost URL if the environment variable is not set.
const GOALS_API_BASE_URL = process.env.GOALS_API_BASE_URL || 'http://localhost:3001/api/goals';

/**
 * Fetches all financial goals for the current user.
 * @returns A promise that resolves to an array of Goal objects or an error object.
 */
export const getGoals = async (): Promise<Goal[] | { error: string }> => {
    try {
        const response = await fetch(GOALS_API_BASE_URL);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data: Goal[] = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching goals:", error);
        return { error: `Failed to retrieve goals: ${(error as Error).message}` };
    }
};

/**
 * Fetches a single financial goal by its ID.
 * @param id The ID of the goal to retrieve.
 * @returns A promise that resolves to a Goal object or an error object.
 */
export const getGoalById = async (id: string): Promise<Goal | { error: string }> => {
    try {
        const response = await fetch(`${GOALS_API_BASE_URL}/${id}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data: Goal = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching goal ${id}:`, error);
        return { error: `Failed to retrieve goal ${id}: ${(error as Error).message}` };
    }
};

/**
 * Creates a new financial goal.
 * @param goalData The data for the new goal, excluding auto-generated fields like `id` and `createdAt`.
 * @returns A promise that resolves to the newly created Goal object or an error object.
 */
export const createGoal = async (goalData: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal | { error: string }> => {
    try {
        const response = await fetch(GOALS_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(goalData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const newGoal: Goal = await response.json();
        return newGoal;
    } catch (error) {
        console.error("Error creating goal:", error);
        return { error: `Failed to create goal: ${(error as Error).message}` };
    }
};

/**
 * Updates an existing financial goal.
 * @param id The ID of the goal to update.
 * @param updates The partial data containing fields to update.
 * @returns A promise that resolves to the updated Goal object or an error object.
 */
export const updateGoal = async (id: string, updates: Partial<Goal>): Promise<Goal | { error: string }> => {
    try {
        const response = await fetch(`${GOALS_API_BASE_URL}/${id}`, {
            method: 'PATCH', // Using PATCH for partial updates, PUT could also be used for full replacement
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const updatedGoal: Goal = await response.json();
        return updatedGoal;
    } catch (error) {
        console.error(`Error updating goal ${id}:`, error);
        return { error: `Failed to update goal ${id}: ${(error as Error).message}` };
    }
};

/**
 * Deletes a financial goal.
 * @param id The ID of the goal to delete.
 * @returns A promise that resolves to a success indicator or an error object.
 */
export const deleteGoal = async (id: string): Promise<{ success: boolean } | { error: string }> => {
    try {
        const response = await fetch(`${GOALS_API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        // Assuming a successful delete might return a 204 No Content or a simple success message
        return { success: true };
    } catch (error) {
        console.error(`Error deleting goal ${id}:`, error);
        return { error: `Failed to delete goal ${id}: ${(error as Error).message}` };
    }
};