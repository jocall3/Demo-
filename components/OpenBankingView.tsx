import React, { useState, useReducer, useEffect, useCallback, useMemo, FC } from 'react';
import Card from './Card';

// --- ENHANCED TYPES AND INTERFACES for a REAL WORLD APPLICATION ---

/**
 * Represents the status of an Open Banking connection.
 */
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'pending';

/**
 * Represents a user's bank account that can be linked.
 */
export interface BankAccount {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit_card';
    accountNumberMasked: string;
    balance: number;
    currency: 'USD';
}

/**
 * Detailed information about a specific permission.
 */
export interface PermissionDetail {
    key: string;
    label: string;
    description: string;
    category: 'Account Information' | 'Payment Initiation' | 'Data Analysis';
    riskLevel: 'low' | 'medium' | 'high';
}

/**

 * Represents a third-party application available for connection.
 */
export interface ThirdPartyApp {
    id: string;
    name: string;
    description: string;
    developer: string;
    website: string;
    category: 'Budgeting' | 'Tax' | 'Investment' | 'Lending' | 'Analytics';
    icon: string; // SVG path
    requestedPermissions: PermissionDetail[];
}

/**
 * Represents an active or past Open Banking connection.
 */
export interface OpenBankingConnection {
    id: number;
    app: ThirdPartyApp;
    status: ConnectionStatus;
    connectedAt: string; // ISO 8601 Date string
    expiresAt: string; // ISO 8601 Date string
    lastAccessedAt: string | null; // ISO 8601 Date string
    linkedAccountIds: string[];
    grantedPermissions: PermissionDetail[];
    dataSharingFrequency: 'one_time' | 'recurring';
}

/**
 * Represents an event in the connection's history.
 */
export interface ConnectionHistoryEvent {
    id: string;
    connectionId: number;
    appName: string;
    eventType: 'connected' | 'revoked' | 'expired' | 'data_accessed' | 'permissions_updated';
    timestamp: string; // ISO 8601 Date string
    details: string;
}

/**
 * User preferences for Open Banking.
 */
export interface OpenBankingSettings {
    defaultConsentDurationDays: 90 | 180 | 365;
    notifyOnNewConnection: boolean;
    notifyOnConnectionExpiration: boolean;
    requireReauthenticationForHighRisk: boolean;
}


// --- MOCK DATA for a REAL WORLD APPLICATION ---

const MOCK_ACCOUNTS: BankAccount[] = [
    { id: 'acc_101', name: 'Primary Checking', type: 'checking', accountNumberMasked: '**** **** **** 1234', balance: 15432.88, currency: 'USD' },
    { id: 'acc_102', name: 'High-Yield Savings', type: 'savings', accountNumberMasked: '**** **** **** 5678', balance: 89102.15, currency: 'USD' },
    { id: 'acc_103', name: 'Travel Rewards Card', type: 'credit_card', accountNumberMasked: '**** ****** *9012', balance: -2345.67, currency: 'USD' },
];

export const ALL_PERMISSIONS: { [key: string]: PermissionDetail } = {
    'read_transaction_history': { key: 'read_transaction_history', label: 'Read transaction history', description: 'Allows the app to view your list of transactions for budgeting or analysis. It cannot initiate payments.', category: 'Account Information', riskLevel: 'low' },
    'view_account_balances': { key: 'view_account_balances', label: 'View account balances', description: 'Allows the app to see the current balance of your accounts. It cannot move money.', category: 'Account Information', riskLevel: 'low' },
    'access_income_statements': { key: 'access_income_statements', label: 'Access income statements', description: 'Allows the app to see your income history, typically for verification purposes.', category: 'Data Analysis', riskLevel: 'medium' },
    'initiate_single_payment': { key: 'initiate_single_payment', label: 'Initiate single payment', description: 'Allows the app to initiate a one-time payment from one of your accounts. You must still approve each payment.', category: 'Payment Initiation', riskLevel: 'high' },
    'view_account_details': { key: 'view_account_details', label: 'View account details', description: 'Allows the app to see account details like account number and routing number.', category: 'Account Information', riskLevel: 'medium' },
    'access_contact_info': { key: 'access_contact_info', label: 'Access contact information', description: 'Allows the app to view your name, address, and email associated with your bank account.', category: 'Account Information', riskLevel: 'low' },
};

