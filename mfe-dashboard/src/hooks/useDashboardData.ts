/**
 * @file mfe-dashboard/src/hooks/useDashboardData.ts
 * @description A custom hook for fetching all necessary data for the Dashboard Micro-Frontend.
 * This hook aligns with the architectural directive to separate server and client state,
 * using TanStack Query to manage all server state for this MFE.
 *
 * @see https://tanstack.com/query/latest/docs/react/overview
 * @author Elite AI Implementation Team
 */

import { useQuery } from '@tanstack/react-query';
// As per the architecture, shared types would come from a versioned UI library package.
// Using a relative path for now, assuming the types are accessible during the transition.
import type {
  Transaction,
  AIInsight,
  BudgetCategory,
  GamificationState,
  Subscription,
  CreditScore,
  UpcomingBill,
  FinancialGoal,
  MarketMover,
  RewardPoints,
} from '../../../types';

// --- Type Definitions ---

/**
 * @interface BalanceSummaryData
 * @description Represents the pre-aggregated data structure for the balance summary widget.
 */
export interface BalanceSummaryData {
  totalBalance: number;
  change30d: number;
  chartData: { name: string; balance: number }[];
}

/**
 * @interface ImpactData
 * @description Represents data for the green impact tracking widget.
 */
export interface ImpactData {
  treesPlanted: number;
  progressToNextTree: number;
}

/**
 * @interface WealthTimelineDataPoint
 * @description A single data point for the wealth timeline chart, including historical and projected values.
 */
export interface WealthTimelineDataPoint {
  month: string;
  balance: number | null;
  projection: number | null;
}

/**
 * @interface AIPredictiveBundle
 * @description Data for the AI-driven product bundle recommendation widget.
 */
export interface AIPredictiveBundle {
  title: string;
  description: string;
  images: string[];
}

/**
 * @interface LinkedAccount
 * @description Basic information about a linked financial account, used to determine if the user has onboarded.
 */
export interface LinkedAccount {
  id: string;
  name: string;
}

/**
 * @interface DashboardData
 * @description The comprehensive data structure for the entire dashboard, mirroring the GraphQL query result.
 * This single type defines all server state required by the Dashboard MFE.
 */
export interface DashboardData {
  balanceSummary: BalanceSummaryData;
  transactions: Transaction[];
  aiInsights: AIInsight[];
  impact: ImpactData;
  wealthTimeline: WealthTimelineDataPoint[];
  linkedAccounts: LinkedAccount[];
  gamification: GamificationState;
  creditHealth: { score: CreditScore };
  rewards: { points: RewardPoints };
  subscriptions: Subscription[];
  upcomingBills: UpcomingBill[];
  budgets: BudgetCategory[];
  financialGoals: FinancialGoal[];
  marketMovers: MarketMover[];
  aiPredictiveBundle?: AIPredictiveBundle;
}

// --- GraphQL Layer ---

/**
 * @const GET_DASHBOARD_DATA_QUERY
 * @description A comprehensive GraphQL query to fetch all data needed for the dashboard MFE
 * in a single network request. This is sent to the federated API gateway (supergraph).
 */
const GET_DASHBOARD_DATA_QUERY = `
  query GetDashboardData {
    userData {
      balanceSummary {
        totalBalance
        change30d
        chartData { name, balance }
      }
      transactions(limit: 5) {
        id
        type
        category
        description
        amount
        date
        carbonFootprint
      }
      aiInsights {
        id
        title
        description
        urgency
        chartData { name, value }
      }
      impact {
        treesPlanted
        progressToNextTree
      }
      wealthTimeline {
        month
        balance
        projection
      }
      linkedAccounts {
        id
        name
      }
      gamification {
        score
        level
        levelName
        progress
      }
      creditHealth {
        score {
          score
          change
          rating
        }
      }
      rewards {
        points {
          balance
          currency
        }
      }
      subscriptions {
        id
        name
        amount
        nextPayment
        iconName
      }
      upcomingBills {
        id
        name
        amount
        dueDate
      }
      budgets {
        id
        name
        limit
        spent
        color
      }
      financialGoals {
        id
        name
        targetAmount
        currentAmount
        iconName
      }
      marketMovers {
        ticker
        name
        price
        change
      }
      aiPredictiveBundle {
        title
        description
        images
      }
    }
  }
`;

/**
 * @async
 * @function fetchDashboardData
 * @description An asynchronous function that fetches the complete dashboard data from the GraphQL gateway.
 * This function serves as the `queryFn` for the `useDashboardData` TanStack Query hook.
 * @returns {Promise<DashboardData>} A promise that resolves to the complete dashboard data.
 * @throws {Error} Throws an error if the network request or GraphQL execution fails.
 */
const fetchDashboardData = async (): Promise<DashboardData> => {
  // The GraphQL endpoint URL should be configured via environment variables and supplied by the shell.
  const graphqlEndpoint = process.env.REACT_APP_GRAPHQL_ENDPOINT || '/graphql';

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real MFE architecture, an authentication token would be retrieved from a shared
      // authentication service/context provided by the shell and included here.
      // Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ query: GET_DASHBOARD_DATA_QUERY }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.errors?.[0]?.message || `Request failed with status ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    console.error('GraphQL Errors:', errors);
    throw new Error(errors.map((e: { message: string }) => e.message).join('\n'));
  }

  if (!data?.userData) {
    throw new Error('Invalid data structure returned from API: "userData" object is missing.');
  }

  return data.userData;
};

// --- Custom Hook ---

/**
 * @hook useDashboardData
 * @description A custom hook that serves as the single entry point for fetching and managing all
 * server state required by the Dashboard MFE. It uses TanStack Query (`useQuery`) to handle
 * data fetching, caching, background synchronization, and error handling.
 * This hook completely abstracts away the data fetching logic from the UI components,
 * adhering to the principle of separating server and client state.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult<DashboardData, Error>}
 * The result object from TanStack Query, which includes `data`, `isLoading`, `isError`, `error`, `refetch`, etc.
 */
export const useDashboardData = () => {
  return useQuery<DashboardData, Error>({ 
    queryKey: ['dashboardData'], 
    queryFn: fetchDashboardData,
    // Configuration for TanStack Query:
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes, preventing unnecessary refetches.
    refetchOnWindowFocus: true, // Automatically refetch data when the user returns to the tab.
    retry: 1, // Attempt to refetch once on failure before showing an error state.
  });
};
