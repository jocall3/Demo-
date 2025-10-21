/**
 * Defines TypeScript interfaces for budget structures, financial goals,
 * and their associated progress tracking.
 */

export interface IBudget {
    id: string;
    name: string;
    category: string; // e.g., "Groceries", "Utilities", "Entertainment"
    limit: number; // The budgeted amount for the period
    spent: number; // The amount currently spent within this budget
    currency: string; // e.g., "USD", "EUR"
    period: 'weekly' | 'monthly' | 'yearly'; // The recurrence period of the budget
    startDate: string; // ISO date string, indicates the start of the current budget cycle (e.g., "2023-01-01")
    endDate?: string; // Optional: ISO date string, end of the current budget cycle, if not recurring or a specific term
    isRecurring: boolean; // True if the budget automatically renews
    alertThreshold?: number; // Optional: A percentage (0-100) at which to trigger an alert (e.g., 80 for 80% of limit)
}

export interface IFinancialGoal {
    id: string;
    name: string;
    description?: string;
    targetAmount: number; // The total amount needed to achieve the goal
    currentAmount: number; // The amount saved or contributed towards the goal so far
    currency: string; // e.g., "USD", "EUR"
    targetDate: string; // ISO date string, the desired date for achieving the goal (e.g., "2025-12-31")
    type: 'saving' | 'investment' | 'debt_reduction' | 'education' | 'retirement' | 'home_ownership' | 'other';
    priority: 'low' | 'medium' | 'high';
    status: 'on_track' | 'behind' | 'achieved' | 'deferred' | 'pending';
    progressPercentage: number; // Calculated: (currentAmount / targetAmount) * 100, stored for convenience
}