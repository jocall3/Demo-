

import React, { useState, useContext, useRef, useEffect } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import { View } from '../types';
import type { Transaction } from '../types';

interface SendMoneyViewProps {
  setActiveView: (view: View) => void;
}

type PaymentMethod = 'quantumpay' | 'cashapp';

// A symbol for success with animation.
const AnimatedCheckmarkIcon = () => (
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
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                stroke-width: 4;
                stroke: #fff;
                animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke {
                100% {
                    stroke-dashoffset: 0;
                }
            }
        `}</style>
    </>
);

const QuantumLedgerAnimation = () => (
    <>
        <div className="quantum-grid">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="quantum-block"></div>)}
        </div>
        <style>{`
            .quantum-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                width: 100px;
                height: 100px;
            }
            .quantum-block {
                background-color: rgba(6, 182, 212, 0.3);
                border: 1px solid #06b6d4;
                border-radius: 4px;
                animation: quantum-flash 2s infinite ease-in-out;
            }
            .quantum-block:nth-child(1) { animation-delay: 0.1s; }
            .quantum-block:nth-child(2) { animation-delay: 0.5s; }
            .quantum-block:nth-child(3) { animation-delay: 0.2s; }
            .quantum-block:nth-child(4) { animation-delay: 0.6s; }
            .quantum-block:nth-child(5) { animation-delay: 0.3s; }
            .quantum-block:nth-child(6) { animation-delay: 0.7s; }
            .quantum-block:nth-child(7) { animation-delay: 0.4s; }
            .quantum-block:nth-child(8) { animation-delay: 0.8s; }
            .quantum-block:nth-child(9) { animation-delay: 0.1s; }

            @keyframes quantum-flash {
                0%, 100% { background-color: rgba(6, 182, 212, 0.3); transform: scale(1); }
                50% { background-color: rgba(165, 243, 252, 0.8); transform: scale(1.05); }
            }
        `}</style>
    </>
);


// The biometric lock, which now specifies the payment method for clarity.
const BiometricModal: React.FC<{ 
    isOpen: boolean;
    onSuccess: () => void; 
    onClose: () => void; 
    amount: string; 
    recipient: string; 
    paymentMethod: 'QuantumPay' | 'Cash App';
}> = ({ isOpen, onSuccess, onClose, amount, recipient, paymentMethod }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scanState, setScanState] = useState<'scanning' | 'success' | 'verifying' | 'error'>('scanning');
    const [verificationStep, setVerificationStep] = useState(0);

    const verificationMessages = [
        `Heuristic API: Validating ${recipient}'s identity...`,
        'Heuristic API: Checking sufficient funds...',
        'Heuristic API: Executing transaction on secure ledger...',
        'Heuristic API: Confirming transfer...',
    ];

    useEffect(() => {
        if (!isOpen) {
            setScanState('scanning'); // Reset state on close
            setVerificationStep(0);
            return;
        };

        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setScanState('error');
            }
        };
        startCamera();

        const successTimer = setTimeout(() => setScanState('success'), 3000);
        const verifyTimer = setTimeout(() => setScanState('verifying'), 4000);
        const successActionTimer = setTimeout(onSuccess, 8500); // Increased duration
        const closeTimer = setTimeout(onClose, 9500); // Increased duration

        return () => {
            clearTimeout(successTimer);
            clearTimeout(verifyTimer);
            clearTimeout(successActionTimer);
            clearTimeout(closeTimer);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, onSuccess, onClose]);
    
    useEffect(() => {
        if (scanState === 'verifying') {
            const interval = setInterval(() => {
                setVerificationStep(prev => {
                    if (prev >= verificationMessages.length - 1) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000); // Change message every second
            return () => clearInterval(interval);
        }
    }, [scanState, verificationMessages.length]);

    const getTitle = () => {
        switch (scanState) {
            case 'scanning': return 'Scanning Face';
            case 'success': return 'Identity Confirmed';
            case 'verifying': return 'Quantum Ledger Verification';
            case 'error': return 'Verification Failed';
        }
    }
    
    const getSubtitle = () => {
        switch (scanState) {
            case 'scanning': return `Sending $${amount} to ${recipient} via ${paymentMethod}`;
            case 'success': return 'Transaction authorized. Submitting to secure ledger...';
            case 'verifying': return verificationMessages[verificationStep];
            case 'error': return `Please try again.`;
        }
    }

    return (
        <div className={`fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-gray-800 rounded-t-2xl sm:rounded-2xl p-8 max-w-sm w-full text-center border-t sm:border border-gray-700 transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-gray-600 mb-6">
                    <video ref={videoRef} autoPlay muted playsInline className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"></video>
                    {scanState === 'scanning' && <div className="absolute inset-0 bg-grid-pattern animate-scan"></div>}
                    {scanState === 'success' && <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center"><AnimatedCheckmarkIcon /></div>}
                    {scanState === 'verifying' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><QuantumLedgerAnimation /></div>}
                    {scanState === 'error' && <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center p-4"><p>Camera not found. Cannot complete biometric verification.</p></div>}
                </div>
                <h3 className="text-2xl font-bold text-white">{getTitle()}</h3>
                <p className="text-gray-400 mt-2">{getSubtitle()}</p>
                {scanState === 'scanning' && (
                    <button onClick={onClose} className="mt-6 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
                        Cancel
                    </button>
                )}
            </div>
             <style>{`
                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px);
                    background-size: 2rem 2rem;
                }
                @keyframes scan-effect {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 -4rem; }
                }
                .animate-scan {
                    animation: scan-effect 1.5s linear infinite;
                }
            `}</style>
        </div>
    );
};

// The re-engineered Send Money portal with dual payment rails.
const SendMoneyView: React.FC<SendMoneyViewProps> = ({ setActiveView }) => {
  const context = useContext(DataContext);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('quantumpay');
  
  // States for form fields
  const [amount, setAmount] = useState('');
  const [quantumTag, setQuantumTag] = useState('');
  const [remittance, setRemittance] = useState('');
  const [cashtag, setCashtag] = useState('');
  
  // State for modal visibility and animation
  const [showModal, setShowModal] = useState(false);

  if (!context) {
    throw new Error("SendMoneyView must be used within a DataProvider");
  }
  const { addTransaction } = context;

  const recipient = paymentMethod === 'quantumpay' ? quantumTag : cashtag;
  const isFormValid = parseFloat(amount) > 0 && recipient.trim() !== '';

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
        setShowModal(true);
    }
  };
  
  const handleSuccess = () => {
    // This is where the real-world connection is demonstrated.
    // In a live app, this would be an actual `fetch` call. Here, we log the intended request.
    const simulateApiCall = () => {
        const consumerKey = "[REDACTED_FOR_SECURITY]"; // From your credentials
        const requestHeaders = new Headers();
        // The DirectLogin header format for Open Bank Project
        requestHeaders.append("Authorization", `DirectLogin token="${consumerKey}"`);
        requestHeaders.append("Content-Type", "application/json");

        const requestBody = {
            "to_account_id": recipient,
            "amount": amount,
            "currency": "USD",
            "description": remittance || `QuantumBank payment`
        };

        console.log("--- SIMULATING OPEN BANKING API CALL ---");
        console.log("Endpoint: POST https://apisandbox.openbankproject.com/my/logins/direct");
        console.log("Headers:", Object.fromEntries(requestHeaders.entries()));
        console.log("Body:", requestBody);
        console.log("-----------------------------------------");
    };
    
    // Only simulate the Open Banking call if using QuantumPay
    if (paymentMethod === 'quantumpay') {
        simulateApiCall();
    }


    const description = paymentMethod === 'quantumpay'
        ? `QuantumPay to ${recipient}`
        : `Cash App to ${recipient}`;
        
    const newTx: Transaction = {
      id: new Date().toISOString(),
      type: 'expense',
      category: 'Transfer',
      description: description,
      amount: parseFloat(amount),
      date: new Date().toLocaleDateString('en-CA'),
      carbonFootprint: 0.1,
    };
    addTransaction(newTx);
  };
  
  const handleClose = () => {
      setShowModal(false);
      // Redirect after the modal is fully closed
      setTimeout(() => setActiveView(View.Transactions), 350);
  };
  
  const renderQuantumPayForm = () => (
    <>
      <div>
        <label htmlFor="quantumTag" className="block text-sm font-medium text-gray-300">Recipient's @QuantumTag</label>
        <div className="mt-1">
          <input
            type="text"
            name="quantumTag"
            id="quantumTag"
            value={quantumTag}
            onChange={(e) => setQuantumTag(e.target.value)}
            className="block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="@the_future"
          />
        </div>
      </div>
      <div>
        <label htmlFor="remittance" className="block text-sm font-medium text-gray-300">Remittance Info (ISO 20022)</label>
        <div className="mt-1">
          <input
            type="text"
            name="remittance"
            id="remittance"
            value={remittance}
            onChange={(e) => setRemittance(e.target.value)}
            className="block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="e.g., Invoice #12345"
          />
        </div>
      </div>
    </>
  );

  const renderCashAppForm = () => (
    <div>
      <label htmlFor="cashtag" className="block text-sm font-medium text-gray-300">Recipient's $Cashtag</label>
      <div className="mt-1">
        <input
          type="text"
          name="cashtag"
          id="cashtag"
          value={cashtag}
          onChange={(e) => setCashtag(e.target.value)}
          className="block w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="$new_beginnings"
        />
      </div>
    </div>
  );
  
  return (
      <>
        <Card title="Send Money">
            <div className="p-1 bg-gray-900/50 rounded-lg flex mb-6">
                <button 
                    onClick={() => setPaymentMethod('quantumpay')}
                    className={`w-1/2 py-2.5 text-sm font-medium rounded-md transition-colors ${paymentMethod === 'quantumpay' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                    QuantumPay (ISO20022)
                </button>
                <button 
                    onClick={() => setPaymentMethod('cashapp')}
                    className={`w-1/2 py-2.5 text-sm font-medium rounded-md transition-colors ${paymentMethod === 'cashapp' ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                    Cash App
                </button>
            </div>
            
            <form onSubmit={handleSend} className="space-y-6">
                {paymentMethod === 'quantumpay' ? renderQuantumPayForm() : renderCashAppForm()}
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                            <span className="text-gray-400 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            name="amount"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`block w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-7 pr-4 py-2 text-white focus:outline-none focus:ring-2 ${paymentMethod === 'quantumpay' ? 'focus:ring-cyan-500' : 'focus:ring-green-500'}`}
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={!isFormValid}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${paymentMethod === 'quantumpay' ? 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
                    >
                        Send with Biometric Confirmation
                    </button>
                </div>
            </form>
        </Card>
        <BiometricModal 
            isOpen={showModal}
            onSuccess={handleSuccess}
            onClose={handleClose} 
            amount={amount} 
            recipient={recipient} 
            paymentMethod={paymentMethod === 'quantumpay' ? 'QuantumPay' : 'Cash App'}
        />
    </>
  );
};

export default SendMoneyView;