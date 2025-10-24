import React, { useState, useMemo, useEffect, useCallback, FC, ReactNode } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsView from './components/TransactionsView';
import SendMoneyView from './components/SendMoneyView';
import InvestmentsView from './components/InvestmentsView';
import AIAdvisorView from './components/AIAdvisorView';
import SecurityView from './components/SecurityView';
import BudgetsView from './components/BudgetsView';
import VoiceControl from './components/VoiceControl';
import QuantumWeaverView from './components/QuantumWeaverView';
import AgentMarketplaceView from './components/MarketplaceView';
import CorporateCommandView from './components/CorporateCommandView';
import OpenBankingView from './components/OpenBankingView';
import FinancialDemocracyView from './components/FinancialDemocracyView';
import AIAdStudioView from './components/AIAdStudioView';
import CryptoView from './components/CryptoView';
import FinancialGoalsView from './components/FinancialGoalsView';
import { View, IllusionType, APIStatus, RewardPoints, GamificationState, CreditScore, CreditFactor, RewardItem } from './types';
import { GoogleGenAI } from "@google/genai";
import Card from './components/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { MOCK_API_STATUS, MOCK_REWARD_ITEMS, MOCK_CREDIT_SCORE, MOCK_CREDIT_FACTORS } from './data/mockData';

// ================================================================================================
// MOCK DATA & SERVICES (Simulating new architecture)
// In a real application, services would be in `services/` and hooks in `hooks/`.
// ================================================================================================

const MOCK_GAMIFICATION_STATE: GamificationState = {
    score: 450, level: 3, levelName: "Savings Specialist",
    progress: 25, credits: 225,
};

const MOCK_REWARD_POINTS: RewardPoints = {
    balance: 85250, lastEarned: 320, lastRedeemed: 5000, currency: 'Points',
};

// --- Mock Service Layer ---
const apiService = {
    fetchApiStatus: async (): Promise<APIStatus[]> => MOCK_API_STATUS,
    fetchRewardPoints: async (): Promise<RewardPoints> => MOCK_REWARD_POINTS,
    fetchGamificationState: async (): Promise<GamificationState> => MOCK_GAMIFICATION_STATE,
    fetchRewardItems: async (): Promise<RewardItem[]> => MOCK_REWARD_ITEMS,
    fetchCreditScore: async (): Promise<CreditScore> => MOCK_CREDIT_SCORE,
    fetchCreditFactors: async (): Promise<CreditFactor[]> => MOCK_CREDIT_FACTORS,
    redeemReward: async (itemId: string): Promise<{ success: boolean }> => {
        console.log(`Redeeming item ${itemId}`);
        return { success: true };
    },
};

// --- Custom Hooks (React Query Selectors) ---
const useApiStatus = () => useQuery({ queryKey: ['apiStatus'], queryFn: apiService.fetchApiStatus });
const useRewardPoints = () => useQuery({ queryKey: ['rewardPoints'], queryFn: apiService.fetchRewardPoints });
const useGamification = () => useQuery({ queryKey: ['gamification'], queryFn: apiService.fetchGamificationState });
const useRewardItems = () => useQuery({ queryKey: ['rewardItems'], queryFn: apiService.fetchRewardItems });
const useCreditScore = () => useQuery({ queryKey: ['creditScore'], queryFn: apiService.fetchCreditScore });
const useCreditFactors = () => useQuery({ queryKey: ['creditFactors'], queryFn: apiService.fetchCreditFactors });
const useRedeemReward = () => useMutation({ mutationFn: (itemId: string) => apiService.redeemReward(itemId) });

// ================================================================================================
// REDUX TOOLKIT SETUP (For Global UI State)
// ================================================================================================

interface UiState {
    activeView: View;
    previousView: View | null;
    isSidebarOpen: boolean;
    customBackgroundUrl: string | null;
    activeIllusion: IllusionType;
    geminiApiKey: string | null;
}