export const MOCK_AVAILABLE_APPS: ThirdPartyApp[] = [
    { id: 'app_001', name: 'MintFusion Budgeting', developer: 'FusionCorp', website: 'https://fusioncorp.example.com', description: 'A powerful tool to track your spending, create budgets, and achieve your financial goals.', category: 'Budgeting', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', requestedPermissions: [ALL_PERMISSIONS.read_transaction_history, ALL_PERMISSIONS.view_account_balances, ALL_PERMISSIONS.view_account_details] },
    { id: 'app_002', name: 'TaxBot Pro', developer: 'Taxable Inc.', website: 'https://taxable.example.com', description: 'Automate your tax preparation by importing financial data directly and securely.', category: 'Tax', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', requestedPermissions: [ALL_PERMISSIONS.read_transaction_history, ALL_PERMISSIONS.access_income_statements] },
    { id: 'app_003', name: 'Acornvest', developer: 'Oak Financial', website: 'https://oakfin.example.com', description: 'Invest your spare change automatically from everyday purchases.', category: 'Investment', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6', requestedPermissions: [ALL_PERMISSIONS.read_transaction_history, ALL_PERMISSIONS.view_account_balances, ALL_PERMISSIONS.initiate_single_payment] },
    { id: 'app_004', name: 'LendEasy', developer: 'QuickCredit', website: 'https://quickcredit.example.com', description: 'Get faster loan approvals by securely sharing your financial history.', category: 'Lending', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', requestedPermissions: [ALL_PERMISSIONS.read_transaction_history, ALL_PERMISSIONS.view_account_balances, ALL_PERMISSIONS.access_income_statements, ALL_PERMISSIONS.access_contact_info] },
];

const MOCK_CONNECTIONS: OpenBankingConnection[] = [
    { id: 1, app: MOCK_AVAILABLE_APPS[0], status: 'active', connectedAt: '2023-08-15T10:30:00Z', expiresAt: '2024-11-15T10:30:00Z', lastAccessedAt: '2023-10-28T14:00:00Z', linkedAccountIds: ['acc_101', 'acc_102'], grantedPermissions: MOCK_AVAILABLE_APPS[0].requestedPermissions, dataSharingFrequency: 'recurring' },
    { id: 2, app: MOCK_AVAILABLE_APPS[1], status: 'active', connectedAt: '2023-01-20T18:00:00Z', expiresAt: '2024-04-20T18:00:00Z', lastAccessedAt: '2023-04-15T09:00:00Z', linkedAccountIds: ['acc_101'], grantedPermissions: MOCK_AVAILABLE_APPS[1].requestedPermissions, dataSharingFrequency: 'recurring' },
    { id: 3, app: MOCK_AVAILABLE_APPS[3], status: 'expired', connectedAt: '2022-05-10T11:00:00Z', expiresAt: '2023-08-10T11:00:00Z', lastAccessedAt: '2022-05-10T11:05:00Z', linkedAccountIds: ['acc_101', 'acc_102'], grantedPermissions: MOCK_AVAILABLE_APPS[3].requestedPermissions, dataSharingFrequency: 'one_time' },
];

const MOCK_HISTORY: ConnectionHistoryEvent[] = [
    { id: 'evt_001', connectionId: 1, appName: 'MintFusion Budgeting', eventType: 'connected', timestamp: '2023-08-15T10:30:00Z', details: 'Access granted to Primary Checking, High-Yield Savings.' },
    { id: 'evt_002', connectionId: 1, appName: 'MintFusion Budgeting', eventType: 'data_accessed', timestamp: '2023-10-28T14:00:00Z', details: 'Transaction history and balances were synced.' },
    { id: 'evt_003', connectionId: 2, appName: 'TaxBot Pro', eventType: 'connected', timestamp: '2023-01-20T18:00:00Z', details: 'Access granted to Primary Checking.' },
    { id: 'evt_004', connectionId: 2, appName: 'TaxBot Pro', eventType: 'data_accessed', timestamp: '2023-04-15T09:00:00Z', details: 'Transaction history and income statements were synced.' },
    { id: 'evt_005', connectionId: 3, appName: 'LendEasy', eventType: 'connected', timestamp: '2022-05-10T11:00:00Z', details: 'Access granted for a one-time credit check.' },
    { id: 'evt_006', connectionId: 3, appName: 'LendEasy', eventType: 'data_accessed', timestamp: '2022-05-10T11:05:00Z', details: 'Financial history was accessed.' },
    { id: 'evt_007', connectionId: 3, appName: 'LendEasy', eventType: 'expired', timestamp: '2023-08-10T11:00:00Z', details: 'Connection expired automatically after 90 days.' },
];

const MOCK_USER_SETTINGS: OpenBankingSettings = {
    defaultConsentDurationDays: 90,
    notifyOnNewConnection: true,
    notifyOnConnectionExpiration: true,
    requireReauthenticationForHighRisk: true,
};

// --- MOCK API LAYER ---

/**
 * A mock API utility to simulate network requests.
 * @param data The data to return on success.
 * @param delay The simulated network delay in milliseconds.
 * @param failureRate The chance of the request failing (0 to 1).
 */
export const mockApi = <T,>(data: T, delay: number = 500, failureRate: number = 0): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < failureRate) {
                reject(new Error("A simulated network error occurred."));
            } else {
                resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation
            }
        }, delay);
    });
};


