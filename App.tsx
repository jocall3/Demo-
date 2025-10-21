import React, { useState, useContext, useMemo, useEffect } from 'react';
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
import { View, IllusionType, FinancialGoal, AIGoalPlan, CryptoAsset, VirtualCard, PaymentOperation, CorporateCard, CorporateTransaction, NFTAsset, RewardItem, APIStatus } from './types';
import { DataProvider, DataContext } from './context/DataContext';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import Card from './components/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import CorporateCommandView from './components/CorporateCommandView';
import OpenBankingView from './components/OpenBankingView';
import FinancialDemocracyView from './components/FinancialDemocracyView';
import AIAdStudioView from './components/AIAdStudioView';
import CryptoView from './components/CryptoView';
import FinancialGoalsView from './components/FinancialGoalsView';


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

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

const APIIntegrationView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("APIIntegrationView must be within a DataProvider.");
    const { apiStatus, geminiApiKey, setGeminiApiKey } = context;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');

    const handleSaveKey = () => {
        setGeminiApiKey(apiKeyInput);
        setIsModalOpen(false);
    };

    const StatusIndicator: React.FC<{ status: APIStatus['status'] }> = ({ status }) => {
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
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white">Configure Google Gemini API Key</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-400">Enter your API key to enable all AI features. Your key is stored locally in your browser and is not sent to our servers.</p>
                            <input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="Enter your Gemini API Key"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <button onClick={handleSaveKey} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Save Key</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white tracking-wider">System & API Status</h2>
                <Card>
                    <div className="space-y-3">
                        {apiStatus.map(api => (
                            <div key={api.provider} className="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                <h4 className="font-semibold text-lg text-white mb-2 sm:mb-0">{api.provider}</h4>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-gray-400 font-mono">{api.responseTime}ms</p>
                                    <StatusIndicator status={api.status} />
                                    {api.provider === 'Google Gemini' && (
                                        <button onClick={() => { setApiKeyInput(geminiApiKey || ''); setIsModalOpen(true); }} className="text-gray-400 hover:text-white">
                                            <SettingsIcon className="h-5 w-5"/>
                                        </button>
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

const RewardsView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("RewardsView must be within a DataProvider.");
    const { rewardPoints, gamification, rewardItems, redeemReward } = context;

    const [message, setMessage] = useState('');

    const handleRedeem = (item: RewardItem) => {
        const success = redeemReward(item);
        setMessage(success ? `Successfully redeemed ${item.name}!` : `Not enough points for ${item.name}.`);
        setTimeout(() => setMessage(''), 3000);
    };
    
    const REWARD_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
        cash: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        gift: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4H5z" /></svg>,
        leaf: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 3.5a1.5 1.5 0 011.5 1.5v.92l5.06 4.69a1.5 1.5 0 01-.18 2.4l-3.38 1.95a1.5 1.5 0 01-1.5-.26L10 12.43l-1.5 2.25a1.5 1.5 0 01-1.5.26l-3.38-1.95a1.5 1.5 0 01-.18-2.4l5.06-4.69V5A1.5 1.5 0 0110 3.5z" /></svg>,
    };

    return (
        <div className="space-y-6">
             <h2 className="text-3xl font-bold text-white tracking-wider">Rewards Hub</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Your Points" className="md:col-span-1">
                     <div className="text-center">
                        <p className="text-5xl font-bold text-cyan-300">{rewardPoints.balance.toLocaleString()}</p>
                        <p className="text-gray-400">{rewardPoints.currency}</p>
                     </div>
                </Card>
                 <Card title="Your Level" className="md:col-span-2">
                     <div className="flex items-center gap-6">
                         <h3 className="text-2xl font-semibold text-white flex-1">{gamification.levelName} <span className="text-base text-gray-400">(Level {gamification.level})</span></h3>
                         <div className="w-full max-w-xs">
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${gamification.progress}%` }}></div>
                            </div>
                         </div>
                     </div>
                 </Card>
             </div>
             <Card title="Redeem Your Points">
                 {message && <p className="text-center mb-4 text-cyan-200">{message}</p>}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {rewardItems.map(item => {
                         const Icon = REWARD_ICONS[item.iconName];
                         return (
                            <div key={item.id} className="p-4 bg-gray-800/50 rounded-lg flex flex-col">
                                 <Icon className="w-8 h-8 text-cyan-400 mb-2" />
                                 <h4 className="font-semibold text-white flex-grow">{item.name}</h4>
                                 <p className="text-xs text-gray-400 my-2">{item.description}</p>
                                 <div className="flex justify-between items-center mt-auto">
                                     <p className="font-mono text-cyan-300">{item.cost.toLocaleString()} pts</p>
                                     <button onClick={() => handleRedeem(item)} disabled={rewardPoints.balance < item.cost} className="px-3 py-1 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-xs disabled:opacity-50">Redeem</button>
                                 </div>
                            </div>
                         );
                     })}
                 </div>
             </Card>
        </div>
    );
};

const CreditHealthView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("CreditHealthView must be within a DataProvider.");
    const { creditScore, creditFactors, geminiApiKey } = context;

    const [insight, setInsight] = useState('');
    const [isLoadingInsight, setIsLoadingInsight] = useState(false);

    const getAIInsight = async () => {
        setIsLoadingInsight(true);
        if (!geminiApiKey) {
            setInsight("Please set your Gemini API key in the API Status view to get insights.");
            setIsLoadingInsight(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({apiKey: geminiApiKey});
            const prompt = `A user has a credit score of ${creditScore.score}. Their credit factors are: ${creditFactors.map(f => `${f.name}: ${f.status}`).join(', ')}. Provide one concise, actionable tip to help them improve their score.`;
            const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt});
            setInsight(response.text);
        } catch (err) {
            console.error("Error getting credit insight:", err);
            setInsight("Could not generate a personalized tip at this time.");
        } finally {
            setIsLoadingInsight(false);
        }
    };
    
    useEffect(() => { getAIInsight() }, [geminiApiKey]);

    const StatusIndicator: React.FC<{ status: 'Excellent' | 'Good' | 'Fair' | 'Poor' }> = ({ status }) => {
        const colors = { Excellent: 'bg-green-500', Good: 'bg-cyan-500', Fair: 'bg-yellow-500', Poor: 'bg-red-500' };
        return <div className={`w-3 h-3 rounded-full ${colors[status]}`}></div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Credit Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Your Credit Score" subtitle={`Rating: ${creditScore.rating}`}>
                     <p className="text-7xl font-bold text-center text-white my-8">{creditScore.score}</p>
                </Card>
                <Card title="AI-Powered Tip">
                     <div className="flex flex-col justify-center items-center h-full text-center">
                         {isLoadingInsight ? <p>Analyzing...</p> : <p className="text-gray-300 italic">"{insight}"</p>}
                     </div>
                </Card>
            </div>
            <Card title="Factors Impacting Your Score">
                <div className="space-y-3">
                    {creditFactors.map(factor => (
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

const SettingsView: React.FC = () => (
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
         <Card title="Theme">
             <p className="text-sm text-gray-400">Theme settings are managed in the <span className="font-semibold text-cyan-300">Personalization</span> view.</p>
         </Card>
    </div>
);

const PersonalizationView: React.FC = () => {
    const context = useContext(DataContext);
    const [prompt, setPrompt] = useState('An isolated lighthouse on a stormy sea, with a powerful beam of light cutting through the darkness.');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestedTheme, setSuggestedTheme] = useState<{ name: string, justification: string, type: IllusionType | 'image', url?: string } | null>(null);


    if (!context) {
        throw new Error("PersonalizationView must be within a DataProvider.");
    }
    const { setCustomBackgroundUrl, setActiveIllusion, activeIllusion, geminiApiKey } = context;

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError('');
        if (!geminiApiKey) {
            setError("Please set your Gemini API key in the API Status view to generate images.");
            setIsLoading(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
            });
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            setCustomBackgroundUrl(imageUrl);
        } catch (err) {
            console.error("Image generation error:", err);
            setError("Sorry, I couldn't generate the image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const illusionOptions: { id: IllusionType, name: string }[] = [
        { id: 'none', name: 'None' },
        { id: 'aurora', name: 'Aurora' },
    ];
    
    const handleSuggestion = () => {
        setSuggestedTheme({
            name: "Tropical Sunset",
            justification: "Your 'Cyberpunk Vacation' savings goal inspired me to find a theme that matches your dream destination.",
            type: 'image',
            url: '/IMG_5610.webp' // Using a preloaded image for the suggestion
        });
    }
    
    const applySuggestion = () => {
        if (suggestedTheme) {
            if (suggestedTheme.type === 'image' && suggestedTheme.url) {
                setCustomBackgroundUrl(suggestedTheme.url);
            } else if (suggestedTheme.type === 'aurora' || suggestedTheme.type === 'none') {
                 setActiveIllusion(suggestedTheme.type);
            }
        }
    }


    return (
        <div className="space-y-6">
            <Card title="Heuristic API Theme Suggestions">
                <div className="flex flex-col items-center text-center">
                    {!suggestedTheme ? (
                        <>
                         <p className="text-gray-400 mb-4">Let the Heuristic API suggest a personalized theme based on your financial goals and activity.</p>
                         <button onClick={handleSuggestion} className="px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-sm">Suggest a Theme</button>
                        </>
                    ) : (
                        <div>
                             <h4 className="font-semibold text-cyan-300">Theme Suggestion: {suggestedTheme.name}</h4>
                             <p className="text-sm text-gray-400 italic my-2">"{suggestedTheme.justification}"</p>
                             <button onClick={applySuggestion} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">Apply Theme</button>
                        </div>
                    )}
                </div>
            </Card>
            <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg p-6`}>
                <h3 className="text-xl font-semibold text-gray-100 mb-4">Generate App Background</h3>
                <p className="text-gray-400 mb-4">Describe the background you want to see, and let AI create it for you. This will disable any active dynamic visual.</p>
                <div className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A calm zen garden with a flowing river"
                        className="w-full h-24 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Generating...' : 'Generate Background'}
                    </button>
                    {error && <p className="text-red-400 text-center">{error}</p>}
                </div>
            </div>
             <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg p-6`}>
                <h3 className="text-xl font-semibold text-gray-100 mb-4">Dynamic Visuals</h3>
                <p className="text-gray-400 mb-4">Choose a dynamic, reality-bending background for the app. This will override any generated background image.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {illusionOptions.map(option => (
                        <button 
                            key={option.id}
                            onClick={() => setActiveIllusion(option.id)}
                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500
                                ${activeIllusion === option.id 
                                    ? 'bg-cyan-600 text-white shadow-lg' 
                                    : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                }`}
                        >
                            {option.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CardCustomizationView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("CardCustomizationView must be within a DataProvider.");
    }
    const { geminiApiKey } = context;
    
    const [baseImage, setBaseImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Add a phoenix rising from the center, with its wings made of glowing data streams.');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [cardStory, setCardStory] = useState('');
    const [isStoryLoading, setIsStoryLoading] = useState(false);

    // New states for interactive effects
    const [metallic, setMetallic] = useState(50); // 0-100
    const [holo, setHolo] = useState(false);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setBaseImage(`data:${file.type};base64,${base64}`);
            setGeneratedImage(null); // Clear previous generation
        }
    };

    const handleGenerate = async () => {
        if (!baseImage || !prompt) return;
        setIsLoading(true);
        setError('');
        setGeneratedImage(null);
        if (!geminiApiKey) {
            setError("Please set your Gemini API key in the API Status view to edit images.");
            setIsLoading(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const base64Data = baseImage.split(',')[1];
            const mimeType = baseImage.match(/:(.*?);/)?.[1] || 'image/jpeg';
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: mimeType } },
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                const newBase64 = imagePart.inlineData.data;
                setGeneratedImage(`data:${imagePart.inlineData.mimeType};base64,${newBase64}`);
            } else {
                 setError("The AI didn't return an image. Try a different prompt.");
            }
        } catch (err) {
            console.error("Image editing error:", err);
            setError("Sorry, I couldn't edit the image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

     const generateCardStory = async () => {
        setIsStoryLoading(true);
        setCardStory('');
         if (!geminiApiKey) {
            setCardStory("Please set your Gemini API key in the API Status view to generate stories.");
            setIsStoryLoading(false);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const storyPrompt = `Based on this generative AI prompt for a credit card design, write a short, inspiring "Card Story" (2-3 sentences) about what this card represents.
Prompt: "${prompt}"
Effects: ${metallic > 0 ? 'Metallic sheen, ' : ''}${holo ? 'Holographic effect' : ''}`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: storyPrompt
            });
            setCardStory(response.text);
        } catch (err) {
            console.error("Card story generation error:", err);
            setCardStory("Could not generate a story for this design.");
        } finally {
            setIsStoryLoading(false);
        }
    };


    const displayImage = generatedImage || baseImage;
    const cardStyle: React.CSSProperties = {
        '--metallic-sheen': `${metallic}%`,
    } as React.CSSProperties;

    return (
        <div className="space-y-6">
             <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg p-6`}>
                <h3 className="text-xl font-semibold text-gray-100 mb-4">Design Your Card</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                         <p className="text-gray-400 mb-4">Upload a base image, describe your changes, and add physical effects.</p>
                         <div className="space-y-4">
                             <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600/50 file:text-cyan-200 hover:file:bg-cyan-600"/>
                             <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Make this image look like a watercolor painting"
                                className="w-full h-24 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                disabled={isLoading || !baseImage}
                            />
                             <button
                                onClick={handleGenerate}
                                disabled={isLoading || !baseImage || !prompt}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Generating...' : 'Generate Image'}
                            </button>
                            {error && <p className="text-red-400 text-center">{error}</p>}
                         </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-gray-400 mb-2">Card Preview</p>
                        <div style={cardStyle} className={`w-full max-w-sm aspect-[85.6/54] rounded-xl bg-gray-900/50 overflow-hidden shadow-2xl border border-gray-600 flex items-center justify-center relative ${holo ? 'holo-effect' : ''}`}>
                            <div className="absolute inset-0 metallic-overlay" style={{ opacity: metallic / 200 }}></div>
                            {isLoading && <div className="text-cyan-300">Generating...</div>}
                            {!isLoading && displayImage && <img src={displayImage} alt="Card Preview" className="w-full h-full object-cover"/>}
                            {!isLoading && !displayImage && <div className="text-gray-500">Upload an image to start</div>}
                        </div>
                    </div>
                </div>
            </div>
             <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg p-6`}>
                <h3 className="text-xl font-semibold text-gray-100 mb-4">Add Physical Effects</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-300">Metallic Sheen: {metallic}%</label>
                        <input type="range" min="0" max="100" value={metallic} onChange={e => setMetallic(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between">
                         <label className="text-gray-300">Holographic Effect</label>
                         <input type="checkbox" checked={holo} onChange={e => setHolo(e.target.checked)} className="toggle toggle-sm toggle-cyan" />
                    </div>
                </div>
            </div>
             <Card title="AI-Generated Card Story">
                {isStoryLoading ? <p>Generating story...</p> : cardStory ? <p className="text-gray-300 italic">"{cardStory}"</p> : <p className="text-gray-400">Generate a story for your unique card design.</p>}
                 <button onClick={generateCardStory} disabled={isStoryLoading} className="mt-4 px-4 py-2 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded-lg text-sm">
                    {isStoryLoading ? 'Writing...' : 'Generate Story'}
                </button>
             </Card>
            <style>{`
                .toggle-cyan:checked { background-color: #06b6d4; }
                .metallic-overlay {
                    background: linear-gradient(110deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 60%);
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }
                .holo-effect {
                    position: relative;
                    overflow: hidden;
                }
                .holo-effect::before {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%;
                    width: 200%; height: 200%;
                    background: linear-gradient(110deg, transparent 20%, #ff00ff, #00ffff, #ffff00, #ff00ff, transparent 80%);
                    animation: holo-spin 8s linear infinite;
                    opacity: 0.2;
                    mix-blend-mode: screen;
                }
                @keyframes holo-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const App: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("App must be used within a DataProvider.");
    }

    const { customBackgroundUrl, activeIllusion } = context;
    const [activeView, _setActiveView] = useState<View>(View.Dashboard);
    const [previousView, setPreviousView] = useState<View | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const setActiveView = (view: View) => {
        if (view !== activeView) {
            setPreviousView(activeView);
        }
        _setActiveView(view);
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
                    <Header onMenuClick={() => setIsSidebarOpen(prev => !prev)} setActiveView={setActiveView} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
                        {renderActiveView()}
                    </main>
                </div>
                <VoiceControl setActiveView={setActiveView} />
            </div>
             {/* Simple CSS for aurora effect */}
            {activeIllusion === 'aurora' && <style>{`
                .aurora-bg {
                    background: #030712;
                    position: relative;
                    overflow: hidden;
                }
                .aurora-bg::before, .aurora-bg::after {
                    content: '';
                    position: absolute;
                    width: 800px;
                    height: 800px;
                    border-radius: 50%;
                    filter: blur(150px);
                    opacity: 0.3;
                    mix-blend-mode: screen;
                    animation: aurora-flow 20s infinite linear;
                }
                .aurora-bg::before {
                    background: radial-gradient(circle, #06b6d4, transparent);
                    top: -20%; left: -20%;
                }
                .aurora-bg::after {
                    background: radial-gradient(circle, #4f46e5, transparent);
                    bottom: -20%; right: -20%;
                    animation-delay: -10s;
                }
                @keyframes aurora-flow {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(100px, 100px) rotate(180deg); }
                    100% { transform: translate(0, 0) rotate(360deg); }
                }
            `}</style>}</div>
    );
};

export default App;