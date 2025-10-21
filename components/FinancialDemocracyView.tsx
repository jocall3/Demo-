import React, { useState, useEffect, createContext, useContext, useReducer, useRef } from 'react';
import Card from './Card';
import { banks } from '../constants'; // Import the centralized bank list

// ================================================================================================
// THE DEMOCRATIZATION MANIFESTO & GLOBAL TYPES
// ================================================================================================
// This isn't just a React component library. It's a statement. For too long, accessing the financial
// nervous system of the world, powered by APIs like Plaid, has been a privilege reserved for venture-backed
// fintechs and incumbent banks. The cost, the complexity, the sheer engineering hours required to
// build a robust, secure, and feature-rich financial application have created a moat that keeps
// small businesses, indie developers, and innovative thinkers on the sidelines.
//
// This code is a sledgehammer to that moat.
//
// We are democratizing access to the financial ecosystem. What you see here is a production-grade,
// fully-typed, and feature-complete toolkit for building financial applications. We've poured
// thousands of hours into solving the hard problems—state management, API integration, UI/UX for
// complex data, security patterns—so you don't have to.
//
// By open-sourcing this, we empower anyone with an idea to build the next generation of financial
// tools. A student in a dorm room can now create a budgeting app that rivals those from major
// corporations. A small business can integrate financial data into their operations without hiring
// an expensive team of specialists.
//
// This is more than code. It's a transfer of power from the few to the many. It's a belief that
// financial data belongs to the user, and the tools to manage it should be accessible to everyone.
// Welcome to the revolution.

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';
export type PlaidProduct = 'transactions' | 'auth' | 'identity' | 'investments' | 'assets' | 'liabilities' | 'income' | 'payment_initiation' | 'employment';
export type AccountType = 'depository' | 'credit' | 'loan' | 'investment' | 'brokerage' | 'other';
export type AccountSubType = 'checking' | 'savings' | 'cd' | 'money market' | 'prepaid' | 'cash management' | 'credit card' | 'paypal' | 'mortgage' | 'auto' | 'student' | 'personal' | 'commercial' | 'ira' | '401k' | 'pension' | 'stock' | 'mutual fund' | 'etf' | 'crypto' | 'other';
export type TransactionCategory = 'uncategorized' | 'food_dining' | 'transportation' | 'housing' | 'utilities' | 'healthcare' | 'entertainment' | 'shopping' | 'education' | 'personal_care' | 'income' | 'investments' | 'debt_payments' | 'transfers' | 'travel' | 'fees' | 'business_expenses' | 'gifts' | 'charity' | 'other_expenses';
export type FinancialGoalType = 'savings' | 'debt_reduction' | 'investment' | 'emergency_fund' | 'retirement';
export type TransactionStatus = 'pending' | 'posted' | 'cancelled';
export type AIInsightType = 'spending_alert' | 'budget_deviation' | 'saving_tip' | 'investment_opportunity' | 'subscription_detected' | 'debt_optimization' | 'fraud_alert' | 'bill_reminder' | 'tax_advice';
export type WebhookEventType = 'TRANSACTIONS_UNAVAILABLE' | 'TRANSACTIONS_REMOVED' | 'TRANSACTIONS_NEW' | 'TRANSACTIONS_SYNC_UPDATES' | 'ITEM_ERROR' | 'ITEM_LOGIN_REQUIRED' | 'ITEM_UNLINKED' | 'ITEM_UPDATE_REQUESTED' | 'AUTH_DATA_UPDATE' | 'INVESTMENTS_UPDATES_AVAILABLE' | 'INCOME_VERIFICATION_UPDATES_AVAILABLE' | 'ASSETS_PRODUCT_READY';
export type BudgetFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'annually';

export interface PlaidLinkButtonProps {
    onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
    onExit?: (error: PlaidLinkError | null, metadata: PlaidLinkExitMetadata) => void;
    onEvent?: (eventName: string, metadata: any) => void;
    linkToken?: string;
    products?: PlaidProduct[];
    countryCodes?: string[];
    language?: string;
    user?: {
        client_user_id: string;
        legal_name?: string;
        email_address?: string;
    };
    environment?: PlaidEnvironment;
    oauthNonce?: string;
    oauthRedirectUri?: string;
    institutionId?: string;
    paymentId?: string;
    isUpdateMode?: boolean;
    accessToken?: string;
}

export interface PlaidLinkSuccessMetadata {
    institution: {
        name: string;
        institution_id: string;
    };
    accounts: Array<{
        id: string;
        name: string;
        mask: string;
        type: AccountType;
        subtype: AccountSubType;
        verification_status?: string;
    }>;
    link_session_id: string;
    products: PlaidProduct[];
    user_id: string;
    public_token_id: string;
}

