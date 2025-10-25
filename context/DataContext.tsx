/**
 * @file context/DataContext.tsx
 * @description This file establishes the primary data context for the application, transitioning from a local useState-based
 * implementation to a modern, GraphQL-driven approach using @tanstack/react-query for server state management.
 * 
 * ARCHITECTURAL OVERVIEW:
 * - This DataContext now serves as a facade over React Query, providing a consistent data access layer for components that have not yet been individually refactored to use hooks directly.
 * - Server state (e.g., transactions, assets, goals) is fetched via GraphQL queries defined herein.
 * - State mutations are handled by GraphQL mutations, triggered via React Query's useMutation hook.
 * - For actions where a GraphQL mutation is not yet available in the schema (e.g., addBudget), this context performs an optimistic client-side update using `queryClient.setQueryData` as a temporary measure.
 * - All data fetching logic is encapsulated, presenting a clean, hook-like interface (`useContext(DataContext)`) to consumer components.
 */

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as types from '../types';
import { useAuth } from './AuthContext'; // Import useAuth from AuthContext
import { PlaidLinkSuccessMetadata } from '../components/PlaidLinkButton';

// ===============================================================================================
// GRAPHQL CLIENT & OPERATIONS
// ===============================================================================================

// --- GraphQL Queries ---

const USER_DATA_QUERY = `
  query GetUserData {
    userData {
      transactions { id type category description amount date carbonFootprint }
      assets { name value color esgRating description performanceYTD }
      aiInsights { id title description urgency chartData { name value } }
      budgets { id name limit spent color }
      financialGoals {
        id name targetAmount targetDate currentAmount iconName
        plan { feasibilitySummary monthlyContribution steps { title description category } }
        contributions { id amount date type }
      }
      cryptoPortfolio {
        assets { ticker name value amount color }
        nfts { id name imageUrl contractAddress }
      }
      corporateData {
        cards { id holderName cardNumberMask status frozen controls { atm contactless online monthlyLimit } }
        transactions { id cardId holderName merchant amount status timestamp }
      }
      creditHealth {
        score { score change rating }
        factors { name status description }
        aiTip
      }
      rewards {
        points { balance currency }
        items { id name cost type description iconName }
      }
      notifications { id message timestamp read view }
      apiStatus { provider status responseTime }
      # Assuming linked accounts are now part of userData.accounts, derived from user-service and accounts-service
      accounts { id userId name mask type subtype balance { available current iso_currency_code } }
    }
  }
`;

const Q_WEAVER_STATE_QUERY = `
  query GetQuantumWeaverState {
    quantumWeaverState {
      stage businessPlan feedback loanAmount error
      questions { id question category }
      coachingPlan { feasibilitySummary monthlyContribution steps { title description category timeline } }
    }
  }
`;

// --- GraphQL Mutations ---

const PITCH_BUSINESS_PLAN_MUTATION = `
  mutation PitchBusinessPlan($plan: String!) {
    pitchBusinessPlan(plan: $plan) { stage businessPlan feedback questions { id question category } error }
  }
`;

const SIMULATE_WEAVER_TEST_PASS_MUTATION = `
  mutation SimulateWeaverTestPass {
    simulateWeaverTestPass { stage loanAmount coachingPlan { feasibilitySummary monthlyContribution steps { title description category timeline } } error }
  }
`;

const GENERATE_GOAL_PLAN_MUTATION = `
  mutation GenerateGoalPlan($goalId: ID!) {
    generateGoalPlan(goalId: $goalId) { id plan { feasibilitySummary monthlyContribution steps { title description category timeline } } }
  }
`;

const EXCHANGE_PUBLIC_TOKEN_MUTATION = `
  mutation ExchangePublicToken($publicToken: String!, $userId: ID!) {
    exchangePublicToken(publicToken: $publicToken, userId: $userId)
  }
`;

const SEND_MONEY_MUTATION = `
  mutation SendMoney($input: SendMoneyInput!) {
    sendMoney(input: $input) { id type category description amount date }
  }
`;

const ADD_BUDGET_MUTATION = `
  mutation AddBudget($input: NewBudgetInput!) {
    addBudget(input: $input) { id name limit spent color }
  }
`;

const UNLINK_ACCOUNT_MUTATION = `
  mutation UnlinkAccount($accountId: ID!) {
    unlinkAccount(accountId: $accountId)
  }
`;

const ADD_FINANCIAL_GOAL_MUTATION = `
  mutation AddFinancialGoal($input: NewFinancialGoalInput!) {
    addFinancialGoal(input: $input) { id name targetAmount targetDate currentAmount iconName }
  }
`;

