import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
  handlePlaidSuccess: (publicToken: string, metadata: any) => Promise<void>;
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
        // Fetch from the BFF endpoint instead of calling Gemini directly.
        // The BFF is responsible for managing API keys and constructing the prompt.
        const response = await fetch('/api/insights/dashboard');
        if (!response.ok) {
            throw new Error(`BFF Error: ${response.statusText}`);
        }
        const data = await response.json();
        setAiInsights(data.insights);
    } catch (error) {
        console.error("Failed to fetch AI insights from BFF:", error);
        setAiInsights([{ id: 'error_1', title: 'Analysis Paused', description: 'Could not fetch fresh insights at this time. Please check your connection.', urgency: 'low' }]);
    } finally {
        setIsInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    // generateDashboardInsights(); // Initial generation on mount is disabled for demo purposes
    // const intervalId = setInterval(generateDashboardInsights, 35000); // Auto-refresh
    // return () => clearInterval(intervalId);
  }, [generateDashboardInsights]);

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    setIsImportingData(true);
    try {
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, metadata }),
      });

      if (!response.ok) throw new Error('Token exchange with BFF failed');
      
      const { newAccount, newTransactions } = await response.json();
      
      // Update state based on BFF response
      if (!linkedAccounts.some(acc => acc.id === newAccount.id)) {
        setLinkedAccounts(prev => [...prev, newAccount]);
      }
      setTransactions(prev => [...newTransactions, ...prev]);
      updateGamification(100);
      generateDashboardInsights();

    } catch (error) {
      console.error("Plaid integration error:", error);
      // Fallback to client-side simulation for demo purposes if BFF call fails
      const newAccount: LinkedAccount = {
          id: metadata.institution.institution_id,
          name: metadata.institution.name,
          mask: metadata.accounts[0].mask,
      };
      if (!linkedAccounts.some(acc => acc.id === newAccount.id)) {
          setLinkedAccounts(prev => [...prev, newAccount]);
      }
      setTransactions(prev => [ ...MOCK_TRANSACTIONS.slice(0,5).map(t => ({...t, id: `plaid_${t.id}_${Date.now()}`})), ...prev]);
      updateGamification(100);
    } finally {
      // Use a timeout to simulate data processing
      setTimeout(() => setIsImportingData(false), 2000);
    }
  };

  const unlinkAccount = (id: string) => {
      setLinkedAccounts(prev => prev.filter(acc => acc.id !== id));
      // Fire-and-forget request to the BFF to update the backend
      fetch('/api/plaid/unlink-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id })
      }).catch(err => console.error('Failed to unlink account on server:', err));
  };

  const pitchBusinessPlan = async (plan: string) => {
    setWeaverState(prev => ({ ...prev, stage: WeaverStage.Analysis, businessPlan: plan, error: null }));
    try {
      const response = await fetch('/api/weaver/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!response.ok) throw new Error('BFF returned an error during pitch analysis');

      const data = await response.json();
      setWeaverState(prev => ({
        ...prev,
        stage: WeaverStage.Test,
        feedback: data.feedback,
        questions: data.questions,
      }));
    } catch (err) {
      console.error("Error analyzing business plan via BFF:", err);
      setWeaverState(prev => ({ ...prev, stage: WeaverStage.Error, error: "The AI encountered an issue analyzing your plan. Please try again." }));
    }
  };

  const simulateTestPass = async () => {
    setWeaverState(prev => ({ ...prev, stage: WeaverStage.FinalReview, error: null }));
    try {
      const response = await fetch('/api/weaver/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessPlan: weaverState.businessPlan }),
      });
      if (!response.ok) throw new Error('BFF returned an error during final review');

      const data = await response.json();
      const { loanAmount, coachingPlan } = data;

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
        console.error("Error finalizing loan via BFF:", err);
        setWeaverState(prev => ({ ...prev, stage: WeaverStage.Error, error: "The AI couldn't finalize the funding package. Please try again." }));
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
    // Fire-and-forget request to BFF
    fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) }).catch(console.error);
  };

  const addBudget = (budget: Omit<BudgetCategory, 'id' | 'spent' | 'color'>) => {
      const newBudget: BudgetCategory = {
          id: budget.name.toLowerCase().replace(' ', '-'),
          ...budget,
          spent: 0,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      };
      setBudgets(prev => [...prev, newBudget]);
      // Fire-and-forget request to BFF
      fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBudget) }).catch(console.error);
  };

  const addFinancialGoal = (goalData: Omit<FinancialGoal, 'id' | 'plan' | 'currentAmount'>) => {
    const newGoal: FinancialGoal = {
        ...goalData,
        id: `goal_${Date.now()}`,
        currentAmount: 0,
        plan: null,
    };
    setFinancialGoals(prev => [...prev, newGoal]);
    // Fire-and-forget request to BFF
    fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newGoal) }).catch(console.error);
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
      addTransaction(tx); // This will also call the BFF for the transaction
  };

  const generateGoalPlan = async (goalId: string) => {
    const goal = financialGoals.find(g => g.id === goalId);
    if (!goal) return;

    try {
        const response = await fetch('/api/goals/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goalId, goalDetails: goal })
        });
        if (!response.ok) throw new Error('BFF failed to generate goal plan');

        const plan: AIGoalPlan = await response.json();
        setFinancialGoals(prev => prev.map(g => g.id === goalId ? { ...g, plan } : g));
    } catch (err) {
        console.error("Error generating goal plan via BFF:", err);
    }
  };
  
    // --- CRYPTO & WEB3 FUNCTIONS ---
  const connectWallet = () => {
      setTimeout(() => {
          setWalletInfo({ address: '0x1a2b...c3d4', balance: 12.5 });
      }, 500);
  };

  const issueCard = () => {
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
      setTimeout(() => {
          const cryptoAmount = usdAmount / 3000; // Mock ETH price
          setCryptoAssets(prev => prev.map(asset => asset.ticker === cryptoTicker ? { ...asset, amount: asset.amount + cryptoAmount, value: asset.value + usdAmount } : asset));
          const tx: Transaction = {
            id: `crypto_buy_${Date.now()}`,
            type: 'expense',
            category: 'Investments',
            description: `Buy ${cryptoTicker}`,
            amount: usdAmount,
            date: new Date().toLocaleDateString('en-CA'),
            carbonFootprint: 0.2
          };
          addTransaction(tx);
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