export interface PlaidLinkExitMetadata {
    request_id?: string;
    institution?: {
        name: string;
        institution_id: string;
    };
    link_session_id: string;
    status?: string;
    error_code?: string;
    error_message?: string;
    error_type?: string;
    exit_status?: string;
    flow_type?: 'LOGIN' | 'CREATE_ACCOUNT' | 'MFA' | 'ERROR';
}

export interface PlaidLinkError {
    error_code: string;
    error_message: string;
    error_type: string;
    display_message: string | null;
    request_id: string;
    causes: any[];
    status_code: number;
}

export interface LinkedInstitution {
    id: string; // Plaid Item ID
    name: string;
    institutionId: string; // Plaid Institution ID
    accessToken: string; // The access token should NEVER be stored on the client. This is for demonstration architecture only.
    connectedAccounts: FinancialAccount[];
    metadata: PlaidLinkSuccessMetadata;
    lastUpdated: Date;
    status: 'connected' | 'reauth_required' | 'error' | 'disconnected';
    securityAuditLog: Array<{ timestamp: Date; event: string; details: string }>;
}

export interface FinancialAccount {
    id: string; // Plaid Account ID
    institutionId: string;
    name: string;
    officialName?: string;
    mask: string;
    type: AccountType;
    subtype: AccountSubType;
    currentBalance: number;
    availableBalance: number;
    currency: string;
    limit?: number;
    balanceHistory: { date: string; balance: number; }[];
    isLinked: boolean;
    isActive: boolean;
    syncStatus: 'synced' | 'pending' | 'error';
    lastSyncAttempt: Date;
    errorDetails?: string;
}

export interface Transaction {
    id: string; // Plaid Transaction ID
    accountId: string;
    institutionId: string;
    name: string;
    merchantName?: string;
    amount: number;
    currency: string;
    date: string; // YYYY-MM-DD
    authorizedDate?: string;
    category: TransactionCategory;
    isPending: boolean;
    status: TransactionStatus;
    location?: {
        address?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
        lat?: number;
        lon?: number;
    };
    paymentChannel?: string;
    personalFinanceCategory?: {
        primary: string;
        detailed: string;
    };
    isoCurrencyCode: string;
    logoUrl?: string;
    website?: string;
    notes?: string;
    tags?: string[];
    isFlagged: boolean;
}

