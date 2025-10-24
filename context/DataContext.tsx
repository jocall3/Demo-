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

import React, { createContext, useContext, useCallback, useMemo, ReactNode, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as types from '../types';
import { PlaidLinkSuccessMetadata } from '../components/PlaidLinkButton';

// ===============================================================================================
// GRAPHQL CLIENT & OPERATIONS
// ===============================================================================================

/**
 * A lightweight GraphQL client function using fetch.
 * In a larger app, this could be replaced with a more robust client like `graphql-request`.
 */
async function graphqlClient<T>(query: string, variables?: Record<string, any>): Promise<T> {
  // The BFF is proxied to /graphql in the Vite config
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header would be added here, e.g., from an auth context or Redux state
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const { data, errors } = await response.json();
  if (errors) {
    // Combine multiple GraphQL errors into a single Error object
    throw new Error(errors.map((e: { message: string }) => e.message).join('\n'));
  }

  return data;
}

// --- GraphQL Queries ---

const USER_DATA_QUERY = `
  query GetUserData {
    userData {
      transactions { id type category description amount date carbonFootprint }
      assets { name value color esgRating description performanceYTD }
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
    }
  }
`;

const Q_WEAVER_STATE_QUERY = `
  query GetQuantumWeaverState {
    quantumWeaverState {
      stage businessPlan feedback loanAmount error
      questions { id question category }
      coachingPlan { feasibilitySummary monthlyContribution steps { title description category } }
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
    simulateWeaverTestPass { stage loanAmount coachingPlan { feasibilitySummary monthlyContribution steps { title description category } } error }
  }
`;

const GENERATE_GOAL_PLAN_MUTATION = `
  mutation GenerateGoalPlan($goalId: ID!) {
    generateGoalPlan(goalId: $goalId) { id plan { feasibilitySummary monthlyContribution steps { title description category } } }
  }
`;

const EXCHANGE_PUBLIC_TOKEN_MUTATION = `
  mutation ExchangePublicToken($publicToken: String!) {
    exchangePublicToken(publicToken: $publicToken)
  }
`;

const SEND_MONEY_MUTATION = `
  mutation SendMoney($input: SendMoneyInput!) {
    sendMoney(input: $input) { id type category description amount date }
  }
`;


// ===============================================================================================
// CONTEXT DEFINITION
// ===============================================================================================

interface IDataContext extends types.UserData {
  // State from other queries
  weaverState: types.QuantumWeaverState;
  // Standalone client-side state
  linkedAccounts: types.LinkedAccount[];
  // Loading states
  isLoading: boolean;
  // Mutations & Actions
  addTransaction: (tx: Partial<types.Transaction>) => void;
  addBudget: (budget: { name: string; limit: number }) => void;
  addFinancialGoal: (goal: Omit<types.FinancialGoal, 'id' | 'currentAmount' | 'plan'>) => void;
  generateGoalPlan: (goalId: string) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  updateCorporateCard: (id: string, controls: types.CorporateCardControls, frozen: boolean) => void;
  initiatePayment: (details: { amount: number; description: string; type: 'ACH' | 'Wire' }) => void;
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
  const [linkedAccounts, setLinkedAccounts] = useState<types.LinkedAccount[]>([]);

  // --- DATA FETCHING (QUERIES) ---
  const { data: userDataPayload, isLoading: isUserDataLoading } = useQuery<{
    userData: types.UserData;
  }>({ queryKey: ['userData'], queryFn: () => graphqlClient(USER_DATA_QUERY) });

  const { data: weaverStatePayload, isLoading: isWeaverStateLoading } = useQuery<{
    quantumWeaverState: types.QuantumWeaverState;
  }>({ queryKey: ['weaverState'], queryFn: () => graphqlClient(Q_WEAVER_STATE_QUERY) });

  const userData = userDataPayload?.userData;
  const weaverState = weaverStatePayload?.quantumWeaverState;

  // --- SERVER-SIDE ACTIONS (MUTATIONS) ---

  const exchangeTokenMutation = useMutation({
    mutationFn: (variables: { publicToken: string }) => graphqlClient(EXCHANGE_PUBLIC_TOKEN_MUTATION, variables),
    onSuccess: (_, variables) => {
        // In a real app, we'd get account info back or refetch a query.
        // For now, we simulate adding the linked account to client state.
        console.log("Plaid public token exchanged successfully on the backend.");
        // This part is a mock for UI feedback as the schema doesn't return account data.
        // setLinkedAccounts(prev => [...prev, { id: variables.publicToken, name: 'New Bank', mask: '0000' }]);
    },
  });

  const pitchBusinessPlanMutation = useMutation({
    mutationFn: (variables: { plan: string }) => graphqlClient(PITCH_BUSINESS_PLAN_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weaverState'] })
  });

  const simulateTestPassMutation = useMutation({
    mutationFn: () => graphqlClient(SIMULATE_WEAVER_TEST_PASS_MUTATION),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weaverState'] })
  });

  const generateGoalPlanMutation = useMutation({
    mutationFn: (variables: { goalId: string }) => graphqlClient(GENERATE_GOAL_PLAN_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  const sendMoneyMutation = useMutation({
    mutationFn: (variables: { input: { recipient: string; amount: number }}) => graphqlClient(SEND_MONEY_MUTATION, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userData'] })
  });

  // --- ACTION HANDLERS ---

  const handlePlaidSuccess = useCallback((publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
    exchangeTokenMutation.mutate({ publicToken });
    // Optimistically update the UI with the new linked account.
    const newAccount: types.LinkedAccount = {
      id: metadata.institution.institution_id,
      name: metadata.institution.name,
      mask: metadata.accounts[0]?.mask ?? '****',
    };
    setLinkedAccounts(prev => [...prev.filter(acc => acc.id !== newAccount.id), newAccount]);
  }, [exchangeTokenMutation]);
  
  const addTransaction = useCallback((tx: Partial<types.Transaction>) => {
    sendMoneyMutation.mutate({ input: { recipient: tx.description ?? 'Unknown', amount: tx.amount ?? 0 } });
  }, [sendMoneyMutation]);

  const pitchBusinessPlan = useCallback((plan: string) => pitchBusinessPlanMutation.mutate({ plan }), [pitchBusinessPlanMutation]);
  const simulateTestPass = useCallback(() => simulateTestPassMutation.mutate(), [simulateTestPassMutation]);
  const generateGoalPlan = useCallback((goalId: string) => generateGoalPlanMutation.mutate({ goalId }), [generateGoalPlanMutation]);

  // --- CLIENT-SIDE "MUTATIONS" (OPTIMISTIC UPDATES) ---
  // These are placeholders for when GraphQL mutations are not available.

  const addBudget = useCallback((newBudget: { name: string; limit: number }) => {
    console.warn("Performing client-side mutation for addBudget. A real GraphQL mutation is needed.");
    queryClient.setQueryData(['userData'], (oldData: any) => {
      if (!oldData) return oldData;
      const newBudgets = [...(oldData.userData.budgets || []), {
        id: `budget_${Date.now()}`,
        name: newBudget.name,
        limit: newBudget.limit,
        spent: 0,
        color: '#8b5cf6' // Default color
      }];
      return { ...oldData, userData: { ...oldData.userData, budgets: newBudgets } };
    });
  }, [queryClient]);

  const unlinkAccount = useCallback((accountId: string) => {
    console.warn("Performing client-side mutation for unlinkAccount. A real GraphQL mutation is needed.");
    setLinkedAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, []);
  
  // Other placeholders
  const addFinancialGoal = (goal: any) => console.warn("addFinancialGoal not implemented.", goal);
  const contributeToGoal = (goalId: string, amount: number) => console.warn("contributeToGoal not implemented.", {goalId, amount});
  const updateCorporateCard = (id: string) => console.warn("updateCorporateCard not implemented.", id);
  const initiatePayment = (details: any) => console.warn("initiatePayment not implemented.", details);

  // --- CONTEXT VALUE ASSEMBLY ---

  const value = useMemo(() => ({
    // Data from queries (with defaults for loading states)
    transactions: userData?.transactions ?? [],
    assets: userData?.assets ?? [],
    budgets: userData?.budgets ?? [],
    financialGoals: userData?.financialGoals ?? [],
    cryptoPortfolio: userData?.cryptoPortfolio ?? { assets: [], nfts: [] },
    corporateData: userData?.corporateData ?? { cards: [], transactions: [] },
    // Spreading other fields for convenience
    ...(userData || {}),
    // Other states
    weaverState: weaverState ?? {} as types.QuantumWeaverState,
    linkedAccounts,
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
  }), [userData, weaverState, linkedAccounts, isUserDataLoading, isWeaverStateLoading, addTransaction, addBudget, generateGoalPlan, pitchBusinessPlan, simulateTestPass, handlePlaidSuccess, unlinkAccount]);

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
};
