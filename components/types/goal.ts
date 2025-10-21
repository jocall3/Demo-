export type GoalCategory =
    | 'Savings'
    | 'Debt Reduction'
    | 'Investment'
    | 'Retirement'
    | 'Education'
    | 'Housing'
    | 'Travel'
    | 'Emergency Fund'
    | 'Other';

export type GoalStatus =
    | 'active'
    | 'completed'
    | 'paused'
    | 'overdue'
    | 'archived';

export interface FinancialGoal {
    id: string;
    name: string;
    description?: string;
    category: GoalCategory;
    targetAmount: number; // The total amount planned for the goal
    currentAmount: number; // The amount currently contributed towards the goal
    startDate: string; // ISO date string when the goal was started
    targetDate?: string; // Optional ISO date string for the desired completion date
    progress: number; // Percentage completion (0-100)
    status: GoalStatus;
    // Optional: a list of contributions made to this goal
    contributions?: {
        date: string;
        amount: number;
        source?: string; // e.g., 'manual', 'automatic transfer'
    }[];
}