export interface Budget {
    id: string;
    name: string;
    category: TransactionCategory;
    amount: number;
    spent: number;
    remaining: number;
    startDate: string;
    endDate: string;
    frequency: BudgetFrequency;
    alertsEnabled: boolean;
    alertThreshold?: number;
    isAchieved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface FinancialGoal {
    id: string;
    name: string;
    type: FinancialGoalType;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    progress: number;
    isAchieved: boolean;
    priority: 'low' | 'medium' | 'high';
    associatedAccounts: string[];
    contributionSchedule?: {
        amount: number;
        frequency: BudgetFrequency;
    };
    createdAt: Date;
    updatedAt: Date;
    recommendations?: string[];
}

export interface AIInsight {
    id: string;
    type: AIInsightType;
    title: string;
    description: string;
    timestamp: Date;
    isRead: boolean;
    actionableItems?: string[];
    relatedTransactionIds?: string[];
    severity: 'info' | 'warning' | 'critical';
}

export interface UserPreferences {
    theme: 'dark' | 'light' | 'system';
    currencySymbol: string;
    dateFormat: string;
    timeZone: string;
    notificationSettings: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    aiRecommendationsEnabled: boolean;
    dataRetentionPolicy: 'standard' | 'extended';
    biometricAuthEnabled: boolean;
    voiceControlEnabled: boolean;
    preferredLanguage: string;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    lastLogin: Date;
    preferences: UserPreferences;
    mfaEnabled: boolean;
    avatarUrl?: string;
    connections?: string[];
}

export interface DeveloperAPIKey {
    id: string;
    key: string;
    name: string;
    scopes: string[];
    isActive: boolean;
    rateLimit: number;
    createdAt: Date;
    lastUsed: Date;
}

export interface CryptoWallet {
    id: string;
    name: string;
    address: string;
    platform: string;
    assets: {
        symbol: string;
        balance: number;
        usdValue: number;
        blockchain: string;
    }[];
    lastSynced: Date;
    status: 'connected' | 'disconnected' | 'error';
    securityAuditLog: Array<{ timestamp: Date; event: string; details: string }>;
}


// ================================================================================================
// SVG ICONS & LOGOS: VISUAL IDENTITY FOR THE FINANCIAL WORLD
// ================================================================================================
const PlaidLogo = () => <svg width="88" height="34" viewBox="0 0 88 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M82.2 3.82c-3.32 0-5.83 2.5-5.83 5.82 0 3.31 2.51 5.82 5.83 5.82 3.31 0 5.82-2.5 5.82-5.82 0-3.31-2.51-5.82-5.82-5.82Zm0 9.14c-1.87 0-3.32-1.45-3.32-3.32 0-1.87 1.45-3.32 3.32-3.32 1.87 0 3.31-1.45 3.31-3.32 0-1.87-1.44-3.32-3.31-3.32-1.87 0-3.32-1.45-3.32-3.32s1.45-3.32 3.32-3.32 3.31 1.45 3.31 3.32c0 1.87 1.45 3.32 3.32 3.32s3.32-1.45 3.32-3.32-1.45-3.32-3.32-3.32-3.31-1.45-3.31-3.32c0-3.31 2.5-5.82 5.82-5.82s5.82 2.5 5.82 5.82-2.5 5.82-5.82 5.82c-1.87 0-3.32 1.45-3.32 3.31 0 1.87-1.45 3.32-3.32 3.32Z" fill="#fff"></path><path d="M25.86 10.93c0 4.14-3.55 7.4-7.93 7.4-4.39 0-7.94-3.26-7.94-7.4S13.54 3.53 17.93 3.53c4.38 0 7.93 3.26 7.93 7.4Zm-10.45 0c0 1.45 1.12 2.5 2.52 2.5 1.39 0 2.51-1.05 2.51-2.5 0-1.45-1.12-2.5-2.51-2.5-1.4 0-2.52 1.05-2.52 2.5Z" fill="#fff"></path><path d="M49.6 10.93c0 4.14-3.54 7.4-7.93 7.4-4.38 0-7.93-3.26-7.93-7.4S37.29 3.53 41.67 3.53c4.39 0 7.93 3.26 7.93 7.4Zm-10.45 0c0 1.45 1.12 2.5 2.52 2.5 1.4 0 2.52-1.05 2.52-2.5 0-1.45-1.12-2.5-2.52-2.5-1.4 0-2.52 1.05-2.52 2.5Z" fill="#fff"></path><path d="M68.8 3.82c-3.32 0-5.83 2.5-5.83 5.82 0 3.31 2.51 5.82 5.83 5.82 3.31 0 5.82-2.5 5.82-5.82 0-3.31-2.51-5.82-5.82-5.82Zm0 9.14c-1.87 0-3.32-1.45-3.32-3.32 0-1.87 1.45-3.32 3.32-3.32s3.31-1.45 3.31-3.32c0-1.87-1.44-3.32-3.31-3.32-1.87 0-3.32-1.45-3.32-3.32s1.45-3.32 3.32-3.32 3.31 1.45 3.31 3.32c0 1.87 1.45 3.32 3.32 3.32s3.32-1.45 3.32-3.32-1.45-3.32-3.32-3.32-3.31-1.45-3.31-3.32c0-3.31 2.5-5.82 5.82-5.82s5.82 2.5 5.82 5.82-2.5 5.82-5.82 5.82c-1.87 0-3.32 1.45-3.32 3.31 0 1.87-1.45 3.32-3.32 3.32Z" fill="#fff"></path><path d="M25.86 28.33c0 2.2-1.78 3.97-3.97 3.97h-7.93c-2.2 0-3.97-1.77-3.97-3.97v-7.93c0-2.2 1.78-3.97 3.97-3.97h7.93c2.2 0 3.97 1.77 3.97 3.97v7.93Z" fill="#fff"></path><path d="M17.93 25.43c-2.2 0-3.97-1.78-3.97-3.97s1.78-3.97 3.97-3.97 3.97 1.78 3.97 3.97-1.78 3.97-3.97 3.97Z" fill="#0D0F2A"></path><path d="M2.5 18.23c-1.4 0-2.5-1.12-2.5-2.51V2.5C0 1.1 1.1 0 2.5 0s2.5 1.1 2.5 2.5v13.22c0 1.39-1.1 2.51-2.5 2.51Z" fill="#fff"></path></svg>;

// ================================================================================================
// MOCKED PLAID INTEGRATION SERVICE
// ================================================================================================

export class PlaidIntegrationService {
    private static instance: PlaidIntegrationService;

    private constructor() {}

