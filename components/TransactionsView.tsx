import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';
import Card from './Card';
import type { Transaction, DetectedSubscription } from '../types';

// ================================================================================================
// MOCK DATA (Simulating data from a service layer)
// ================================================================================================
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'expense', category: 'Dining', description: 'Coffee Shop', amount: 12.50, date: '2024-07-21', carbonFootprint: 1.2 },
  { id: '2', type: 'income', category: 'Salary', description: 'Paycheck', amount: 2500.00, date: '2024-07-20' },
  { id: '3', type: 'expense', category: 'Shopping', description: 'Online Store', amount: 89.99, date: '2024-07-19', carbonFootprint: 8.5 },
  { id: '4', type: 'expense', category: 'Utilities', description: 'Electricity Bill', amount: 75.30, date: '2024-07-18', carbonFootprint: 15.3 },
  { id: '5', type: 'expense', category: 'Transport', description: 'Gas Station', amount: 55.00, date: '2024-07-18', carbonFootprint: 25.1 },
  { id: '6', type: 'income', category: 'Freelance', description: 'Project ABC', amount: 500.00, date: '2024-07-17' },
];

// ================================================================================================
// SERVICE LAYER
// In a real application, this logic would reside in a dedicated `services/` directory.
// ================================================================================================

/**
 * Fetches all transactions from the BFF.
 * @returns A promise that resolves to an array of transactions.
 */
const fetchTransactions = async (): Promise<Transaction[]> => {
    console.log("Calling BFF to fetch transactions...");
    // Simulating an API call to a BFF endpoint like GET /api/transactions
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    // const response = await fetch('/api/transactions');
    // if (!response.ok) throw new Error('Failed to fetch transactions');
    // return response.json();
    return MOCK_TRANSACTIONS; // Returning mock data for demonstration
};

/**
 * Requests an AI insight from the BFF based on transaction data.
 * @param insightType The type of insight to generate.
 * @param transactions A list of transactions to analyze.
 * @returns A promise that resolves to the AI-generated insight.
 */
const fetchTransactionInsight = async (insightType: string, transactions: Transaction[]): Promise<{ result: any }> => {
    console.log(`Calling BFF to generate insight: ${insightType}`);
    // Simulating an API call to a BFF endpoint like POST /api/ai/transaction-insight
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    // const response = await fetch('/api/ai/transaction-insight', { ... });
    // if (!response.ok) throw new Error('Failed to generate insight');
    // return response.json();
    
    // Returning mock data for demonstration
    if (insightType === 'subscription_hunter') {
        return { result: { subscriptions: [{ name: 'QuantumFlix', estimatedAmount: 15.99 }, { name: 'SynthWave Music', estimatedAmount: 9.99 }] }};
    }
    if (insightType === 'anomaly_detection') {
        return { result: "Unusual spending of $89.99 at 'Online Store' detected. This is 50% higher than your average shopping purchase." };
    }
    return { result: 'This is a mock insight from Plato AI for your review.' };
};


// ================================================================================================
// CUSTOM HOOKS
// In a real application, these hooks would reside in a `hooks/` or `features/` directory.
// ================================================================================================

/**
 * Custom hook to fetch and manage transaction data using React Query.
 * This abstracts the data fetching logic from the UI component.
 */
const useTransactions = () => {
    return useQuery<Transaction[], Error>({
        queryKey: ['transactions'],
        queryFn: fetchTransactions,
        staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
        refetchOnWindowFocus: false,
    });
};

/**
 * Custom hook to generate an AI insight for transactions using React Query's useMutation.
 * This encapsulates the server-side action of generating an insight.
 */
const useTransactionInsight = (insightType: string, transactions?: Transaction[]) => {
    return useMutation<any, Error>({
        mutationFn: () => fetchTransactionInsight(insightType, transactions || []),
    });
};

// ================================================================================================
// UI COMPONENTS
// ================================================================================================

const TransactionDetailModal: React.FC<{ transaction: Transaction | null; onClose: () => void }> = ({ transaction, onClose }) => {
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
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Amount:</span> <span className={`font-mono font-semibold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Date:</span> <span className="text-white">{transaction.date}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Category:</span> <span className="text-white">{transaction.category}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Transaction ID:</span> <span className="text-white font-mono text-xs">{transaction.id}</span></div>
                    {transaction.carbonFootprint && <div className="flex justify-between text-sm"><span className="text-gray-400">Carbon Footprint:</span> <span className="text-green-300">{transaction.carbonFootprint.toFixed(1)} kg CO₂</span></div>}
                </div>
            </div>
        </div>
    );
};

interface AITransactionWidgetProps {
    title: string;
    mutation: UseMutationResult<any, Error, void, unknown>;
    children?: (result: any) => React.ReactNode;
}

const AITransactionWidget: React.FC<AITransactionWidgetProps> = ({ title, mutation, children }) => {
    const { mutate, data: result, isPending: isLoading, error } = mutation;
    
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
                {!isLoading && result && children && children(result.result)}
                {!isLoading && result && !children && <p className="text-gray-300 text-xs">{result.result}</p>}
                {!isLoading && !result && !error && (
                    <button onClick={() => mutate()} className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
                        Generate Insight
                    </button>
                )}
            </div>
        </div>
    );
};

const TransactionTableSkeleton: React.FC = () => (
    <div className="animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
                <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                <div className="h-4 bg-gray-700 rounded w-1/6"></div>
            </div>
        ))}
    </div>
);


const TransactionsView: React.FC = () => {
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sort, setSort] = useState<'date' | 'amount'>('date');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: transactions, isLoading, error } = useTransactions();
    
    // AI Insight mutations
    const subscriptionInsight = useTransactionInsight('subscription_hunter', transactions);
    const anomalyInsight = useTransactionInsight('anomaly_detection', transactions);
    const taxInsight = useTransactionInsight('tax_deduction_finder', transactions);
    const savingsInsight = useTransactionInsight('savings_finder', transactions);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions
            .filter(tx => filter === 'all' || tx.type === filter)
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
                 <Card title="Plato's Intelligence Suite" isCollapsible>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AITransactionWidget title="Subscription Hunter" mutation={subscriptionInsight}>
                           {(result: { subscriptions: DetectedSubscription[] }) => (
                                <ul className="text-xs text-gray-300 space-y-1">
                                    {result.subscriptions.map(sub => <li key={sub.name}>- {sub.name} (~${sub.estimatedAmount.toFixed(2)})</li>)}
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
                            <tbody>
                                {isLoading && <TransactionTableSkeleton />}
                                {error && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-red-400">
                                            Error loading transactions: {error.message}
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && !error && filteredTransactions.map(tx => (
                                    <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer">
                                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{tx.description}</th>
                                        <td className="px-6 py-4">{tx.category}</td>
                                        <td className="px-6 py-4">{tx.date}</td>
                                        <td className={`px-6 py-4 text-right font-mono ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            <TransactionDetailModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
        </>
    );
};

export default TransactionsView;
