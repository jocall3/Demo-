import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Transaction, Asset, BudgetCategory, GamificationState, IllusionType, LinkedAccount, QuantumWeaverState, AIPlan, AIQuestion, Subscription, CreditScore, UpcomingBill, SavingsGoal, MarketMover, MarketplaceProduct, FinancialGoal, AIGoalPlan, CryptoAsset, VirtualCard, PaymentOperation, AIInsight, CorporateCard, CorporateTransaction, RewardPoints, Notification, NFTAsset, RewardItem, APIStatus, CreditFactor, CorporateCardControls } from '../types';
import { View, WeaverStage } from '../types';
import { MOCK_TRANSACTIONS, MOCK_ASSETS, MOCK_IMPACT_INVESTMENTS, MOCK_BUDGETS, MOCK_SUBSCRIPTIONS, MOCK_CREDIT_SCORE, MOCK_UPCOMING_BILLS, MOCK_SAVINGS_GOALS, MOCK_MARKET_MOVERS, MOCK_FINANCIAL_GOALS, MOCK_CRYPTO_ASSETS, MOCK_PAYMENT_OPERATIONS, MOCK_CORPORATE_CARDS, MOCK_CORPORATE_TRANSACTIONS, MOCK_REWARD_POINTS, MOCK_NOTIFICATIONS, MOCK_REWARD_ITEMS, MOCK_API_STATUS, MOCK_CREDIT_FACTORS } from '../data/mockData';

const LEVEL_NAMES = ["Financial Novice", "Budgeting Apprentice", "Savings Specialist", "Investment Adept", "Wealth Master"];
const SCORE_PER_LEVEL = 200;

interface WalletInfo {
    address: string;
    balance: number; // ETH for simplicity
}

interface IDataContext {
  transactions: Transaction[];
  assets: Asset[];
  impactInvestments: Asset[];
  budgets: BudgetCategory[];
  addBudget: (budget: Omit<BudgetCategory, 'id' | 'spent' | 'color'>) => void;
  gamification: GamificationState;
  impactData: {
    treesPlanted: number;
    spendingForNextTree: number;
    progressToNextTree: number;
  };
  customBackgroundUrl: string | null;
  setCustomBackgroundUrl: (url: string) => void;
  addTransaction: (tx: Transaction) => void;
  activeIllusion: IllusionType;
  setActiveIllusion: (illusion: IllusionType) => void;
  linkedAccounts: LinkedAccount[];
  unlinkAccount: (id: string) => void;
  handlePlaidSuccess: (publicToken: string, metadata: any) => void;
  weaverState: QuantumWeaverState;
  pitchBusinessPlan: (plan: string) => Promise<void>;
  simulateTestPass: () => Promise<void>;
  subscriptions: Subscription[];
  creditScore: CreditScore;
  upcomingBills: UpcomingBill[];
  savingsGoals: SavingsGoal[];
  marketMovers: MarketMover[];
  financialGoals: FinancialGoal[];
  addFinancialGoal: (goalData: Omit<FinancialGoal, 'id' | 'plan' | 'currentAmount'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  generateGoalPlan: (goalId: string) => Promise<void>;
  cryptoAssets: CryptoAsset[];
  paymentOperations: PaymentOperation[];
  walletInfo: WalletInfo | null;
  virtualCard: VirtualCard | null;
  connectWallet: () => void;
  issueCard: () => void;
  buyCrypto: (usdAmount: number, cryptoTicker: string) => void;
  aiInsights: AIInsight[];
  isInsightsLoading: boolean;
  corporateCards: CorporateCard[];
  corporateTransactions: CorporateTransaction[];
  toggleCorporateCardFreeze: (cardId: string) => void;
  updateCorporateCard: (cardId: string, newControls: CorporateCardControls, newFrozenState: boolean) => void;
  rewardPoints: RewardPoints;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  isImportingData: boolean;
  nftAssets: NFTAsset[];
  mintNFT: (name: string, imageUrl: string) => void;
  mintToken: (name: string, ticker: string, amount: number) => void;
  initiatePayment: (details: Omit<PaymentOperation, 'id' | 'status' | 'date'>) => void;
  rewardItems: RewardItem[];
  redeemReward: (item: RewardItem) => boolean;
  apiStatus: APIStatus[];
  creditFactors: CreditFactor[];
}

export const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const COST_PER_TREE = 250;

  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [assets] = useState<Asset[]>(MOCK_ASSETS);
  const [impactInvestments] = useState<Asset[]>(MOCK_IMPACT_INVESTMENTS);
  const [budgets, setBudgets] = useState<BudgetCategory[]>(MOCK_BUDGETS);
  const [treesPlanted, setTreesPlanted] = useState<number>(12);
  const [spendingForNextTree, setSpendingForNextTree] = useState<number>(170);
  const [gamification, setGamification] = useState<GamificationState>({
      score: 450,
      level: 3,
      levelName: "Savings Specialist",
      progress: 25,
      credits: 225,
  });
  const [customBackgroundUrl, setCustomBackgroundUrlState] = useState<string | null>(() => {
      return localStorage.getItem('customBackgroundUrl');
  });
  const [activeIllusion, setActiveIllusionState] = useState<IllusionType>(
    () => (localStorage.getItem('activeIllusion') as IllusionType) || 'none'
  );
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [weaverState, setWeaverState] = useState<QuantumWeaverState>({
    stage: WeaverStage.Pitch,
    businessPlan: '',
    feedback: '',
    questions: [],
    loanAmount: 0,
    coachingPlan: null,
    error: null,
  });

