// "Let the user command the app with their voice," Gemini proclaimed. "We will give them a constant companion."
import React, { useState } from 'react';
import { View } from '../types';

interface VoiceControlProps {
    setActiveView: (view: View) => void;
}

const MicIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const VoiceModal: React.FC<{ onClose: () => void; onCommand: (view: View) => void; }> = ({ onClose, onCommand }) => {
    const commands = [
        { label: "Show my dashboard", view: View.Dashboard },
        { label: "What are my recent transactions?", view: View.Transactions },
        { label: "Take me to my budgets", view: View.Budgets },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full text-center border border-gray-700 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="relative w-24 h-24 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping"></div>
                    <MicIcon className="h-12 w-12 text-cyan-300" />
                </div>
                <h3 className="text-2xl font-bold text-white">Listening...</h3>
                <p className="text-gray-400 mt-2 mb-6">You can say things like:</p>
                <div className="space-y-3">
                    {commands.map(cmd => (
                        <button key={cmd.view} onClick={() => onCommand(cmd.view)} className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-cyan-200 transition-colors">
                            "{cmd.label}"
                        </button>
                    ))}
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

const VoiceControl: React.FC<VoiceControlProps> = ({ setActiveView }) => {
    const [isListening, setIsListening] = useState(false);

    const handleCommand = (view: View) => {
        setActiveView(view);
        setIsListening(false);
    };

    return (
        <>
            <button
                onClick={() => setIsListening(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-cyan-600 hover:bg-cyan-500 rounded-full shadow-lg flex items-center justify-center text-white z-40 transition-transform hover:scale-110"
                aria-label="Activate Voice Control"
            >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                <MicIcon />
            </button>
            {isListening && <VoiceModal onClose={() => setIsListening(false)} onCommand={handleCommand} />}
        </>
    );
};

export default VoiceControl;