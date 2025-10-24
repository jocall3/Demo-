/**
 * @/types.ts
 * This file serves as the single source of truth for all shared types and interfaces across the application.
 * Consolidating types here ensures consistency and aligns with a Backend for Frontend (BFF) architecture,
 * where these types define the contract between the frontend and the BFF service.
 */

// ================================================================================================
// CORE ENUMS & GLOBAL APPLICATION STATE
// ================================================================================================

/**
 * @description Defines all primary views/pages within the application for navigation.
 */
export enum View {
  Dashboard = 'dashboard',
  Transactions = 'transactions',
  SendMoney = 'send-money',
  Budgets = 'budgets',
  Investments = 'investments',
  TheVision = 'the-vision',
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
  SASPlatforms = 'the-vision', // Redundant, points to TheVision
}

/**
 * @description Defines the stages for the Quantum Weaver business incubator flow.
 */
export enum WeaverStage {
  Pitch = 'pitch',
  Analysis = 'analysis',
  Test = 'test',
  FinalReview = 'final_review',
  Approved = 'approved',
  Error = 'error',
}

/**
 * @description Defines the types of dynamic background illusions available.
 */
export type IllusionType = 'none' | 'aurora';

// ================================================================================================
// USER & PROFILE TYPES
// ================================================================================================

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  currencySymbol: string;
  dateFormat: string;
  notificationSettings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  aiRecommendationsEnabled: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  preferences: UserPreferences;
  avatarUrl?: string;
}

// ================================================================================================
// CORE FINANCIAL & BANKING TYPES
// ================================================================================================

export interface Transaction {
  id: string;
  accountId?: string;
  type: 'income' | 'expense';
  status?: 'pending' | 'posted' | 'cancelled';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  merchantName?: string;
  logoUrl?: string;
  carbonFootprint?: number;
}

export interface Asset {
  name: string;
  value: number;
  color: string;
  performanceYTD?: number;
  esgRating?: number;
  description?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextPayment: string;
  iconName: string;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
}

export interface CreditScore {
  score: number;
  change: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface CreditFactor {
  name: 'Payment History' | 'Credit Utilization' | 'Credit Age' | 'New Credit' | 'Credit Mix';
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  description: string;
}

// ================================================================================================
// GOALS & PLANNING TYPES
// ================================================================================================

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

// Legacy type for simpler dashboard widget, maps to FinancialGoal
export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  iconName: string;
}

// ================================================================================================
// AI & MACHINE LEARNING TYPES
// ================================================================================================

// General AI Types
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  chartData?: { name: string; value: number }[];
}

export interface DetectedSubscription {
  name: string;
  estimatedAmount: number;
  lastCharged: string;
}

// AI Advisor Types
export type RichContent = {
  type: 'table';
  data: {
    headers: string[];
    rows: (string | number)[][];
  };
} | { type: 'bar_chart'; data: { dataKey: string; items: Record<string, string | number>[] } } | { type: 'line_chart'; data: { dataKeyX: string; dataKeyY: string; items: Record<string, string | number>[] } };

export type RichContentPart = { richContent: RichContent };
export type ToolCallPart = { functionCall: { name: string; args: Record<string, any>; } };
export type ToolResultPart = { functionResponse: { name: string; response: Record<string, any>; } };
export type MessagePart = { text: string } | ToolCallPart | ToolResultPart | RichContentPart;

export interface EnhancedMessage {
  id: string;
  role: 'user' | 'model' | 'system_tool';
  parts: MessagePart[];
  timestamp: Date;
}

// Quantum Weaver Types
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

export interface AIQuestion {
  id: string;
  question: string;
  category: string;
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

// AI Ad Studio Types
export type GenerationState = 'idle' | 'generating' | 'polling' | 'done' | 'error';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type VideoModel = 'veo-3.1-fast-generate-preview' | 'imagen-video-3-hq' | 'lumiere-hd-001' | 'phoenix-v1-fast';
export type GenerationMode = 'single' | 'storyboard';

export interface GenerationSettings {
  model: VideoModel;
  aspectRatio: AspectRatio;
  duration: number; // in seconds
  negativePrompt: string;
  seed: number;
  highFidelity: boolean;
  stylizationStrength: number; // 0-100
}

export interface StoryboardScene {
  id: string;
  prompt: string;
  duration: number; // Scene-specific duration
}

export interface VideoAsset {
  id: string;
  projectId: string;
  url: string; 
  thumbnailUrl?: string;
  prompt: string;
  creationDate: string;
  settings: GenerationSettings;
  generationMode: GenerationMode;
  storyboard?: StoryboardScene[];
  isFavorite: boolean;
}

export interface AdProject {
  id: string;
  name: string;
  creationDate: string;
  lastModified: string;
  assets: VideoAsset[];
}

// ================================================================================================
// CORPORATE, CRYPTO & PAYMENTS TYPES
// ================================================================================================

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

// ================================================================================================
// GAMIFICATION & REWARDS TYPES
// ================================================================================================

export interface GamificationState {
  score: number;
  level: number;
  levelName: string;
  progress: number;
  credits: number;
}

export interface RewardPoints {
  balance: number;
  lastEarned: number;
  lastRedeemed: number;
  currency: string;
}

export interface RewardItem {
  id: string;
  name: string;
  cost: number; // in reward points
  type: 'cashback' | 'giftcard' | 'impact';
  description: string;
  iconName: string; // for an icon
}

// ================================================================================================
// MISCELLANEOUS UI & DATA TYPES
// ================================================================================================

export interface LinkedAccount {
  id: string;
  name: string;
  mask: string;
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

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  view?: View;
}

export type APIProvider = 'Plaid' | 'Stripe' | 'Marqeta' | 'Modern Treasury' | 'Google Gemini';

export interface APIStatus {
  provider: APIProvider;
  status: 'Operational' | 'Degraded Performance' | 'Partial Outage' | 'Major Outage';
  responseTime: number; // in ms
}