// --- REUSABLE UI COMPONENTS ---

/**
 * A tooltip for providing extra information on hover.
 */
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative flex items-center ml-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {text}
        </div>
    </div>
);

/**
 * A generic modal component.
 */
export const Modal: FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white tracking-wider">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

/**
 * A skeleton loader for list items.
 */
export const ConnectionSkeleton: FC = () => (
    <div className="p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4 animate-pulse">
        <div className="flex items-start w-full">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 mr-4"></div>
            <div className="w-full">
                <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-3"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
        </div>
        <div className="h-8 bg-gray-700 rounded-lg w-full sm:w-24 flex-shrink-0 self-start sm:self-center mt-2 sm:mt-0"></div>
    </div>
);

/**
 * A styled tag for displaying status.
 */
export const StatusTag: FC<{ status: ConnectionStatus }> = ({ status }) => {
    const statusStyles = {
        active: 'bg-green-500/20 text-green-300',
        expired: 'bg-yellow-500/20 text-yellow-300',
        revoked: 'bg-red-500/20 text-red-300',
        pending: 'bg-blue-500/20 text-blue-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// --- CUSTOM HOOKS ---

/**
 * Custom hook for managing modal visibility state.
 */
export const useDisclosure = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const onOpen = useCallback(() => setIsOpen(true), []);
    const onClose = useCallback(() => setIsOpen(false), []);
    const onToggle = useCallback(() => setIsOpen(prev => !prev), []);
    return { isOpen, onOpen, onClose, onToggle };
};


// --- STATE MANAGEMENT (useReducer) ---

type State = {
    connections: OpenBankingConnection[];
    history: ConnectionHistoryEvent[];
    settings: OpenBankingSettings;
    availableApps: ThirdPartyApp[];
    accounts: BankAccount[];
    isLoading: boolean;
    error: string | null;
    filter: string;
    statusFilter: ConnectionStatus | 'all';
};

type Action =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: { connections: OpenBankingConnection[], history: ConnectionHistoryEvent[], settings: OpenBankingSettings, availableApps: ThirdPartyApp[], accounts: BankAccount[] } }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'REVOKE_CONNECTION'; payload: number }
    | { type: 'ADD_CONNECTION'; payload: { app: ThirdPartyApp; linkedAccountIds: string[]; grantedPermissions: PermissionDetail[] } }
    | { type: 'SET_FILTER'; payload: string }
    | { type: 'SET_STATUS_FILTER'; payload: ConnectionStatus | 'all' }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<OpenBankingSettings> };

const initialState: State = {
    connections: [],
    history: [],
    settings: MOCK_USER_SETTINGS,
    availableApps: [],
    accounts: [],
    isLoading: true,
    error: null,
    filter: '',
    statusFilter: 'all',
};

function openBankingReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, isLoading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, isLoading: false, ...action.payload };
        case 'FETCH_ERROR':
            return { ...state, isLoading: false, error: action.payload };
        case 'REVOKE_CONNECTION': {
            const now = new Date().toISOString();
            return {
                ...state,
                connections: state.connections.map(c =>
                    c.id === action.payload ? { ...c, status: 'revoked' } : c
                ),
                history: [
                    ...state.history,
                    {
                        id: `evt_${Date.now()}`,
                        connectionId: action.payload,
                        appName: state.connections.find(c => c.id === action.payload)?.app.name || 'Unknown App',
                        eventType: 'revoked',
                        timestamp: now,
                        details: 'User revoked access manually.',
                    },
                ],
            };
        }
        case 'ADD_CONNECTION': {
            const { app, linkedAccountIds, grantedPermissions } = action.payload;
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + state.settings.defaultConsentDurationDays);

            const newConnection: OpenBankingConnection = {
                id: Math.max(...state.connections.map(c => c.id), 0) + 1,
                app,
                status: 'active',
                connectedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                lastAccessedAt: null,
                linkedAccountIds,
                grantedPermissions,
                dataSharingFrequency: 'recurring'
            };
            
            const linkedAccountNames = state.accounts
                .filter(acc => linkedAccountIds.includes(acc.id))
                .map(acc => acc.name)
                .join(', ');

            return {
                ...state,
                connections: [newConnection, ...state.connections],
                history: [
                    ...state.history,
                    {
                        id: `evt_${Date.now()}`,
                        connectionId: newConnection.id,
                        appName: app.name,
                        eventType: 'connected',
                        timestamp: newConnection.connectedAt,
                        details: `Access granted to ${linkedAccountNames}.`,
                    }
                ]
            }
        }
        case 'SET_FILTER':
            return { ...state, filter: action.payload };
        case 'SET_STATUS_FILTER':
            return { ...state, statusFilter: action.payload };
        case 'UPDATE_SETTINGS':
            return { ...state, settings: { ...state.settings, ...action.payload } };
        default:
            return state;
    }
}


// --- UTILITY FUNCTIONS ---

/**
 * Formats an ISO date string into a more readable format.
 * @param isoString The date string to format.
 * @returns A formatted date string (e.g., "October 29, 2023").
 */
export const formatDate = (isoString: string | null): string => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Calculates the number of days remaining until a connection expires.
 * @param expiresAt The expiration date string.
 * @returns The number of days remaining.
 */
export const daysUntilExpiration = (expiresAt: string): number => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};


// --- DETAILED CHILD COMPONENTS ---

/**
 * Modal to display the full details of a single connection.
 */
