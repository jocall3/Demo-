// Copyright James Burvel O’Callaghan III
// President Citibank Demo Business Inc.

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
import VoiceControl from './components/VoiceControl'; // Gemini's voice now echoes through the halls.
import QuantumWeaverView from './components/QuantumWeaverView';
import MarketplaceView from './components/MarketplaceView';
import { View, IllusionType, FinancialGoal, AIGoalPlan, CryptoAsset, VirtualCard, PaymentOperation, CorporateCard, CorporateTransaction, NFTAsset, RewardItem, APIStatus } from './types';
import { DataProvider, DataContext } from './context/DataContext';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import Card from './components/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import CorporateCommandView from './components/CorporateCommandView';


// Due to platform constraints, new view components are defined within this file.
// In a standard setup, these would be in their own files.

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

const APIIntegrationView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("APIIntegrationView must be within a DataProvider.");
    const { apiStatus } = context;

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
                             {/* FIX: The recharts `Tooltip` component was imported as `RechartsTooltip` to avoid name collisions. This updates the component name to match the import. */}
                             <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                             <Area type="monotone" dataKey="calls" stroke="#06b6d4" fill="url(#apiColor)" />
                         </AreaChart>
                     </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

const OpenBankingView: React.FC = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white tracking-wider">Open Banking Connections</h2>
        <Card title="Your Connected Apps">
            <p className="text-sm text-gray-400 mb-4">You have granted the following third-party applications limited access to your Demo Bank data. You can revoke access at any time.</p>
            <div className="space-y-3">
                <div className="p-4 bg-gray-800/50 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-white">MintFusion Budgeting</h4>
                        <p className="text-xs text-gray-400">Permissions: Read transaction history, View account balances</p>
                    </div>
                    <button className="text-xs text-red-400 hover:text-red-300">Revoke Access</button>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-white">TaxBot Pro</h4>
                        <p className="text-xs text-gray-400">Permissions: Read transaction history</p>
                    </div>
                    <button className="text-xs text-red-400 hover:text-red-300">Revoke Access</button>
                </div>
            </div>
        </Card>
    </div>
);

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
    const { creditScore, creditFactors } = context;

    const [insight, setInsight] = useState('');
    const [isLoadingInsight, setIsLoadingInsight] = useState(false);

    const getAIInsight = async () => {
        setIsLoadingInsight(true);
        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
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
    
    useEffect(() => { getAIInsight() }, []);

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
    const { setCustomBackgroundUrl, setActiveIllusion, activeIllusion } = context;

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Data = baseImage.split(',')[1];
            const mimeType = baseImage.match(/:(.*?);/)?.[1] || 'image/jpeg';
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: mimeType } },
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
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
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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

// ================================================================================================
// NEW AI AD STUDIO VIEW COMPONENT
// ================================================================================================
// FIX: Moved pollingMessages outside the component to prevent it from being redeclared on every render, which could cause issues with useEffect dependencies.
const pollingMessages = [
    "Initializing Veo 2.0 model...",
    "Analyzing prompt semantics...",
    "Generating initial keyframes...",
    "Rendering motion vectors...",
    "Upscaling to high resolution...",
    "Adding audio layer...",
    "Finalizing video file..."
];

