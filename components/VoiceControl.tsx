/**
 * @file components/VoiceControl.tsx
 * @description Implements the primary voice control interface for the application.
 *
 * ARCHITECTURAL REFACTOR:
 * This component has been significantly enhanced to demonstrate a more sophisticated, AI-driven interaction model.
 * It now utilizes the browser's Web Speech API for realistic voice recognition and speech synthesis, moving
 * beyond a simple click-based simulation.
 *
 * Key Architectural Changes:
 * 1.  **Web Speech API Integration**: Implements `SpeechRecognition` for listening and `SpeechSynthesisUtterance` for speaking,
 *     providing a high-fidelity voice interaction experience.
 * 2.  **Command & Query Separation**: The `processUtterance` function demonstrates client-side CQRS by parsing natural
 *     language to distinguish between:
 *     - **Navigation Actions**: Client-side state changes (calling `setActiveView`).
 *     - **Queries**: Read operations that fetch server state (e.g., "What is my balance?"), simulated via TanStack Query-style hooks.
 *     - **Commands**: Write operations that mutate server state (e.g., "Pay Alex Ray $50"), simulated via TanStack Query-style hooks that would trigger a GraphQL mutation and a durable workflow.
 * 3.  **Decoupled Server State**: Introduces `useSendMoneyMutation` and `useBalanceQuery` as examples of how this component would interact
 *     with the backend via feature-specific hooks, adhering to the principle of separating client and server state management.
 * 4.  **Comprehensive TSDoc**: All types, components, and functions are documented as per the new architectural directive.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Transaction } from '../types';

// ===============================================================================================
// HYPOTHETICAL API HOOKS (NEW ARCHITECTURE)
// These hooks simulate the TanStack Query pattern for managing server state,
// replacing direct data context consumption.
// ===============================================================================================

/**
 * @description A simulated TanStack Query `useMutation` hook for sending money.
 * In a real application, this would wrap a GraphQL mutation call.
 * @returns An object with a `mutate` function and `isPending` state.
 */
const useSendMoneyMutation = () => {
  const [isPending, setIsPending] = useState(false);
  const mutate = async (vars: { recipient: string, amount: number }): Promise<Transaction> => {
    setIsPending(true);
    console.log(`[API] Sending GraphQL Mutation: sendMoney(${JSON.stringify(vars)})`);
    // Simulate network latency and a durable workflow initiation.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate a potential business logic failure for demonstration.
    if (vars.recipient.toLowerCase().includes('fail')) {
        setIsPending(false);
        throw new Error('Payment to this recipient is currently blocked.');
    }

    const newTx: Transaction = {
      id: `tx_voice_${Date.now()}`,
      type: 'EXPENSE',
      category: 'Transfer',
      description: `Sent to ${vars.recipient}`,
      amount: vars.amount,
      date: new Date().toISOString().split('T')[0],
    };
    setIsPending(false);
    return newTx;
  };
  return { mutate, isPending };
};

/**
 * @description A simulated TanStack Query `useQuery` hook for fetching the user's balance.
 * @returns An object with a `query` function and `isLoading` state.
 */
const useBalanceQuery = () => {
    const [isLoading, setIsLoading] = useState(false);
    const query = async (): Promise<{ totalBalance: number }> => {
        setIsLoading(true);
        console.log('[API] Sending GraphQL Query: totalBalance');
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsLoading(false);
        // Simulate fetching a balance from the accounts-service subgraph.
        return { totalBalance: 54321.98 };
    };
    return { query, isLoading };
}

// ===============================================================================================
// UI SUB-COMPONENTS & TYPES
// ===============================================================================================

/**
 * @description Defines the possible states of the voice interaction lifecycle.
 */
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * @description A simple, reusable microphone icon component.
 * @param {object} props - Component props.
 * @param {string} [props.className] - Optional CSS classes.
 * @returns {React.ReactElement} The SVG icon.
 */
const MicIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

/**
 * @interface VoiceModalProps
 * @description Props for the `VoiceModal` component.
 */
interface VoiceModalProps {
  /** Function to close the modal. */
  onClose: () => void;
  /** The current state of the voice recognition engine. */
  voiceState: VoiceState;
  /** The current speech-to-text transcript. */
  transcript: string;
  /** The text response from the AI or system. */
  aiResponse: string;
  /** Callback to process a text command, simulating a voice command. */
  processUtterance: (utterance: string) => void;
}

/**
 * @description The modal UI for the voice interaction, showing state and example commands.
 * @param {VoiceModalProps} props - The component props.
 * @returns {React.ReactElement} The rendered modal component.
 */
