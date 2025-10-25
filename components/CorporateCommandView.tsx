import React, { useState, useMemo, FC, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Card from './Card';
import type { CorporateCard, CorporateTransaction, CorporateCardControls } from '../types';
import { gql } from 'graphql-request'; // Use a lightweight client for demonstration

// ================================================================================================
// GRAPHQL & SERVICE LAYER
// This section defines the interactions with the GraphQL supergraph.
// ================================================================================================

// A lightweight GraphQL client function. In a real app, this would be a shared utility.
const graphqlRequest = async <T, V>(query: string, variables?: V): Promise<T> => {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(errors.map((e: any) => e.message).join('\n'));
    return data;
};

// --- Queries & Mutations ---

const GET_CORPORATE_DATA_QUERY = gql`
  query GetCorporateDashboard {
    userData {
      corporateData {
        cards {
          id
          holderName
          cardNumberMask
          status
          frozen
          controls {
            atm
            contactless
            online
            monthlyLimit
          }
        }
        transactions {
          id
          cardId
          holderName
          merchant
          amount
          status
          timestamp
        }
        aiAnomalyInsight
      }
    }
  }
`;

const UPDATE_CARD_CONTROLS_MUTATION = gql`
  mutation UpdateCorporateCardControls($input: UpdateCorporateCardInput!) {
    updateCorporateCard(input: $input) {
      id
      frozen
      controls {
        atm
        contactless
        online
        monthlyLimit
      }
    }
  }
`;

const INITIATE_PAYMENT_MUTATION = gql`
  mutation InitiateCorporatePayment($input: InitiateCorporatePaymentInput!) {
    initiateCorporatePayment(input: $input) {
      workflowId
      initialStatus
    }
  }
`;

const GET_ANOMALY_INSIGHT_MUTATION = gql`
  mutation GetCorporateAnomalyInsight {
    getCorporateAnomalyInsight {
        insight
    }
  }
`;

// --- Type Definitions for GraphQL Payloads ---

interface CorporateDataPayload {
    userData: {
        corporateData: {
            cards: CorporateCard[];
            transactions: CorporateTransaction[];
            aiAnomalyInsight: string | null;
        }
    }
}

interface UpdateCardInput {
    cardId: string;
    frozen?: boolean;
    controls?: Partial<CorporateCardControls>;
}

interface InitiatePaymentInput {
    amount: number;
    description: string;
    type: 'ACH' | 'Wire';
}

// --- Custom Hooks for Data Fetching & Mutations ---

const useCorporateData = () => {
    return useQuery<CorporateDataPayload, Error>({
        queryKey: ['corporateData'],
        queryFn: () => graphqlRequest(GET_CORPORATE_DATA_QUERY),
        staleTime: 1000 * 60, // 1 minute
    });
};

const useUpdateCardControls = () => {
    const queryClient = useQueryClient();
    return useMutation<any, Error, UpdateCardInput>({
        mutationFn: (input) => graphqlRequest(UPDATE_CARD_CONTROLS_MUTATION, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['corporateData'] });
        },
    });
};

const useInitiatePayment = () => {
    const queryClient = useQueryClient();
    return useMutation<any, Error, InitiatePaymentInput>({
        mutationFn: (input) => graphqlRequest(INITIATE_PAYMENT_MUTATION, { input }),
        onSuccess: () => {
            // A more sophisticated implementation might use the workflowId to optimistically
            // add a "pending" transaction to the list before invalidating.
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['corporateData'] }), 2000); // Delay invalidation to allow workflow to start
        },
    });
};

const useAnomalyInsight = () => {
    const queryClient = useQueryClient();
    return useMutation<any, Error, void>({
        mutationFn: () => graphqlRequest(GET_ANOMALY_INSIGHT_MUTATION),
        onSuccess: (data) => {
            const insight = data?.getCorporateAnomalyInsight?.insight;
            // Optimistically update the cache with the new insight
            queryClient.setQueryData(['corporateData'], (oldData: CorporateDataPayload | undefined) => {
                if (oldData && oldData.userData && oldData.userData.corporateData) {
                    return {
                        ...oldData,
                        userData: {
                            ...oldData.userData,
                            corporateData: {
                                ...oldData.userData.corporateData,
                                aiAnomalyInsight: insight
                            }
                        }
                    };
                }
                return oldData;
            });
        },
    });
};


