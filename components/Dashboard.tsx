import React, { useContext, useMemo, useState, useEffect } from 'react';
import BalanceSummary from './BalanceSummary';
import RecentTransactions from './RecentTransactions';
import WealthTimeline from './WealthTimeline';
import AIInsights from './AIInsights';
import ImpactTracker from './ImpactTracker';
import { DataContext } from '../context/DataContext';
import Card from './Card';
// FIX: Changed `import type` to a regular import for `View` because it's an enum used as a value.
import { type GamificationState, type Subscription, type CreditScore, type SavingsGoal, type MarketMover, type UpcomingBill, type Transaction, type BudgetCategory, type RewardPoints, View } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, AreaChart, Area } from 'recharts';
import PlaidLinkButton from './PlaidLinkButton';
import { GoogleGenAI, Type } from '@google/genai';

// ================================================================================================
// MODAL & OVERLAY COMPONENTS
// ================================================================================================
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const DataImportingOverlay: React.FC<{ isImporting: boolean; bankName: string | null }> = ({ isImporting, bankName }) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = [
        `Connecting to ${bankName || 'your bank'}...`,
        'Securely importing transactions...',
        'AI is analyzing your new financial data...',
        'Updating your dashboard...'
    ];

    useEffect(() => {
        if (isImporting) {
            setMessageIndex(0);
            const interval = setInterval(() => {
                setMessageIndex(prev => (prev + 1) % messages.length);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [isImporting, bankName]);

    if (!isImporting) return null;

    return (
        <div className="fixed inset-0 bg-gray-950/90 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-lg mt-8 font-semibold animate-pulse">{messages[messageIndex]}</p>
        </div>
    );
};


// ================================================================================================
// ICON COMPONENTS FOR NEW WIDGETS
// ================================================================================================
// A map of simple icon components used by the new widgets.
const WIDGET_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
    video: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    music: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
    cloud: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    plane: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    rocket: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    send: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    bill: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    deposit: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
};

// ================================================================================================
// NEW WIDGET COMPONENTS
// ================================================================================================

const LinkAccountPrompt: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("LinkAccountPrompt must be used within a DataProvider");
    }
    const { handlePlaidSuccess } = context;

    return (
        <Card title="Welcome to Demo Bank" variant="default">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Connect Your Financial World</h3>
                <p className="text-gray-400 mt-2 mb-6 max-w-md mx-auto">To unlock the full power of Demo Bank, connect your primary bank account. This will enable a unified financial view, AI-powered insights, and automated transaction tracking.</p>
                <div className="max-w-xs mx-auto">
                    <PlaidLinkButton onSuccess={handlePlaidSuccess} />
                </div>
            </div>
        </Card>
    );
};