const AIAdStudioView: React.FC = () => {
    type GenerationState = 'idle' | 'generating' | 'polling' | 'done' | 'error';

    const [prompt, setPrompt] = useState('A neon hologram of a cat driving a futuristic car at top speed through a cyberpunk city.');
    const [style, setStyle] = useState('Cinematic');
    const [length, setLength] = useState('15s');
    const [voice, setVoice] = useState('Energetic Male');
    
    const [generationState, setGenerationState] = useState<GenerationState>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [adQualityScore, setAdQualityScore] = useState(0);
    const [ctaSuggestions, setCtaSuggestions] = useState<string[]>([]);
    const [isCtaLoading, setIsCtaLoading] = useState(false);

    const [pollingMessageIndex, setPollingMessageIndex] = useState(0);

    useEffect(() => {
        // Mock Ad Quality Score calculation
        let score = 0;
        if (prompt.length > 20) score += 25;
        if (prompt.length > 50) score += 25;
        if (style !== 'Default') score += 15;
        if (length === '15s') score += 10;
        if (voice !== 'None') score += 10;
        setAdQualityScore(Math.min(99, score + Math.floor(Math.random() * 15)));
    }, [prompt, style, length, voice]);

    useEffect(() => {
        // FIX: The type `NodeJS.Timeout` is not available in browser environments.
        // This has been refactored to use type inference, which correctly identifies the interval ID as a `number`.
        // This also fixes a potential bug where `clearInterval` could be called on an uninitialized variable.
        if (generationState === 'polling') {
            const interval = setInterval(() => {
                setPollingMessageIndex(prev => (prev + 1) % pollingMessages.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [generationState]);

    // Cleanup effect for blob URL
    useEffect(() => {
        return () => {
            if (videoUrl && videoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);


    const handleGenerate = async () => {
        setGenerationState('generating');
        setError('');
        if (videoUrl && videoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        setCtaSuggestions([]);
        setPollingMessageIndex(0);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const fullPrompt = `${prompt}, ${style} style, high detail, a video that is ${length} long, with an ${voice} voiceover.`;
            
            let operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: fullPrompt,
                config: { numberOfVideos: 1 }
            });

            setGenerationState('polling');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }
            
            // @ts-ignore
            if (operation.error) {
                // @ts-ignore
                throw new Error(operation.error.message || "An unknown error occurred during video generation.");
            }
            
            // @ts-ignore
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch the generated video file from the temporary URL.');
                }
                const videoBlob = await response.blob();
                const objectUrl = URL.createObjectURL(videoBlob);
                setVideoUrl(objectUrl);
                setGenerationState('done');
            } else {
                throw new Error("Video generation completed, but no download link was returned.");
            }

        } catch (err: any) {
            console.error("Video generation error:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
            setGenerationState('error');
        }
    };
    
    const handleDownload = () => {
        if (!videoUrl) return;
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `DemoBank_AI_Ad_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

     const generateCTAs = async () => {
        setIsCtaLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const ctaPrompt = `For a video ad about "${prompt}", generate 3 short, catchy call-to-action phrases.`;
            const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: ctaPrompt});
            setCtaSuggestions(response.text.split('\n').map(s => s.replace(/^- /, '')).filter(Boolean));
        } catch (err) {
            console.error("CTA generation error:", err);
        } finally {
            setIsCtaLoading(false);
        }
    };
    
    useEffect(() => {
        if(generationState === 'done') {
            generateCTAs();
        }
    }, [generationState]);

    const mockThumbnails = ['/thumb1.webp', '/thumb2.webp', '/thumb3.webp'];

    return (
        <div className="space-y-6">
            <Card title="AI Ad Studio" subtitle="Generate a custom video ad with Veo 2.0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-1 space-y-4">
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your video..." className="w-full h-32 bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                        
                        <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white">
                            <option>Cinematic</option><option>Vibrant</option><option>Monochrome</option><option>Surreal</option>
                        </select>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <select value={length} onChange={e => setLength(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white"><option>15s</option><option>30s</option><option>60s</option></select>
                             <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white"><option>Energetic Male</option><option>Calm Female</option></select>
                        </div>
                        
                        <Card title="Ad Quality Score" variant="outline">
                            <p className="text-center text-4xl font-bold text-cyan-300">{adQualityScore}%</p>
                            <p className="text-center text-xs text-gray-400 mt-1">Based on prompt detail & settings</p>
                        </Card>
                        
                        <button onClick={handleGenerate} disabled={generationState === 'generating' || generationState === 'polling'} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50">
                             { (generationState === 'generating' || generationState === 'polling') ? 'Generating...' : 'Generate Ad' }
                        </button>
                    </div>

                    {/* Right Column: Output */}
                    <div className="lg:col-span-2">
                        {generationState === 'idle' && (
                            <Card title="Pre-Render Thumbnails">
                                <p className="text-sm text-gray-400 mb-4">Example stills based on similar prompts.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {mockThumbnails.map(thumb => <img key={thumb} src={thumb} className="rounded-lg aspect-video object-cover" />)}
                                </div>
                            </Card>
                        )}
                        {(generationState === 'generating' || generationState === 'polling') && (
                            <Card className="flex flex-col items-center justify-center h-full min-h-[20rem]">
                                 <div className="relative w-24 h-24">
                                     <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                                     <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                                 </div>
                                 <p className="text-white text-lg mt-6 font-semibold animate-pulse">{pollingMessages[pollingMessageIndex]}</p>
                            </Card>
                        )}
                         {generationState === 'done' && videoUrl && (
                             <div>
                                 <div className="relative">
                                     <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg mb-4" />
                                     <button 
                                         onClick={handleDownload}
                                         className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 z-10"
                                         aria-label="Download video"
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                         Download
                                     </button>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                     <Card title="TikTok Preview" padding="sm"><div className="p-4 bg-black rounded-lg"><p className="text-white text-sm">Your ad here!</p></div></Card>
                                     <Card title="YouTube Preview" padding="sm"><div className="p-4 bg-gray-900 rounded-lg"><p className="text-white text-sm">Your ad here!</p></div></Card>
                                     <Card title="Instagram Preview" padding="sm"><div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"><p className="text-white text-sm">Your ad here!</p></div></Card>
                                 </div>
                                 <Card title="AI Call to Action Suggestions" className="mt-4">
                                     {isCtaLoading ? <p>Generating...</p> : ctaSuggestions.map(cta => <p key={cta} className="text-cyan-200 p-1 font-semibold">"{cta}"</p>)}
                                 </Card>
                             </div>
                         )}
                         {generationState === 'error' && (
                            <Card className="flex flex-col items-center justify-center h-full min-h-[20rem] bg-red-900/20 border-red-500/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <h4 className="text-lg font-semibold text-red-200 mt-4">Generation Failed</h4>
                                <p className="text-red-300 mt-1 max-w-md text-center">{error}</p>
                            </Card>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};


// ================================================================================================
// NEW GOALS VIEW COMPONENT
// ================================================================================================
const GoalsView: React.FC = () => {
    type GoalView = 'LIST' | 'CREATE' | 'VIEW_PLAN';
    const [currentView, setCurrentView] = useState<GoalView>('LIST');
    const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
    const [loadingGoalId, setLoadingGoalId] = useState<string | null>(null);

    const context = useContext(DataContext);
    if (!context) throw new Error("GoalsView must be within a DataProvider.");
    const { financialGoals, addFinancialGoal, generateGoalPlan } = context;

    const GOAL_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
        home: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
        plane: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
        car: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m14 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        education: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20" /></svg>,
        ring: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11a3.03 3.03 0 01-3.022 3.022A3.03 3.03 0 015 11a3.03 3.03 0 013-3.022A3.03 3.03 0 0111 11zM11 5a6.06 6.06 0 00-6.043 6.043A6.06 6.06 0 0011 17.086 6.06 6.06 0 0017.043 11 6.06 6.06 0 0011 5zm5.121 1.879l-1.414 1.414" /></svg>,
        default: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    };

    const handleGeneratePlan = async (goalId: string) => {
        setLoadingGoalId(goalId);
        await generateGoalPlan(goalId);
        setLoadingGoalId(null);
    };

    const GoalCard: React.FC<{ goal: FinancialGoal }> = ({ goal }) => {
        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const Icon = GOAL_ICONS[goal.iconName] || GOAL_ICONS.default;
        return (
            <Card className="flex flex-col">
                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold text-white">{goal.name}</h3>
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300">
                            <Icon className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Target Date: {goal.targetDate}</p>
                    <div className="mt-4">
                        <div className="flex justify-between text-sm font-mono text-gray-300 mb-1">
                            <span>${goal.currentAmount.toLocaleString()}</span>
                            <span>${goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-right text-xs text-gray-400 mt-1">{progress.toFixed(0)}% Complete</p>
                    </div>
                </div>
                <div className="mt-6">
                    {goal.plan ? (
                        <button onClick={() => { setSelectedGoal(goal); setCurrentView('VIEW_PLAN'); }} className="w-full text-center py-2 px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-sm font-medium transition-colors">View Plan</button>
                    ) : (
                        <button onClick={() => handleGeneratePlan(goal.id)} disabled={loadingGoalId === goal.id} className="w-full text-center py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {loadingGoalId === goal.id ? 'Generating...' : 'Generate AI Plan'}
                        </button>
                    )}
                </div>
            </Card>
        );
    };

    const CreateGoalView: React.FC = () => {
        const [name, setName] = useState('');
        const [targetAmount, setTargetAmount] = useState('');
        const [targetDate, setTargetDate] = useState('');
        const [iconName, setIconName] = useState('default');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (name && targetAmount && targetDate && iconName) {
                addFinancialGoal({ name, targetAmount: parseFloat(targetAmount), targetDate, iconName });
                setCurrentView('LIST');
            }
        };

        return (
            <div>
                 <button onClick={() => setCurrentView('LIST')} className="flex items-center text-sm text-cyan-300 hover:text-cyan-200 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to All Goals
                </button>
                <Card title="Create a New Financial Goal">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Goal Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Down Payment for House" required className="mt-1 block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Target Amount ($)</label>
                            <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="e.g., 50000" required className="mt-1 block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Target Date</label>
                            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="mt-1 block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-300">Icon</label>
                             <select value={iconName} onChange={e => setIconName(e.target.value)} className="mt-1 block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {Object.keys(GOAL_ICONS).map(key => <option key={key} value={key} className="capitalize">{key}</option>)}
                             </select>
                        </div>
                        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">Create Goal</button>
                    </form>
                </Card>
            </div>
        );
    };

    const ViewPlan: React.FC<{ goal: FinancialGoal }> = ({ goal }) => {
        if (!goal.plan) return null;
        const plan = goal.plan;
        const categoryColors: { [key: string]: string } = {
            Savings: 'bg-green-500/20 text-green-300',
            Budgeting: 'bg-yellow-500/20 text-yellow-300',
            Investing: 'bg-indigo-500/20 text-indigo-300',
            Income: 'bg-sky-500/20 text-sky-300',
        };
        return (
            <div>
                <button onClick={() => setCurrentView('LIST')} className="flex items-center text-sm text-cyan-300 hover:text-cyan-200 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to All Goals
                </button>
                <Card title={`AI Plan: ${goal.name}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Card variant="outline">
                            <p className="text-sm text-gray-400">AI Feasibility Summary</p>
                            <p className="text-gray-200 mt-2 italic">"{plan.feasibilitySummary}"</p>
                        </Card>
                        <Card variant="outline">
                            <p className="text-sm text-gray-400">Recommended Contribution</p>
                            <p className="text-3xl font-bold text-white mt-2">${plan.monthlyContribution.toLocaleString()}</p>
                            <p className="text-gray-400">per month</p>
                        </Card>
                    </div>
                     <h4 className="text-lg font-semibold text-cyan-300 mb-4">Your Action Plan</h4>
                     <div className="space-y-4">
                        {plan.steps.map((step, index) => (
                             <div key={index} className="p-4 bg-gray-900/50 rounded-lg flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 text-cyan-300 rounded-full flex items-center justify-center font-bold mr-4">{index+1}</div>
                                <div>
                                    <div className="flex items-center">
                                        <h5 className="font-semibold text-white">{step.title}</h5>
                                        <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[step.category]}`}>{step.category}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    };

    if (currentView === 'CREATE') return <CreateGoalView />;
    if (currentView === 'VIEW_PLAN' && selectedGoal) return <ViewPlan goal={selectedGoal} />;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Your Financial Goals</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {financialGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                <Card variant="interactive" className="flex items-center justify-center min-h-[20rem] cursor-pointer" padding="none">
                    <button onClick={() => setCurrentView('CREATE')} className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors">
                         <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center mb-4 group-hover:border-white">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                         </div>
                         <span className="font-semibold">Create New Goal</span>
                    </button>
                </Card>
            </div>
        </div>
    );
};


// ================================================================================================
// NEW CRYPTO & WEB3 VIEW COMPONENT
// ================================================================================================
const CryptoView: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("CryptoView must be within a DataProvider.");
    
    const { 
        cryptoAssets, 
        paymentOperations, 
        walletInfo, 
        virtualCard, 
        connectWallet, 
        issueCard, 
        buyCrypto,
        nftAssets,
        mintNFT,
        mintToken,
    } = context;
    
    const [isIssuingCard, setIsIssuingCard] = useState(false);
    const [isMetaMaskModalOpen, setIsMetaMaskModalOpen] = useState(false);
    const [isStripeModalOpen, setStripeModalOpen] = useState(false);
    const [buyAmount, setBuyAmount] = useState('100');

    const handleIssueCard = () => {
        setIsIssuingCard(true);
        issueCard();
    };
    
    const handleMetaMaskConnect = () => {
        connectWallet();
        setIsMetaMaskModalOpen(false);
    };

    const handleBuyCrypto = () => {
        buyCrypto(parseFloat(buyAmount), 'ETH'); // hardcode ETH for demo
        setStripeModalOpen(false);
    };
    
    const MetaMaskConnectModal: React.FC<{ isOpen: boolean; onClose: () => void; onConnect: () => void; }> = ({ isOpen, onClose, onConnect }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full border border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 text-center">
                        <h3 className="font-semibold text-white">MetaMask</h3>
                    </div>
                    <div className="p-6 flex-grow flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full border-2 border-cyan-500 flex items-center justify-center">
                             <svg className="h-10 w-10 text-cyan-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4"/><path d="M30 70V30H55C65 30 65 40 55 40H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M55 70V30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <h4 className="text-xl font-bold text-white mt-4">Connect With MetaMask</h4>
                        <p className="text-gray-400 mt-2">Demo Bank wants to connect to your account.</p>
                        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg w-full">
                            <p className="text-sm text-gray-300">Allow this site to:</p>
                            <ul className="text-xs text-gray-400 list-disc list-inside mt-1 text-left ml-2">
                                <li>View the addresses of your permitted accounts (required).</li>
                                <li>Suggest transactions to approve.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-900/50 grid grid-cols-2 gap-3">
                         <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg">Cancel</button>
                         <button onClick={onConnect} className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg">Connect</button>
                    </div>
                </div>
            </div>
        );
    };
    
    const StripeCheckoutModal: React.FC<{ isOpen: boolean; onClose: () => void; onPay: () => void; amountUSD: string; }> = ({ isOpen, onClose, onPay, amountUSD }) => {
        const [isProcessing, setIsProcessing] = useState(false);

        const handlePayClick = () => {
            setIsProcessing(true);
            setTimeout(() => {
                onPay();
                setIsProcessing(false);
            }, 2000);
        };
        
        if (!isOpen) return null;
        
        return (
             <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 flex flex-col">
                     <div className="p-6 bg-gray-800 rounded-t-lg">
                        <h3 className="font-semibold text-white">Demo Bank Inc.</h3>
                        <p className="text-sm text-gray-400">Pay with card</p>
                        <p className="text-2xl font-bold text-white mt-2">${parseFloat(amountUSD).toFixed(2)}</p>
                     </div>
                     <div className="p-6 space-y-4">
                        <input type="email" placeholder="Email" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="visionary@demobank.com" />
                        <input type="text" placeholder="Card information" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="4242 4242 4242 4242" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="MM / YY" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="12 / 28" />
                            <input type="text" placeholder="CVC" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" defaultValue="123" />
                        </div>
                         <button onClick={handlePayClick} disabled={isProcessing} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                            {isProcessing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isProcessing ? 'Processing...' : `Pay $${parseFloat(amountUSD).toFixed(2)}`}
                        </button>
                     </div>
                </div>
            </div>
        );
    }
    
    // Component for Metamask Wallet Connection
    const ConnectWalletCard: React.FC = () => (
        <Card title="Web3 Wallet" className="h-full">
            <div className="flex flex-col items-center justify-center text-center h-full">
                {walletInfo ? (
                    <div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask" className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-green-400 font-semibold">Wallet Connected</p>
                        <p className="text-sm text-gray-300 font-mono break-all my-2">{walletInfo.address}</p>
                        <p className="text-xl text-white">{walletInfo.balance.toFixed(4)} ETH</p>
                    </div>
                ) : (
                    <>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask" className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400 mb-4">Connect your Metamask wallet to interact with Web3 features.</p>
                        <button onClick={() => setIsMetaMaskModalOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Connect Metamask
                        </button>
                    </>
                )}
            </div>
        </Card>
    );

    // Component for Crypto Portfolio
    const CryptoPortfolioCard: React.FC = () => {
        const totalValue = cryptoAssets.reduce((sum, asset) => sum + asset.value, 0);
        return (
            <Card title="Crypto Portfolio">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={cryptoAssets} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={5}>
                                    {cryptoAssets.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-gray-400 text-sm">Total Value</p>
                        <p className="text-3xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </Card>
        );
    };

    // Component for Marqeta Virtual Card
    const MarqetaVirtualCard: React.FC = () => (
         <Card title="Demo Bank Crypto Card" className="h-full">
            <div className="flex flex-col items-center justify-center h-full">
                {virtualCard ? (
                    <div className="w-full max-w-sm aspect-[85.6/54] p-4 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl border border-gray-600 flex flex-col justify-between text-white font-mono tracking-wider">
                        <div className="flex justify-between items-start">
                            <span className="text-lg font-semibold">Demo Bank</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <div>
                            <p className="text-xl">{virtualCard.cardNumber}</p>
                            <div className="flex justify-between text-xs mt-2">
                                <span>{virtualCard.holderName}</span>
                                <span>VALID THRU: {virtualCard.expiry}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                         <p className="text-gray-400 mb-4">Issue a virtual card to spend your crypto balance anywhere.</p>
                         <button onClick={handleIssueCard} disabled={isIssuingCard || !walletInfo} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                             {isIssuingCard ? 'Issuing Card...' : 'Issue Virtual Card'}
                         </button>
                    </div>
                )}
            </div>
        </Card>
    );

    // Component for Stripe On-Ramp
    const StripeOnRamp: React.FC = () => (
        <Card title="Buy Crypto (On-Ramp)">
            <p className="text-sm text-gray-400 mb-4">Securely purchase crypto with your credit or debit card, powered by Stripe.</p>
            <div>
                 <label htmlFor="buy_amount" className="block text-sm font-medium text-gray-300">Amount to Buy (USD)</label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                        <span className="text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input type="number" name="buy_amount" id="buy_amount" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} className="block w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-7 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="100.00"/>
                 </div>
            </div>
            <button onClick={() => setStripeModalOpen(true)} disabled={!walletInfo} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                Buy with Stripe
            </button>
        </Card>
    );
    
    // Component for Modern Treasury Ledger
    const ModernTreasuryLedger: React.FC = () => {
        const statusColors: { [key: string]: string } = {
            Completed: 'bg-green-500/20 text-green-300',
            Processing: 'bg-yellow-500/20 text-yellow-300',
            Initiated: 'bg-blue-500/20 text-blue-300',
            Failed: 'bg-red-500/20 text-red-300',
        };
        return (
            <Card title="Payment Operations Ledger" className="lg:col-span-full">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {paymentOperations.map(op => (
                        <div key={op.id} className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-lg">
                            <div>
                                <p className="text-white">{op.description}</p>
                                <p className="text-xs text-gray-400">{op.type} - {op.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-white">${op.amount.toLocaleString()}</p>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[op.status]}`}>{op.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    const MintingStation: React.FC = () => {
        const [nftName, setNftName] = useState('CyberPunk Cat');
        const [nftImageUrl, setNftImageUrl] = useState('https://img.freepik.com/free-photo/a-cat-wearing-cyborg-costume-and-a-hat-that-says-cyberpunk_1340-41229.jpg');
        const [tokenName, setTokenName] = useState('Visionary Coin');
        const [tokenTicker, setTokenTicker] = useState('VISN');
        const [tokenAmount, setTokenAmount] = useState('1000000');
        
        const handleMintNFT = (e: React.FormEvent) => {
            e.preventDefault();
            mintNFT(nftName, nftImageUrl);
        };
        
        const handleMintToken = (e: React.FormEvent) => {
             e.preventDefault();
             mintToken(tokenName, tokenTicker, parseFloat(tokenAmount));
        };

        return (
            <Card title="Minting Station" className="lg:col-span-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <form onSubmit={handleMintNFT} className="space-y-3">
                        <h4 className="font-semibold text-cyan-300">Mint an NFT</h4>
                        <input type="text" value={nftName} onChange={e => setNftName(e.target.value)} placeholder="NFT Name" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" />
                        <input type="text" value={nftImageUrl} onChange={e => setNftImageUrl(e.target.value)} placeholder="Image URL" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" />
                        <button type="submit" disabled={!walletInfo} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">Mint NFT</button>
                    </form>
                     <form onSubmit={handleMintToken} className="space-y-3">
                        <h4 className="font-semibold text-indigo-300">Create ERC-20 Token</h4>
                        <input type="text" value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="Token Name" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={tokenTicker} onChange={e => setTokenTicker(e.target.value)} placeholder="Ticker (e.g., DBNK)" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" />
                            <input type="number" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)} placeholder="Amount" className="w-full bg-gray-700/50 border-gray-600 rounded-lg p-2 text-white" />
                        </div>
                        <button type="submit" disabled={!walletInfo} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">Mint Token</button>
                    </form>
                </div>
            </Card>
        );
    };

    const NFTGallery: React.FC = () => (
        <Card title="My NFT Gallery">
            {nftAssets.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {nftAssets.map(nft => (
                        <div key={nft.id} className="aspect-square bg-gray-900/50 rounded-lg overflow-hidden group">
                            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 backdrop-blur-sm">
                                <p className="text-white text-xs font-semibold truncate">{nft.name}</p>
                            </div>
                        </div>
                     ))}
                 </div>
            ) : (
                <p className="text-center text-gray-400 text-sm py-8">Your NFT collection is empty. Mint your first one at the Minting Station!</p>
            )}
        </Card>
    );

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white tracking-wider">Crypto & Web3 Hub</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CryptoPortfolioCard />
                    <ConnectWalletCard />
                </div>
                <MintingStation />
                {nftAssets.length > 0 && <NFTGallery />}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <MarqetaVirtualCard />
                    </div>
                    <StripeOnRamp />
                </div>
                <ModernTreasuryLedger />
            </div>
            <MetaMaskConnectModal isOpen={isMetaMaskModalOpen} onClose={() => setIsMetaMaskModalOpen(false)} onConnect={handleMetaMaskConnect} />
            <StripeCheckoutModal isOpen={isStripeModalOpen} onClose={() => setStripeModalOpen(false)} onPay={handleBuyCrypto} amountUSD={buyAmount} />
        </>
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
            case View.Marketplace: return <MarketplaceView />;
            case View.Personalization: return <PersonalizationView />;
            case View.CardCustomization: return <CardCustomizationView />;
            case View.Security: return <SecurityView />;
            case View.Goals: return <GoalsView />;
            case View.Crypto: return <CryptoView />;
            case View.CorporateCommand: return <CorporateCommandView />;
            case View.SASPlatforms: return <TheVisionView />;
            case View.APIIntegration: return <APIIntegrationView />;
            case View.OpenBanking: return <OpenBankingView />;
            case View.Rewards: return <RewardsView />;
            case View.CreditHealth: return <CreditHealthView />;
            case View.Settings: return <SettingsView />;
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