  // State for new dashboard widgets
  const [subscriptions] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);
  const [creditScore] = useState<CreditScore>(MOCK_CREDIT_SCORE);
  const [upcomingBills] = useState<UpcomingBill[]>(MOCK_UPCOMING_BILLS);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(MOCK_SAVINGS_GOALS);
  const [marketMovers] = useState<MarketMover[]>(MOCK_MARKET_MOVERS);
  const [rewardPoints, setRewardPoints] = useState<RewardPoints>(MOCK_REWARD_POINTS);
  
  // State for Financial Goals
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(MOCK_FINANCIAL_GOALS);

  // State for Crypto & Web3 Hub
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>(MOCK_CRYPTO_ASSETS);
  const [nftAssets, setNftAssets] = useState<NFTAsset[]>([]);
  const [paymentOperations, setPaymentOperations] = useState<PaymentOperation[]>(MOCK_PAYMENT_OPERATIONS);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [virtualCard, setVirtualCard] = useState<VirtualCard | null>(null);

  // State for dynamic AI insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isImportingData, setIsImportingData] = useState(false);

  // State for Corporate Command Center
  const [corporateCards, setCorporateCards] = useState<CorporateCard[]>(MOCK_CORPORATE_CARDS);
  const [corporateTransactions] = useState<CorporateTransaction[]>(MOCK_CORPORATE_TRANSACTIONS);

  // State for new interactive features
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  
  // State for new views
  const [rewardItems] = useState<RewardItem[]>(MOCK_REWARD_ITEMS);
  const [apiStatus] = useState<APIStatus[]>(MOCK_API_STATUS);
  const [creditFactors] = useState<CreditFactor[]>(MOCK_CREDIT_FACTORS);


  const setCustomBackgroundUrl = (url: string) => {
      localStorage.setItem('customBackgroundUrl', url);
      setCustomBackgroundUrlState(url);
      localStorage.setItem('activeIllusion', 'none');
      setActiveIllusionState('none');
  };

  const setActiveIllusion = (illusion: IllusionType) => {
    localStorage.setItem('activeIllusion', illusion);
    setActiveIllusionState(illusion);
    if (illusion !== 'none') {
      localStorage.removeItem('customBackgroundUrl');
      setCustomBackgroundUrlState(null);
    }
  };
  
  const updateGamification = (points: number) => {
    setGamification(prev => {
        const newScore = prev.score + points;
        const newLevel = Math.floor(newScore / SCORE_PER_LEVEL) + 1;
        const newProgress = ((newScore % SCORE_PER_LEVEL) / SCORE_PER_LEVEL) * 100;
        const newLevelName = LEVEL_NAMES[Math.min(newLevel - 1, LEVEL_NAMES.length - 1)];
        const newCredits = prev.credits + (points > 0 ? Math.floor(points / 2) : 0);

        return { score: newScore, level: newLevel, levelName: newLevelName, progress: newProgress, credits: newCredits };
    });
  };

  const generateDashboardInsights = useCallback(async () => {
    setIsInsightsLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const recentTransactionsSummary = transactions.slice(0, 10).map(t => `${t.description}: $${t.amount.toFixed(2)} (${t.type})`).join(', ');
        
        const prompt = `You are Quantum, a proactive AI financial advisor. Analyze the user's recent transactions to generate 3 diverse, actionable insights. Your insights must be concise. If an insight is about high spending, provide chartData for the top 3 items. Format your response as a JSON object that strictly adheres to the provided schema. Do not include any text outside of the JSON object.

Recent Transactions: ${recentTransactionsSummary}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        insights: {
                            type: Type.ARRAY,
                            description: "A list of 3 diverse financial insights.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING, description: "A unique identifier for the insight, e.g., 'insight_1'." },
                                    title: { type: Type.STRING, description: "A short, catchy title for the insight (max 10 words)." },
                                    description: { type: Type.STRING, description: "A concise, user-friendly description of the insight (max 2 sentences)." },
                                    urgency: { type: Type.STRING, description: "The urgency level of the insight.", enum: ['low', 'medium', 'high'] },
                                    chartData: {
                                        type: Type.ARRAY,
                                        description: "Optional. If the insight is about spending, provide data for a bar chart. Include the top 3 items.",
                                        nullable: true,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING, description: "The name of the item for the chart (e.g., a specific transaction description)." },
                                                value: { type: Type.NUMBER, description: "The value (amount) for the chart." }
                                            },
                                            required: ["name", "value"]
                                        }
                                    }
                                },
                                required: ["id", "title", "description", "urgency"]
                            }
                        }
                    },
                    required: ["insights"]
                }
            }
        });
        
        const parsedResponse = JSON.parse(response.text);
        if (parsedResponse.insights) {
            setAiInsights(parsedResponse.insights);
        }

    } catch (error) {
        console.error("Failed to generate AI insights:", error);
        // Fallback to a default insight on error
        setAiInsights([{ id: 'error_1', title: 'Analysis Paused', description: 'Could not fetch fresh insights at this time. Displaying last known data.', urgency: 'low' }]);
    } finally {
        setIsInsightsLoading(false);
    }
}, [transactions]); // Dependency on transactions ensures it can re-run with new data

useEffect(() => {
    generateDashboardInsights(); // Initial generation
    const intervalId = setInterval(generateDashboardInsights, 35000); // Auto-refresh every 35 seconds
    return () => clearInterval(intervalId);
}, [generateDashboardInsights]);

  const handlePlaidSuccess = (publicToken: string, metadata: any) => {
    setIsImportingData(true);
    console.log("Plaid Link Success!", { publicToken, metadata });

    const newAccount: LinkedAccount = {
        id: metadata.institution.institution_id,
        name: metadata.institution.name,
        mask: metadata.accounts[0].mask,
    };
    
    if (!linkedAccounts.some(acc => acc.id === newAccount.id)) {
        setLinkedAccounts(prev => [...prev, newAccount]);
    }
    
    setTimeout(() => {
        const plaidTransactions: Transaction[] = [
            { id: `plaid_${Date.now()}`, type: 'expense', category: 'Shopping', description: `Zara`, amount: 152.34, date: '2024-03-22', carbonFootprint: 10.1 },
            { id: `plaid_${Date.now()+1}`, type: 'expense', category: 'Dining', description: `The Cheesecake Factory`, amount: 85.50, date: '2024-03-21', carbonFootprint: 8.2 },
            { id: `plaid_${Date.now()+2}`, type: 'income', category: 'Salary', description: `Paycheck`, amount: 2500.00, date: '2024-03-20' },
            { id: `plaid_${Date.now()+3}`, type: 'expense', category: 'Groceries', description: `Whole Foods`, amount: 210.40, date: '2024-03-19', carbonFootprint: 21.8 },
            { id: `plaid_${Date.now()+4}`, type: 'expense', category: 'Transport', description: `Uber`, amount: 25.10, date: '2024-03-18', carbonFootprint: 2.1 },
            { id: `plaid_${Date.now()+5}`, type: 'expense', category: 'Utilities', description: `Con Edison`, amount: 112.00, date: '2024-03-15', carbonFootprint: 25.3 },
            { id: `plaid_${Date.now()+6}`, type: 'expense', category: 'Entertainment', description: `Netflix Subscription`, amount: 15.99, date: '2024-03-12', carbonFootprint: 0.5 },
            { id: `plaid_${Date.now()+7}`, type: 'expense', category: 'Dining', description: `Starbucks`, amount: 7.80, date: '2024-03-11', carbonFootprint: 0.8 },
        ];
        
        setTransactions(prev => [...plaidTransactions, ...prev]);
        
        updateGamification(100);
        
        // The generateDashboardInsights function will automatically re-run due to the dependency change,
        // but we can call it here to ensure immediate feedback after import simulation.
        generateDashboardInsights();
        
        setIsImportingData(false);
    }, 4000);
  };

  const unlinkAccount = (id: string) => {
      setLinkedAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const pitchBusinessPlan = async (plan: string) => {
    setWeaverState(prev => ({ ...prev, stage: WeaverStage.Analysis, businessPlan: plan, error: null }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `Analyze the following business plan. Provide brief, constructive initial feedback (1-2 sentences) and generate exactly 5 sample assessment questions based on the plan's potential weaknesses or key areas. The questions should cover different categories like Market, Finance, Operations, etc.

Business Plan: "${plan}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    feedback: { type: Type.STRING },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                question: { type: Type.STRING },
                                category: { type: Type.STRING }
                            },
                            required: ["id", "question", "category"]
                        }
                    }
                },
                 required: ["feedback", "questions"]
            }
        }
      });
      
      const parsedResponse = JSON.parse(response.text);
      setWeaverState(prev => ({
        ...prev,
        stage: WeaverStage.Test,
        feedback: parsedResponse.feedback,
        questions: parsedResponse.questions,
      }));

    } catch (err) {
      console.error("Error analyzing business plan:", err);
      setWeaverState(prev => ({ ...prev, stage: WeaverStage.Error, error: "Plato AI encountered an issue analyzing your plan. Please try again." }));
    }
  };

  const simulateTestPass = async () => {
    setWeaverState(prev => ({ ...prev, stage: WeaverStage.FinalReview, error: null }));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `Based on this business plan, you have approved a seed loan. Determine a realistic loan amount (between $50,000 and $250,000). Then, generate a 3-step coaching plan to guide the founder. The plan should be high-level and encouraging.

Business Plan: "${weaverState.businessPlan}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    loanAmount: { type: Type.NUMBER },
                    coachingPlan: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            steps: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        timeline: { type: Type.STRING }
                                    },
                                    required: ["title", "description", "timeline"]
                                }
                            }
                        },
                        required: ["title", "summary", "steps"]
                    }
                },
                required: ["loanAmount", "coachingPlan"]
            }
        }
      });

      const parsedResponse = JSON.parse(response.text);
      const { loanAmount, coachingPlan } = parsedResponse;

      setWeaverState(prev => ({
        ...prev,
        stage: WeaverStage.Approved,
        loanAmount,
        coachingPlan,
      }));
      
      const loanTx: Transaction = {
          id: `loan_${new Date().toISOString()}`,
          type: 'income',
          category: 'Loan',
          description: `QuantumWeaver Seed Loan`,
          amount: loanAmount,
          date: new Date().toLocaleDateString('en-CA'),
      };
      addTransaction(loanTx);

    } catch (err) {
        console.error("Error finalizing loan:", err);
        setWeaverState(prev => ({ ...prev, stage: WeaverStage.Error, error: "Plato AI couldn't finalize the funding package. Please try again." }));
    }
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (tx.type === 'expense') {
        setSpendingForNextTree(prev => {
            const newSpending = prev + tx.amount;
            if (newSpending >= COST_PER_TREE) {
                setTreesPlanted(p => p + Math.floor(newSpending / COST_PER_TREE));
                return newSpending % COST_PER_TREE;
            }
            return newSpending;
        });

        const budgetToUpdate = budgets.find(b => b.name.toLowerCase() === tx.category.toLowerCase());
        if (budgetToUpdate) {
            setBudgets(prev => prev.map(b => b.id === budgetToUpdate.id ? { ...b, spent: b.spent + tx.amount } : b));
        }
    }
    updateGamification(tx.type === 'income' ? 20 : 10);
  };

  const addBudget = (budget: Omit<BudgetCategory, 'id' | 'spent' | 'color'>) => {
      const newBudget: BudgetCategory = {
          id: budget.name.toLowerCase().replace(' ', '-'),
          ...budget,
          spent: 0,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      };
      setBudgets(prev => [...prev, newBudget]);
  };

  const addFinancialGoal = (goalData: Omit<FinancialGoal, 'id' | 'plan' | 'currentAmount'>) => {
    const newGoal: FinancialGoal = {
        ...goalData,
        id: `goal_${Date.now()}`,
        currentAmount: 0,
        plan: null,
    };
    setFinancialGoals(prev => [...prev, newGoal]);
  };

  const contributeToGoal = (goalId: string, amount: number) => {
      setFinancialGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g));
      const tx: Transaction = {
          id: `goal_contrib_${Date.now()}`,
          type: 'expense',
          category: 'Savings',
          description: `Contribution to ${financialGoals.find(g => g.id === goalId)?.name}`,
          amount: amount,
          date: new Date().toLocaleDateString('en-CA'),
      };
      addTransaction(tx);
  };

  const generateGoalPlan = async (goalId: string) => {
    const goal = financialGoals.find(g => g.id === goalId);
    if (!goal) return;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `Generate a feasible financial plan for the following goal. Provide a brief feasibility summary, a recommended monthly contribution, and 3 actionable steps across different categories (Savings, Budgeting, Investing, Income).
        
Goal: ${goal.name}
Target Amount: $${goal.targetAmount}
Target Date: ${goal.targetDate}
Current Savings for this goal: $${goal.currentAmount}`;

         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        feasibilitySummary: { type: Type.STRING },
                        monthlyContribution: { type: Type.NUMBER },
                        steps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    category: { type: Type.STRING, enum: ['Savings', 'Budgeting', 'Investing', 'Income'] }
                                },
                                required: ["title", "description", "category"]
                            }
                        }
                    },
                    required: ["feasibilitySummary", "monthlyContribution", "steps"]
                }
            }
        });

        const plan: AIGoalPlan = JSON.parse(response.text);
        setFinancialGoals(prev => prev.map(g => g.id === goalId ? { ...g, plan } : g));
    } catch (err) {
        console.error("Error generating goal plan:", err);
    }
  };
  
    // --- CRYPTO & WEB3 FUNCTIONS ---
  const connectWallet = () => {
      // Simulate Metamask connection
      setTimeout(() => {
          setWalletInfo({
              address: '0x1a2b...c3d4',
              balance: 12.5
          });
      }, 500);
  };

  const issueCard = () => {
       // Simulate Marqeta card issuance
       setTimeout(() => {
          setVirtualCard({
              cardNumber: '5555 1234 5678 9012',
              cvv: '123',
              expiry: '12/28',
              holderName: 'The Visionary'
          });
       }, 2000);
  };

  const buyCrypto = (usdAmount: number, cryptoTicker: string) => {
      // Simulate Stripe on-ramp and Modern Treasury ledger update
      setTimeout(() => {
          const cryptoAmount = usdAmount / 3000; // Mock ETH price
          setCryptoAssets(prev => prev.map(asset => asset.ticker === cryptoTicker ? { ...asset, amount: asset.amount + cryptoAmount, value: asset.value + usdAmount } : asset));
          const tx: Transaction = {
            id: `crypto_buy_${Date.now()}`,
            type: 'expense',
            category: 'Investments',
            description: `Buy ${cryptoTicker} via Stripe`,
            amount: usdAmount,
            date: new Date().toLocaleDateString('en-CA'),
            carbonFootprint: 0.2
          };
          addTransaction(tx);
          setAiInsights(prev => [
              { id: 'crypto_insight_1', title: 'Crypto Purchase Detected', description: `Our systems noticed your recent purchase of ${cryptoTicker}. We recommend monitoring market volatility.`, urgency: 'medium' },
              ...prev
          ]);
      }, 1000);
  };

  const mintNFT = (name: string, imageUrl: string) => {
    const newNft: NFTAsset = {
        id: `nft_${Date.now()}`,
        name,
        imageUrl,
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`
    };
    setNftAssets(prev => [newNft, ...prev]);
    setNotifications(prev => [
        { id: `notif_${Date.now()}`, message: `Congratulations! You've successfully minted the "${name}" NFT.`, timestamp: 'Just now', read: false, view: View.Crypto },
        ...prev
    ]);
  };

  const mintToken = (name: string, ticker: string, amount: number) => {
    if (cryptoAssets.some(asset => asset.ticker.toUpperCase() === ticker.toUpperCase())) {
        setNotifications(prev => [
            { id: `notif_${Date.now()}`, message: `Error: Token with ticker ${ticker.toUpperCase()} already exists.`, timestamp: 'Just now', read: false, view: View.Crypto },
            ...prev
        ]);
        return;
    }
    const newMockToken: CryptoAsset = {
        ticker: ticker.toUpperCase(),
        name: name,
        value: Math.random() * 100,
        amount: amount,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    };
    setCryptoAssets(prev => [...prev, newMockToken]);
    setNotifications(prev => [
        { id: `notif_${Date.now()}`, message: `New token minted: ${amount.toLocaleString()} ${ticker.toUpperCase()} added to your portfolio.`, timestamp: 'Just now', read: false, view: View.Crypto },
        ...prev
    ]);
  };


  const toggleCorporateCardFreeze = (cardId: string) => {
      setCorporateCards(prev => prev.map(c => c.id === cardId ? { ...c, frozen: !c.frozen } : c));
  };
  
  const updateCorporateCard = (cardId: string, newControls: CorporateCardControls, newFrozenState: boolean) => {
      setCorporateCards(prev => prev.map(c => c.id === cardId ? { ...c, controls: newControls, frozen: newFrozenState } : c));
  };
  
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const initiatePayment = (details: Omit<PaymentOperation, 'id' | 'status' | 'date'>) => {
      const newPayment: PaymentOperation = {
          ...details,
          id: `po_${Date.now()}`,
          status: 'Initiated',
          date: new Date().toLocaleDateString('en-CA'),
      };
      setPaymentOperations(prev => [newPayment, ...prev]);
      
      // Simulate status progression
      setTimeout(() => {
          setPaymentOperations(prev => prev.map(p => p.id === newPayment.id ? {...p, status: 'Processing' } : p));
      }, 3000);
      setTimeout(() => {
          setPaymentOperations(prev => prev.map(p => p.id === newPayment.id ? {...p, status: 'Completed' } : p));
      }, 8000);
  };
  
  const redeemReward = (item: RewardItem): boolean => {
      if (rewardPoints.balance >= item.cost) {
          setRewardPoints(prev => ({
              ...prev,
              balance: prev.balance - item.cost,
              lastRedeemed: item.cost,
          }));
          setNotifications(prev => [{
              id: `notif_reward_${Date.now()}`,
              message: `You've successfully redeemed "${item.name}" for ${item.cost.toLocaleString()} points.`,
              timestamp: 'Just now',
              read: false,
              view: View.Rewards
          }, ...prev]);
          return true;
      }
      return false;
  };

  const impactData = {
    treesPlanted,
    spendingForNextTree,
    progressToNextTree: (spendingForNextTree / COST_PER_TREE) * 100,
  };

  const value = {
    transactions,
    assets,
    impactInvestments,
    budgets,
    addBudget,
    gamification,
    impactData,
    customBackgroundUrl,
    setCustomBackgroundUrl,
    addTransaction,
    activeIllusion,
    setActiveIllusion,
    linkedAccounts,
    unlinkAccount,
    handlePlaidSuccess,
    weaverState,
    pitchBusinessPlan,
    simulateTestPass,
    subscriptions,
    creditScore,
    upcomingBills,
    savingsGoals,
    marketMovers,
    financialGoals,
    addFinancialGoal,
    contributeToGoal,
    generateGoalPlan,
    cryptoAssets,
    paymentOperations,
    walletInfo,
    virtualCard,
    connectWallet,
    issueCard,
    buyCrypto,
    aiInsights,
    isInsightsLoading,
    corporateCards,
    corporateTransactions,
    toggleCorporateCardFreeze,
    updateCorporateCard,
    rewardPoints,
    notifications,
    markNotificationRead,
    isImportingData,
    nftAssets,
    mintNFT,
    mintToken,
    initiatePayment,
    rewardItems,
    redeemReward,
    apiStatus,
    creditFactors,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};