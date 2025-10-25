import React, { useState, useCallback } from 'react';
import Card from './Card';
import PlaidLinkButton, { PlaidLinkSuccessMetadata } from './PlaidLinkButton';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- GraphQL Query/Mutation Definitions ---
// This query fetches the user's linked financial accounts from the GraphQL API.
// It assumes the API Gateway exposes a `userData.linkedAccounts` field.
const GET_LINKED_ACCOUNTS_QUERY = `
  query GetUserLinkedAccounts {
    userData {
      linkedAccounts {
        id
        name
        mask
        institutionId
      }
    }
  }
`;

// This mutation sends a request to the GraphQL API to unlink a specific account.
// It assumes the API Gateway exposes an `unlinkPlaidAccount` mutation.
const UNLINK_PLAID_ACCOUNT_MUTATION = `
  mutation UnlinkPlaidAccount($accountId: ID!) {
    unlinkPlaidAccount(accountId: $accountId)
  }
`;

// --- Type Definitions for GraphQL Payloads ---
/**
 * Defines the structure of a single linked account as received from the GraphQL API.
 * @param id - The unique identifier for the linked account.
 * @param name - The name of the account (e.g., "Chase Checking").
 * @param mask - The last 4 digits of the account number.
 * @param institutionId - An optional identifier for the financial institution.
 */
interface LinkedAccountData {
  id: string;
  name: string;
  mask: string;
  institutionId?: string;
}

/**
 * Defines the expected response structure for the `GET_LINKED_ACCOUNTS_QUERY`.
 */
interface LinkedAccountsResponse {
  userData: {
    linkedAccounts: LinkedAccountData[];
  };
}

/**
 * Defines the expected response structure for the `UNLINK_PLAID_ACCOUNT_MUTATION`.
 */
interface UnlinkAccountResponse {
  unlinkPlaidAccount: boolean;
}

/**
 * Defines the variables required for the `UNLINK_PLAID_ACCOUNT_MUTATION`.
 */
interface UnlinkAccountVariables {
  accountId: string;
}

// --- Generic GraphQL Client (for demonstration within this file) ---
/**
 * A generic helper function to execute GraphQL queries/mutations against the API Gateway.
 * This function is included here for self-containment, but in a real project, it would
 * be a shared utility (e.g., in `services/graphqlClient.ts` or similar).
 * @param query The GraphQL query or mutation string.
 * @param variables Optional variables for the GraphQL operation.
 * @returns The data from the GraphQL response.
 * @throws An error if the network request or GraphQL execution fails.
 */
async function graphqlRequest<T, V>(query: string, variables?: V): Promise<T> {
  const response = await fetch('/graphql', { // Assumes /graphql is the BFF/API Gateway endpoint
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorBody.message || `GraphQL request failed with status ${response.status}`);
  }
  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors.map((e: any) => e.message).join('\n'));
  }
  return data;
}

// --- Custom Hooks for Security Data ---
/**
 * Custom hook to fetch a user's linked financial accounts from the GraphQL API.
 * It uses `@tanstack/react-query` to manage fetching, caching, and loading states.
 * This hook replaces direct consumption from a monolithic `DataContext`.
 * @returns Query result containing linked accounts data, loading status, and any errors.
 */
const useLinkedAccountsQuery = () => {
  return useQuery<LinkedAccountsResponse, Error>({
    queryKey: ['linkedAccounts'],
    queryFn: () => graphqlRequest<LinkedAccountsResponse, undefined>(GET_LINKED_ACCOUNTS_QUERY),
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
  });
};

/**
 * Custom hook to unlink a Plaid-connected account via a GraphQL mutation.
 * It uses `@tanstack/react-query` for managing the mutation process.
 * On success, it invalidates relevant queries to refetch fresh data.
 * @returns Mutation result containing the `mutate` function, loading status, and any errors.
 */
const useUnlinkAccountMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<UnlinkAccountResponse, Error, UnlinkAccountVariables>({
    mutationFn: (variables) => graphqlRequest<UnlinkAccountResponse, UnlinkAccountVariables>(UNLINK_PLAID_ACCOUNT_MUTATION, variables),
    onSuccess: () => {
      // Invalidate queries to trigger a refetch of linked accounts and other relevant user data.
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['userData'] }); // Broader invalidation if other components rely on `userData`
    },
    onError: (error) => {
        console.error("Failed to unlink account:", error);
        // In a production application, integrate with a global toast/notification system.
    }
  });
};

/**
 * @component SecurityView
 * @description Provides users with controls over their linked accounts and application-specific security settings.
 *
 * ARCHITECTURAL REFACTOR:
 * This component has been refactored to align with the new frontend architecture.
 * It no longer consumes a monolithic `DataContext` for server state. Instead,
 * it uses dedicated `@tanstack/react-query` hooks (`useLinkedAccountsQuery`, `useUnlinkAccountMutation`)
 * that interact with the GraphQL API Gateway. This enhances data fetching reliability, caching, and separation of concerns.
 */