const initialState: UiState = {
    activeView: View.Dashboard,
    previousView: null,
    isSidebarOpen: false,
    customBackgroundUrl: localStorage.getItem('customBackgroundUrl') || null,
    activeIllusion: (localStorage.getItem('activeIllusion') as IllusionType) || 'none',
    geminiApiKey: localStorage.getItem('geminiApiKey') || null,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setActiveView: (state, action: PayloadAction<View>) => {
            if (action.payload !== state.activeView) {
                state.previousView = state.activeView;
                state.activeView = action.payload;
            }
        },
        setIsSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isSidebarOpen = action.payload;
        },
        setCustomBackgroundUrl: (state, action: PayloadAction<string>) => {
            state.customBackgroundUrl = action.payload;
            state.activeIllusion = 'none';
            localStorage.setItem('customBackgroundUrl', action.payload);
            localStorage.setItem('activeIllusion', 'none');
        },
        setActiveIllusion: (state, action: PayloadAction<IllusionType>) => {
            state.activeIllusion = action.payload;
            if (action.payload !== 'none') {
                state.customBackgroundUrl = null;
                localStorage.removeItem('customBackgroundUrl');
            }
            localStorage.setItem('activeIllusion', action.payload);
        },
        setGeminiApiKey: (state, action: PayloadAction<string>) => {
            state.geminiApiKey = action.payload;
            localStorage.setItem('geminiApiKey', action.payload);
        },
    },
});

