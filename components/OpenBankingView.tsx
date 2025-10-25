import React, { useState, useEffect, useCallback, useMemo, FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from './Card';

// ================================================================================================
// THE DEMOCRATIZATION MANIFESTO & GLOBAL TYPES
// ================================================================================================
// This isn't just a React component library. It's a statement. For too long, accessing the financial
// nervous system of the world has been a privilege. This code is a sledgehammer to that moat.
// We are democratizing access to the financial ecosystem.
// This is more than code. It's a transfer of power from the few to the many. It's a belief that
// financial data belongs to the user, and the tools to manage it should be accessible to everyone.
// Welcome to the revolution.

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'pending';

export interface BankAccount {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit_card';
    accountNumberMasked: string;
    balance: number;
    currency: 'USD';
}

export interface PermissionDetail {
    key: string;
    label: string;
    description: string;
    category: 'Account Information' | 'Payment Initiation' | 'Data Analysis';
    riskLevel: 'low' | 'medium' | 'high';
}

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

export interface ConnectionHistoryEvent {
    id: string;
    connectionId: number;
    appName: string;
    eventType: 'connected' | 'revoked' | 'expired' | 'data_accessed' | 'permissions_updated';
    timestamp: string; // ISO 8601 Date string
    details: string;
}

export interface OpenBankingSettings {
    defaultConsentDurationDays: 90 | 180 | 365;
    notifyOnNewConnection: boolean;
    notifyOnConnectionExpiration: boolean;
    requireReauthenticationForHighRisk: boolean;
}

interface OpenBankingDashboardData {
    openBankingDashboard: {
        connections: OpenBankingConnection[];
        history: ConnectionHistoryEvent[];
        settings: OpenBankingSettings;
        availableApps: ThirdPartyApp[];
        accounts: BankAccount[];
    };
}

// --- GraphQL & SERVICE LAYER ---

const GET_OPEN_BANKING_DASHBOARD = `
  query GetOpenBankingDashboard {
    openBankingDashboard {
      connections {
        id
        app { id name description developer website category icon requestedPermissions { key label description category riskLevel } }
        status
        connectedAt
        expiresAt
        lastAccessedAt
        linkedAccountIds
        grantedPermissions { key label description category riskLevel }
        dataSharingFrequency
      }
      history {
        id
        connectionId
        appName
        eventType
        timestamp
        details
      }
      settings {
        defaultConsentDurationDays
        notifyOnNewConnection
        notifyOnConnectionExpiration
        requireReauthenticationForHighRisk
      }
      availableApps {
        id
        name
        description
        developer
        website
        category
        icon
        requestedPermissions { key label description category riskLevel }
      }
      accounts {
        id
        name
        type
        accountNumberMasked
        balance
        currency
      }
    }
  }
`;

const REVOKE_CONNECTION_MUTATION = `
  mutation RevokeConnection($connectionId: ID!) {
    revokeOpenBankingConnection(connectionId: $connectionId) {
      id
      status
    }
  }
`;

const ADD_CONNECTION_MUTATION = `
  mutation AddConnection($appId: ID!, $linkedAccountIds: [ID!]!, $grantedPermissionKeys: [String!]!) {
    addOpenBankingConnection(appId: $appId, linkedAccountIds: $linkedAccountIds, grantedPermissionKeys: $grantedPermissionKeys) {
      id
      status
      app { name }
    }
  }
`;

const graphqlClient = {
  request: async <T>(query: string, variables?: object) => {
    const response = await fetch('/graphql', { // Assuming /graphql is the endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(errors.map((e: any) => e.message).join('\n'));
    return data as T;
  }
};

const openBankingService = {
  getDashboardData: (): Promise<OpenBankingDashboardData> => graphqlClient.request<OpenBankingDashboardData>(GET_OPEN_BANKING_DASHBOARD),
  revokeConnection: (connectionId: number) => graphqlClient.request<any>(REVOKE_CONNECTION_MUTATION, { connectionId: connectionId.toString() }),
  addConnection: (variables: { appId: string, linkedAccountIds: string[], grantedPermissionKeys: string[] }) => graphqlClient.request<any>(ADD_CONNECTION_MUTATION, variables),
};


// --- CUSTOM HOOKS using @tanstack/react-query ---

const useOpenBankingDashboard = () => {
    return useQuery<OpenBankingDashboardData, Error>({
        queryKey: ['openBankingDashboard'],
        queryFn: openBankingService.getDashboardData,
    });
};

const useRevokeConnection = () => {
    const queryClient = useQueryClient();
    return useMutation<any, Error, number>({
        mutationFn: openBankingService.revokeConnection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['openBankingDashboard'] });
        },
    });
};

