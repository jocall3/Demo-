import React, { useContext, useState, useRef, useEffect } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import type { BudgetCategory, Transaction } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";

// ================================================================================================
// MODAL & UI SUB-COMPONENTS
// ================================================================================================

const NewBudgetModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (name: string, limit: number) => void; }> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');

    const handleSubmit = () => {
        if(name && limit) {
            onAdd(name, parseFloat(limit));
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
                    <button onClick={handleSubmit} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Create</button>
                </div>
            </div>
        </div>
    );
};

const BudgetDetailModal: React.FC<{ budget: BudgetCategory | null; transactions: Transaction[]; onClose: () => void; }> = ({ budget, transactions, onClose }) => {
    if (!budget) return null;
    const relevantTransactions = transactions.filter(t => t.category.toLowerCase() === budget.name.toLowerCase() && t.type === 'expense');

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{budget.name} Budget Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6">
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {relevantTransactions.length > 0 ? relevantTransactions.map(tx => (
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


const BudgetRing: React.FC<{ budget: BudgetCategory; onClick: () => void; }> = ({ budget, onClick }) => {
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
  const context = useContext(DataContext);
  const [conversation, setConversation] = useState<InsightMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetCategory | null>(null);


  if (!context) {
    throw new Error("BudgetsView must be a child of DataProvider.");
  }
  const { budgets, transactions, addBudget } = context;
  
  const initializeChat = () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const budgetContext = `You are Quantum, a specialized financial advisor AI focused on budget analysis. The user's current budget data is: ${JSON.stringify(budgets)}. Your goal is to provide concise, actionable advice to help them manage their spending effectively. Keep responses brief and to the point.`;
        
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: budgetContext
            }
        });
    } catch (err) {
        console.error("AI insight error:", err);
        setError("I'm having trouble providing insights right now. Please try again later.");
    }
  }

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    if (!chatRef.current) {
        initializeChat();
    }
    if (!chatRef.current) return; // initialization failed
    
    setIsLoading(true);
    setError('');
    if (!hasStarted) setHasStarted(true);

    const userMsg: InsightMessage = { id: Date.now().toString(), sender: 'user', text: messageText };
    setConversation(prev => [...prev, userMsg]);
    setUserInput('');

    try {
        const chat = chatRef.current;
        const stream = await chat.sendMessageStream({ message: messageText });
        
        let aiResponseText = '';
        const aiMsgId = Date.now().toString() + '-ai';
        setConversation(prev => [...prev, { id: aiMsgId, sender: 'ai', text: '' }]);

        for await (const chunk of stream) {
            aiResponseText += chunk.text;
            setConversation(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiResponseText } : m));
        }

    } catch (err) {
        console.error("AI insight error:", err);
        setError("I'm having trouble providing an insight right now. Please try again later.");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasStarted) {
        // Automatically trigger the first AI insight when the component loads.
        const timer = setTimeout(() => {
            handleSendMessage("Analyze my current budgets and give me one key insight.");
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [hasStarted]);

  return (
    <>
    <div className="space-y-6">
      <Card title="Monthly Budgets" headerActions={[{ id: 'add', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, onClick: () => setIsNewBudgetModalOpen(true), label: 'Add new budget' }]}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {budgets.map(budget => (
            <BudgetRing key={budget.id} budget={budget} onClick={() => setSelectedBudget(budget)} />
          ))}
        </div>
      </Card>
      <Card title="Quantum Insights">
         {!hasStarted && !isLoading ? (
             <div className="text-center min-h-[10rem] flex flex-col items-center justify-center">
                 <p className="text-gray-400 mb-4">Let Quantum analyze your spending and provide personalized advice.</p>
                 <div className="flex items-center space-x-2 text-cyan-300">
                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span>Quantum is preparing your first insight...</span>
                </div>
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
                    {isLoading && (
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
                     {error && (
                        <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-lg text-red-200 text-sm">
                            <p>{error}</p>
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
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !userInput} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">Send</button>
                 </form>
            </div>
         )}
      </Card>
    </div>
    <NewBudgetModal isOpen={isNewBudgetModalOpen} onClose={() => setIsNewBudgetModalOpen(false)} onAdd={(name, limit) => addBudget({ name, limit })} />
    <BudgetDetailModal budget={selectedBudget} transactions={transactions} onClose={() => setSelectedBudget(null)} />
    </>
  );
};

export default BudgetsView;