export const ConnectionDetailModal: FC<{ connection: OpenBankingConnection | null; accounts: BankAccount[]; onClose: () => void; }> = ({ connection, accounts, onClose }) => {
    if (!connection) return null;

    const linkedAccounts = accounts.filter(acc => connection.linkedAccountIds.includes(acc.id));

    return (
        <Modal isOpen={!!connection} onClose={onClose} title={`${connection.app.name} Details`}>
            <div className="space-y-6 text-gray-300">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-300 flex-shrink-0">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={connection.app.icon} /></svg>
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold text-white">{connection.app.name}</h4>
                        <p className="text-sm text-gray-400">by {connection.app.developer}</p>
                        <a href={connection.app.website} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                            {connection.app.website}
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-gray-400 text-xs">Status</p>
                        <div className="mt-1"><StatusTag status={connection.status} /></div>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-gray-400 text-xs">Connected On</p>
                        <p className="text-white font-medium">{formatDate(connection.connectedAt)}</p>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-gray-400 text-xs">Expires On</p>
                        <p className="text-white font-medium">{formatDate(connection.expiresAt)}</p>
                    </div>
                </div>

                <div>
                    <h5 className="font-semibold text-white mb-2">Linked Accounts</h5>
                    <ul className="space-y-2">
                        {linkedAccounts.map(acc => (
                            <li key={acc.id} className="p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                <span>{acc.name} ({acc.accountNumberMasked})</span>
                                <span className="text-gray-400">{acc.type.replace('_', ' ')}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h5 className="font-semibold text-white mb-2">Permissions Granted</h5>
                    <ul className="space-y-2">
                        {connection.grantedPermissions.map(p => (
                             <li key={p.key} className="p-3 bg-gray-700/50 rounded-lg">
                                <p className="font-medium text-white">{p.label}</p>
                                <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Modal to confirm revoking access.
 */
export const RevokeConfirmationModal: FC<{ connection: OpenBankingConnection | null; onClose: () => void; onConfirm: (id: number) => void }> = ({ connection, onClose, onConfirm }) => {
    if (!connection) return null;

    return (
        <Modal isOpen={!!connection} onClose={onClose} title="Revoke Access">
            <div className="text-gray-300">
                <p>Are you sure you want to revoke access for <strong className="text-white">{connection.app.name}</strong>?</p>
                <p className="text-sm mt-2 text-gray-400">
                    This action is irreversible. The application will immediately lose all access to your financial data granted through this connection. You can always reconnect it later if you change your mind.
                </p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Cancel</button>
                    <button onClick={() => onConfirm(connection.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                        Yes, Revoke
                    </button>
                </div>
            </div>
        </Modal>
    );
};


/**
 * Wizard for connecting a new third-party application.
 */
export const ConnectNewAppWizard: FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    availableApps: ThirdPartyApp[];
    accounts: BankAccount[];
    onConnect: (payload: { app: ThirdPartyApp; linkedAccountIds: string[]; grantedPermissions: PermissionDetail[] }) => void;
}> = ({ isOpen, onClose, availableApps, accounts, onConnect }) => {
    const [step, setStep] = useState(1);
    const [selectedApp, setSelectedApp] = useState<ThirdPartyApp | null>(null);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    
    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setTimeout(() => {
                setStep(1);
                setSelectedApp(null);
                setSelectedAccountIds([]);
            }, 300); // delay for close animation
        }
    }, [isOpen]);

    const handleSelectApp = (app: ThirdPartyApp) => {
        setSelectedApp(app);
        setStep(2);
    };

    const handleAccountToggle = (accountId: string) => {
        setSelectedAccountIds(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const handleConfirm = () => {
        if (!selectedApp || selectedAccountIds.length === 0) return;
        onConnect({
            app: selectedApp,
            linkedAccountIds: selectedAccountIds,
            grantedPermissions: selectedApp.requestedPermissions,
        });
        setStep(4); // Success step
    };

    const renderStep = () => {
        switch(step) {
            case 1: // Select App
                return (
                    <div>
                        <h4 className="text-white font-semibold mb-4">Choose an application to connect</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableApps.map(app => (
                                <div key={app.id} onClick={() => handleSelectApp(app)} className="p-4 bg-gray-700/50 rounded-lg flex items-start gap-4 cursor-pointer hover:bg-gray-700 transition-colors">
                                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300 flex-shrink-0">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={app.icon} /></svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{app.name}</p>
                                        <p className="text-xs text-gray-400">{app.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2: // Review Permissions
                if (!selectedApp) return null;
                return (
                    <div>
                        <button onClick={() => setStep(1)} className="text-sm text-cyan-400 mb-4">&larr; Back to app selection</button>
                        <h4 className="text-white font-semibold mb-1">
                            {selectedApp.name} is requesting permission to:
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">Review the data this app wants to access.</p>
                        <ul className="space-y-3">
                            {selectedApp.requestedPermissions.map(p => (
                                <li key={p.key} className="p-3 bg-gray-700/50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-white">{p.label}</p>
                                        {p.riskLevel === 'high' && <span className="text-xs px-2 py-1 bg-red-500/30 text-red-300 rounded-full">High Risk</span>}
                                        {p.riskLevel === 'medium' && <span className="text-xs px-2 py-1 bg-yellow-500/30 text-yellow-300 rounded-full">Medium Risk</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setStep(3)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">
                                Next: Select Accounts &rarr;
                            </button>
                        </div>
                    </div>
                );
            case 3: // Select Accounts
                 if (!selectedApp) return null;
                 return (
                    <div>
                        <button onClick={() => setStep(2)} className="text-sm text-cyan-400 mb-4">&larr; Back to permissions</button>
                        <h4 className="text-white font-semibold mb-1">
                            Which accounts do you want to share with {selectedApp.name}?
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">The app will only have access to the accounts you select.</p>
                        <div className="space-y-3">
                            {accounts.map(acc => (
                                <label key={acc.id} className="p-4 bg-gray-700/50 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-gray-700 transition-colors has-[:checked]:bg-cyan-900/50 has-[:checked]:border-cyan-500 border-2 border-transparent">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-cyan-600 focus:ring-cyan-500"
                                        checked={selectedAccountIds.includes(acc.id)}
                                        onChange={() => handleAccountToggle(acc.id)}
                                    />
                                    <div>
                                        <p className="font-semibold text-white">{acc.name}</p>
                                        <p className="text-sm text-gray-400">{acc.accountNumberMasked}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                         <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleConfirm} 
                                disabled={selectedAccountIds.length === 0}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                                Confirm and Connect
                            </button>
                        </div>
                    </div>
                 );
            case 4: // Success
                return (
                    <div className="text-center py-8">
                        <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h4 className="text-2xl font-bold text-white mt-4">Connection Successful!</h4>
                        <p className="text-gray-300 mt-2">
                            You have successfully connected <strong className="text-white">{selectedApp?.name}</strong>. You can now manage this connection from your dashboard.
                        </p>
                        <div className="mt-6">
                            <button onClick={onClose} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">
                                Done
                            </button>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Connect New Application">
            {renderStep()}
        </Modal>
    );
};


/**
 * Main View for Open Banking management.
 */
const OpenBankingView: React.FC = () => {
    const [state, dispatch] = useReducer(openBankingReducer, initialState);
    
    const { 
        isOpen: isDetailsOpen, 
        onOpen: onDetailsOpen, 
        onClose: onDetailsClose 
    } = useDisclosure();
    const { 
        isOpen: isRevokeOpen, 
        onOpen: onRevokeOpen, 
        onClose: onRevokeClose 
    } = useDisclosure();
    const {
        isOpen: isConnectOpen,
        onOpen: onConnectOpen,
        onClose: onConnectClose
    } = useDisclosure();

    const [selectedConnection, setSelectedConnection] = useState<OpenBankingConnection | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            dispatch({ type: 'FETCH_START' });
            try {
                // In a real app, these would be separate API calls.
                const [connections, history, settings, availableApps, accounts] = await Promise.all([
                    mockApi(MOCK_CONNECTIONS),
                    mockApi(MOCK_HISTORY.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())),
                    mockApi(MOCK_USER_SETTINGS),
                    mockApi(MOCK_AVAILABLE_APPS),
                    mockApi(MOCK_ACCOUNTS),
                ]);
                dispatch({ type: 'FETCH_SUCCESS', payload: { connections, history, settings, availableApps, accounts } });
            } catch (error) {
                dispatch({ type: 'FETCH_ERROR', payload: error instanceof Error ? error.message : 'An unknown error occurred' });
            }
        };

        fetchData();
    }, []);

    const handleViewDetails = (connection: OpenBankingConnection) => {
        setSelectedConnection(connection);
        onDetailsOpen();
    };

    const handleRevokeClick = (connection: OpenBankingConnection) => {
        setSelectedConnection(connection);
        onRevokeOpen();
    };

    const handleConfirmRevoke = (id: number) => {
        dispatch({ type: 'REVOKE_CONNECTION', payload: id });
        onRevokeClose();
    };

    const handleConnectNewApp = (payload: { app: ThirdPartyApp; linkedAccountIds: string[]; grantedPermissions: PermissionDetail[] }) => {
        dispatch({ type: 'ADD_CONNECTION', payload });
        // The success step in the modal will handle closing.
    };
    
    const filteredConnections = useMemo(() => {
        return state.connections.filter(c => {
            const matchesSearch = c.app.name.toLowerCase().includes(state.filter.toLowerCase());
            const matchesStatus = state.statusFilter === 'all' || c.status === state.statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [state.connections, state.filter, state.statusFilter]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-white tracking-wider">Open Banking Connections</h2>
                <button onClick={onConnectOpen} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Connect a New App
                </button>
            </div>

            <Card title="What is Open Banking?">
                <p className="text-gray-300 text-sm">
                    Open Banking is a secure way to give trusted third-party apps access to your financial information without ever sharing your login credentials. You are always in control, and you can revoke access at any time. This allows you to use powerful apps for budgeting, tax preparation, and more.
                </p>
            </Card>
            
            <Card title="Your Connected Applications">
                <div className="mb-4 flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by app name..."
                        value={state.filter}
                        onChange={(e) => dispatch({ type: 'SET_FILTER', payload: e.target.value })}
                        className="w-full sm:w-1/2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <select
                        value={state.statusFilter}
                        onChange={(e) => dispatch({ type: 'SET_STATUS_FILTER', payload: e.target.value as ConnectionStatus | 'all' })}
                        className="w-full sm:w-auto px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="revoked">Revoked</option>
                    </select>
                </div>
                
                <div className="space-y-4">
                    {state.isLoading && Array.from({ length: 3 }).map((_, i) => <ConnectionSkeleton key={i} />)}
                    
                    {!state.isLoading && state.error && (
                        <div className="p-4 text-center text-red-400 bg-red-500/10 rounded-lg">
                            <p><strong>Error:</strong> {state.error}</p>
                            <p className="text-sm">Could not load your connections. Please try again later.</p>
                        </div>
                    )}
                    
                    {!state.isLoading && !state.error && filteredConnections.map(conn => (
                        <div key={conn.id} className="p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start">
                                <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300 flex-shrink-0 mr-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={conn.app.icon} /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">{conn.app.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StatusTag status={conn.status} />
                                        {conn.status === 'active' && <p className="text-xs text-gray-400">Expires in {daysUntilExpiration(conn.expiresAt)} days</p>}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">Permissions granted: {conn.grantedPermissions.length}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-shrink-0 self-start sm:self-center">
                                <button onClick={() => handleViewDetails(conn)} className="px-3 py-2 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg text-xs w-full sm:w-auto">View Details</button>
                                {conn.status === 'active' && (
                                    <button onClick={() => handleRevokeClick(conn)} className="px-3 py-2 bg-red-600/50 hover:bg-red-600 text-white rounded-lg text-xs w-full sm:w-auto">Revoke Access</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!state.isLoading && filteredConnections.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                            {state.connections.length > 0 ? "No connections match your filters." : "You have not connected any third-party applications."}
                        </p>
                    )}
                </div>
            </Card>

            <Card title="Connection History" isCollapsible defaultCollapsed>
                <div className="text-sm text-gray-300 space-y-3 max-h-96 overflow-y-auto pr-2">
                    {state.history.map(event => (
                        <div key={event.id} className="flex gap-4 items-start">
                            <div className="text-xs text-gray-500 whitespace-nowrap pt-1">
                                {formatDate(event.timestamp)}
                            </div>
                            <div className="flex-grow pb-3 border-b border-gray-800">
                                <p className="font-semibold text-white">{event.appName} - {event.eventType.replace('_', ' ')}</p>
                                <p className="text-gray-400">{event.details}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Learn More About Your Control" isCollapsible defaultCollapsed>
                 <div className="text-sm text-gray-300 space-y-2">
                    <p><strong className="text-white">Your Credentials are Safe:</strong> You never share your bank login details with third-party apps. Instead, you authorize access directly with us, your bank.</p>
                    <p><strong className="text-white">You are in Command:</strong> You can see a full list of every app you've granted access to right here. If you no longer use an app, you can revoke its access with a single click.</p>
                 </div>
            </Card>

            {/* Modals */}
            <ConnectionDetailModal connection={selectedConnection} accounts={state.accounts} onClose={() => { onDetailsClose(); setSelectedConnection(null); }} />
            <RevokeConfirmationModal connection={selectedConnection} onConfirm={handleConfirmRevoke} onClose={() => { onRevokeClose(); setSelectedConnection(null); }} />
            <ConnectNewAppWizard isOpen={isConnectOpen} onClose={onConnectClose} availableApps={state.availableApps} accounts={state.accounts} onConnect={handleConnectNewApp} />
        </div>
    );
};

export default OpenBankingView;