const useAddConnection = () => {
    const queryClient = useQueryClient();
    return useMutation<any, Error, { appId: string, linkedAccountIds: string[], grantedPermissionKeys: string[] }>({
        mutationFn: openBankingService.addConnection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['openBankingDashboard'] });
        }
    });
};


// --- REUSABLE UI COMPONENTS ---

const InfoTooltip: FC<{ text: string }> = ({ text }) => (
    <div className="group relative flex items-center ml-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {text}
        </div>
    </div>
);

export const Modal: FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white tracking-wider">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

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

export const useDisclosure = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const onOpen = useCallback(() => setIsOpen(true), []);
    const onClose = useCallback(() => setIsOpen(false), []);
    const onToggle = useCallback(() => setIsOpen(prev => !prev), []);
    return { isOpen, onOpen, onClose, onToggle };
};

// --- UTILITY FUNCTIONS ---

export const formatDate = (isoString: string | null): string => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export const daysUntilExpiration = (expiresAt: string): number => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};


// --- DETAILED CHILD COMPONENTS ---

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
                        <a href={connection.app.website} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">{connection.app.website}</a>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700/50 p-3 rounded-lg"><p className="text-gray-400 text-xs">Status</p><div className="mt-1"><StatusTag status={connection.status} /></div></div>
                    <div className="bg-gray-700/50 p-3 rounded-lg"><p className="text-gray-400 text-xs">Connected On</p><p className="text-white font-medium">{formatDate(connection.connectedAt)}</p></div>
                    <div className="bg-gray-700/50 p-3 rounded-lg"><p className="text-gray-400 text-xs">Expires On</p><p className="text-white font-medium">{formatDate(connection.expiresAt)}</p></div>
                </div>
                <div>
                    <h5 className="font-semibold text-white mb-2">Linked Accounts</h5>
                    <ul className="space-y-2">{linkedAccounts.map(acc => (<li key={acc.id} className="p-3 bg-gray-700/50 rounded-lg flex justify-between items-center"><span>{acc.name} ({acc.accountNumberMasked})</span><span className="text-gray-400">{acc.type.replace('_', ' ')}</span></li>))}</ul>
                </div>
                <div>
                    <h5 className="font-semibold text-white mb-2">Permissions Granted</h5>
                    <ul className="space-y-2">{connection.grantedPermissions.map(p => (<li key={p.key} className="p-3 bg-gray-700/50 rounded-lg"><p className="font-medium text-white">{p.label}</p><p className="text-xs text-gray-400 mt-1">{p.description}</p></li>))}</ul>
                </div>
            </div>
        </Modal>
    );
};

