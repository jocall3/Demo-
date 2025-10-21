import React, { useContext, useState, useEffect } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import type { CorporateCard, CorporateCardControls } from '../types';
import { GoogleGenAI } from '@google/genai';

const NewPaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; onInitiate: (details: { amount: number; description: string; type: 'ACH' | 'Wire' }) => void; }> = ({ isOpen, onClose, onInitiate }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'ACH' | 'Wire'>('ACH');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (amount && description) {
            onInitiate({ amount: parseFloat(amount), description, type });
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700"><h3 className="text-lg font-semibold text-white">Initiate New Payment</h3></div>
                <div className="p-6 space-y-4">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g., Vendor Payment)" className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white" />
                    <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white"><option>ACH</option><option>Wire</option></select>
                    <button onClick={handleSubmit} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Submit Payment</button>
                </div>
            </div>
        </div>
    );
};

const CorporateCardDetailModal: React.FC<{ card: CorporateCard | null; onClose: () => void; onSave: (id: string, controls: CorporateCardControls, frozen: boolean) => void; }> = ({ card, onClose, onSave }) => {
    const [controls, setControls] = useState<CorporateCardControls | null>(card?.controls || null);
    const [isFrozen, setIsFrozen] = useState(card?.frozen || false);

    useEffect(() => {
        setControls(card?.controls || null);
        setIsFrozen(card?.frozen || false);
    }, [card]);
    
    if (!card || !controls) return null;

    const handleControlChange = (key: keyof CorporateCardControls, value: any) => {
        setControls(prev => prev ? { ...prev, [key]: value } : null);
    }
    
    const handleSaveChanges = () => {
        if (controls) {
            onSave(card.id, controls, isFrozen);
            onClose();
        }
    }

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
                     <button onClick={handleSaveChanges} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

const CorporateCommandView: React.FC = () => {
    const context = useContext(DataContext);
    const [aiInsight, setAiInsight] = useState('');
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    if (!context) throw new Error("CorporateCommandView must be within a DataProvider.");
    
    const { corporateCards, corporateTransactions, updateCorporateCard, initiatePayment } = context;

    const generateInsight = async () => {
        setIsInsightLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const transactionSummary = corporateTransactions.map(t => `${t.timestamp}: ${t.holderName} spent $${t.amount} at ${t.merchant} (${t.status})`).join('\n');
            const prompt = `You are a corporate finance AI. Analyze the following corporate card transactions for anomalies, potential policy violations, or cost-saving opportunities. Provide a brief, actionable summary (2-3 sentences). Transactions:\n${transactionSummary}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAiInsight(response.text);
        } catch (error) {
            console.error("Failed to generate corporate insight:", error);
            setAiInsight("An error occurred while analyzing transaction data.");
        } finally {
            setIsInsightLoading(false);
        }
    };

    const StatusBadge: React.FC<{ status: CorporateCard['status'], frozen: boolean }> = ({ status, frozen }) => {
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
                    <Card title="Corporate Card Management" padding="none">
                        <div className="divide-y divide-gray-700/50 max-h-[45vh] overflow-y-auto">
                            {corporateCards.map(card => (
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
                        {isInsightLoading ? <p className="text-gray-400 text-sm">Analyzing transactions...</p> : 
                         aiInsight ? <p className="text-gray-300 text-sm italic">"{aiInsight}"</p> :
                         <button onClick={generateInsight} className="w-full text-center py-2 px-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-sm font-medium transition-colors">Scan Transactions</button>
                        }
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card title="Real-Time Transaction Feed" className="max-h-[80vh] flex flex-col">
                        <div className="flex-1 overflow-y-auto space-y-3">
                        {corporateTransactions.map(tx => (
                            <div key={tx.id} className="flex items-center p-1 rounded-md hover:bg-gray-800/50">
                                <div className={`w-2 h-2 mr-3 rounded-full ${tx.status === 'Approved' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
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
        <CorporateCardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} onSave={updateCorporateCard} />
        <NewPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onInitiate={initiatePayment} />
        </>
    );
};

export default CorporateCommandView;