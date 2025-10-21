import React, { useState, useEffect } from 'react';
import { banks } from '../constants'; // Import the centralized bank list

interface PlaidLinkButtonProps {
    onSuccess: (publicToken: string, metadata: any) => void;
}

// ================================================================================================
// SVG ICONS & LOGOS
// ================================================================================================
const PlaidLogo = () => <svg width="88" height="34" viewBox="0 0 88 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M82.2 3.82c-3.32 0-5.83 2.5-5.83 5.82 0 3.31 2.51 5.82 5.83 5.82 3.31 0 5.82-2.5 5.82-5.82 0-3.31-2.51-5.82-5.82-5.82Zm0 9.14c-1.87 0-3.32-1.45-3.32-3.32 0-1.87 1.45-3.32 3.32-3.32 1.87 0 3.31-1.45 3.31-3.32 0-1.87-1.44-3.32-3.31-3.32-1.87 0-3.32-1.45-3.32-3.32s1.45-3.32 3.32-3.32 3.31 1.45 3.31 3.32c0 1.87 1.45 3.32 3.32 3.32s3.32-1.45 3.32-3.32-1.45-3.32-3.32-3.32-3.31-1.45-3.31-3.32c0-3.31 2.5-5.82 5.82-5.82s5.82 2.5 5.82 5.82-2.5 5.82-5.82 5.82c-1.87 0-3.32 1.45-3.32 3.31 0 1.87-1.45 3.32-3.32 3.32Z" fill="#fff"></path><path d="M25.86 10.93c0 4.14-3.55 7.4-7.93 7.4-4.39 0-7.94-3.26-7.94-7.4S13.54 3.53 17.93 3.53c4.38 0 7.93 3.26 7.93 7.4Zm-10.45 0c0 1.45 1.12 2.5 2.52 2.5 1.39 0 2.51-1.05 2.51-2.5 0-1.45-1.12-2.5-2.51-2.5-1.4 0-2.52 1.05-2.52 2.5Z" fill="#fff"></path><path d="M49.6 10.93c0 4.14-3.54 7.4-7.93 7.4-4.38 0-7.93-3.26-7.93-7.4S37.29 3.53 41.67 3.53c4.39 0 7.93 3.26 7.93 7.4Zm-10.45 0c0 1.45 1.12 2.5 2.52 2.5 1.4 0 2.52-1.05 2.52-2.5 0-1.45-1.12-2.5-2.52-2.5-1.4 0-2.52 1.05-2.52 2.5Z" fill="#fff"></path><path d="M68.8 3.82c-3.32 0-5.83 2.5-5.83 5.82 0 3.31 2.51 5.82 5.83 5.82 3.31 0 5.82-2.5 5.82-5.82 0-3.31-2.51-5.82-5.82-5.82Zm0 9.14c-1.87 0-3.32-1.45-3.32-3.32 0-1.87 1.45-3.32 3.32-3.32s3.31-1.45 3.31-3.32c0-1.87-1.44-3.32-3.31-3.32-1.87 0-3.32-1.45-3.32-3.32s1.45-3.32 3.32-3.32 3.31 1.45 3.31 3.32c0 1.87 1.45 3.32 3.32 3.32s3.32-1.45 3.32-3.32-1.45-3.32-3.32-3.32-3.31-1.45-3.31-3.32c0-3.31 2.5-5.82 5.82-5.82s5.82 2.5 5.82 5.82-2.5 5.82-5.82 5.82c-1.87 0-3.32 1.45-3.32 3.31 0 1.87-1.45 3.32-3.32 3.32Z" fill="#fff"></path><path d="M25.86 28.33c0 2.2-1.78 3.97-3.97 3.97h-7.93c-2.2 0-3.97-1.77-3.97-3.97v-7.93c0-2.2 1.78-3.97 3.97-3.97h7.93c2.2 0 3.97 1.77 3.97 3.97v7.93Z" fill="#fff"></path><path d="M17.93 25.43c-2.2 0-3.97-1.78-3.97-3.97s1.78-3.97 3.97-3.97 3.97 1.78 3.97 3.97-1.78 3.97-3.97 3.97Z" fill="#0D0F2A"></path><path d="M2.5 18.23c-1.4 0-2.5-1.12-2.5-2.51V2.5C0 1.1 1.1 0 2.5 0s2.5 1.1 2.5 2.5v13.22c0 1.39-1.1 2.51-2.5 2.51Z" fill="#fff"></path></svg>;

// ================================================================================================
// HIGH-FIDELITY PLAID MODAL SIMULATION
// ================================================================================================

const PlaidModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (publicToken: string, metadata: any) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'select' | 'connecting' | 'connected'>('select');
    const [selectedBank, setSelectedBank] = useState<typeof banks[0] | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
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
            const mockMetadata = {
                institution: { name: bank.name, institution_id: bank.institution_id },
                accounts: [{ id: `acct_${Math.random().toString(36).substring(7)}`, name: 'Plaid Checking', mask: Math.floor(1000 + Math.random() * 9000).toString(), type: 'checking', subtype: 'checking' }],
                link_session_id: `link-session-${Math.random().toString(36).substring(7)}`,
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


const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({ onSuccess }) => {
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
            <PlaidModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={onSuccess} />
        </>
    );
};

export default PlaidLinkButton;