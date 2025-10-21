import { mockTransactions, mockBudgets } from '../../data/mockData';

// --- TYPES ---
// These types represent the domain models for transactions and budgets.
// In a larger application, these might be defined in a central 'types.ts' file (e.g., '../../types.ts').
// For self-containment within this service file, they are defined here.

export interface Transaction {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    accountId: string;
}

export interface Budget {
    id: string;
    userId: string;
    category: string;
    amount: number; // The total budgeted amount for the period
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    currency: string;
}

export interface BudgetPerformance {
    id: string;
    category: string;
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageSpent: number;
    status: 'on-track' | 'overspent' | 'underspent'; // Indicates current status of the budget
    timeProgress: number; // How far along in the budget's time period (0 to 1)
}

// --- CONSTANTS ---
// Simulate network latency for API calls
const API_DELAY = 300; // Standard operations (ms)
const API_ANALYTICS_DELAY = 500; // Analytics or AI-driven operations (ms)

// --- UTILITY FUNCTIONS ---
const generateUniqueId = (): string => `budget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// --- MOCK API SERVICE IMPLEMENTATION ---
/**
 * This object provides a mock implementation for budgeting API functionalities.
 * It simulates asynchronous operations and interacts with local mock data.
 * In a real application, these functions would make actual HTTP requests to a backend service.
 */
const budgetingApi = {
    /**
     * Simulates fetching all budgets for a given user.
     * @param userId The ID of the user.
     * @returns A promise that resolves to an array of Budget objects.
     */
    async getBudgets(userId: string): Promise<Budget[]> {
        console.log(`[budgetingApi] Fetching budgets for user: ${userId}`);
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        // Filter mock budgets by userId to simulate personalized data
        return (mockBudgets as Budget[]).filter(budget => budget.userId === userId);
    },

    /**
     * Simulates creating a new budget for a user.
     * @param newBudget The budget data to create (without an 'id', which will be generated).
     * @returns A promise that resolves to the newly created Budget object, including its generated ID.
     */
    async createBudget(newBudget: Omit<Budget, 'id'>): Promise<Budget> {
        console.log('[budgetingApi] Creating new budget:', newBudget);
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        const budget: Budget = {
            id: generateUniqueId(),
            ...newBudget,
        };
        // In a real backend, this would persist the budget to a database.
        // For this mock, we simply return the new budget as if it were saved.
        // To simulate persistent mock state across calls, 'budget' could be added to 'mockBudgets' array,
        // but this adds complexity to mock data management.
        return budget;
    },

    /**
     * Simulates updating an existing budget.
     * @param updatedBudget The complete Budget object with updated fields.
     * @returns A promise that resolves to the updated Budget object.
     */
    async updateBudget(updatedBudget: Budget): Promise<Budget> {
        console.log('[budgetingApi] Updating budget:', updatedBudget);
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        // In a real backend, this would locate and update the budget in the database.
        // For mock, we assume the update is successful and return the provided updated data.
        return updatedBudget;
    },

    /**
     * Simulates deleting a budget by its ID.
     * @param budgetId The ID of the budget to delete.
     * @returns A promise that resolves to `true` if deletion is successful, `false` otherwise (in a real app).
     */
    async deleteBudget(budgetId: string): Promise<boolean> {
        console.log(`[budgetingApi] Deleting budget with ID: ${budgetId}`);
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        // In a real backend, this would remove the budget from the database.
        // For mock, we simply indicate success.
        return true;
    },

    /**
     * Calculates and returns the performance details for a specific budget.
     * This involves analyzing relevant user transactions against the budgeted amount and period.
     * @param budgetId The ID of the budget to analyze.
     * @param userId The ID of the user who owns the budget.
     * @param transactions All user transactions (typically provided from a central data context or fetched).
     * @returns A promise that resolves to a BudgetPerformance object, or `null` if the budget is not found.
     */
    async getBudgetPerformance(budgetId: string, userId: string, transactions: Transaction[]): Promise<BudgetPerformance | null> {
        console.log(`[budgetingApi] Analyzing performance for budget: ${budgetId} (user: ${userId})`);
        await new Promise(resolve => setTimeout(resolve, API_ANALYTICS_DELAY));

        const budget = (mockBudgets as Budget[]).find(b => b.id === budgetId && b.userId === userId);
        if (!budget) {
            console.warn(`[budgetingApi] Budget with ID ${budgetId} not found for user ${userId}.`);
            return null;
        }

        const startDate = new Date(budget.startDate);
        const endDate = new Date(budget.endDate);
        const now = new Date();

        // Calculate time progress within the budget period (0 to 1)
        const totalDurationMs = endDate.getTime() - startDate.getTime();
        const elapsedDurationMs = now.getTime() - startDate.getTime();
        let timeProgress = 0;
        if (totalDurationMs > 0) {
            timeProgress = Math.max(0, Math.min(1, elapsedDurationMs / totalDurationMs));
        }

        // Filter transactions relevant to this budget's category, type, and date range
        const relevantTransactions = transactions.filter(tx =>
            tx.userId === userId &&
            tx.category === budget.category &&
            tx.type === 'expense' &&
            new Date(tx.date) >= startDate &&
            new Date(tx.date) <= endDate
        );

        const spentAmount = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const remainingAmount = budget.amount - spentAmount;
        const percentageSpent = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
        
        let status: BudgetPerformance['status'] = 'on-track';

        // Determine budget status based on spending and time progress
        if (spentAmount > budget.amount) {
            status = 'overspent';
        } else if (timeProgress > 0.05 && percentageSpent / timeProgress > 110) {
            // If spending is significantly ahead of schedule (e.g., 10% more than expected for the time elapsed)
            status = 'overspent';
        } else if (remainingAmount > 0 && now > endDate) {
            // Budget period ended with money still remaining
            status = 'underspent';
        } else if (spentAmount === 0 && now > endDate) {
            // Budget period ended with nothing spent in the category
            status = 'underspent'; // Could be 'unused'
        }

        return {
            id: budget.id,
            category: budget.category,
            budgetedAmount: parseFloat(budget.amount.toFixed(2)),
            spentAmount: parseFloat(spentAmount.toFixed(2)),
            remainingAmount: parseFloat(remainingAmount.toFixed(2)),
            percentageSpent: parseFloat(percentageSpent.toFixed(2)),
            status,
            timeProgress: parseFloat(timeProgress.toFixed(2))
        };
    },

    /**
     * Calculates and returns the overall budget performance across all active budgets for a user.
     * @param userId The ID of the user.
     * @param transactions All user transactions.
     * @returns A promise that resolves to an array of BudgetPerformance objects.
     */
    async getOverallBudgetPerformance(userId: string, transactions: Transaction[]): Promise<BudgetPerformance[]> {
        console.log(`[budgetingApi] Analyzing overall budget performance for user: ${userId}`);
        await new Promise(resolve => setTimeout(resolve, API_ANALYTICS_DELAY));

        const userBudgets = (mockBudgets as Budget[]).filter(budget => budget.userId === userId);
        const performances: BudgetPerformance[] = [];

        for (const budget of userBudgets) {
            const performance = await budgetingApi.getBudgetPerformance(budget.id, userId, transactions);
            if (performance) {
                performances.push(performance);
            }
        }
        return performances;
    },

    /**
     * Simulates an AI-driven suggestion for new budget categories and amounts based on recent spending.
     * This function models a backend process that analyzes past transaction data.
     * @param userId The ID of the user.
     * @param transactions All user transactions.
     * @returns A promise that resolves to an array of suggested budget configurations.
     */
    async suggestBudgets(userId: string, transactions: Transaction[]): Promise<Omit<Budget, 'id' | 'userId' | 'currency'>[]> {
        console.log(`[budgetingApi] Suggesting budgets for user: ${userId}`);
        await new Promise(resolve => setTimeout(resolve, API_ANALYTICS_DELAY));

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

        // Filter for recent expenses by the user
        const recentExpenses = transactions.filter(tx =>
            tx.userId === userId &&
            tx.type === 'expense' &&
            new Date(tx.date) >= thirtyDaysAgo
        );

        // Aggregate spending by category
        const spendingByCategory: Record<string, number> = recentExpenses.reduce((acc, tx) => {
            acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
            return acc;
        }, {});

        // Suggest a budget amount based on past spending (e.g., 10% more)
        const suggested: Omit<Budget, 'id' | 'userId' | 'currency'>[] = Object.entries(spendingByCategory).map(([category, amount]) => ({
            category,
            amount: parseFloat((amount * 1.1).toFixed(2)), // Suggest 10% more than previous spending
            startDate: new Date().toISOString().split('T')[0], // Start of current month/period
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0], // End of current month
        }));

        return suggested;
    }
};

export default budgetingApi;