/**
 * @file types.ts
 * @description Single source of truth for all shared types across the frontend ecosystem.
 *
 * @architecturalNote This file is a critical contract for the federated Micro-Frontend architecture.
 * It defines the data structures that the Shell application and all remote MFEs use to communicate and
 * represent state. In a production environment with a mature CI/CD pipeline, these types would be
 * automatically generated from the GraphQL supergraph schema using a tool like GraphQL Code Generator.
 * This ensures type safety and consistency between the frontend and the composed backend services.
 * All exported types and interfaces in this file are fully documented as per project standards.
 */

// ================================================================================================
// CORE CLIENT-SIDE ENUMS & TYPES
// These types are specific to the client-side application logic, such as routing and UI state.
// ================================================================================================

/**
 * Defines all primary views/pages within the application for client-side navigation and routing.
 * This enum is used by the shell application to determine which Micro-Frontend or component to render.
 */
export enum View {
  /** The main dashboard view, showing a summary of the user's financial health. */
  Dashboard = 'dashboard',
  /** A detailed view of all transactions with filtering and search capabilities. */
  Transactions = 'transactions',
  /** A view for initiating money transfers. */
  SendMoney = 'send-money',
  /** A view for creating and managing budgets. */
  Budgets = 'budgets',
  /** A detailed overview of the user's investment portfolio and market data. */
  Investments = 'investments',
  /** An interactive chat interface with the AI financial advisor. */
  AIAdvisor = 'ai-advisor',
  /** An AI-powered incubator for analyzing and developing new business plans. */
  QuantumWeaver = 'quantum-weaver',
  /** An AI-powered tool for generating video advertisements. */
  AIAdStudio = 'ai-ad-studio',
  /** A hub for managing cryptocurrency assets and Web3 integrations. */
  Crypto = 'crypto',
  /** A view for setting and tracking progress towards financial goals. */
  Goals = 'goals',
  /** A marketplace for discovering and installing AI agents. */
  Marketplace = 'marketplace',
  /** A view for managing security settings, linked accounts, and login activity. */
  Security = 'security',
  /** A view for customizing the application's appearance and theme. */
  Personalization = 'personalization',
  /** An AI-powered tool for designing custom bank cards. */
  CardCustomization = 'card-customization',
  /** A view for managing consents and data sharing with third-party applications. */
  OpenBanking = 'open-banking',
  /** A dashboard for managing corporate finances, cards, and payments. */
  CorporateCommand = 'corporate-command',
  /** A status page displaying the health of integrated third-party APIs. */
  APIIntegration = 'api-integration',
  /** A hub for viewing and redeeming gamification rewards. */
  Rewards = 'rewards',
  /** A detailed analysis of the user's credit score and contributing factors. */
  CreditHealth = 'credit-health',
  /** A view for managing user profile and notification settings. */
  Settings = 'settings',
  /** A view demonstrating the open-source and democratized nature of the platform's tools. */
  FinancialDemocracy = 'financial-democracy',
  /** A page outlining the vision and philosophy of the Demo Bank platform. */
  TheVision = 'the-vision',
}

/**
 * Defines the types of dynamic background illusions available for personalization.
 * This is a client-side UI state type.
 */
export type IllusionType = 'none' | 'aurora';


// ================================================================================================
// GRAPHQL SCHEMA ENUMS
// These enums mirror the enums defined in the GraphQL schema for type-safe operations.
// ================================================================================================

/**
 * The type of a financial transaction.
 * - `INCOME`: Represents money coming into an account.
 * - `EXPENSE`: Represents money leaving an account.
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

/**
 * The type of reward that can be redeemed.
 */
export enum RewardType {
  CASHBACK = 'CASHBACK',
  GIFTCARD = 'GIFTCARD',
  IMPACT = 'IMPACT',
}

/**
 * A rating for a user's credit score or a contributing credit factor.
 */
