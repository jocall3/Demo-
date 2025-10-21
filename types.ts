export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  carbonFootprint?: number;
}

export interface Asset {
  name: string;
  value: number;
  color: string;
  esgRating?: number;
  description?: string;
  performanceYTD?: number;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  chartData?: { name: string; value: number }[];
}

export interface BudgetCategory {
    id: string;
    name: string;
    limit: number;
    spent: number;
    color: string;
}

export interface GamificationState {
    score: number;
    level: number;
    levelName: string;
    progress: number;
    credits: number;
}

export interface AIPlanStep {
    title: string;
    description: string;
    timeline: string;
}

export interface AIPlan {
    title: string;
    summary: string;
    steps: AIPlanStep[];
}

export type IllusionType = 'none' | 'aurora';

export interface LinkedAccount {
  id: string;
  name: string;
  mask: string;
}

export interface AIQuestion {
    id:string;
    question: string;
    category: string;
}

export enum WeaverStage {
    Pitch = 'pitch',
    Analysis = 'analysis',
    Test = 'test',
    FinalReview = 'final_review',
    Approved = 'approved',
    Error = 'error',
}

export interface QuantumWeaverState {
    stage: WeaverStage;
    businessPlan: string;
    feedback: string;
    questions: AIQuestion[];
    loanAmount: number;
    coachingPlan: AIPlan | null;
    error: string | null;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextPayment: string;
  iconName: string;
}

export interface CreditScore {
  score: number;
  change: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
}

export interface SavingsGoal {
  id:string;
  name: string;
  target: number;
  saved: number;
  iconName: string;
}

export interface MarketMover {
    ticker: string;
    name: string;
    change: number;
    price: number;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  aiJustification: string;
}

export interface DetectedSubscription {
  name: string;
  estimatedAmount: number;
  lastCharged: string;
}

export interface CryptoAsset {
  ticker: string;
  name: string;
  value: number;
  amount: number;
  color: string;
}

export interface NFTAsset {
  id: string;
  name: string;
  imageUrl: string;
  contractAddress: string;
}

export interface VirtualCard {
  cardNumber: string;
  cvv: string;
  expiry: string;
  holderName: string;
}

export type PaymentOperationStatus = 'Initiated' | 'Processing' | 'Completed' | 'Failed';

export interface PaymentOperation {
  id: string;
  description: string;
  amount: number;
  status: PaymentOperationStatus;
  type: 'ACH' | 'Wire' | 'Crypto';
  date: string;
}

export interface CorporateCardControls {
    atm: boolean;
    contactless: boolean;
    online: boolean;
    monthlyLimit: number;
}

export interface CorporateCard {
    id: string;
    holderName: string;
    cardNumberMask: string;
    status: 'Active' | 'Suspended' | 'Lost';
    frozen: boolean;
    controls: CorporateCardControls;
}

export interface CorporateTransaction {
    id: string;
    cardId: string;
    holderName: string;
    merchant: string;
    amount: number;
    status: 'Pending' | 'Approved';
    timestamp: string;
}

export interface RewardPoints {
    balance: number;
    lastEarned: number;
    lastRedeemed: number;
    currency: string;
}

export interface Notification {
    id: string;
    message: string;
    timestamp: string;
    read: boolean;
    view?: View;
}


export enum View {
    Dashboard = 'dashboard',
    Transactions = 'transactions',
    SendMoney = 'send-money',
    Budgets = 'budgets',
    Investments = 'investments',
    SASPlatforms = 'the-vision',
    AIAdvisor = 'ai-advisor',
    QuantumWeaver = 'quantum-weaver',
    AIAdStudio = 'ai-ad-studio',
    Crypto = 'crypto',
    Goals = 'goals',
    Marketplace = 'marketplace',
    Security = 'security',
    Personalization = 'personalization',
    CardCustomization = 'card-customization',
    OpenBanking = 'open-banking',
    CorporateCommand = 'corporate-command',
    APIIntegration = 'api-integration',
    Rewards = 'rewards',
    CreditHealth = 'credit-health',
    Settings = 'settings',
    FinancialDemocracy = 'financial-democracy',
}

export interface AIGoalPlanStep {
    title: string;
    description: string;
    category: 'Savings' | 'Budgeting' | 'Investing' | 'Income';
}

export interface AIGoalPlan {
    feasibilitySummary: string;
    monthlyContribution: number;
    steps: AIGoalPlanStep[];
}

export type Contribution = {
    id: string;
    amount: number;
    date: string;
    type: 'manual' | 'recurring';
};

export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string;
    currentAmount: number;
    iconName: string;
    plan: AIGoalPlan | null;
    contributions?: Contribution[];
}

export interface RewardItem {
    id: string;
    name: string;
    cost: number; // in reward points
    type: 'cashback' | 'giftcard' | 'impact';
    description: string;
    iconName: string; // for an icon
}

export type APIProvider = 'Plaid' | 'Stripe' | 'Marqeta' | 'Modern Treasury' | 'Google Gemini';

export interface APIStatus {
    provider: APIProvider;
    status: 'Operational' | 'Degraded Performance' | 'Partial Outage' | 'Major Outage';
    responseTime: number; // in ms
}

export interface CreditFactor {
    name: 'Payment History' | 'Credit Utilization' | 'Credit Age' | 'New Credit' | 'Credit Mix';
    status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    description: string;
}