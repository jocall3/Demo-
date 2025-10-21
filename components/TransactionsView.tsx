import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import type { Transaction, DetectedSubscription } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ================================================================================================
// MODAL & DETAIL COMPONENTS
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

// ================================================================================================
// AI WIDGET COMPONENT (REFACTORED)
// ================================================================================================

const AITransactionWidget: React.FC<{
    title: string;
    prompt: string;
    transactions: Transaction[];
    responseSchema?: any; // Allow passing a response schema for structured JSON
    children?: (result: any) => React.ReactNode;
}> = ({ title, prompt, transactions, responseSchema, children }) => {
    const context = useContext(DataContext);
    const { geminiApiKey } = context || {};
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setResult(null);
        if (!geminiApiKey) {
            setError('Please set your Gemini API key in the API Status view.');
            setIsLoading(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const transactionSummary = transactions.slice(0, 20).map(t => `${t.date} - ${t.description}: $${t.amount.toFixed(2)} (${t.type})`).join('\n');
            const fullPrompt = `${prompt}\n\nHere are the most recent transactions for context:\n${transactionSummary}`;
            
            const config: any = { responseMimeType: responseSchema ? "application/json" : "text/plain" };
            if (responseSchema) {
                config.responseSchema = responseSchema;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: config,
            });

            const textResult = response.text.trim();
            setResult(responseSchema ? JSON.parse(textResult) : textResult);

        } catch (err) {
            console.error(`Error generating ${title}:`, err);
            setError('Plato AI could not generate this insight.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold text-gray-200 text-sm mb-2">{title}</h4>
            <div className="space-y-2 min-h-[4rem] flex flex-col justify-center">
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                {isLoading && (
                    <div className="flex items-center justify-center space-x-2">
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                         <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    </div>
                )}
                {!isLoading && result && children && children(result)}
                {!isLoading && result && !children && <p className="text-gray-300 text-xs">{result}</p>}
                {!isLoading && !result && !error && (
                    <button onClick={handleGenerate} className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
                        Generate Insight
                    </button>
                )}
            </div>
        </div>
    );
};

// ================================================================================================
// MAIN TRANSACTIONS VIEW
// ================================================================================================
const TransactionsView: React.FC = () => {
    const context = useContext(DataContext);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sort, setSort] = useState<'date' | 'amount'>('date');
    const [searchTerm, setSearchTerm] = useState('');

    if (!context) {
        throw new Error("TransactionsView must be within a DataProvider");
    }
    const { transactions } = context;

    const filteredTransactions = useMemo(() => {
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
    
    // Schema for Subscription Hunter
    const subscriptionSchema = {
        type: Type.OBJECT,
        properties: {
            subscriptions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        estimatedAmount: { type: Type.NUMBER },
                        lastCharged: { type: Type.STRING }
                    }
                }
            }
        }
    };

    return (
        <>
            <div className="space-y-6">
                 <Card title="Plato's Intelligence Suite" isCollapsible>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AITransactionWidget title="Subscription Hunter" prompt="Analyze these transactions to find potential recurring subscriptions the user might have forgotten about. Look for repeated payments to the same merchant around the same time each month." transactions={transactions} responseSchema={subscriptionSchema}>
                           {(result: { subscriptions: DetectedSubscription[] }) => (
                                <ul className="text-xs text-gray-300 space-y-1">
                                    {result.subscriptions.map(sub => <li key={sub.name}>- {sub.name} (~${sub.estimatedAmount.toFixed(2)})</li>)}
                                </ul>
                           )}
                        </AITransactionWidget>
                        <AITransactionWidget title="Anomaly Detection" prompt="Analyze these transactions and identify one transaction that seems most unusual or out of place compared to the others. Briefly explain why." transactions={transactions} />
                        <AITransactionWidget title="Tax Deduction Finder" prompt="Scan these transactions and identify one potential tax-deductible expense. Explain your reasoning." transactions={transactions} />
                        <AITransactionWidget title="Savings Finder" prompt="Based on spending patterns, suggest one specific and actionable way to save money." transactions={transactions} />
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
                                {filteredTransactions.map(tx => (
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