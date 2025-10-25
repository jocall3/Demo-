import React, { useState, useMemo, FC } from 'react';
import { useMutation, UseMutationResult, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Card from '../../../components/Card';
import { Transaction, TransactionType } from '../../../types';
import { gql } from 'graphql-request';
import { useTransactionsData } from '../hooks/useTransactionsData';

// ================================================================================================
// GRAPHQL & SERVICE LAYER (FOR MUTATIONS)
// The query logic is encapsulated in the useTransactionsData hook.
// This section defines mutation logic specific to this view.
// ================================================================================================

/**
 * A lightweight GraphQL client function for mutations.
 * @param query The GraphQL query string.
 * @param variables The variables for the query.
 * @returns A promise that resolves with the data from the GraphQL response.
 */
const graphqlRequest = async <T, V>(query: string, variables?: V): Promise<T> => {
    const response = await fetch('/graphql', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
        throw new Error(errorBody.message || `GraphQL request failed with status ${response.status}`);
    }
    const { data, errors } = await response.json();
    if (errors) {
        throw new Error(errors.map((e: any) => e.message).join('\n'));
    }
    return data;
};

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
// CUSTOM HOOKS (FOR MUTATIONS)
// ================================================================================================

/**
 * Hook to generate an AI insight for transactions via a GraphQL mutation.
 * @param insightType - The type of insight to request.
 * @returns A mutation object from TanStack Query.
 */
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
// UI COMPONENTS
// ================================================================================================

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
// MAIN COMPONENT
// ================================================================================================

const TransactionsView: FC = () => {
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sort, setSort] = useState<'date' | 'amount'>('date');
    const [searchTerm, setSearchTerm] = useState('');

    const { transactions, isLoading, error } = useTransactionsData();
    
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