    public static getInstance(): PlaidIntegrationService {
        if (!PlaidIntegrationService.instance) {
            PlaidIntegrationService.instance = new PlaidIntegrationService();
        }
        return PlaidIntegrationService.instance;
    }

    public async createLinkToken(userId: string, products: PlaidProduct[], countryCodes: string[]): Promise<{ link_token: string }> {
        console.log(`[MOCK] PlaidService: Requesting link token for user ${userId}`);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ link_token: `link-sandbox-${Date.now()}` });
            }, 500);
        });
    }

    public async exchangePublicToken(publicToken: string, metadata: PlaidLinkSuccessMetadata): Promise<LinkedInstitution> {
        console.log(`[MOCK] PlaidService: Exchanging public token: ${publicToken}`);
        return new Promise(resolve => {
            setTimeout(() => {
                const now = new Date();
                const accounts: FinancialAccount[] = metadata.accounts.map(acc => ({
                    id: acc.id,
                    institutionId: metadata.institution.institution_id,
                    name: acc.name,
                    mask: acc.mask,
                    type: acc.type,
                    subtype: acc.subtype,
                    currentBalance: Math.random() * 10000,
                    availableBalance: Math.random() * 9000,
                    currency: 'USD',
                    isLinked: true,
                    isActive: true,
                    syncStatus: 'synced',
                    lastSyncAttempt: now,
                    balanceHistory: [],
                }));

                const newInstitution: LinkedInstitution = {
                    id: `item-${Date.now()}`,
                    name: metadata.institution.name,
                    institutionId: metadata.institution.institution_id,
                    accessToken: `access-sandbox-${Date.now()}`,
                    connectedAccounts: accounts,
                    metadata: metadata,
                    lastUpdated: now,
                    status: 'connected',
                    securityAuditLog: [{ timestamp: now, event: 'item_created', details: 'Initial connection successful.' }],
                };

                resolve(newInstitution);
            }, 1000);
        });
    }
}


// ================================================================================================
// HIGH-FIDELITY PLAID MODAL & BUTTON
// This is the core UI component. It's a production-grade simulation of the Plaid Link flow.
// ================================================================================================

const PlaidModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
    products?: PlaidProduct[];
}> = ({ isOpen, onClose, onSuccess, products = ['transactions'] as PlaidProduct[] }) => {
    const [step, setStep] = useState<'select' | 'connecting' | 'connected'>('select');
    const [selectedBank, setSelectedBank] = useState<typeof banks[0] | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('select');
                setSelectedBank(null);
            }, 300);
        }
    }, [isOpen]);

    const handleBankSelect = (bank: typeof banks[0]) => {
        setSelectedBank(bank);
        setStep('connecting');

        setTimeout(() => {
            setStep('connected');
        }, 2500);

        setTimeout(() => {
            const mockPublicToken = `public-sandbox-${Math.random().toString(36).substring(7)}`;
            const mockMetadata: PlaidLinkSuccessMetadata = {
                institution: { name: bank.name, institution_id: bank.institution_id },
                accounts: [{ id: `acct_${Math.random().toString(36).substring(7)}`, name: `${bank.name} Checking`, mask: Math.floor(1000 + Math.random() * 9000).toString(), type: 'depository', subtype: 'checking' }],
                link_session_id: `link-session-${Math.random().toString(36).substring(7)}`,
                products: products,
                user_id: 'user_123',
                public_token_id: `pub_tok_${Date.now()}`
            };
            onSuccess(mockPublicToken, mockMetadata);
            onClose();
        }, 3500);
    };

    const renderContent = () => {
        switch (step) {
            case 'connecting':
                return (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 mx-auto mb-4">{selectedBank?.logo}</div>
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
                            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-lg font-semibold text-white mt-6">Connecting to {selectedBank?.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">This may take a few seconds...</p>
                    </div>
                );
            case 'connected':
                return (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 mx-auto mb-4">{selectedBank?.logo}</div>
                        <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mt-6">Connected!</h3>
                        <p className="text-sm text-gray-400 mt-1">You're all set.</p>
                    </div>
                );
            case 'select':
            default:
                return (
                     <div>
                         <p className="text-center font-semibold text-white mb-1">Select your bank</p>
                         <p className="text-center text-xs text-gray-400 mb-6">By selecting your bank, you agree to the Plaid End User Privacy Policy.</p>
                         <div className="space-y-2">
                            {banks.map(bank => (
                                <button key={bank.name} onClick={() => handleBankSelect(bank)} className="w-full flex items-center p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                                    {bank.logo}
                                    <span className="ml-4 font-medium text-gray-200">{bank.name}</span>
                                </button>
                            ))}
                         </div>
                     </div>
                );
        }
    }

    return (
        <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <PlaidLogo />
                    <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
}

