import React, { useState, useMemo, useCallback, FC, ReactNode } from 'react';
import { useQuery, useMutation, UseMutationResult, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { gql } from 'graphql-request';

// ================================================================================================
// SHARED TYPES (Copied for self-containment, but ideally from a shared types package)
// ================================================================================================

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Transaction {
  __typename?: 'Transaction';
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string; // Corresponds to the 'Date' scalar
  carbonFootprint?: number | null;
}

// ================================================================================================
// CORE UI COMPONENTS (Inlined for self-containment as an MFE)
// ================================================================================================

// --- Card Component (Simplified but functional version) ---
export interface CardProps {
  title?: string;
  children: React.ReactNode;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  isLoading?: boolean;
  errorState?: string | null;
  className?: string;
}

const Card: FC<CardProps> = ({ title, children, isCollapsible = false, defaultCollapsed = false, isLoading = false, errorState = null, className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(isCollapsible && defaultCollapsed);

  const renderContent = () => {
    if (isLoading) {
      return <div className="p-6 text-center text-gray-500">Loading...</div>;
    }
    if (errorState) {
      return <div className="p-6 text-center text-red-400">Error: {errorState}</div>;
    }
    return <div className="p-6">{children}</div>;
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg ${className}`}>
      {(title || isCollapsible) && (
        <div className={`flex justify-between items-center p-4 border-b border-gray-700/60 ${isCollapsible ? 'cursor-pointer' : ''}`} onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}>
          {title && <h3 className="text-xl font-semibold text-gray-100 truncate">{title}</h3>}
          {isCollapsible && <button className="text-gray-400 hover:text-white">{isCollapsed ? 'Show' : 'Hide'}</button>}
        </div>
      )}
      {!isCollapsed && renderContent()}
    </div>
  );
};

// --- Transaction-specific Sub-Components ---

const TransactionIcon: FC<{ category: string }> = ({ category }) => {
    let iconPath;
    switch (category) {
        case 'Dining': iconPath = "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2 1 5 1 7 0 2-1 2.657-1.343 2.657-1.343a8 8 0 010 10z"; break;
        case 'Salary': case 'Freelance': iconPath = "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"; break;
        case 'Shopping': iconPath = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"; break;
        case 'Groceries': iconPath = "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"; break;
        case 'Utilities': iconPath = "M13 10V3L4 14h7v7l9-11h-7z"; break;
        case 'Transport': iconPath = "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M12 11a3 3 0 100-6 3 3 0 000 6z"; break;
        case 'Entertainment': iconPath = "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"; break;
        default: iconPath = "M4 6h16M4 10h16M4 14h16M4 18h16"; break;
    }
    return (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath}></path></svg>);
};

const TransactionDetailModal: FC<{ transaction: Transaction | null; onClose: () => void }> = ({ transaction, onClose }) => {
    if (!transaction) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Description:</span> <span className="text-white font-semibold">{transaction.description}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Amount:</span> <span className={`font-mono font-semibold ${transaction.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{transaction.type === TransactionType.INCOME ? '+' : '-'}${transaction.amount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Date:</span> <span className="text-white">{transaction.date}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Category:</span> <span className="text-white">{transaction.category}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Transaction ID:</span> <span className="text-white font-mono text-xs">{transaction.id}</span></div>
                    {transaction.carbonFootprint && <div className="flex justify-between text-sm"><span className="text-gray-400">Carbon Footprint:</span> <span className="text-green-300">{transaction.carbonFootprint.toFixed(1)} kg CO2</span></div>}
                </div>
            </div>
        </div>
    );
};

interface AITransactionWidgetProps {
    title: string;
    mutation: UseMutationResult<any, Error, void, unknown>;
    children?: (result: string) => React.ReactNode;
}

const AITransactionWidget: FC<AITransactionWidgetProps> = ({ title, mutation, children }) => {
    const { mutate, data, isPending: isLoading, error } = mutation;
    const result = data?.askAIAdvisor.messages.find((m: any) => m.role === 'model')?.parts[0]?.text;

    return (
        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold text-gray-200 text-sm mb-2">{title}</h4>
            <div className="space-y-2 min-h-[4rem] flex flex-col justify-center">
                {error && <p className="text-red-400 text-xs text-center">{error.message}</p>}
                {isLoading && (
                    <div className="flex items-center justify-center space-x-2">
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    </div>
                )}
                {!isLoading && result && children && children(result)}
                {!isLoading && result && !children && <p className="text-gray-300 text-xs italic">"{result}"</p>}
                {!isLoading && !result && !error && (
                    <button onClick={() => mutate()} className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
                        Generate Insight
                    </button>
                )}
            </div>
        </div>
    );
};

const TransactionTableSkeleton: FC = () => (
    <tbody>
        {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="animate-pulse border-b border-gray-800">
                <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-3/4"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/2"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/2"></div></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/3 ml-auto"></div></td>
            </tr>
        ))}
    </tbody>
);

// ================================================================================================
// GRAPHQL CLIENT & QUERIES
// ================================================================================================

const graphqlRequest = async <T, V>(query: string, variables?: V): Promise<T> => {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
        throw new Error(errorBody.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`);
    }
    const { data, errors } = await response.json();
    if (errors) {
        throw new Error(errors.map((e: any) => e.message).join('\n'));
    }
    return data;
};

const GET_TRANSACTIONS_QUERY = gql`
    query GetUserTransactions {
        userData {
            transactions {
                id
                type
                category
                description
                amount
                date
                carbonFootprint
            }
        }
    }
`;

const ASK_AI_ADVISOR_MUTATION = gql`
    mutation AskAdvisorForTransactionInsight($message: String!) {
        askAIAdvisor(message: $message) {
            messages {
                role
                parts {
                    text
                }
            }
        }
    }
`;

// ================================================================================================
// CUSTOM HOOKS (Feature-Sliced State Management)
// ================================================================================================

const useTransactions = () => {
    return useQuery<Transaction[], Error>({
        queryKey: ['transactions'],
        queryFn: async () => {
            const data = await graphqlRequest<{ userData: { transactions: Transaction[] } }>(GET_TRANSACTIONS_QUERY);
            return data.userData.transactions;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

const useTransactionInsight = (insightType: string) => {
    return useMutation<{ askAIAdvisor: { messages: any[] } }, Error>({
        mutationFn: () => {
            const prompts = {
                'subscription_hunter': 'Analyze my recent transactions and identify any recurring payments that are likely subscriptions. List their name and estimated monthly amount in a markdown list.',
                'anomaly_detection': "Analyze my recent transactions and identify any spending anomalies or outliers compared to typical patterns. Describe one significant anomaly.",
                'tax_deduction_finder': 'Review my transactions for any potential tax-deductible expenses and list a few examples.',
                'savings_finder': 'Based on my spending habits shown in these transactions, suggest one specific area where I could save money.'
            };
            const message = prompts[insightType as keyof typeof prompts] || 'Analyze my transactions and provide an insight.';
            return graphqlRequest(ASK_AI_ADVISOR_MUTATION, { message });
        },
    });
};

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const TransactionsView: FC = () => {
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sort, setSort] = useState<'date' | 'amount'>('date');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: transactions, isLoading, error } = useTransactions();
    
    const subscriptionInsight = useTransactionInsight('subscription_hunter');
    const anomalyInsight = useTransactionInsight('anomaly_detection');
    const taxInsight = useTransactionInsight('tax_deduction_finder');
    const savingsInsight = useTransactionInsight('savings_finder');

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions
            .filter(tx => filter === 'all' || tx.type.toLowerCase() === filter)
            .filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sort === 'date') {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                }
                return b.amount - a.amount;
            });
    }, [transactions, filter, sort, searchTerm]);
    
    return (
        <>
            <div className="space-y-6">
                 <h2 className="text-3xl font-bold text-white tracking-wider">Transaction History</h2>
                 <Card title="Plato's Intelligence Suite" isCollapsible>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AITransactionWidget title="Subscription Hunter" mutation={subscriptionInsight}>
                           {(result: string) => (
                                <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                                    {result.split('\n').map((line, i) => line.trim() && <li key={i}>{line.replace(/^- /, '')}</li>)}
                                </ul>
                           )}
                        </AITransactionWidget>
                        <AITransactionWidget title="Anomaly Detection" mutation={anomalyInsight} />
                        <AITransactionWidget title="Tax Deduction Finder" mutation={taxInsight} />
                        <AITransactionWidget title="Savings Finder" mutation={savingsInsight} />
                     </div>
                </Card>
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <input type="text" placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-1/3 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                        <div className="flex items-center gap-4">
                            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500">
                                <option value="all">All</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                             <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500">
                                <option value="date">Sort by Date</option>
                                <option value="amount">Sort by Amount</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                             <thead className="text-xs text-gray-300 uppercase bg-gray-900/30">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Category</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            {isLoading ? (
                                <TransactionTableSkeleton />
                            ) : (
                                <tbody>
                                    {error && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-red-400">
                                                Error loading transactions: {error.message}
                                            </td>
                                        </tr>
                                    )}
                                    {!error && filteredTransactions.map(tx => (
                                        <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer">
                                            <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap flex items-center gap-4">
                                              <div className="p-2 bg-gray-700 rounded-full text-cyan-400"><TransactionIcon category={tx.category} /></div>
                                              {tx.description}
                                            </th>
                                            <td className="px-6 py-4">{tx.category}</td>
                                            <td className="px-6 py-4">{tx.date}</td>
                                            <td className={`px-6 py-4 text-right font-mono ${tx.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.type === TransactionType.INCOME ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                        </table>
                    </div>
                </Card>
            </div>
            <TransactionDetailModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
        </>
    );
};

const queryClient = new QueryClient();

const TransactionsViewWithProvider: FC = () => (
    <QueryClientProvider client={queryClient}>
        <TransactionsView />
    </QueryClientProvider>
);

export default TransactionsViewWithProvider;