const CONTRIBUTE_TO_GOAL_MUTATION = `
  mutation ContributeToGoal($goalId: ID!, $amount: Float!) {
    contributeToGoal(goalId: $goalId, amount: $amount) { id currentAmount contributions { id amount date type } }
  }
`;

const UPDATE_CORPORATE_CARD_MUTATION = `
  mutation UpdateCorporateCard($cardId: ID!, $controls: CorporateCardControlsInput!, $frozen: Boolean!) {
    updateCorporateCard(cardId: $cardId, controls: $controls, frozen: $frozen) { id controls { atm contactless online monthlyLimit } frozen }
  }
`;

// ===============================================================================================
// CONTEXT DEFINITION
// ===============================================================================================

interface IDataContext extends types.UserData {
  // State from other queries
  weaverState: types.QuantumWeaverState;
  // Loading states
  isLoading: boolean;
  // Mutations & Actions
  addTransaction: (input: { recipient: string; amount: number }) => void;
  addBudget: (budget: { name: string; limit: number }) => void;
  addFinancialGoal: (goal: Omit<types.FinancialGoal, 'id' | 'currentAmount' | 'plan' | 'contributions'>) => void;
  generateGoalPlan: (goalId: string) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  updateCorporateCard: (id: string, controls: types.CorporateCardControls, frozen: boolean) => void;
  initiatePayment: (details: { fromAccountId: string; toAccountId: string; amount: number; currency: string; userId: string; }) => void;
  pitchBusinessPlan: (plan: string) => void;
  simulateTestPass: () => void;
  handlePlaidSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
  unlinkAccount: (accountId: string) => void;
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

// ===============================================================================================
// DATA PROVIDER COMPONENT
// ===============================================================================================

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently, user } = useAuth(); // Get token acquisition function and user

  // A memoized GraphQL client function that injects the authorization token.
  const authenticatedGraphqlClient = useCallback(async <T>(query: string, variables?: Record<string, any>): Promise<T> => {
    const token = await getAccessTokenSilently();
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Network response was not ok' }));
      throw new Error(errorBody.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`);
    }

    const { data, errors } = await response.json();
    if (errors) {
      throw new Error(errors.map((e: { message: string }) => e.message).join('\n'));
    }

    return data;
  }, [getAccessTokenSilently]);

  // --- DATA FETCHING (QUERIES) ---
  const { data: userDataPayload, isLoading: isUserDataLoading } = useQuery<{ userData: types.UserData }>(
    { queryKey: ['userData'], queryFn: () => authenticatedGraphqlClient(USER_DATA_QUERY) }
  );

  const { data: weaverStatePayload, isLoading: isWeaverStateLoading } = useQuery<{ quantumWeaverState: types.QuantumWeaverState }>(
    { queryKey: ['weaverState'], queryFn: () => authenticatedGraphqlClient(Q_WEAVER_STATE_QUERY) }
  );

  const userData = userDataPayload?.userData;
  const weaverState = weaverStatePayload?.quantumWeaverState;

  // --- SERVER-SIDE ACTIONS (MUTATIONS) ---

  const exchangeTokenMutation = useMutation({
    mutationFn: (variables: { publicToken: string; userId: string }) => authenticatedGraphqlClient(EXCHANGE_PUBLIC_TOKEN_MUTATION, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] }); // Refetch all user data to get new accounts/transactions
    },
  });

  const pitchBusinessPlanMutation = useMutation({
    mutationFn: (variables: { plan: string }) => authenticatedGraphqlClient(PITCH_BUSINESS_PLAN_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weaverState'] })
  });

  const simulateWeaverTestPassMutation = useMutation({
    mutationFn: () => authenticatedGraphqlClient(SIMULATE_WEAVER_TEST_PASS_MUTATION),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weaverState'] })
  });

  const generateGoalPlanMutation = useMutation({
    mutationFn: (variables: { goalId: string }) => authenticatedGraphqlClient(GENERATE_GOAL_PLAN_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const sendMoneyMutation = useMutation({
    mutationFn: (variables: { input: { recipient: string; amount: number }}) => authenticatedGraphqlClient(SEND_MONEY_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const addBudgetMutation = useMutation({
    mutationFn: (variables: { input: { name: string; limit: number }}) => authenticatedGraphqlClient(ADD_BUDGET_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const unlinkAccountMutation = useMutation({
    mutationFn: (variables: { accountId: string }) => authenticatedGraphqlClient(UNLINK_ACCOUNT_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const addFinancialGoalMutation = useMutation({
    mutationFn: (variables: { input: Omit<types.FinancialGoal, 'id' | 'currentAmount' | 'plan' | 'contributions'> }) => authenticatedGraphqlClient(ADD_FINANCIAL_GOAL_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const contributeToGoalMutation = useMutation({
    mutationFn: (variables: { goalId: string; amount: number }) => authenticatedGraphqlClient(CONTRIBUTE_TO_GOAL_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const updateCorporateCardMutation = useMutation({
    mutationFn: (variables: { cardId: string; controls: types.CorporateCardControls; frozen: boolean; }) => authenticatedGraphqlClient(UPDATE_CORPORATE_CARD_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  // --- ACTION HANDLERS ---

  const handlePlaidSuccess = useCallback((publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
    if (!user?.sub) {
        console.error('User ID not available for Plaid token exchange.');
        return;
    }
    exchangeTokenMutation.mutate({ publicToken, userId: user.sub });
  }, [exchangeTokenMutation, user]);
  
  // The original addTransaction takes Partial<types.Transaction>, adapting it for SendMoneyInput
  const addTransaction = useCallback((input: { recipient: string; amount: number }) => {
    sendMoneyMutation.mutate({ input });
  }, [sendMoneyMutation]);

  const addBudget = useCallback((budget: { name: string; limit: number }) => {
    addBudgetMutation.mutate({ input: budget });
  }, [addBudgetMutation]);

  const unlinkAccount = useCallback((accountId: string) => {
    unlinkAccountMutation.mutate({ accountId });
  }, [unlinkAccountMutation]);

  const addFinancialGoal = useCallback((goal: Omit<types.FinancialGoal, 'id' | 'currentAmount' | 'plan' | 'contributions'>) => {
    addFinancialGoalMutation.mutate({ input: goal });
  }, [addFinancialGoalMutation]);

  const contributeToGoal = useCallback((goalId: string, amount: number) => {
    contributeToGoalMutation.mutate({ goalId, amount });
  }, [contributeToGoalMutation]);

  const updateCorporateCard = useCallback((cardId: string, controls: types.CorporateCardControls, frozen: boolean) => {
    updateCorporateCardMutation.mutate({ cardId, controls, frozen });
  }, [updateCorporateCardMutation]);

  const initiatePayment = useCallback((details: { fromAccountId: string; toAccountId: string; amount: number; currency: string; userId: string; }) => {
    // This is a placeholder for a more complex payment initiation. For now, it logs.
    console.warn('Initiate payment not fully implemented yet, logging details:', details);
    // A potential mutation for this could be developed based on the transactions-service Temporal workflow.
  }, []);

  const pitchBusinessPlan = useCallback((plan: string) => pitchBusinessPlanMutation.mutate({ plan }), [pitchBusinessPlanMutation]);
  const simulateTestPass = useCallback(() => simulateWeaverTestPassMutation.mutate(), [simulateWeaverTestPassMutation]);
  const generateGoalPlan = useCallback((goalId: string) => generateGoalPlanMutation.mutate({ goalId }), [generateGoalPlanMutation]);

  // --- CONTEXT VALUE ASSEMBLY ---

  const value = useMemo(() => ({
    // Data from queries (with defaults for loading states)
    transactions: userData?.transactions ?? [],
    assets: userData?.assets ?? [],
    aiInsights: userData?.aiInsights ?? [],
    budgets: userData?.budgets ?? [],
    financialGoals: userData?.financialGoals ?? [],
    cryptoPortfolio: userData?.cryptoPortfolio ?? { assets: [], nfts: [] },
    corporateData: userData?.corporateData ?? { cards: [], transactions: [] },
    creditHealth: userData?.creditHealth ?? {} as types.CreditHealth,
    rewards: userData?.rewards ?? {} as types.Rewards,
    notifications: userData?.notifications ?? [],
    apiStatus: userData?.apiStatus ?? [],
    accounts: userData?.accounts ?? [], // Now directly from userData
    // Spreading other fields for convenience
    ...(userData || {}),
    // Other states
    weaverState: weaverState ?? {} as types.QuantumWeaverState,
    // Loading state
    isLoading: isUserDataLoading || isWeaverStateLoading,
    // Actions
    addTransaction,
    addBudget,
    addFinancialGoal,
    generateGoalPlan,
    contributeToGoal,
    updateCorporateCard,
    initiatePayment,
    pitchBusinessPlan,
    simulateTestPass,
    handlePlaidSuccess,
    unlinkAccount,
  }), [userData, weaverState, isUserDataLoading, isWeaverStateLoading, addTransaction, addBudget, addFinancialGoal, generateGoalPlan, contributeToGoal, updateCorporateCard, initiatePayment, pitchBusinessPlan, simulateTestPass, handlePlaidSuccess, unlinkAccount]);

  return <DataContext.Provider value={value as IDataContext}>{children}</DataContext.Provider>;
};

/**
 * Custom hook to consume the DataContext.
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