const GamificationProfile: React.FC<{ gamification: GamificationState; onClick: () => void; }> = ({ gamification, onClick }) => {
    const { score, level, levelName, progress } = gamification;
    const circumference = 2 * Math.PI * 55;
    const scoreOffset = circumference - (score / 1000) * circumference;
    return (
        <Card title="Financial Health" className="h-full" variant="interactive" onClick={onClick}>
            <div className="flex flex-col justify-between h-full">
                <div className="relative flex items-center justify-center h-40">
                    <svg className="w-full h-full" viewBox="0 0 120 120">
                        <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="55" cx="60" cy="60" />
                        <circle className="text-cyan-400 transition-all duration-1000 ease-in-out" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={scoreOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="55" cx="60" cy="60" transform="rotate(-90 60 60)" />
                        <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-3xl font-bold fill-white">{score}</text>
                    </svg>
                </div>
                <div className="text-center mt-4">
                    <p className="font-semibold text-lg text-white">{levelName}</p>
                    <p className="text-sm text-gray-400">Level {level}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
                        <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const QuickActions: React.FC<{ onAction: (action: string) => void }> = ({ onAction }) => {
    const actions = [{ name: 'Send Money', icon: 'send' }, { name: 'Pay Bill', icon: 'bill' }, { name: 'Deposit', icon: 'deposit' }];
    return (
        <Card title="Quick Actions">
            <div className="grid grid-cols-3 gap-4 text-center">
                {actions.map(action => {
                    const Icon = WIDGET_ICONS[action.icon];
                    return (
                        <button key={action.name} onClick={() => onAction(action.name)} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 mb-2">
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium text-gray-300">{action.name}</span>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

const RewardPointsWidget: React.FC<{ rewards: RewardPoints; onClick: () => void; }> = ({ rewards, onClick }) => {
    return (
        <Card title="Rewards Points" className="h-full" variant="interactive" onClick={onClick}>
            <div className="flex flex-col justify-center items-center h-full text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                <p className="text-4xl font-bold text-white mt-2">{rewards.balance.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">{rewards.currency}</p>
                <div className="mt-4 px-4 py-2 bg-cyan-600/50 text-white rounded-lg text-sm font-medium">
                    View Rewards
                </div>
            </div>
        </Card>
    );
};

const CreditScoreMonitor: React.FC<{ creditScore: CreditScore; onClick: () => void; }> = ({ creditScore, onClick }) => {
    const { score, change, rating } = creditScore;
    const percentage = ((score - 300) / (850 - 300)) * 100; // Common credit score range
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (percentage / 100) * circumference;

    const ratingColor = { Excellent: 'text-green-400', Good: 'text-cyan-400', Fair: 'text-yellow-400', Poor: 'text-red-400' };
    
    return (
        <Card title="Credit Score" variant="interactive" onClick={onClick}>
            <div className="flex items-center justify-center space-x-4">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <path className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" d="M 50,10 a 40,40 0 0,1 0,80 a 40,40 0 0,1 0,-80" />
                        <path className={ratingColor[rating]} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" d="M 50,10 a 40,40 0 0,1 0,80 a 40,40 0 0,1 0,-80" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">{score}</div>
                </div>
                <div className="text-center">
                    <p className={`text-lg font-semibold ${ratingColor[rating]}`}>{rating}</p>
                    <p className={change > 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{change > 0 ? `+${change}` : change} pts</p>
                </div>
            </div>
        </Card>
    );
};

const SecurityStatus: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const [statusText, setStatusText] = useState('All Systems Secure');
    const [subText, setSubText] = useState(`Last scan: ${new Date().toLocaleTimeString()}`);
    const [iconColor, setIconColor] = useState('text-green-400');

    useEffect(() => {
        const messages = [
            { status: 'All Systems Secure', sub: `Last scan: ${new Date().toLocaleTimeString()}`, color: 'text-green-400' },
            { status: 'Running Threat Scan...', sub: 'Heuristic analysis in progress', color: 'text-cyan-400' },
            { status: 'All Systems Secure', sub: `Last scan: ${new Date().toLocaleTimeString()}`, color: 'text-green-400' },
            { status: 'Heuristic Anomaly Detected', sub: 'Threat auto-mitigated by AI', color: 'text-yellow-400' },
        ];
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setStatusText(messages[index].status);
            setSubText(messages[index].sub);
            setIconColor(messages[index].color);
        }, 7000); // Change every 7 seconds
        return () => clearInterval(interval);
    }, []);
    
    return (
        <Card title="Security Status" variant="interactive" onClick={onClick}>
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${iconColor} mx-auto transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 019-2.606m0-15.394v15.394" /></svg>
                    <p className="mt-2 font-semibold text-white">{statusText}</p>
                    <p className="text-xs text-gray-400">{subText}</p>
                </div>
            </div>
        </Card>
    );
};


const SubscriptionTracker: React.FC<{ subscriptions: Subscription[]; onClick: () => void; }> = ({ subscriptions, onClick }) => (
    <Card title="Recurring Subscriptions" variant="interactive" onClick={onClick}>
        <div className="space-y-3">
            {subscriptions.map(sub => {
                const Icon = WIDGET_ICONS[sub.iconName];
                return (
                    <div key={sub.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <Icon className="w-5 h-5 text-cyan-400 mr-3" />
                            <span className="text-gray-200">{sub.name}</span>
                        </div>
                        <span className="font-mono text-white">${sub.amount.toFixed(2)}</span>
                    </div>
                );
            })}
        </div>
    </Card>
);

const UpcomingBills: React.FC<{ bills: UpcomingBill[]; onPay: (bill: UpcomingBill) => void; }> = ({ bills, onPay }) => (
    <Card title="Upcoming Bills">
        <div className="space-y-3">
            {bills.map(bill => (
                <div key={bill.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-700/50">
                    <div>
                        <p className="text-gray-200">{bill.name}</p>
                        <p className="text-xs text-gray-400">{bill.dueDate}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-white">${bill.amount.toFixed(2)}</p>
                    </div>
                    <button onClick={() => onPay(bill)} className="ml-4 px-3 py-1 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-xs">Pay</button>
                </div>
            ))}
        </div>
    </Card>
);

const CategorySpending: React.FC<{ budgets: BudgetCategory[]; onClick: () => void; }> = ({ budgets, onClick }) => {
    const COLORS = budgets.map(b => b.color);
    const data = budgets.map(b => ({ name: b.name, value: b.spent }));
    return (
        <Card title="Spending by Category" variant="interactive" onClick={onClick}>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={5}>
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend iconSize={8} wrapperStyle={{fontSize: '12px'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

const CashFlowAnalysis: React.FC<{ transactions: Transaction[]; onClick: () => void; }> = ({ transactions, onClick }) => {
    const monthlyFlows = useMemo(() => {
        const flows: { [key: string]: { name: string; income: number; expense: number } } = {};
        
        // Ensure transactions are sorted by date
        [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(tx => {
            const month = new Date(tx.date).toLocaleString('default', { month: 'short' });
            if (!flows[month]) {
                flows[month] = { name: month, income: 0, expense: 0 };
            }
            if (tx.type === 'income') {
                flows[month].income += tx.amount;
            } else {
                flows[month].expense += tx.amount;
            }
        });
        
        return Object.values(flows);
    }, [transactions]);
    
    return (
        <Card title="Cash Flow" variant="interactive" onClick={onClick}>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFlows} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend wrapperStyle={{fontSize: '12px'}} />
                        <Bar dataKey="income" fill="#10b981" name="Income" />
                        <Bar dataKey="expense" fill="#f43f5e" name="Expense" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

const SavingsGoals: React.FC<{ goals: SavingsGoal[]; onClick: () => void; }> = ({ goals, onClick }) => (
    <Card title="Savings Goals" className="h-full" variant="interactive" onClick={onClick}>
        <div className="space-y-4">
            {goals.map(goal => {
                const progress = Math.floor((goal.saved / goal.target) * 100);
                const Icon = WIDGET_ICONS[goal.iconName];
                return (
                    <div key={goal.id}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                <Icon className="w-5 h-5 text-cyan-400 mr-2" />
                                <span className="text-sm font-medium text-white">{goal.name}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-300">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    </Card>
);

const MarketMovers: React.FC<{ movers: MarketMover[]; onSelect: (mover: MarketMover) => void; }> = ({ movers, onSelect }) => (
    <Card title="Market Movers">
        <div className="space-y-1">
            {movers.map(mover => (
                <div key={mover.ticker} onClick={() => onSelect(mover)} className="flex items-center justify-between text-sm p-2 rounded-lg cursor-pointer hover:bg-gray-700/50">
                    <div>
                        <p className="font-bold text-white">{mover.ticker}</p>
                        <p className="text-xs text-gray-400 truncate w-32">{mover.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-white">${mover.price.toFixed(2)}</p>
                        <p className={`text-xs ${mover.change > 0 ? 'text-green-400' : 'text-red-400'}`}>{mover.change > 0 ? '+' : ''}{mover.change.toFixed(2)}</p>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const AIPredictiveBundle: React.FC = () => {
    const context = useContext(DataContext);
    const [bundle, setBundle] = useState<{ title: string; description: string; images: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { geminiApiKey } = context || {};

    useEffect(() => {
        const generateBundle = async () => {
            if (!context || context.transactions.length === 0) {
                setIsLoading(false);
                setError("Not enough transaction data to generate a bundle.");
                return;
            };

            if (!geminiApiKey) {
                setError("Set Gemini API key in API Status to use this feature.");
                setIsLoading(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const transactionSummary = context.transactions.slice(0, 10).map(t => `${t.description} ($${t.amount})`).join(', ');
                const textPrompt = `Based on these recent user transactions, create an "AI Predictive Product Bundle" called "Smart Home Upgrade Pack". Generate a short, compelling description (2-3 sentences) for this bundle, explaining why it's recommended based on the transactions. Also suggest two specific, distinct products for the bundle. Format the response as a JSON object with keys: "description", "product1_name", and "product2_name". Transactions: ${transactionSummary}`;

                const textResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: textPrompt,
                    config: { responseMimeType: 'application/json' }
                });

                const bundleData = JSON.parse(textResponse.text);

                const imagePrompt1 = `A sleek, modern product shot of a ${bundleData.product1_name}, minimalist aesthetic, on a clean, light gray background.`;
                const imagePrompt2 = `A sleek, modern product shot of a ${bundleData.product2_name}, minimalist aesthetic, on a clean, light gray background.`;

                const [imageResponse1, imageResponse2] = await Promise.all([
                    ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: imagePrompt1, config: { numberOfImages: 1, outputMimeType: 'image/jpeg' } }),
                    ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: imagePrompt2, config: { numberOfImages: 1, outputMimeType: 'image/jpeg' } })
                ]);
                
                const imageUrl1 = `data:image/jpeg;base64,${imageResponse1.generatedImages[0].image.imageBytes}`;
                const imageUrl2 = `data:image/jpeg;base64,${imageResponse2.generatedImages[0].image.imageBytes}`;
                
                setBundle({
                    title: "Smart Home Upgrade Pack",
                    description: bundleData.description,
                    images: [imageUrl1, imageUrl2]
                });

            } catch (err) {
                console.error("Error generating product bundle:", err);
                setError("Plato AI couldn't generate a bundle at this time.");
            } finally {
                setIsLoading(false);
            }
        };

        generateBundle();
    }, [context, geminiApiKey]);

    return (
        <Card title="AI Predictive Product Bundle" isLoading={isLoading}>
            {error && <p className="text-red-400 text-center">{error}</p>}
            {bundle && (
                 <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-cyan-300">{bundle.title}</h3>
                        <p className="text-sm text-gray-400 mt-2 mb-4 italic">"{bundle.description}"</p>
                        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">View Bundle</button>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-700 rounded-lg"><img src={bundle.images[0]} className="object-cover w-full h-full rounded-lg" /></div>
                        <div className="w-24 h-24 bg-gray-700 rounded-lg"><img src={bundle.images[1]} className="object-cover w-full h-full rounded-lg" /></div>
                    </div>
                </div>
            )}
        </Card>
    );
};


// ================================================================================================
// MAIN DASHBOARD COMPONENT
// ================================================================================================

interface DashboardProps {
    setActiveView: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const context = useContext(DataContext);
    const [modal, setModal] = useState<{ type: string; data: any } | null>(null);


    if (!context) {
        throw new Error("Dashboard must be wrapped in a DataProvider.");
    }

    const { transactions, impactData, gamification, subscriptions, creditScore, upcomingBills, savingsGoals, marketMovers, budgets, linkedAccounts, rewardPoints, isImportingData } = context;
    const hasLinkedAccounts = linkedAccounts && linkedAccounts.length > 0;

    const handleQuickAction = (action: string) => {
        if (action === 'Send Money') {
            setActiveView(View.SendMoney);
        } else {
            setModal({ type: action, data: null });
        }
    };

    const mockStockData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        day: i,
        price: modal?.data?.price ? modal.data.price - 15 + Math.random() * 30 : 100 + Math.random() * 50
    })), [modal?.data?.price]);

    return (
        <>
            <DataImportingOverlay isImporting={isImportingData} bankName={linkedAccounts[linkedAccounts.length -1]?.name} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                
                {!hasLinkedAccounts && (
                    <div className="lg:col-span-12">
                        <LinkAccountPrompt />
                    </div>
                )}

                {/* --- HERO ROW --- */}
                <div className="lg:col-span-9">
                    <BalanceSummary />
                </div>
                <div className="lg:col-span-3">
                    <GamificationProfile gamification={gamification} onClick={() => setActiveView(View.Rewards)} />
                </div>

                {hasLinkedAccounts && (
                    <div className="lg:col-span-12">
                        <AIPredictiveBundle />
                    </div>
                )}

                {/* --- NEW WIDGETS SECTION --- */}
                <div className="lg:col-span-3">
                    <QuickActions onAction={handleQuickAction} />
                </div>
                <div className="lg:col-span-3">
                    <CreditScoreMonitor creditScore={creditScore} onClick={() => setActiveView(View.CreditHealth)} />
                </div>
                <div className="lg:col-span-3">
                    <RewardPointsWidget rewards={rewardPoints} onClick={() => setActiveView(View.Rewards)} />
                </div>
                <div className="lg:col-span-3">
                    <SecurityStatus onClick={() => setActiveView(View.Security)} />
                </div>
                <div className="lg:col-span-5">
                    <SubscriptionTracker subscriptions={subscriptions} onClick={() => setActiveView(View.Budgets)} />
                </div>
                <div className="lg:col-span-7">
                    <SavingsGoals goals={savingsGoals} onClick={() => setActiveView(View.Goals)} />
                </div>

                <div className="lg:col-span-8">
                    <CashFlowAnalysis transactions={transactions} onClick={() => setActiveView(View.Transactions)} />
                </div>
                <div className="lg:col-span-4">
                    <CategorySpending budgets={budgets} onClick={() => setActiveView(View.Budgets)} />
                </div>
                <div className="lg:col-span-6">
                    <MarketMovers movers={marketMovers} onSelect={(mover) => setModal({ type: 'StockDetail', data: mover })} />
                </div>
                <div className="lg:col-span-6">
                    <UpcomingBills bills={upcomingBills} onPay={(bill) => setModal({ type: 'Pay Bill', data: bill })} />
                </div>


                {/* --- ORIGINAL WIDGETS SECTION --- */}
                <div className="lg:col-span-8">
                    <RecentTransactions transactions={transactions.slice(0, 5)} setActiveView={setActiveView} />
                </div>
                <div className="lg:col-span-4">
                    <ImpactTracker
                        treesPlanted={impactData.treesPlanted}
                        progress={impactData.progressToNextTree}
                    />
                </div>
                <div className="lg:col-span-12">
                    <AIInsights />
                </div>
                <div className="lg:col-span-12">
                    <WealthTimeline />
                </div>
            </div>

            {/* --- MODALS --- */}
            <Modal isOpen={modal?.type === 'Pay Bill'} onClose={() => setModal(null)} title={`Pay Bill: ${modal?.data?.name}`}>
                <div className="space-y-4">
                    <p>You are about to pay <span className="font-bold text-white">${modal?.data?.amount.toFixed(2)}</span> for your {modal?.data?.name} bill.</p>
                    <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg" onClick={() => { alert('Payment Successful!'); setModal(null); }}>Confirm Payment</button>
                </div>
            </Modal>
            <Modal isOpen={modal?.type === 'Deposit'} onClose={() => setModal(null)} title="Deposit Check">
                <p>Mobile check deposit functionality would be implemented here, likely using the device camera.</p>
            </Modal>
            <Modal isOpen={modal?.type === 'StockDetail'} onClose={() => setModal(null)} title={`${modal?.data?.name} (${modal?.data?.ticker})`}>
                 <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <p className="text-3xl font-bold text-white">${modal?.data?.price.toFixed(2)}</p>
                        <p className={`font-semibold ${modal?.data?.change > 0 ? 'text-green-400' : 'text-red-400'}`}>{modal?.data?.change > 0 ? '+' : ''}{modal?.data?.change.toFixed(2)}</p>
                    </div>
                    <div className="h-40">
                         <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={mockStockData}>
                                 <defs><linearGradient id="stockColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }}/>
                                <Area type="monotone" dataKey="price" stroke="#06b6d4" fill="url(#stockColor)" />
                             </AreaChart>
                         </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Buy</button>
                        <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Sell</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Dashboard;