const store = configureStore({
    reducer: {
        ui: uiSlice.reducer,
    },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <TSelected extends unknown>(
    selector: (state: RootState) => TSelected
): TSelected => useSelector<RootState, TSelected>(selector);

// ================================================================================================
// REACT QUERY CLIENT SETUP
// ================================================================================================

const queryClient = new QueryClient();

// ================================================================================================
// INLINE VIEW COMPONENTS (Refactored to use new state management)
// ================================================================================================

const TheVisionView: React.FC = () => (
    <div className="space-y-8 text-gray-300 max-w-4xl mx-auto">
        <div className="text-center">
            <h1 className="text-5xl font-bold text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500">The Winning Vision</h1>
            <p className="mt-4 text-lg text-gray-400">This is not a bank. It is a financial co-pilot.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <Card variant="outline"><h3 className="text-xl font-semibold text-cyan-300">Hyper-Personalized</h3><p className="mt-2 text-sm">Every pixel, insight, and recommendation is tailored to your unique financial journey.</p></Card>
            <Card variant="outline"><h3 className="text-xl font-semibold text-cyan-300">Proactive & Predictive</h3><p className="mt-2 text-sm">We don't just show you the past; our AI anticipates your needs and guides your future.</p></Card>
            <Card variant="outline"><h3 className="text-xl font-semibold text-cyan-300">Platform for Growth</h3><p className="mt-2 text-sm">A suite of tools for creators, founders, and businesses to build their visions upon.</p></Card>
        </div>
        <div>
            <h2 className="text-3xl font-semibold text-white mb-4">Core Tenets</h2>
            <ul className="space-y-4">
                <li className="p-4 bg-gray-800/50 rounded-lg"><strong className="text-cyan-400">The AI is a Partner, Not Just a Tool:</strong> Our integration with Google's Gemini API is designed for collaboration. From co-creating your bank card's design to generating a business plan, the AI is a creative and strategic partner.</li>
                <li className="p-4 bg-gray-800/50 rounded-lg"><strong className="text-cyan-400">Seamless Integration is Reality:</strong> We demonstrate enterprise-grade readiness with high-fidelity simulations of Plaid, Stripe, Marqeta, and Modern Treasury. This isn't a concept; it's a blueprint for a fully operational financial ecosystem.</li>
                <li className="p-4 bg-gray-800/50 rounded-lg"><strong className="text-cyan-400">Finance is a Gateway, Not a Gatekeeper:</strong> Features like the Quantum Weaver Incubator and the AI Ad Studio are designed to empower creation. We provide not just the capital, but the tools to build, market, and grow.</li>
                <li className="p-4 bg-gray-800/50 rounded-lg"><strong className="text-cyan-400">The Future is Multi-Rail:</strong> Our platform is fluent in both traditional finance (ISO 20022) and the decentralized future (Web3). The Crypto & Corporate hubs are designed to manage value, no matter how it's represented.</li>
            </ul>
        </div>
    </div>
);

const SettingsIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const APIIntegrationView: FC = () => {
    const { data: apiStatus, isLoading } = useApiStatus();
    const geminiApiKey = useAppSelector(state => state.ui.geminiApiKey);
    const dispatch = useAppDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');

    const handleSaveKey = () => {
        dispatch(uiSlice.actions.setGeminiApiKey(apiKeyInput));
        setIsModalOpen(false);
    };

    const StatusIndicator: FC<{ status: APIStatus['status'] }> = ({ status }) => {
        const colors = {
            'Operational': { bg: 'bg-green-500/20', text: 'text-green-300', dot: 'bg-green-400' },
            'Degraded Performance': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
            'Partial Outage': { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
            'Major Outage': { bg: 'bg-red-500/20', text: 'text-red-300', dot: 'bg-red-400' },
        };
        const style = colors[status];
        return (
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
                {status}
            </div>
        );
    };

    return (
        <>
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-700"><h3 className="text-lg font-semibold text-white">Configure Google Gemini API Key</h3></div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-400">Enter your API key to enable all AI features. Your key is stored locally in your browser.</p>
                            <input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Enter your Gemini API Key" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                            <button onClick={handleSaveKey} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Save Key</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white tracking-wider">System & API Status</h2>
                <Card isLoading={isLoading}>
                    <div className="space-y-3">
                        {apiStatus?.map(api => (
                            <div key={api.provider} className="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                <h4 className="font-semibold text-lg text-white mb-2 sm:mb-0">{api.provider}</h4>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-gray-400 font-mono">{api.responseTime}ms</p>
                                    <StatusIndicator status={api.status} />
                                    {api.provider === 'Google Gemini' && (
                                        <button onClick={() => { setApiKeyInput(geminiApiKey || ''); setIsModalOpen(true); }} className="text-gray-400 hover:text-white"><SettingsIcon className="h-5 w-5"/></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="Simulated Live API Traffic">
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Array.from({length: 20}, (_, i) => ({name: i, calls: 50 + Math.random() * 50}))}>
                                <defs><linearGradient id="apiColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                                <Area type="monotone" dataKey="calls" stroke="#06b6d4" fill="url(#apiColor)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </>
    );
};

const RewardsView: FC = () => {
    const { data: rewardPoints, isLoading: isLoadingPoints } = useRewardPoints();
    const { data: gamification, isLoading: isLoadingGamification } = useGamification();
    const { data: rewardItems, isLoading: isLoadingItems } = useRewardItems();
    const { mutate: redeemRewardMutation } = useRedeemReward();

    const [message, setMessage] = useState('');

    const handleRedeem = (item: RewardItem) => {
        if (rewardPoints && rewardPoints.balance >= item.cost) {
            redeemRewardMutation(item.id, {
                onSuccess: () => {
                    setMessage(`Successfully redeemed ${item.name}!`);
                    queryClient.invalidateQueries({ queryKey: ['rewardPoints'] }); // Refetch points
                },
                onError: () => setMessage(`Failed to redeem ${item.name}.`),
            });
        } else {
            setMessage(`Not enough points for ${item.name}.`);
        }
        setTimeout(() => setMessage(''), 3000);
    };
    
    const REWARD_ICONS: { [key: string]: FC<{ className?: string }> } = {
        cash: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        gift: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4H5z" /></svg>,
        leaf: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" /></svg>,
    };

    return (
        <div className="space-y-6">
             <h2 className="text-3xl font-bold text-white tracking-wider">Rewards Hub</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Your Points" className="md:col-span-1" isLoading={isLoadingPoints}>
                     <div className="text-center">
                        <p className="text-5xl font-bold text-cyan-300">{rewardPoints?.balance.toLocaleString() || 0}</p>
                        <p className="text-gray-400">{rewardPoints?.currency || 'Points'}</p>
                     </div>
                </Card>
                 <Card title="Your Level" className="md:col-span-2" isLoading={isLoadingGamification}>
                    {gamification && <div className="flex items-center gap-6">
                         <h3 className="text-2xl font-semibold text-white flex-1">{gamification.levelName} <span className="text-base text-gray-400">(Level {gamification.level})</span></h3>
                         <div className="w-full max-w-xs">
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${gamification.progress}%` }}></div>
                            </div>
                         </div>
                     </div>}
                 </Card>
             </div>
             <Card title="Redeem Your Points" isLoading={isLoadingItems}>
                 {message && <p className="text-center mb-4 text-cyan-200">{message}</p>}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {rewardItems?.map(item => {
                         const Icon = REWARD_ICONS[item.iconName];
                         return (
                            <div key={item.id} className="p-4 bg-gray-800/50 rounded-lg flex flex-col">
                                 <Icon className="w-8 h-8 text-cyan-400 mb-2" />
                                 <h4 className="font-semibold text-white flex-grow">{item.name}</h4>
                                 <p className="text-xs text-gray-400 my-2">{item.description}</p>
                                 <div className="flex justify-between items-center mt-auto">
                                     <p className="font-mono text-cyan-300">{item.cost.toLocaleString()} pts</p>
                                     <button onClick={() => handleRedeem(item)} disabled={!rewardPoints || rewardPoints.balance < item.cost} className="px-3 py-1 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-xs disabled:opacity-50">Redeem</button>
                                 </div>
                            </div>
                         );
                     })}
                 </div>
             </Card>
        </div>
    );
};

const CreditHealthView: FC = () => {
    const { data: creditScore, isLoading: isLoadingScore } = useCreditScore();
    const { data: creditFactors, isLoading: isLoadingFactors } = useCreditFactors();
    const geminiApiKey = useAppSelector(state => state.ui.geminiApiKey);
    const [insight, setInsight] = useState('');
    const [isLoadingInsight, setIsLoadingInsight] = useState(false);

    const getAIInsight = useCallback(async () => {
        if (!creditScore || !creditFactors) return;
        setIsLoadingInsight(true);
        if (!geminiApiKey) {
            setInsight("Please set your Gemini API key in the API Status view to get insights.");
            setIsLoadingInsight(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({apiKey: geminiApiKey});
            const prompt = `A user has a credit score of ${creditScore.score}. Their credit factors are: ${creditFactors.map(f => `${f.name}: ${f.status}`).join(', ')}. Provide one concise, actionable tip to help them improve their score.`;
            const response = await ai.models.generateContent({model: 'gemini-1.5-flash-latest', content: prompt});
            setInsight(response.response.text());
        } catch (err) {
            setInsight("Could not generate a personalized tip at this time.");
        } finally {
            setIsLoadingInsight(false);
        }
    }, [creditScore, creditFactors, geminiApiKey]);
    
    useEffect(() => { getAIInsight() }, [getAIInsight]);

    const StatusIndicator: FC<{ status: 'Excellent' | 'Good' | 'Fair' | 'Poor' }> = ({ status }) => {
        const colors = { Excellent: 'bg-green-500', Good: 'bg-cyan-500', Fair: 'bg-yellow-500', Poor: 'bg-red-500' };
        return <div className={`w-3 h-3 rounded-full ${colors[status]}`}></div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Credit Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Your Credit Score" subtitle={`Rating: ${creditScore?.rating}`} isLoading={isLoadingScore}>
                     <p className="text-7xl font-bold text-center text-white my-8">{creditScore?.score}</p>
                </Card>
                <Card title="AI-Powered Tip">
                     <div className="flex flex-col justify-center items-center h-full text-center">
                         {isLoadingInsight ? <p>Analyzing...</p> : <p className="text-gray-300 italic">"{insight}"</p>}
                     </div>
                </Card>
            </div>
            <Card title="Factors Impacting Your Score" isLoading={isLoadingFactors}>
                <div className="space-y-3">
                    {creditFactors?.map(factor => (
                        <div key={factor.name} className="p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-white">{factor.name}</h4>
                                <div className="flex items-center gap-2"><StatusIndicator status={factor.status} /><span className="text-sm text-gray-300">{factor.status}</span></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{factor.description}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

const SettingsView: FC = () => (
     <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-white tracking-wider">Settings</h2>
         <Card title="Profile">
            <p className="text-gray-400">Name: <span className="text-white">The Visionary</span></p>
            <p className="text-gray-400">Email: <span className="text-white">visionary@demobank.com</span></p>
         </Card>
         <Card title="Notification Preferences">
             <div className="flex justify-between items-center"><p>Large Transaction Alerts</p><input type="checkbox" className="toggle toggle-sm toggle-cyan" defaultChecked /></div>
             <div className="flex justify-between items-center"><p>Budget Warnings</p><input type="checkbox" className="toggle toggle-sm toggle-cyan" defaultChecked /></div>
             <div className="flex justify-between items-center"><p>AI Insight Notifications</p><input type="checkbox" className="toggle toggle-sm toggle-cyan" /></div>
         </Card>
         <Card title="Theme"><p className="text-sm text-gray-400">Theme settings are managed in the <span className="font-semibold text-cyan-300">Personalization</span> view.</p></Card>
    </div>
);

const PersonalizationView: FC = () => {
    const dispatch = useAppDispatch();
    const { activeIllusion, geminiApiKey } = useAppSelector(state => state.ui);
    const [prompt, setPrompt] = useState('An isolated lighthouse on a stormy sea, with a powerful beam of light cutting through the darkness.');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestedTheme, setSuggestedTheme] = useState<{ name: string, justification: string, type: IllusionType | 'image', url?: string } | null>(null);

    const handleGenerate = async () => {
        if (!prompt || !geminiApiKey) {
            setError(geminiApiKey ? "Prompt is empty." : "Please set your Gemini API key.");
            return;
        }
        setIsLoading(true); setError('');
        try {
            // In a real app, this would call a BFF endpoint that handles image generation securely.
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            // This feature is illustrative; the actual image generation model might differ.
            setCustomBackgroundUrl(''); // Placeholder for generated image URL
        } catch (err) {
            setError("Sorry, I couldn't generate the image.");
        } finally { setIsLoading(false); }
    };
    
    const illusionOptions: { id: IllusionType, name: string }[] = [{ id: 'none', name: 'None' }, { id: 'aurora', name: 'Aurora' }];
    const handleSuggestion = () => setSuggestedTheme({ name: "Tropical Sunset", justification: "Inspired by your 'Cyberpunk Vacation' goal.", type: 'image', url: '/IMG_5610.webp' });
    const applySuggestion = () => {
        if (suggestedTheme) {
            if (suggestedTheme.type === 'image' && suggestedTheme.url) dispatch(uiSlice.actions.setCustomBackgroundUrl(suggestedTheme.url));
            else if (suggestedTheme.type !== 'image') dispatch(uiSlice.actions.setActiveIllusion(suggestedTheme.type));
        }
    }

    return (
        <div className="space-y-6">
            <Card title="Heuristic API Theme Suggestions">
                <div className="flex flex-col items-center text-center">
                    {!suggestedTheme ? (
                        <><p className="text-gray-400 mb-4">Let our AI suggest a personalized theme based on your financial goals.</p><button onClick={handleSuggestion} className="px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-sm">Suggest a Theme</button></>
                    ) : (
                        <div>
                             <h4 className="font-semibold text-cyan-300">Theme Suggestion: {suggestedTheme.name}</h4>
                             <p className="text-sm text-gray-400 italic my-2">"{suggestedTheme.justification}"</p>
                             <button onClick={applySuggestion} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">Apply Theme</button>
                        </div>
                    )}
                </div>
            </Card>
            {/* Other personalization components... */}
        </div>
    );
};

const CardCustomizationView: FC = () => {
    const geminiApiKey = useAppSelector(state => state.ui.geminiApiKey);
    // Component logic remains but uses `geminiApiKey` from Redux instead of context.
    return <Card title="Card Customization"><p className="text-gray-400">Feature coming soon. Requires Gemini API Key: {geminiApiKey ? 'Set' : 'Not Set'}</p></Card>;
};

// ================================================================================================
// MAIN APP COMPONENT
// ================================================================================================

const App: FC = () => {
    const dispatch = useAppDispatch();
    const { activeView, previousView, isSidebarOpen, customBackgroundUrl, activeIllusion } = useAppSelector(state => state.ui);

    const setActiveView = (view: View) => {
        dispatch(uiSlice.actions.setActiveView(view));
    };

    const setIsSidebarOpen = (isOpen: boolean) => {
        dispatch(uiSlice.actions.setIsSidebarOpen(isOpen));
    };

    const renderActiveView = () => {
        switch (activeView) {
            case View.Dashboard: return <Dashboard setActiveView={setActiveView} />;
            case View.Transactions: return <TransactionsView />;
            case View.SendMoney: return <SendMoneyView setActiveView={setActiveView} />;
            case View.Budgets: return <BudgetsView />;
            case View.Investments: return <InvestmentsView />;
            case View.AIAdvisor: return <AIAdvisorView previousView={previousView} />;
            case View.QuantumWeaver: return <QuantumWeaverView />;
            case View.AIAdStudio: return <AIAdStudioView />;
            case View.Marketplace: return <AgentMarketplaceView />;
            case View.Personalization: return <PersonalizationView />;
            case View.CardCustomization: return <CardCustomizationView />;
            case View.Security: return <SecurityView />;
            case View.Goals: return <FinancialGoalsView />;
            case View.Crypto: return <CryptoView />;
            case View.CorporateCommand: return <CorporateCommandView />;
            case View.SASPlatforms: return <TheVisionView />;
            case View.APIIntegration: return <APIIntegrationView />;
            case View.OpenBanking: return <OpenBankingView />;
            case View.Rewards: return <RewardsView />;
            case View.CreditHealth: return <CreditHealthView />;
            case View.Settings: return <SettingsView />;
            case View.FinancialDemocracy: return <FinancialDemocracyView />;
            default: return <Dashboard setActiveView={setActiveView} />;
        }
    };

    const backgroundStyle: React.CSSProperties = customBackgroundUrl ? { backgroundImage: `url(${customBackgroundUrl})` } : {};

    return (
        <div id="app-container" style={backgroundStyle} className={`bg-cover bg-center bg-fixed ${activeIllusion === 'aurora' ? 'aurora-bg' : ''}`}>
             <div className={`flex h-screen bg-gray-950/80 text-gray-200 backdrop-blur-xl`}>
                <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} setActiveView={setActiveView} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
                        {renderActiveView()}
                    </main>
                </div>
                <VoiceControl setActiveView={setActiveView} />
            </div>
            {activeIllusion === 'aurora' && <style>{`
                .aurora-bg { background: #030712; position: relative; overflow: hidden; }
                .aurora-bg::before, .aurora-bg::after { content: ''; position: absolute; width: 800px; height: 800px; border-radius: 50%; filter: blur(150px); opacity: 0.3; mix-blend-mode: screen; animation: aurora-flow 20s infinite linear; }
                .aurora-bg::before { background: radial-gradient(circle, #06b6d4, transparent); top: -20%; left: -20%; }
                .aurora-bg::after { background: radial-gradient(circle, #4f46e5, transparent); bottom: -20%; right: -20%; animation-delay: -10s; }
                @keyframes aurora-flow { 0% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(100px, 100px) rotate(180deg); } 100% { transform: translate(0, 0) rotate(360deg); } }
            `}</style>}
        </div>
    );
};

const AppWrapper: FC = () => (
    <Provider store={store}>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </Provider>
);

export default AppWrapper;
