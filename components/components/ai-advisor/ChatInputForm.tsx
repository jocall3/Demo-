import React, { useState, FormEvent } from 'react';

interface ChatInputFormProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const ChatInputForm: React.FC<ChatInputFormProps> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="p-4 border-t border-gray-700/60 bg-gray-800/50 rounded-b-xl">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Quantum anything..."
                    className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    disabled={isLoading}
                    aria-label="Chat input for AI Advisor"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center w-24 transition-colors"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        'Send'
                    )}
                </button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">Quantum can make mistakes. Consider checking important information.</p>
        </div>
    );
};

export default ChatInputForm;