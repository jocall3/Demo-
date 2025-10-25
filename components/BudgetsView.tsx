import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Card from './Card';
import type { BudgetCategory as Budget, Transaction } from '../types';
import { gql } from 'graphql-request'; // Using this for query string definition clarity

// ================================================================================================
// GRAPHQL & SERVICE LAYER (Conceptual, as per new architecture)
// ================================================================================================

// A lightweight GraphQL client function (could be in a shared lib)
async function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(errors[0].message);
    return data;
}

const GET_BUDGETS_QUERY = gql`
    query GetUserBudgets {
        userData {
            budgets {
                id
                name
                limit
                spent
                color
            }
        }
    }
`;

const GET_TRANSACTIONS_BY_CATEGORY_QUERY = gql`
    query GetTransactionsByCategory($category: String!) {
        transactionsByCategory(category: $category) {
            id
            description
            amount
            date
        }
    }
`;

const ADD_BUDGET_MUTATION = gql`
    mutation AddBudget($name: String!, $limit: Float!) {
        addBudget(input: { name: $name, limit: $limit }) {
            id
            name
            limit
            spent
            color
        }
    }
`;

const GET_BUDGET_INSIGHT_MUTATION = gql`
    mutation GetBudgetInsight($prompt: String!) {
        askAIAdvisor(message: $prompt) {
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

const useBudgets = () => useQuery<Budget[], Error>({
    queryKey: ['budgets'],
    queryFn: async () => {
        const data = await graphqlRequest<{ userData: { budgets: Budget[] } }>(GET_BUDGETS_QUERY);
        return data.userData.budgets;
    },
});

const useAddBudget = () => {
    const queryClient = useQueryClient();
    return useMutation<Budget, Error, { name: string, limit: number }>({
        mutationFn: (variables) => graphqlRequest(ADD_BUDGET_MUTATION, variables),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
        },
    });
};

const useTransactionsForCategory = (category: string | null) => useQuery<Transaction[], Error>({
    queryKey: ['transactions', { category }],
    queryFn: () => graphqlRequest<{ transactionsByCategory: Transaction[] }>(GET_TRANSACTIONS_BY_CATEGORY_QUERY, { category }).then(data => data.transactionsByCategory),
    enabled: !!category, // Only run this query when a category is selected
});

const useBudgetInsight = () => useMutation<any, Error, { prompt: string }>({
    mutationFn: ({ prompt }) => graphqlRequest(GET_BUDGET_INSIGHT_MUTATION, { prompt }),
});


// ================================================================================================
// MODAL & UI SUB-COMPONENTS
// ================================================================================================

const NewBudgetModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onAdd: (vars: { name: string, limit: number }) => void; 
    isAdding: boolean;
}> = ({ isOpen, onClose, onAdd, isAdding }) => {
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');

    const handleSubmit = () => {
        if(name && limit && !isAdding) {
            onAdd({ name, limit: parseFloat(limit) });
            onClose();
            setName('');
            setLimit('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Create New Budget</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Budget Name (e.g., Entertainment)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Monthly Limit ($)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                    <button onClick={handleSubmit} disabled={isAdding} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50">
                        {isAdding ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BudgetDetailModal: React.FC<{ budget: Budget | null; onClose: () => void; }> = ({ budget, onClose }) => {
    const { data: transactions, isLoading } = useTransactionsForCategory(budget?.name || null);

    if (!budget) return null;

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{budget.name} Budget Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6">
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {isLoading ? <p>Loading transactions...</p> : 
                        transactions && transactions.length > 0 ? transactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg text-sm">
                                <div>
                                    <p className="text-white">{tx.description}</p>
                                    <p className="text-gray-400 text-xs">{tx.date}</p>
                                </div>
                                <p className="font-mono text-red-400">-${tx.amount.toFixed(2)}</p>
                            </div>
                        )) : <p className="text-gray-400 text-center text-sm">No transactions in this category yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


const BudgetRing: React.FC<{ budget: Budget; onClick: () => void; }> = ({ budget, onClick }) => {
  const percentage = Math.min(Math.floor((budget.spent / budget.limit) * 100), 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  const ringColor = percentage > 95 ? 'stroke-red-500' : percentage > 80 ? 'stroke-yellow-500' : 'stroke-cyan-400';

  return (
    <button onClick={onClick} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
          <circle
            className={`transition-all duration-700 ease-in-out ${ringColor}`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="52" className="text-xl font-bold fill-current text-white" textAnchor="middle">{percentage}%</text>
        </svg>
      </div>
      <p className="mt-2 font-semibold text-white">{budget.name}</p>
      <p className="text-sm text-gray-400">${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}</p>
    </button>
  );
};

interface InsightMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
}

// ================================================================================================
// MAIN BUDGETS VIEW COMPONENT
// ================================================================================================

const BudgetsView: React.FC = () => {
    const { data: budgets, isLoading: isLoadingBudgets, error: budgetsError } = useBudgets();
    const { mutate: addBudget, isPending: isAddingBudget } = useAddBudget();
    const { mutate: getInsight, isPending: isLoadingInsight, data: insightData, error: insightError } = useBudgetInsight();

    const [conversation, setConversation] = useState<InsightMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

    const handleSendMessage = useCallback((messageText: string) => {
        if (!messageText.trim()) return;

        const userMsg: InsightMessage = { id: Date.now().toString(), sender: 'user', text: messageText };
        setConversation(prev => [...prev, userMsg]);
        setUserInput('');
        
        // Include current budget data as context for the AI
        const contextPrompt = `Context: My current budgets are ${JSON.stringify(budgets)}. Question: ${messageText}`;
        getInsight({ prompt: contextPrompt });
    }, [budgets, getInsight]);
    
    // Add AI response to conversation when data changes
    useMemo(() => {
        if(insightData) {
            const aiText = insightData.askAIAdvisor.messages.find((m: any) => m.role === 'model')?.parts[0]?.text;
            if (aiText) {
                const aiMsg: InsightMessage = { id: `ai_${Date.now()}`, sender: 'ai', text: aiText };
                setConversation(prev => [...prev, aiMsg]);
            }
        }
    }, [insightData]);

    // Initial insight on component load
    useEffect(() => {
        if (budgets && budgets.length > 0 && conversation.length === 0) {
            handleSendMessage("Analyze my current budgets and give me one key insight.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [budgets]);

  return (
    <>
    <div className="space-y-6">
      <Card title="Monthly Budgets" isLoading={isLoadingBudgets} errorState={budgetsError?.message} headerActions={[{ id: 'add', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, onClick: () => setIsNewBudgetModalOpen(true), label: 'Add new budget' }]}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {budgets && budgets.map(budget => (
            <BudgetRing key={budget.id} budget={budget} onClick={() => setSelectedBudget(budget)} />
          ))}
        </div>
      </Card>
      <Card title="Quantum Insights">
         {(conversation.length === 0 && !isLoadingInsight) ? (
             <div className="text-center min-h-[10rem] flex items-center justify-center">
                 <p className="text-gray-400">Quantum is ready to analyze your spending habits.</p>
            </div>
         ) : (
            <div className="flex flex-col space-y-4 max-h-96">
                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {conversation.map(msg => (
                        <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && <div className="w-6 h-6 rounded-full bg-cyan-600/50 flex items-center justify-center text-cyan-200 font-bold text-xs flex-shrink-0 mt-1">Q</div>}
                             <div className={`max-w-md p-3 text-sm rounded-lg ${msg.sender === 'user' ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoadingInsight && (
                         <div className="flex items-start gap-2">
                             <div className="w-6 h-6 rounded-full bg-cyan-600/50 flex items-center justify-center text-cyan-200 font-bold text-xs flex-shrink-0 mt-1">Q</div>
                             <div className="max-w-md p-3 text-sm rounded-lg bg-gray-700 text-gray-200">
                                 <div className="flex items-center space-x-2">
                                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                </div>
                             </div>
                         </div>
                    )}
                     {insightError && (
                        <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-lg text-red-200 text-sm">
                            <p>Sorry, I couldn't generate an insight: {insightError.message}</p>
                        </div>
                    )}
                </div>
                 <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center space-x-2 pt-2 border-t border-gray-700">
                    <input 
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        disabled={isLoadingInsight}
                    />
                    <button type="submit" disabled={isLoadingInsight || !userInput} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">Send</button>
                 </form>
            </div>
         )}
      </Card>
    </div>
    <NewBudgetModal isOpen={isNewBudgetModalOpen} onClose={() => setIsNewBudgetModalOpen(false)} onAdd={addBudget} isAdding={isAddingBudget} />
    <BudgetDetailModal budget={selectedBudget} onClose={() => setSelectedBudget(null)} />
    </>
  );
};

// ================================================================================================
// WRAPPER COMPONENT WITH QUERY CLIENT PROVIDER
// For standalone MFE usage or isolated testing, this wrapper provides the necessary context.
// ================================================================================================
const queryClient = new QueryClient();

const BudgetsViewWithProvider: React.FC = () => (
    <QueryClientProvider client={queryClient}>
        <BudgetsView />
    </QueryClientProvider>
);

export default BudgetsViewWithProvider;
