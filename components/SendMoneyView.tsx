import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Card from './Card';
import { View } from '../types';

// ================================================================================================
// GRAPHQL & SERVICE LAYER (NEW ARCHITECTURE)
// ================================================================================================

// In a real application, this would be in a dedicated features/transactions folder.
const SEND_MONEY_MUTATION = `
  mutation SendMoney($input: SendMoneyInput!) {
    sendMoney(input: $input) {
      workflowId
      status
    }
  }
`;

interface SendMoneyInput {
  recipientId: string;
  recipientName: string;
  amount: number;
  currency: string;
  rail: PaymentRail;
}

interface SendMoneyResponse {
  sendMoney: {
    workflowId: string;
    status: 'STARTED' | 'PENDING';
  };
}

/**
 * API function to call the GraphQL gateway for sending money.
 * This triggers a durable workflow on the backend.
 */
const sendMoneyApi = async (input: SendMoneyInput): Promise<SendMoneyResponse> => {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // Auth headers would be added here
    body: JSON.stringify({
      query: SEND_MONEY_MUTATION,
      variables: { input },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown network error occurred' }));
    throw new Error(errorBody.errors?.[0]?.message || `Request failed with status ${response.status}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors.map((e: any) => e.message).join('\n'));
  }

  return data;
};

/**
 * Custom hook to encapsulate the send money mutation logic.
 */
const useSendMoney = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMoneyApi,
    onSuccess: (data) => {
      console.log(`Payment workflow started successfully: ${data.sendMoney.workflowId}`);
      // Invalidate queries that reflect user's balance and transactions.
      // The backend workflow will eventually update the state, and this refetch will show it.
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
    onError: (error: Error) => {
      console.error("Send money mutation failed:", error.message);
      // A user-facing notification/toast would be triggered here.
    },
  });
};


// ================================================================================================
// REMITRAX PLATFORM WIDE TYPE DEFINITIONS
// These types reflect the highly advanced, multi-dimensional nature of its operations.
// ================================================================================================

export type PaymentRail = 'quantumpay' | 'cashapp' | 'swift_global' | 'blockchain_dlt' | 'interstellar_p2p' | 'neuro_link' | 'ai_contract_escrow';

export interface RemitraxRecipientProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  quantumTag?: string;
  cashtag?: string;
}

interface SendMoneyViewProps {
  setActiveView: (view: View) => void;
}

// ================================================================================================
// ANIMATED UI SUB-COMPONENTS
// ================================================================================================

export const AnimatedCheckmarkIcon: React.FC = () => (
    <>
        <svg className="h-24 w-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
        <style>{`
            .checkmark__circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 3;
                stroke-miterlimit: 10;
                stroke: #4ade80;
                fill: none;
                animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                stroke-width: 4;
                stroke: #fff;
                animation: stroke-check 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke-circle {
                100% { stroke-dashoffset: 0; }
            }
            @keyframes stroke-check {
                100% { stroke-dashoffset: 0; }
            }
        `}</style>
    </>
);

export const QuantumLedgerAnimation: React.FC = () => (
    <>
        <div className="quantum-grid">
            {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="quantum-block" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
        </div>
        <style>{`
            .quantum-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                width: 120px;
                height: 120px;
            }
            .quantum-block {
                background-color: rgba(6, 182, 212, 0.2);
                border: 1px solid #06b6d4;
                border-radius: 2px;
                animation: quantum-pulse 2.5s infinite ease-in-out;
            }
            @keyframes quantum-pulse {
                0%, 100% { background-color: rgba(6, 182, 212, 0.2); transform: scale(1); }
                50% { background-color: rgba(165, 243, 252, 0.7); transform: scale(1.1); }
            }
        `}</style>
    </>
);

// The main component, Remitrax.
export const SendMoneyView: React.FC<SendMoneyViewProps> = ({ setActiveView }) => {
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState<RemitraxRecipientProfile | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { mutate: sendMoney, isPending: isProcessing } = useSendMoney();

    const handleSend = () => {
        if (!amount || !recipient || parseFloat(amount) <= 0) return;
        setErrorMessage(null);

        sendMoney({
            recipientId: recipient.id,
            recipientName: recipient.name,
            amount: parseFloat(amount),
            currency: 'USD',
            rail: 'quantumpay' // Default rail
        }, {
            onSuccess: () => {
                setIsSuccess(true);
                setTimeout(() => {
                    setIsSuccess(false);
                    setAmount('');
                    setRecipient(null);
                    setActiveView(View.Dashboard);
                }, 3500); // Allow time for success animation
            },
            onError: (error) => {
                setErrorMessage(error.message || 'An unexpected error occurred during the transaction.');
            }
        });
    };

    if (isProcessing) {
        return (
            <Card>
                <div className="flex flex-col items-center justify-center h-96">
                    <QuantumLedgerAnimation />
                    <p className="mt-4 text-lg font-semibold text-white">Processing Transaction...</p>
                    <p className="text-sm text-gray-400">Securing quantum channel and committing to ledger.</p>
                </div>
            </Card>
        );
    }
    
    if (isSuccess) {
         return (
            <Card>
                <div className="flex flex-col items-center justify-center h-96">
                    <AnimatedCheckmarkIcon />
                    <p className="mt-4 text-lg font-semibold text-white">Transaction Sent!</p>
                    <p className="text-sm text-gray-400">
                        ${amount} sent to {recipient?.name}.
                    </p>
                </div>
            </Card>
        );
    }

    // Mock recipient for demo
    const mockRecipient: RemitraxRecipientProfile = {
        id: 'rec_1',
        name: 'Alex Ray',
        quantumTag: '@alexray',
        avatarUrl: 'https://i.pravatar.cc/80?u=alexray'
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Remitrax: Send Money</h2>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Recipient</h3>
                        <div 
                            className={`p-4 bg-gray-700/50 rounded-lg flex items-center gap-4 cursor-pointer border-2 ${recipient ? 'border-cyan-500' : 'border-transparent'}`}
                            onClick={() => setRecipient(mockRecipient)}
                        >
                             <img src={mockRecipient.avatarUrl} alt={mockRecipient.name} className="w-12 h-12 rounded-full" />
                             <div>
                                <p className="font-semibold text-white">{mockRecipient.name}</p>
                                <p className="text-sm text-cyan-400">{mockRecipient.quantumTag}</p>
                             </div>
                        </div>
                        {!recipient && <p className="text-gray-400 text-xs mt-2">Click above to select a recipient.</p>}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Amount</h3>
                         <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full text-4xl bg-transparent border-b-2 border-gray-600 focus:border-cyan-500 text-white outline-none pb-2 transition-colors"
                        />
                        {errorMessage && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg">
                                <strong>Payment Failed:</strong> {errorMessage}
                            </div>
                        )}
                         <button
                            onClick={handleSend}
                            disabled={!amount || !recipient || parseFloat(amount) <= 0 || isProcessing}
                            className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Send ${amount || '0.00'}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SendMoneyView;