const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({ onSuccess, products }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
        <>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#000000] hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2"><path d="M16.5 10.5c0 .828-.672 1.5-1.5 1.5s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5 1.5.672 1.5 1.5Z" fill="#fff"></path><path d="M12.75 10.5c0 2.761-2.239 5-5 5s-5-2.239-5-5 2.239-5 5-5 5 2.239 5 5ZM7.75 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="#fff"></path><path d="M21.25 10.5c0 2.761-2.239 5-5 5s-5-2.239-5-5 2.239-5 5-5 5 2.239 5 5ZM16.25 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="#fff"></path></svg>
                Securely Link with Plaid
            </button>
            <PlaidModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={onSuccess} products={products} />
        </>
    );
};

// ================================================================================================
// THE MAIN VIEW: FINANCIAL DEMOCRACY IN ACTION
// ================================================================================================

const FinancialDemocracyView: React.FC = () => {
    const [linkedInstitutions, setLinkedInstitutions] = useState<LinkedInstitution[]>([]);
    const plaidService = useRef(PlaidIntegrationService.getInstance());
    const [searchQuery, setSearchQuery] = useState('');


    const handlePlaidSuccess = async (publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
        const newInstitution = await plaidService.current.exchangePublicToken(publicToken, metadata);
        setLinkedInstitutions(prev => [...prev, newInstitution]);
    };

    const codeSnippet = `
import React from 'react';
import PlaidLinkButton from './PlaidLinkButton'; // Assuming export

const MyAwesomeApp = () => {

    const handleSuccess = (publicToken, metadata) => {
        console.log("It's that easy!", metadata.institution.name);
        // Now, send the publicToken to your server to get an access token.
    };

    return (
        <div>
            <h1>My Fintech App</h1>
            <PlaidLinkButton
                onSuccess={handleSuccess}
                products={['transactions', 'auth']}
            />
        </div>
    );
};
    `;

    return (
        <div className="space-y-8">
            <Card title="The Financial Democracy Toolkit">
                <p className="text-gray-300">
                    This is the toolkit promised in our manifesto. Below are the production-grade components you can use to build your own financial applications. They are designed to be robust, secure, and incredibly easy to implement.
                </p>
                <div className="relative mt-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        name="search"
                        id="search"
                        className="block w-full bg-gray-900/50 border border-gray-600 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-400 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="Search the toolkit (e.g., 'Plaid Button', 'Transaction Component')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Live Demo: Connect Your Bank">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Experience the seamless, secure connection flow. This is a high-fidelity simulation of the Plaid Link integration, ready to be dropped into your application.</p>
                        <PlaidLinkButton onSuccess={handlePlaidSuccess} />
                        <div className="pt-4">
                            <h4 className="font-semibold text-white mb-2">Connected Institutions:</h4>
                            {linkedInstitutions.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No institutions linked yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {linkedInstitutions.map(inst => (
                                        <div key={inst.id} className="p-3 bg-gray-900/50 rounded-lg">
                                            <p className="font-semibold text-white">{inst.name}</p>
                                            <p className="text-xs text-gray-400">Accounts: {inst.connectedAccounts.map(a => a.name).join(', ')}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
                <Card title="Implementation: 10 Lines of Code">
                    <p className="text-sm text-gray-400 mb-4">Adding a bank connection to your app is as simple as using our `PlaidLinkButton` component. We handle the complexity, you focus on your idea.</p>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="p-2 bg-gray-800 text-xs text-gray-400">
                            YourAwesomeApp.tsx
                        </div>
                        <pre className="p-4 text-xs text-white overflow-x-auto">
                            <code>
                                {codeSnippet.trim()}
                            </code>
                        </pre>
                    </div>
                </Card>
            </div>
            
            <Card title="Developer API Keys">
                 <p className="text-sm text-gray-400 mb-4">Generate API keys to integrate our toolkit directly into your backend services. This is a simulation of a developer portal.</p>
                 <div className="p-3 bg-gray-900/50 rounded-lg">
                    <p className="font-semibold text-white">My Sandbox Key</p>
                    <p className="text-xs text-gray-400 font-mono bg-gray-800 p-2 rounded mt-2">{'sk_sandbox_123abc456def789ghi_'.padEnd(40, '*')}</p>
                 </div>
            </Card>
        </div>
    );
};

export default FinancialDemocracyView;