const VoiceModal: React.FC<VoiceModalProps> = ({ onClose, voiceState, transcript, aiResponse, processUtterance }) => {
    const commands = [
        "Show my dashboard", 
        "What is my total balance?", 
        "Pay Alex Ray $50 for dinner", 
        "Take me to my budgets"
    ];

    const stateText = {
        idle: 'Ready',
        listening: 'Listening...',
        processing: 'Thinking...',
        speaking: 'Responding...',
        error: 'Error'
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full text-center border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="relative w-24 h-24 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center mb-6">
                    {voiceState === 'listening' && <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping"></div>}
                    <MicIcon className="h-12 w-12 text-cyan-300" />
                </div>
                <h3 className="text-2xl font-bold text-white min-h-[2.25rem]">{stateText[voiceState]}</h3>
                <p className="text-gray-300 mt-2 mb-6 min-h-[1.5rem] italic">{transcript || ' '}</p>
                <div className="h-16 text-center flex items-center justify-center mb-6 p-2 bg-gray-900/50 rounded-lg">
                    <p className="text-lg text-cyan-200">{aiResponse}</p>
                </div>
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">Or try saying:</p>
                    {commands.map(cmd => (
                        <button key={cmd} onClick={() => processUtterance(cmd)} className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-cyan-200 transition-colors">
                            "{cmd}"
                        </button>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

// ===============================================================================================
// MAIN VOICE CONTROL COMPONENT
// ===============================================================================================

/**
 * @interface VoiceControlProps
 * @description Props for the main `VoiceControl` component.
 */
interface VoiceControlProps {
  /** Callback to change the active view in the application. */
  setActiveView: (view: View) => void;
}

/**
 * @description The main floating action button and modal orchestrator for voice commands.
 * @param {VoiceControlProps} props - The component props.
 * @returns {React.ReactElement} The rendered voice control UI.
 */
const VoiceControl: React.FC<VoiceControlProps> = ({ setActiveView }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('Hello! How can I help you?');
    
    const { mutate: sendMoney } = useSendMoneyMutation();
    const { query: getBalance } = useBalanceQuery();

    const recognitionRef = useRef<any>(null);
    const isMounted = useRef(false);

    const startListening = useCallback(() => {
        if (recognitionRef.current && voiceState !== 'listening') {
            setTranscript('');
            setVoiceState('listening');
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.warn("Speech recognition already started.", error);
            }
        }
    }, [voiceState]);
    
    const speak = useCallback((text: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!isMounted.current) {
                reject(new Error('Component not mounted'));
                return;
            }
            setVoiceState('speaking');
            setAiResponse(text);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => isMounted.current && resolve();
            utterance.onerror = (e) => {
                if(isMounted.current) {
                     setVoiceState('error');
                     setAiResponse("Sorry, I couldn't speak.");
                }
                reject(e);
            };
            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const processUtterance = useCallback(async (command: string) => {
        if (!isMounted.current) return;
        setTranscript(command);
        setVoiceState('processing');
        const lowerCommand = command.toLowerCase();

        // Command: Navigate
        const navMatch = lowerCommand.match(/^(show|go to|take me to|open|view) (my )?(.+)$/i);
        if (navMatch) {
            let viewName = navMatch[3].trim().replace(/\s+/g, '-');
            if (['home', 'overview'].includes(viewName)) viewName = 'dashboard';
            const targetView = Object.values(View).find(v => v.replace(/-/g, '') === viewName.replace(/-/g, ''));
            if (targetView) {
                await speak(`Navigating to ${targetView.replace(/-/g, ' ')}.`);
                setActiveView(targetView);
                setIsModalOpen(false);
                return;
            }
        }
        
        // Command: Send Money (CQRS Command)
        const payMatch = lowerCommand.match(/^(pay|send) (.+?) \$?(\d+(\.\d{1,2})?)/i);
        if (payMatch) {
            const recipient = payMatch[2].trim();
            const amount = parseFloat(payMatch[3]);
            try {
                await speak(`Initiating payment of $${amount} to ${recipient}.`);
                await sendMoney({ recipient, amount });
                await speak(`Payment successful.`);
            } catch (error: any) {
                await speak(`Sorry, I couldn't complete the payment. ${error.message}`);
            }
            setIsModalOpen(false);
            return;
        }

        // Command: Get Balance (CQRS Query)
        if (lowerCommand.includes('balance') || lowerCommand.includes('how much money')) {
            try {
                const { totalBalance } = await getBalance();
                await speak(`Your total balance is $${totalBalance.toLocaleString()}.`);
            } catch (error: any) {
                await speak(`Sorry, I couldn't retrieve your balance right now.`);
            }
            startListening();
            return;
        }

        await speak("I'm sorry, I didn't understand that. Please try again.");
        if (isMounted.current) startListening();

    }, [setActiveView, speak, startListening, sendMoney, getBalance]);

    useEffect(() => {
        isMounted.current = true;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setAiResponse("Sorry, your browser doesn't support voice control.");
            setVoiceState('error');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    if(isMounted.current) setTranscript(event.results[i][0].transcript);
                }
            }
            if (finalTranscript) {
                recognition.stop();
                processUtterance(finalTranscript.trim());
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if(isMounted.current) {
                setAiResponse(`Error: ${event.error}. Please try again.`);
                setVoiceState('error');
            }
        };
        
        recognition.onstart = () => {
             if (isMounted.current) setVoiceState('listening');
        }

        recognition.onend = () => {
            if (isMounted.current && voiceState === 'listening') {
                 setVoiceState('idle');
            }
        };
        
        recognitionRef.current = recognition;
        
        return () => {
            isMounted.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
        }
    }, [processUtterance, voiceState]);

    const openModal = () => {
        setAiResponse('Hello! How can I help you?');
        setIsModalOpen(true);
        setTimeout(startListening, 300);
    }
    
    const closeModal = () => {
        setIsModalOpen(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        window.speechSynthesis.cancel();
    }

    return (
        <>
            <button
                onClick={openModal}
                className="fixed bottom-8 right-8 w-16 h-16 bg-cyan-600 hover:bg-cyan-500 rounded-full shadow-lg flex items-center justify-center text-white z-40 transition-transform hover:scale-110"
                aria-label="Activate Voice Control"
            >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                <MicIcon />
            </button>
            {isModalOpen && (
                <VoiceModal
                    onClose={closeModal}
                    voiceState={voiceState}
                    transcript={transcript}
                    aiResponse={aiResponse}
                    processUtterance={processUtterance}
                />
            )}
        </>
    );
};

export default VoiceControl;
