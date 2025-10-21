import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { View, Transaction } from '../types';
import { DataContext } from '../context/DataContext';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

// --- UI Components ---
const MicIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const VoiceModal: React.FC<{
    onClose: () => void;
    voiceState: VoiceState;
    transcript: string;
    aiResponse: string;
    processUtterance: (utterance: string) => void;
}> = ({ onClose, voiceState, transcript, aiResponse, processUtterance }) => {
    const commands = ["Show my dashboard", "What are my recent transactions?", "Pay Alex Ray $50 for dinner", "Take me to my budgets"];

    const stateText = {
        idle: 'Ready',
        listening: 'Listening...',
        processing: 'Thinking...',
        speaking: 'Speaking...',
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

// --- Main Voice Control Component ---

interface VoiceControlProps {
    setActiveView: (view: View) => void;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ setActiveView }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('Hello! How can I help you?');
    
    const recognitionRef = useRef<any>(null);
    const dataContext = useContext(DataContext);
    const isMounted = useRef(false);

    const startListening = useCallback(() => {
        if (recognitionRef.current && voiceState !== 'listening') {
            setTranscript('');
            setVoiceState('listening');
            try {
                recognitionRef.current.start();
            } catch (error) {
                // Handle cases where recognition is already started
                console.warn("Speech recognition already started.", error);
            }
        }
    }, [voiceState]);
    
    const speak = useCallback((text: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!isMounted.current) {
                reject();
                return;
            }
            setVoiceState('speaking');
            setAiResponse(text);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
                if(isMounted.current) resolve();
            };
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

        // Navigate
        const navMatch = lowerCommand.match(/^(show|go to|take me to|open|view) (my )?(.+)$/i);
        if (navMatch) {
            let viewName = navMatch[3].trim().replace(/\s+/g, '-');
            if (viewName === 'home' || viewName === 'overview') viewName = 'dashboard';
            
            const targetView = Object.values(View).find(v => v.replace(/-/g, '') === viewName.replace(/-/g, ''));
            
            if (targetView) {
                setActiveView(targetView);
                await speak(`Navigating to ${targetView.replace(/-/g, ' ')}.`);
                setIsModalOpen(false);
                return;
            }
        }
        
        // Send Money
        const payMatch = lowerCommand.match(/^(pay|send) (.+?) \$?(\d+(\.\d{1,2})?)/i);
        if (payMatch && dataContext) {
            const recipient = payMatch[2].trim();
            const amount = parseFloat(payMatch[3]);
            
            const newTx: Transaction = {
                id: `tx_voice_${Date.now()}`, type: 'expense', category: 'Transfer',
                description: `Sent to ${recipient}`, amount: amount,
                date: new Date().toISOString().split('T')[0],
            };
            dataContext.addTransaction(newTx);
            await speak(`Okay, I've sent $${amount} to ${recipient}.`);
            setIsModalOpen(false);
            return;
        }

        await speak("I'm sorry, I didn't understand that. Please try again.");
        if (isMounted.current) startListening();

    }, [setActiveView, dataContext, speak, startListening]);

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

        // FIX: Use 'any' as SpeechRecognitionEvent is not available in all TS lib configs.
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    setTranscript(event.results[i][0].transcript);
                }
            }
            if (finalTranscript) {
                recognition.stop();
                processUtterance(finalTranscript.trim());
            }
        };

        // FIX: Use 'any' as SpeechRecognitionErrorEvent is not available in all TS lib configs.
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setAiResponse(`Error: ${event.error}. Please try again.`);
            setVoiceState('error');
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
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
        }
    }, [processUtterance, voiceState]);

    const openModal = () => {
        setAiResponse('Hello! How can I help you?');
        setIsModalOpen(true);
        // Delay listening to allow modal to open and permissions prompt if needed
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