const SecurityView: React.FC = () => {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [settings, setSettings] = useState({ twoFactor: true, biometric: false });

    // Fetch linked accounts using the new dedicated hook
    const { data: linkedAccountsData, isLoading: isLoadingAccounts, error: accountsError } = useLinkedAccountsQuery();
    const linkedAccounts = linkedAccountsData?.userData?.linkedAccounts || [];

    // Use the mutation hook for unlinking accounts
    const { mutate: unlinkAccount, isPending: isUnlinking } = useUnlinkAccountMutation();

    /**
     * Handles the toggling of security settings (e.g., 2FA, Biometric Login).
     * In a full implementation, this would trigger a backend mutation to update user preferences.
     * @param {('twoFactor' | 'biometric')} setting The name of the setting to toggle.
     */
    const handleToggle = useCallback((setting: 'twoFactor' | 'biometric') => {
        setSettings(prev => ({...prev, [setting]: !prev[setting]}));
        console.log(`Toggled ${setting} to ${!settings[setting]}. (Backend update simulated)`);
    }, [settings]);

    /**
     * Initiates the process of unlinking a financial account.
     * @param {string} accountId The ID of the account to unlink.
     */
    const handleUnlinkAccount = useCallback((accountId: string) => {
        if (window.confirm("Are you sure you want to unlink this account? This cannot be undone.")) {
            unlinkAccount({ accountId });
        }
    }, [unlinkAccount]);

    /**
     * Callback for successful Plaid Link integration.
     * The `PlaidLinkButton` component internally handles exchanging the public token and invalidating
     * the `linkedAccounts` query, so no direct state update is needed here.
     * @param {string} publicToken The public token received from Plaid.
     * @param {PlaidLinkSuccessMetadata} metadata Metadata about the linked institution and accounts.
     */
    const handlePlaidLinkSuccess = useCallback((publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
        console.log("Plaid Link successful. UI will update automatically from query invalidation.");
    }, []);

    /**
     * @description A modal component for changing the user's password.
     */
    const PasswordModal: React.FC = () => (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Change Password</h3>
                </div>
                <div className="p-6 space-y-4">
                    <input type="password" placeholder="Current Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <input type="password" placeholder="New Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <input type="password" placeholder="Confirm New Password" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <button onClick={() => { alert('Password changed successfully!'); setIsPasswordModalOpen(false); }} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Update Password</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Security Settings</h2>

            <Card 
                title="Linked Accounts & Data Sources" 
                isLoading={isLoadingAccounts || isUnlinking}
                errorState={accountsError?.message || null}
            >
                <div className="space-y-4">
                    {linkedAccounts.length > 0 ? (
                        linkedAccounts.map(account => (
                            <div key={account.id} className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-white">{account.name}</h4>
                                    <p className="text-sm text-gray-400">Account ending in â€¢â€¢â€¢â€¢ {account.mask}</p>
                                </div>
                                <button 
                                    onClick={() => handleUnlinkAccount(account.id)} 
                                    disabled={isUnlinking}
                                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Unlink
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 py-4">You haven't linked any bank accounts yet. Link an account to import your transactions automatically.</p>
                    )}
                    <PlaidLinkButton onSuccess={handlePlaidLinkSuccess} />
                </div>
            </Card>
            
            <Card title="Security Settings">
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                            <h4 className="font-semibold text-white">Two-Factor Authentication (2FA)</h4>
                            <p className="text-sm text-gray-400">Add an extra layer of security to your account.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.twoFactor} onChange={() => handleToggle('twoFactor')} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>
                     <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                            <h4 className="font-semibold text-white">Biometric Login</h4>
                            <p className="text-sm text-gray-400">Use your fingerprint or face to log in.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.biometric} onChange={() => handleToggle('biometric')} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>
                     <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                         <h4 className="font-semibold text-white">Change Password</h4>
                         <button onClick={() => setIsPasswordModalOpen(true)} className="px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-sm">Change</button>
                    </div>
                </div>
            </Card>

            <Card title="Recent Login Activity">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">Chrome on Windows</span> - New York, USA</p>
                        <p className="text-gray-400">Today, 10:30 AM</p>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">Safari on macOS</span> - New York, USA</p>
                        <p className="text-gray-400">Yesterday, 8:15 PM</p>
                    </div>
                     <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-800">
                        <p className="text-gray-300"><span className="font-mono">QuantumBank App on iOS</span> - New York, USA</p>
                        <p className="text-gray-400">2 days ago, 11:00 AM</p>
                    </div>
                </div>
            </Card>
            {isPasswordModalOpen && <PasswordModal />}
        </div>
    );
};

/**
 * A wrapper component that provides a QueryClient to its children.
 * This is a good pattern for feature components that manage their own server state,
 * keeping them decoupled from a single global client provider.
 */
const SecurityViewWithProvider: React.FC = () => {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={queryClient}>
            <SecurityView />
        </QueryClientProvider>
    );
};

export default SecurityViewWithProvider;