// ================================================================================================
// SUB-COMPONENTS (Mostly Presentational)
// ================================================================================================

const NewPaymentModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onInitiate: (details: InitiatePaymentInput) => void;
    isPending: boolean;
}> = ({ isOpen, onClose, onInitiate, isPending }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'ACH' | 'Wire'>('ACH');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (amount && description) {
            onInitiate({ amount: parseFloat(amount), description, type });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700"><h3 className="text-lg font-semibold text-white">Initiate New Payment Workflow</h3></div>
                <div className="p-6 space-y-4">
                    <p className="text-xs text-gray-400">This action will start a durable, auditable payment workflow managed by our orchestration engine.</p>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g., Vendor Payment)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                    <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white"><option>ACH</option><option>Wire</option></select>
                    <button onClick={handleSubmit} disabled={isPending} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50">
                        {isPending ? 'Submitting...' : 'Submit Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CorporateCardDetailModal: FC<{
    card: CorporateCard | null;
    onClose: () => void;
    onSave: (id: string, controls: Partial<CorporateCardControls>, frozen: boolean) => void;
    isPending: boolean;
}> = ({ card, onClose, onSave, isPending }) => {
    const [controls, setControls] = useState<Partial<CorporateCardControls> | null>(card?.controls || null);
    const [isFrozen, setIsFrozen] = useState(card?.frozen || false);

    useEffect(() => {
        setControls(card?.controls || null);
        setIsFrozen(card?.frozen || false);
    }, [card]);

    if (!card || !controls) return null;

    const handleControlChange = (key: keyof CorporateCardControls, value: any) => {
        setControls(prev => prev ? { ...prev, [key]: value } : null);
    };

    const handleSaveChanges = () => {
        if (controls) {
            onSave(card.id, controls, isFrozen);
            // Don't close immediately; wait for mutation to succeed. Let parent handle closure.
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{card.holderName}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                     <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg"><span className="text-sm text-gray-300">Freeze Card</span><input type="checkbox" checked={isFrozen} onChange={() => setIsFrozen(!isFrozen)} className="toggle toggle-sm toggle-cyan" /></div>
                     <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg"><span className="text-sm text-gray-300">ATM Withdrawals</span><input type="checkbox" checked={controls.atm} onChange={e => handleControlChange('atm', e.target.checked)} className="toggle toggle-sm toggle-cyan" /></div>
                     <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg"><span className="text-sm text-gray-300">Contactless Payments</span><input type="checkbox" checked={controls.contactless} onChange={e => handleControlChange('contactless', e.target.checked)} className="toggle toggle-sm toggle-cyan" /></div>
                     <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg"><span className="text-sm text-gray-300">Online Purchases</span><input type="checkbox" checked={controls.online} onChange={e => handleControlChange('online', e.target.checked)} className="toggle toggle-sm toggle-cyan" /></div>
                     <div className="p-2 bg-gray-900/50 rounded-lg">
                        <label className="block text-sm text-gray-300 mb-1">Monthly Limit</label>
                        <input type="number" value={controls.monthlyLimit} onChange={(e) => handleControlChange('monthlyLimit', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-1 text-white" />
                     </div>
                     <button onClick={handleSaveChanges} disabled={isPending} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50">
                        {isPending ? 'Saving...' : 'Save Changes'}
                     </button>
                </div>
            </div>
        </div>
    );
};

const StatusBadge: FC<{ status: CorporateCard['status'], frozen: boolean }> = ({ status, frozen }) => {
    if (frozen) {
        return <span className={`px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300`}>Frozen</span>;
    }
    const colors = {
        Active: 'bg-green-500/20 text-green-300',
        Suspended: 'bg-yellow-500/20 text-yellow-300',
        Lost: 'bg-red-500/20 text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

// ================================================================================================
// MAIN COMPONENT (Refactored to use GraphQL hooks)
// ================================================================================================

const CorporateCommandViewInternal: FC = () => {
    const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // --- Data fetching hooks ---
    const { data, isLoading, isError, error } = useCorporateData();
    const updateCardMutation = useUpdateCardControls();
    const initiatePaymentMutation = useInitiatePayment();
    const anomalyInsightMutation = useAnomalyInsight();

    const corporateData = data?.userData?.corporateData;

    // --- Event Handlers ---
    const handleSaveCard = (id: string, controls: Partial<CorporateCardControls>, frozen: boolean) => {
        updateCardMutation.mutate({ cardId: id, controls, frozen }, {
            onSuccess: () => setSelectedCard(null) // Close modal on success
        });
    };

    const handleInitiatePayment = (details: InitiatePaymentInput) => {
        initiatePaymentMutation.mutate(details);
    };

    const generateInsight = () => {
        anomalyInsightMutation.mutate();
    };

    // Memoize sorted transactions for performance
    const sortedTransactions = useMemo(() => {
        return [...(corporateData?.transactions || [])].sort((a, b) => {
            // A simple way to sort "2m ago" vs "1h ago" is not feasible without parsing,
            // so we'll just sort by ID for stable-ish ordering in this mock.
            // A real API would provide a real timestamp.
            return b.id.localeCompare(a.id);
        });
    }, [corporateData?.transactions]);
    
    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white tracking-wider">Corporate Command Center</h2>
                     <div className="flex gap-2">
                        <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg text-sm">New Payment</button>
                        <button onClick={() => alert("Opening form to issue a new card...")} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-sm">Issue New Card</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Corporate Card Management" isLoading={isLoading} errorState={isError ? error.message : null} padding="none">
                            <div className="divide-y divide-gray-700/50 max-h-[45vh] overflow-y-auto">
                                {corporateData?.cards.map(card => (
                                    <div key={card.id} onClick={() => setSelectedCard(card)} className="p-4 space-y-3 hover:bg-gray-800/50 cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-white">{card.holderName}</h4>
                                                <p className="text-sm text-gray-400 font-mono">**** **** **** {card.cardNumberMask}</p>
                                            </div>
                                            <StatusBadge status={card.status} frozen={card.frozen} />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                             <div className="text-gray-300 text-xs">Monthly Limit: <span className="font-semibold text-white">${card.controls.monthlyLimit.toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="AI Anomaly Detection">
                            {anomalyInsightMutation.isPending ? <p className="text-gray-400 text-sm">Analyzing transactions...</p> : 
                             corporateData?.aiAnomalyInsight ? <p className="text-gray-300 text-sm italic">"{corporateData.aiAnomalyInsight}"</p> :
                             <button onClick={generateInsight} className="w-full text-center py-2 px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-sm font-medium transition-colors">Scan Transactions</button>
                            }
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card title="Real-Time Transaction Feed" isLoading={isLoading} className="max-h-[80vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto space-y-3">
                            {sortedTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center p-1 rounded-md hover:bg-gray-800/50">
                                    <div className={`w-2 h-2 mr-3 rounded-full ${tx.status === 'Approved' ? 'bg-green-500' : tx.status === 'Pending' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm">
                                            <p className="font-semibold text-white">{tx.merchant}</p>
                                            <p className="font-mono text-white">${tx.amount.toFixed(2)}</p>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <p className="text-gray-400">{tx.holderName}</p>
                                            <p className="text-gray-500">{tx.status}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </Card>
                    </div>
                </div>
                 <style>{`.toggle-cyan:checked { background-color: #06b6d4; }`}</style>
            </div>

            {selectedCard && <CorporateCardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} onSave={handleSaveCard} isPending={updateCardMutation.isPending} />}
            <NewPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onInitiate={handleInitiatePayment} isPending={initiatePaymentMutation.isPending} />
        </>
    );
};

// ================================================================================================
// WRAPPER COMPONENT WITH QUERY CLIENT PROVIDER
// ================================================================================================
const queryClient = new QueryClient();
const CorporateCommandView: FC = () => (
    <QueryClientProvider client={queryClient}>
        <CorporateCommandViewInternal />
    </QueryClientProvider>
);

export default CorporateCommandView;
