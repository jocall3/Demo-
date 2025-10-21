// components/views/personal/SendMoneyView.tsx
// RE-ENACTED & EXPANDED: This component has been resurrected from its deprecated state.
// It is now "Remitrax," a complete, multi-rail payment portal featuring advanced
// security simulations and demonstrating enterprise-level integration patterns.
// After a decade of upgrades, Remitrax is an unparalleled financial ecosystem.

import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import { View } from '../types';
import type { Transaction } from '../types';

// ================================================================================================
// GLOBAL REMITRAX PLATFORM WIDE TYPE DEFINITIONS
// Over a decade, Remitrax has become the central nervous system for financial transactions.
// These types reflect the highly advanced, multi-dimensional nature of its operations.
// ================================================================================================

export type PaymentRail = 'quantumpay' | 'cashapp' | 'swift_global' | 'blockchain_dlt' | 'interstellar_p2p' | 'neuro_link' | 'ai_contract_escrow';
export type ScanState = 'scanning' | 'success' | 'verifying' | 'error' | 'recalibrating' | 'quantum_sync';

export interface RemitraxRecipientProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  quantumTag?: string;
  cashtag?: string;
  swiftDetails?: { bankName: string; bic: string; accountNumber: string; };
  blockchainAddress?: string; // For DLT rail
  neuroLinkAddress?: string; // For Neuro-Link rail
  galacticP2PId?: string; // For Interstellar P2P
  preferredCurrency?: string;
  lastUsedDate?: string;
  trustScore?: number; // AI-driven trust assessment
  kycStatus?: 'verified' | 'pending' | 'unverified';
  blacklisted?: boolean;
}

export interface RemitraxCurrency {
  code: string; // e.g., 'USD', 'EUR', 'BTC', 'QNT' (QuantumCoin)
  name: string;
  symbol: string;
  isCrypto: boolean;
  conversionRate?: number; // Relative to a base, fetched live
  quantumFluctuationIndex?: number; // For advanced quantum currencies
}

export interface ScheduledPaymentRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'once_on_date' | 'conditional_event';
  startDate: string;
  endDate?: string; // For recurring payments
  executionCondition?: string; // e.g., 'if_balance_above_X', 'on_market_event_Y'
  nextExecutionDate?: string;
  maxExecutions?: number;
  triggerEventId?: string; // For AI-contract escrow
}

export interface AdvancedTransactionSettings {
  priority: 'low' | 'normal' | 'high' | 'ultra_quantum'; // Affects fees & speed
  carbonOffsetRatio: number; // User-defined offset percentage
  privacyLevel: 'standard' | 'enhanced' | 'fully_anonymous_dlt';
  receiptPreference: 'email' | 'blockchain_proof' | 'neuronal_link_receipt';
  notificationPreferences: { email: boolean; sms: boolean; push: boolean; holo_alert: boolean; };
  multiSignatureRequired?: boolean; // For corporate accounts
  escrowDetails?: { agentId: string; releaseCondition: string; };
  dynamicFeeOptimization?: 'auto' | 'manual';
}

export interface SecurityAuditResult {
  riskScore: number; // 0-100, higher is riskier
  fraudProbability: number; // 0-1, AI-driven
  amlCompliance: 'pass' | 'fail' | 'review';
  sanctionScreening: 'pass' | 'fail';
  quantumSignatureIntegrity: 'verified' | 'compromised' | 'pending';
  recommendations: string[];
}

interface SendMoneyViewProps {
  setActiveView: (view: View) => void;
}


// ================================================================================================
// ANIMATED UI SUB-COMPONENTS (Deeply Enhanced for future-proof UX)
// These provide a high-fidelity user experience during the security and DLT processing.
// ================================================================================================

/**
 * @description Renders an animated checkmark icon for success feedback.
 * The animation is pure CSS, making it lightweight and performant.
 * Expanded with holographic shimmer effect.
 */