export const RevokeConfirmationModal: FC<{ connection: OpenBankingConnection | null; onClose: () => void; onConfirm: (id: number) => void }> = ({ connection, onClose, onConfirm }) => {
    if (!connection) return null;
    return (
        <Modal isOpen={!!connection} onClose={onClose} title="Revoke Access">
            <div className="text-gray-300">
                <p>Are you sure you want to revoke access for <strong className="text-white">{connection.app.name}</strong>?</p>
                <p className="text-sm mt-2 text-gray-400">This action is irreversible. The application will immediately lose all access to your financial data. You can always reconnect it later.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Cancel</button>
                    <button onClick={() => onConfirm(connection.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Yes, Revoke</button>
                </div>
            </div>
        </Modal>
    );
};

export const ConnectNewAppWizard: FC<{ isOpen: boolean; onClose: () => void; availableApps: ThirdPartyApp[]; accounts: BankAccount[]; onConnect: (payload: { appId: string; linkedAccountIds: string[]; grantedPermissionKeys: string[] }) => void; }> = ({ isOpen, onClose, availableApps, accounts, onConnect }) => {
    const [step, setStep] = useState(1);
    const [selectedApp, setSelectedApp] = useState<ThirdPartyApp | null>(null);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    
    useEffect(() => { if (!isOpen) { setTimeout(() => { setStep(1); setSelectedApp(null); setSelectedAccountIds([]); }, 300); } }, [isOpen]);
    const handleSelectApp = (app: ThirdPartyApp) => { setSelectedApp(app); setStep(2); };
    const handleAccountToggle = (accountId: string) => setSelectedAccountIds(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
    const handleConfirm = () => { if (!selectedApp || selectedAccountIds.length === 0) return; onConnect({ appId: selectedApp.id, linkedAccountIds: selectedAccountIds, grantedPermissionKeys: selectedApp.requestedPermissions.map(p => p.key) }); setStep(4); };

    const renderStep = () => {
        switch(step) {
            case 1: 
                return <div><h4 className="text-white font-semibold mb-4">Choose an application to connect</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{availableApps.map(app => (<div key={app.id} onClick={() => handleSelectApp(app)} className="p-4 bg-gray-700/50 rounded-lg flex items-start gap-4 cursor-pointer hover:bg-gray-700 transition-colors"><div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300 flex-shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={app.icon} /></svg></div><div><p className="font-semibold text-white">{app.name}</p><p className="text-xs text-gray-400">by {app.developer}</p></div></div>))}</div></div>;
            case 2: 
                if (!selectedApp) return null;
                return <div><button onClick={() => setStep(1)} className="text-sm text-cyan-400 mb-4">&larr; Back to app selection</button><h4 className="text-white font-semibold mb-1">{selectedApp.name} is requesting permission to:</h4><p className="text-sm text-gray-400 mb-4">Review the data this app wants to access.</p><ul className="space-y-3">{selectedApp.requestedPermissions.map(p => (<li key={p.key} className="p-3 bg-gray-700/50 rounded-lg"><div className="flex justify-between items-start"><p className="font-medium text-white">{p.label}</p>{p.riskLevel === 'high' && <span className="text-xs px-2 py-1 bg-red-500/30 text-red-300 rounded-full">High Risk</span>}{p.riskLevel === 'medium' && <span className="text-xs px-2 py-1 bg-yellow-500/30 text-yellow-300 rounded-full">Medium Risk</span>}</div><p className="text-xs text-gray-400 mt-1">{p.description}</p></li>))}</ul><div className="mt-6 flex justify-end"><button onClick={() => setStep(3)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Next: Select Accounts &rarr;</button></div></div>;
            case 3: 
                 if (!selectedApp) return null;
                 return <div><button onClick={() => setStep(2)} className="text-sm text-cyan-400 mb-4">&larr; Back to permissions</button><h4 className="text-white font-semibold mb-1">Which accounts do you want to share with {selectedApp.name}?</h4><p className="text-sm text-gray-400 mb-4">The app will only have access to the accounts you select.</p><div className="space-y-3">{accounts.map(acc => (<label key={acc.id} className="p-4 bg-gray-700/50 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-gray-700 transition-colors has-[:checked]:bg-cyan-900/50 has-[:checked]:border-cyan-500 border-2 border-transparent"><input type="checkbox" className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-cyan-600 focus:ring-cyan-500" checked={selectedAccountIds.includes(acc.id)} onChange={() => handleAccountToggle(acc.id)} /><div><p className="font-semibold text-white">{acc.name}</p><p className="text-sm text-gray-400">{acc.accountNumberMasked}</p></div></label>))}</div><div className="mt-6 flex justify-end"><button onClick={handleConfirm} disabled={selectedAccountIds.length === 0} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">Confirm and Connect</button></div></div>;
            case 4: 
                return <div className="text-center py-8"><svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h4 className="text-2xl font-bold text-white mt-4">Connection Successful!</h4><p className="text-gray-300 mt-2">You have successfully connected <strong className="text-white">{selectedApp?.name}</strong>.</p><div className="mt-6"><button onClick={onClose} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Done</button></div></div>;
        }
    };
    
    return <Modal isOpen={isOpen} onClose={onClose} title="Connect New Application">{renderStep()}</Modal>;
};


// --- MAIN VIEW COMPONENT ---

const OpenBankingView: React.FC = () => {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>('all');
    const [selectedConnection, setSelectedConnection] = useState<OpenBankingConnection | null>(null);

    const { data, isLoading, error } = useOpenBankingDashboard();
    const { mutate: revokeConnection } = useRevokeConnection();
    const { mutate: addConnection } = useAddConnection();
    
    const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
    const { isOpen: isRevokeOpen, onOpen: onRevokeOpen, onClose: onRevokeClose } = useDisclosure();
    const { isOpen: isConnectOpen, onOpen: onConnectOpen, onClose: onConnectClose } = useDisclosure();

    const { connections = [], history = [], settings, availableApps = [], accounts = [] } = data?.openBankingDashboard || {};

    const handleViewDetails = (connection: OpenBankingConnection) => {
        setSelectedConnection(connection);
        onDetailsOpen();
    };

    const handleRevokeClick = (connection: OpenBankingConnection) => {
        setSelectedConnection(connection);
        onRevokeOpen();
    };

    const handleConfirmRevoke = (id: number) => {
        revokeConnection(id, { onSuccess: onRevokeClose });
    };

    const handleConnectNewApp = (payload: { appId: string, linkedAccountIds: string[], grantedPermissionKeys: string[] }) => {
        addConnection(payload, { onSuccess: onConnectClose });
    };
    
    const filteredConnections = useMemo(() => {
        return connections.filter(c => {
            const matchesSearch = c.app.name.toLowerCase().includes(filter.toLowerCase());
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [connections, filter, statusFilter]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-white tracking-wider">Open Banking Connections</h2>
                <button onClick={onConnectOpen} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Connect a New App
                </button>
            </div>

            <Card title="What is Open Banking?">
                <p className="text-gray-300 text-sm">Open Banking is a secure way to give trusted third-party apps access to your financial information without ever sharing your login credentials. You are always in control, and you can revoke access at any time.</p>
            </Card>
            
            <Card title="Your Connected Applications">
                <div className="mb-4 flex flex-col sm:flex-row gap-4">
                    <input type="text" placeholder="Search by app name..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:w-1/2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | 'all')} className="w-full sm:w-auto px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="revoked">Revoked</option>
                    </select>
                </div>
                
                <div className="space-y-4">
                    {isLoading && Array.from({ length: 3 }).map((_, i) => <ConnectionSkeleton key={i} />)}
                    {!isLoading && error && <div className="p-4 text-center text-red-400 bg-red-500/10 rounded-lg"><p><strong>Error:</strong> {error.message}</p></div>}
                    {!isLoading && !error && filteredConnections.map(conn => (
                        <div key={conn.id} className="p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start">
                                <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300 flex-shrink-0 mr-4"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={conn.app.icon} /></svg></div>
                                <div>
                                    <h4 className="font-semibold text-white">{conn.app.name}</h4>
                                    <div className="flex items-center gap-2 mt-1"><StatusTag status={conn.status} />{conn.status === 'active' && <p className="text-xs text-gray-400">Expires in {daysUntilExpiration(conn.expiresAt)} days</p>}</div>
                                    <p className="text-sm text-gray-400 mt-2">Permissions granted: {conn.grantedPermissions.length}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-shrink-0 self-start sm:self-center">
                                <button onClick={() => handleViewDetails(conn)} className="px-3 py-2 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg text-xs w-full sm:w-auto">View Details</button>
                                {conn.status === 'active' && <button onClick={() => handleRevokeClick(conn)} className="px-3 py-2 bg-red-600/50 hover:bg-red-600 text-white rounded-lg text-xs w-full sm:w-auto">Revoke Access</button>}
                            </div>
                        </div>
                    ))}
                    {!isLoading && filteredConnections.length === 0 && <p className="text-gray-500 text-center py-8">{connections.length > 0 ? "No connections match your filters." : "You have not connected any third-party applications."}</p>}
                </div>
            </Card>

            <Card title="Connection History" isCollapsible defaultCollapsed>
                <div className="text-sm text-gray-300 space-y-3 max-h-96 overflow-y-auto pr-2">
                    {history.map(event => (
                        <div key={event.id} className="flex gap-4 items-start">
                            <div className="text-xs text-gray-500 whitespace-nowrap pt-1">{formatDate(event.timestamp)}</div>
                            <div className="flex-grow pb-3 border-b border-gray-800"><p className="font-semibold text-white">{event.appName} - {event.eventType.replace('_', ' ')}</p><p className="text-gray-400">{event.details}</p></div>
                        </div>
                    ))}
                </div>
            </Card>

            <ConnectionDetailModal connection={selectedConnection} accounts={accounts} onClose={() => { onDetailsClose(); setSelectedConnection(null); }} />
            <RevokeConfirmationModal connection={selectedConnection} onConfirm={handleConfirmRevoke} onClose={() => { onRevokeClose(); setSelectedConnection(null); }} />
            <ConnectNewAppWizard isOpen={isConnectOpen} onClose={onConnectClose} availableApps={availableApps} accounts={accounts} onConnect={handleConnectNewApp} />
        </div>
    );
};

export default OpenBankingView;