export enum CreditRating {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

/**
 * The integrated third-party API providers.
 */
export enum APIProvider {
  Plaid = 'Plaid',
  Stripe = 'Stripe',
  Marqeta = 'Marqeta',
  ModernTreasury = 'ModernTreasury',
  GoogleGemini = 'GoogleGemini',
}

/**
 * The operational status of a downstream API.
 */
export enum APIStatusType {
  Operational = 'Operational',
  DegradedPerformance = 'DegradedPerformance',
  PartialOutage = 'PartialOutage',
  MajorOutage = 'MajorOutage',
}

/**
 * The current stage of the Quantum Weaver business plan analysis workflow.
 */
export enum WeaverStage {
  Pitch = 'Pitch',
  Analysis = 'Analysis',
  Test = 'Test',
  FinalReview = 'FinalReview',
  Approved = 'Approved',
  Error = 'Error',
}


// ================================================================================================
// GRAPHQL SUPERGRAPH TYPES
// These interfaces represent the shape of data queried from the federated GraphQL endpoint.
// ================================================================================================

/**
 * Represents a single financial transaction.
 */
export interface Transaction {
  /** The GraphQL typename. */
  __typename?: 'Transaction';
  /** The unique identifier for the transaction. */
  id: string;
  /** The type of transaction (income or expense). */
  type: TransactionType;
  /** The spending category of the transaction. */
  category: string;
  /** The merchant name or a short description of the transaction. */
  description: string;
  /** The monetary value of the transaction. */
  amount: number;
  /** The date the transaction was posted, in 'YYYY-MM-DD' format. */
  date: string;
  /** The estimated carbon footprint of the transaction in kilograms of CO2. */
  carbonFootprint?: number | null;
}

/**
 * Represents a user's financial account.
 */
export interface Account {
    /** The GraphQL typename. */
    __typename?: 'Account';
    /** The account's unique identifier. */
    id: string;
    /** The ID of the user who owns this account. */
    userId: string;
    /** The user-friendly name of the account (e.g., "Chase Checking"). */
    name: string;
    /** The last 2-4 alphanumeric characters of the account number. */
    mask: string | null;
    /** The high-level type of the account (e.g., "depository", "credit"). */
    type: string;
    /** The specific subtype of the account (e.g., "checking", "savings"). */
    subtype: string | null;
    /** The balance of funds in the account. */
    balance: Balance;
}

/**
 * Represents the balance of a financial account.
 */
export interface Balance {
    /** The GraphQL typename. */
    __typename?: 'Balance';
    /** The amount of funds immediately available for use. */
    available: number | null;
    /** The total amount of funds in the account, including pending transactions. */
    current: number;
    /** The ISO-4217 currency code of the balance (e.g., "USD"). */
    iso_currency_code: string | null;
}

/**
 * Represents an asset within an investment portfolio.
 */
export interface Asset {
  /** The GraphQL typename. */
  __typename?: 'Asset';
  /** The name of the asset (e.g., 'Stocks', 'Bonds'). */
  name: string;
  /** The current market value of the asset. */
  value: number;
  /** The color code used for charting this asset. */
  color: string;
  /** The Environmental, Social, and Governance (ESG) rating, if applicable. */
  esgRating?: number | null;
  /** A brief description of the asset. */
  description?: string | null;
  /** The year-to-date performance percentage. */
  performanceYTD?: number | null;
}

/**
 * Represents a single data point for a chart within an AI insight.
 */
export interface AIInsightChartData {
  /** The GraphQL typename. */
  __typename?: 'AIInsightChartData';
  /** The label for the data point (e.g., a category name). */
  name: string;
  /** The numerical value of the data point. */
  value: number;
}

/**
 * Represents a single piece of AI-generated advice or observation.
 */
export interface AIInsight {
  /** The GraphQL typename. */
  __typename?: 'AIInsight';
  /** The unique identifier for the insight. */
  id: string;
  /** The title of the insight. */
  title: string;
  /** A detailed description of the insight. */
  description: string;
  /** The urgency level of the insight (e.g., 'low', 'medium', 'high'). */
  urgency: string;
  /** Optional data for rendering a chart alongside the insight. */
  chartData?: (AIInsightChartData | null)[] | null;
}

/**
 * Represents a user-defined budget for a specific spending category.
 */
export interface BudgetCategory {
  /** The GraphQL typename. */
  __typename?: 'BudgetCategory';
  /** The unique identifier for the budget. */
  id: string;
  /** The name of the budget category (e.g., 'Dining'). */
  name: string;
  /** The total monthly limit for this budget. */
  limit: number;
  /** The amount spent in the current budget period. */
  spent: number;
  /** The color code used for charting this budget category. */
  color: string;
}

/**
 * Represents the user's state within the gamification system.
 */
export interface GamificationState {
  /** The GraphQL typename. */
  __typename?: 'GamificationState';
  /** The user's overall financial health score. */
  score: number;
  /** The user's current level. */
  level: number;
  /** The name of the user's current level (e.g., 'Savings Specialist'). */
  levelName: string;
  /** The percentage progress towards the next level. */
  progress: number;
  /** In-app currency earned through achievements. */
  credits: number;
}

/**
 * Represents a recurring subscription payment.
 */
export interface Subscription {
  /** The GraphQL typename. */
  __typename?: 'Subscription';
  /** The unique identifier for the subscription. */
  id: string;
  /** The name of the subscription service. */
  name: string;
  /** The recurring amount of the subscription. */
  amount: number;
  /** The date of the next scheduled payment in 'YYYY-MM-DD' format. */
  nextPayment: string;
  /** The name of an icon to display for this subscription. */
  iconName: string;
}

/**
 * Represents a user's credit score.
 */
export interface CreditScore {
  /** The GraphQL typename. */
  __typename?: 'CreditScore';
  /** The numerical credit score. */
  score: number;
  /** The change in score since the last update. */
  change: number;
  /** The rating category of the score (e.g., 'EXCELLENT'). */
  rating: CreditRating;
}

/**
 * Represents a factor contributing to a user's credit score.
 */
export interface CreditFactor {
  /** The GraphQL typename. */
  __typename?: 'CreditFactor';
  /** The name of the factor (e.g., 'Payment History'). */
  name: string;
  /** The status rating of this factor. */
  status: CreditRating;
  /** A description of the factor and the user's performance. */
  description: string;
}

/**
 * A comprehensive overview of a user's credit health.
 */
export interface CreditHealth {
  /** The GraphQL typename. */
  __typename?: 'CreditHealth';
  /** The user's credit score details. */
  score: CreditScore;
  /** A list of factors contributing to the score. */
  factors: CreditFactor[];
  /** An AI-generated tip for improving the credit score. */
  aiTip?: string | null;
}

/**
 * Represents an upcoming bill payment.
 */
export interface UpcomingBill {
  /** The GraphQL typename. */
  __typename?: 'UpcomingBill';
  /** The unique identifier for the bill. */
  id: string;
  /** The name of the biller. */
  name: string;
  /** The amount due. */
  amount: number;
  /** The due date in 'YYYY-MM-DD' format. */
  dueDate: string;
}

/**
 * Represents a single actionable step in an AI-generated financial plan.
 */
export interface AIGoalPlanStep {
  /** The GraphQL typename. */
  __typename?: 'AIGoalPlanStep';
  /** The title of the step. */
  title: string;
  /** A detailed description of the action to take. */
  description: string;
  /** The financial category this step relates to (e.g., 'Savings', 'Budgeting'). */
  category: string;
  /** A suggested timeline for this step. */
  timeline: string;
}

/**
 * Represents an AI-generated plan to achieve a financial goal.
 */
export interface AIGoalPlan {
  /** The GraphQL typename. */
  __typename?: 'AIGoalPlan';
  /** A summary from the AI on the feasibility of the goal. */
  feasibilitySummary: string;
  /** The recommended monthly contribution to reach the goal. */
  monthlyContribution: number;
  /** A list of actionable steps to follow. */
  steps: AIGoalPlanStep[];
}

/**
 * Represents a single contribution made towards a financial goal.
 */
export interface Contribution {
  /** The GraphQL typename. */
  __typename?: 'Contribution';
  /** The unique identifier for the contribution. */
  id: string;
  /** The amount of the contribution. */
  amount: number;
  /** The date of the contribution in 'YYYY-MM-DD' format. */
  date: string;
  /** The type of contribution (e.g., 'manual', 'automatic'). */
  type: string;
}

/**
 * Represents a user-defined financial goal.
 */
export interface FinancialGoal {
  /** The GraphQL typename. */
  __typename?: 'FinancialGoal';
  /** The unique identifier for the goal. */
  id: string;
  /** The name of the goal (e.g., 'Down Payment for House'). */
  name: string;
  /** The target monetary amount for the goal. */
  targetAmount: number;
  /** The target date to achieve the goal in 'YYYY-MM-DD' format. */
  targetDate: string;
  /** The current amount saved towards the goal. */
  currentAmount: number;
  /** The name of an icon to display for this goal. */
  iconName: string;
  /** The optional AI-generated plan to achieve this goal. */
  plan?: AIGoalPlan | null;
  /** A list of contributions made towards this goal. */
  contributions?: (Contribution | null)[] | null;
}

/**
 * Represents a single cryptocurrency asset.
 */
export interface CryptoAsset {
  /** The GraphQL typename. */
  __typename?: 'CryptoAsset';
  /** The asset's ticker symbol (e.g., 'BTC'). */
  ticker: string;
  /** The full name of the asset (e.g., 'Bitcoin'). */
  name: string;
  /** The current total value of the holding in USD. */
  value: number;
  /** The amount of the asset held. */
  amount: number;
  /** The color code used for charting this asset. */
  color: string;
}

/**
 * Represents a Non-Fungible Token (NFT) asset.
 */
export interface NFTAsset {
  /** The GraphQL typename. */
  __typename?: 'NFTAsset';
  /** The unique identifier for the NFT. */
  id: string;
  /** The name of the NFT. */
  name: string;
  /** A URL to the image of the NFT. */
  imageUrl: string;
  /** The blockchain contract address of the NFT. */
  contractAddress: string;
}

/**
 * Represents a user's entire cryptocurrency portfolio.
 */
export interface CryptoPortfolio {
  /** The GraphQL typename. */
  __typename?: 'CryptoPortfolio';
  /** A list of fungible crypto assets. */
  assets: CryptoAsset[];
  /** A list of non-fungible token assets. */
  nfts: NFTAsset[];
}

/**
 * Represents the configurable controls for a corporate card.
 */
export interface CorporateCardControls {
  /** The GraphQL typename. */
  __typename?: 'CorporateCardControls';
  /** Whether ATM withdrawals are enabled. */
  atm: boolean;
  /** Whether contactless payments are enabled. */
  contactless: boolean;
  /** Whether online purchases are enabled. */
  online: boolean;
  /** The monthly spending limit for the card. */
  monthlyLimit: number;
}

/**
 * Represents a single corporate card.
 */
export interface CorporateCard {
  /** The GraphQL typename. */
  __typename?: 'CorporateCard';
  /** The unique identifier for the card. */
  id: string;
  /** The name of the cardholder. */
  holderName: string;
  /** The last four digits of the card number. */
  cardNumberMask: string;
  /** The current status of the card (e.g., 'Active', 'Suspended'). */
  status: string;
  /** Whether the card is currently frozen. */
  frozen: boolean;
  /** The configurable spending controls for the card. */
  controls: CorporateCardControls;
}

/**
 * Represents a single transaction made with a corporate card.
 */
export interface CorporateTransaction {
  /** The GraphQL typename. */
  __typename?: 'CorporateTransaction';
  /** The unique identifier for the transaction. */
  id: string;
  /** The ID of the card used for the transaction. */
  cardId: string;
  /** The name of the cardholder who made the transaction. */
  holderName: string;
  /** The name of the merchant. */
  merchant: string;
  /** The amount of the transaction. */
  amount: number;
  /** The status of the transaction (e.g., 'Approved', 'Pending'). */
  status: string;
  /** A human-readable timestamp for the transaction (e.g., '2m ago'). */
  timestamp: string;
}

/**
 * Represents all data related to a corporate account.
 */
export interface CorporateData {
  /** The GraphQL typename. */
  __typename?: 'CorporateData';
  /** A list of all corporate cards. */
  cards: CorporateCard[];
  /** A list of recent corporate transactions. */
  transactions: CorporateTransaction[];
  /** An AI-generated insight about potential anomalies in corporate spending. */
  aiAnomalyInsight?: string | null;
}

/**
 * Represents the user's balance of reward points.
 */
export interface RewardPoints {
  /** The GraphQL typename. */
  __typename?: 'RewardPoints';
  /** The total number of points available. */
  balance: number;
  /** The name of the rewards currency (e.g., 'Points'). */
  currency: string;
}

/**
 * Represents an item that can be redeemed with reward points.
 */
export interface RewardItem {
  /** The GraphQL typename. */
  __typename?: 'RewardItem';
  /** The unique identifier for the reward item. */
  id: string;
  /** The name of the reward. */
  name: string;
  /** The number of points required to redeem the item. */
  cost: number;
  /** The type of the reward. */
  type: RewardType;
  /** A description of the reward. */
  description: string;
  /** The name of an icon to display for this reward. */
  iconName: string;
}

/**
 * A comprehensive object for a user's rewards data.
 */
export interface Rewards {
  /** The GraphQL typename. */
  __typename?: 'Rewards';
  /** The user's current points balance. */
  points: RewardPoints;
  /** A list of items available for redemption. */
  items: RewardItem[];
}

/**
 * Represents a single notification for the user.
 */
export interface Notification {
  /** The GraphQL typename. */
  __typename?: 'Notification';
  /** The unique identifier for the notification. */
  id: string;
  /** The content of the notification message. */
  message: string;
  /** A human-readable timestamp (e.g., '2h ago'). */
  timestamp: string;
  /** Whether the user has read the notification. */
  read: boolean;
  /** An optional view to navigate to when the notification is clicked. */
  view?: string | null;
}

/**
 * Represents the real-time operational status of an integrated API provider.
 */
export interface APIStatus {
  /** The GraphQL typename. */
  __typename?: 'APIStatus';
  /** The name of the API provider. */
  provider: APIProvider;
  /** The current operational status. */
  status: APIStatusType;
  /** The recent P95 response time in milliseconds. */
  responseTime: number;
}

/**
 * Represents an AI-generated question for the Quantum Weaver business plan assessment.
 */
export interface AIQuestion {
    /** The GraphQL typename. */
    __typename?: 'AIQuestion';
    /** The unique identifier for the question. */
    id: string;
    /** The content of the question. */
    question: string;
    /** The category of the question. */
    category: 'Market' | 'Finance' | 'Operations';
}

/**
 * Represents the state of the Quantum Weaver business plan analysis workflow.
 */
export interface QuantumWeaverState {
    /** The GraphQL typename. */
    __typename?: 'QuantumWeaverState';
    /** The current stage of the workflow. */
    stage: WeaverStage;
    /** The business plan submitted by the user. */
    businessPlan: string;
    /** High-level feedback from the AI on the business plan. */
    feedback: string;
    /** A list of critical questions generated by the AI. */
    questions: AIQuestion[];
    /** The amount of seed funding approved. */
    loanAmount: number;
    /** The AI-generated coaching plan for the founder. */
    coachingPlan: AIGoalPlan | null;
    /** An error message if the workflow has failed. */
    error?: string | null;
}

/**
 * Represents the main data payload for the dashboard, combining multiple data sources.
 * This is the primary query for hydrating the application's main view.
 */
export interface UserData {
  /** The GraphQL typename. */
  __typename?: 'UserData';
  /** A list of all financial transactions for the user. */
  transactions: Transaction[];
   /** A list of all financial accounts linked by the user. */
  accounts: Account[];
  /** A list of assets in the user's investment portfolio. */
  assets: Asset[];
  /** A list of AI-generated insights about the user's finances. */
  aiInsights: AIInsight[];
  /** A list of user-defined budgets. */
  budgets: BudgetCategory[];
  /** The user's state in the gamification system. */
  gamification: GamificationState;
  /** A list of detected recurring subscriptions. */
  subscriptions: Subscription[];
  /** A list of upcoming bill payments. */
  upcomingBills: UpcomingBill[];
  /** A list of the user's long-term financial goals. */
  financialGoals: FinancialGoal[];
  /** The user's cryptocurrency portfolio. */
  cryptoPortfolio: CryptoPortfolio;
  /** The user's corporate finance data. */
  corporateData: CorporateData;
  /** A comprehensive overview of the user's credit health. */
  creditHealth: CreditHealth;
  /** The user's rewards and gamification data. */
  rewards: Rewards;
  /** A list of notifications for the user. */
  notifications: Notification[];
  /** The real-time status of integrated third-party APIs. */
  apiStatus: APIStatus[];
}