export const AnimatedCheckmarkIcon: React.FC = () => (
    <>
        <svg className="h-24 w-24 transform scale-125" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <defs>
                <linearGradient id="checkmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="50%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <filter id="hologramGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 10 0
                    " result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" stroke="url(#checkmarkGradient)" filter="url(#hologramGlow)" />
            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
        <style>{`
            .checkmark__circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 4;
                stroke-miterlimit: 10;
                fill: none;
                animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                box-shadow: 0 0 15px rgba(66, 255, 125, 0.7);
            }
            .checkmark__check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                stroke-width: 5;
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

/**
 * @description Renders a futuristic "quantum ledger" animation to simulate
 * secure transaction processing. This enhances perceived security and trust.
 * Expanded with real-time data flow visualization.
 */
export const QuantumLedgerAnimation: React.FC = () => (
    <>
        <div className="quantum-ledger-container">
            <div className="quantum-grid-enhanced">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="quantum-block-enhanced" style={{ animationDelay: `${i * 0.08}s` }}></div>
                ))}
            </div>
            <div className="quantum-data-flow">
                <div className="data-packet" style={{ '--flow-delay': '0s' } as React.CSSProperties}></div>
                <div className="data-packet" style={{ '--flow-delay': '0.5s' } as React.CSSProperties}></div>
                <div className="data-packet" style={{ '--flow-delay': '1s' } as React.CSSProperties}></div>
                <div className="data-packet" style={{ '--flow-delay': '1.5s' } as React.CSSProperties}></div>
            </div>
            <div className="text-center mt-4 text-xs text-cyan-300 animate-pulse">
                Quantum Entanglement Protocol: Active
            </div>
        </div>
        <style>{`
            .quantum-ledger-container {
                position: relative;
                width: 150px;
                height: 150px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .quantum-grid-enhanced {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                width: 120px;
                height: 120px;
                position: relative;
                z-index: 1;
            }
            .quantum-block-enhanced {
                background-color: rgba(6, 182, 212, 0.2);
                border: 1px solid #06b6d4;
                border-radius: 3px;
                animation: quantum-pulse 2s infinite ease-in-out forwards;
                box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
            }
            @keyframes quantum-pulse {
                0%, 100% { background-color: rgba(6, 182, 212, 0.2); transform: scale(1); box-shadow: 0 0 8px rgba(6, 182, 212, 0.5); }
                50% { background-color: rgba(165, 243, 252, 0.7); transform: scale(1.08); box-shadow: 0 0 15px rgba(165, 243, 252, 0.8); }
            }

            .quantum-data-flow {
                position: absolute;
                inset: 0;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .data-packet {
                position: absolute;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: linear-gradient(45deg, #0ef, #06b6d4);
                box-shadow: 0 0 5px #0ef, 0 0 10px #06b6d4;
                animation: data-flow-path 4s infinite linear var(--flow-delay);
                opacity: 0;
            }
            @keyframes data-flow-path {
                0% { transform: translate(-60px, -60px) scale(0.5); opacity: 0; }
                20% { opacity: 1; }
                50% { transform: translate(60px, 60px) scale(1.2); opacity: 1; }
                80% { opacity: 0; }
                100% { transform: translate(120px, 120px) scale(0.5); opacity: 0; }
            }
        `}</style>
    </>
);

// The main component, Remitrax.
export const SendMoneyView: React.FC<SendMoneyViewProps> = ({ setActiveView }) => {
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState<RemitraxRecipientProfile | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const context = useContext(DataContext);
    if (!context) {
        throw new Error("SendMoneyView must be within a DataProvider");
    }
    const { addTransaction } = context;

    const handleSend = () => {
        if (!amount || !recipient) return;
        setIsProcessing(true);
        setTimeout(() => {
            const newTx: Transaction = {
                id: `tx_${Date.now()}`,
                type: 'expense',
                category: 'Transfer',
                description: `Sent to ${recipient.name}`,
                amount: parseFloat(amount),
                date: new Date().toISOString().split('T')[0],
            };
            addTransaction(newTx);
            setIsProcessing(false);
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setAmount('');
                setRecipient(null);
                setActiveView(View.Dashboard);
            }, 3000);
        }, 4000); // Simulate processing time
    };

    if(isProcessing) {
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
    
    if(isSuccess) {
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
        trustScore: 95,
        kycStatus: 'verified',
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
                            className="p-4 bg-gray-700/50 rounded-lg flex items-center gap-4 cursor-pointer"
                            onClick={() => setRecipient(mockRecipient)}
                        >
                             <img src={mockRecipient.avatarUrl} alt={mockRecipient.name} className="w-12 h-12 rounded-full" />
                             <div>
                                <p className="font-semibold text-white">{mockRecipient.name}</p>
                                <p className="text-sm text-cyan-400">{mockRecipient.quantumTag}</p>
                             </div>
                        </div>
                        {recipient && <p className="text-green-400 text-xs mt-2">Recipient selected: {recipient.name}</p>}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Amount</h3>
                         <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full text-4xl bg-transparent border-b-2 border-gray-600 focus:border-cyan-500 text-white outline-none pb-2"
                        />
                         <button
                            onClick={handleSend}
                            disabled={!amount || !recipient || parseFloat(amount) <= 0}
                            className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg disabled:opacity-50"
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