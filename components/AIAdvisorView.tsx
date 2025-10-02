// Copyright James Burvel O’Callaghan III
// President Citibank Demo Business Inc.

import React, { useState, useRef, useEffect, useContext } from 'react';
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { DataContext } from '../context/DataContext';
import { View, type Transaction } from '../types';

// ================================================================================================
// TYPE DEFINITIONS & STATE MANAGEMENT
// ================================================================================================

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    toolExecution?: {
        name: string;
        args: any;
        result?: string;
        state: 'pending' | 'success' | 'error';
    };
    confidenceScore?: number;
}

type AdvisorStatus = 'idle' | 'thinking' | 'executing_tool' | 'error';

// ================================================================================================
// UI SUB-COMPONENTS
// ================================================================================================

/**
 * @description Renders the confidence score for an AI message.
 */
const ConfidenceScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
    const getBarColor = () => {
        if (score > 95) return 'bg-green-500';
        if (score > 90) return 'bg-cyan-500';
        return 'bg-yellow-500';
    };
    return (
        <div className="mt-2 text-xs text-gray-400">
            <p className="mb-1">Heuristic API Confidence</p>
            <div className="flex items-center gap-2">
                <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div className={`${getBarColor()} h-1.5 rounded-full`} style={{ width: `${score}%` }}></div>
                </div>
                <span className="font-mono text-cyan-300">{score}%</span>
            </div>
        </div>
    );
};


/**
 * @description A dedicated component to visualize the AI's tool usage within the chat log.
 * This provides transparency into the AI's actions beyond simple text responses.
 */
const ToolExecutionDisplay: React.FC<{ execution: Message['toolExecution'] }> = ({ execution }) => {
    if (!execution) return null;

    const getStatusColor = () => {
        switch (execution.state) {
            case 'pending': return 'border-yellow-500/50 bg-yellow-900/20 text-yellow-200';
            case 'success': return 'border-green-500/50 bg-green-900/20 text-green-200';
            case 'error': return 'border-red-500/50 bg-red-900/20 text-red-200';
        }
    };

    const StatusIcon = () => {
         switch (execution.state) {
            case 'pending': return (
                <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
            );
            case 'success': return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
            case 'error': return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
        }
    }

    return (
        <div className={`mt-2 p-3 border rounded-lg text-xs ${getStatusColor()}`}>
            <div className="flex items-center font-semibold mb-2">
                <StatusIcon />
                <span className="ml-2">Tool Call: {execution.name}</span>
            </div>
            <pre className="bg-black/20 p-2 rounded text-gray-300 font-mono text-xs overflow-x-auto">
                <code>Arguments: {JSON.stringify(execution.args, null, 2)}</code>
            </pre>
            {execution.result && (
                 <pre className="mt-2 bg-black/20 p-2 rounded text-gray-300 font-mono text-xs overflow-x-auto">
                    <code>Result: {execution.result}</code>
                </pre>
            )}
        </div>
    );
};


// ================================================================================================
// MAIN AI ADVISOR COMPONENT
// ================================================================================================
interface AIAdvisorViewProps {
    previousView: View | null;
}

const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ previousView }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<AdvisorStatus>('idle');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const context = useContext(DataContext);
    
    // Use a ref to hold the Chat instance, preventing re-initialization on re-renders.
    const chatRef = useRef<Chat | null>(null);

    const [examplePrompts, setExamplePrompts] = useState([
        "Analyze my recent spending.",
        "Send $50 to my friend Alex.",
        "How am I doing on my budgets?",
    ]);

    useEffect(() => {
        const getPrompts = () => {
            switch (previousView) {
                case View.Transactions:
                    return [
                        "Analyze my recent spending.",
                        "Flag unusual transactions for me.",
                        "What was my biggest expense last month?",
                    ];
                case View.Investments:
                    return [
                        "How is my portfolio performing?",
                        "Suggest an ESG stock for me to look at.",
                        "What's the outlook for crypto?",
                    ];
                case View.Budgets:
                     return [
                        "Which budget am I closest to exceeding?",
                        "Suggest a way to save money on dining out.",
                        "Help me create a new budget for 'Travel'.",
                    ];
                case View.CorporateCommand:
                    return [
                        "Summarize recent corporate spending.",
                        "Are there any policy violations in the latest transactions?",
                        "Identify the top 3 spending categories for the sales team.",
                    ];
                default:
                    return [
                        "Give me a summary of my financial health.",
                        "Find a way I can save $100 this month.",
                        "What are my upcoming bills?",
                    ];
            }
        };
        setExamplePrompts(getPrompts());
    }, [previousView]);

    const initializeChat = () => {
        if (chatRef.current) return;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const systemInstruction = `You are Quantum, an advanced AI financial advisor integrated into the Demo Bank app. You can analyze financial data and execute tasks on the user's behalf. Be helpful, concise, and always adopt a professional, slightly futuristic persona. You have access to tools to perform actions.`;
            
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: systemInstruction,
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: "get_transaction_summary",
                                    description: "Retrieves a summary of the user's recent transactions.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: "send_money",
                                    description: "Initiates a payment to another user.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {
                                            amount: { type: Type.NUMBER, description: "The amount of money to send." },
                                            recipient: { type: Type.STRING, description: "The name or tag of the person to send money to." },
                                            currency: { type: Type.STRING, description: "The currency of the transaction, e.g., USD." }
                                        },
                                        required: ["amount", "recipient", "currency"]
                                    }
                                }
                            ]
                        }
                    ]
                }
            });

        } catch (err) {
            console.error("AI Advisor initialization error:", err);
            setStatus('error');
            setMessages(prev => [...prev, { id: 'error-init', sender: 'ai', text: "Apologies, my core systems are facing a temporary glitch. Please try again shortly." }]);
        }
    };
    
    useEffect(() => {
        initializeChat();
    }, []);

    const handleSendMessage = async (prompt: string) => {
        if (!prompt.trim() || status !== 'idle') return;
        
        initializeChat(); // Ensure chat is initialized
        if (!chatRef.current) return;

        setStatus('thinking');
        setInput('');

        const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);

        try {
            const chat = chatRef.current;
            let response = await chat.sendMessage({ message: prompt });
            
            // Check for tool calls
            if(response.functionCalls && response.functionCalls.length > 0) {
                 setStatus('executing_tool');
                 // For this demo, we'll just acknowledge the tool call and provide a mock result
                 const toolCall = response.functionCalls[0];
                 const toolMessage: Message = {
                     id: Date.now().toString() + '-tool',
                     sender: 'ai',
                     text: `Alright, I'm on it.`,
                     toolExecution: { name: toolCall.name, args: toolCall.args, state: 'pending' }
                 };
                 setMessages(prev => [...prev, toolMessage]);

                 // Simulate tool execution
                 await new Promise(resolve => setTimeout(resolve, 1500));

                 let toolResultText = '';
                 if (toolCall.name === 'send_money') {
                     toolResultText = `Successfully sent $${toolCall.args.amount} to ${toolCall.args.recipient}.`;
                 } else if (toolCall.name === 'get_transaction_summary') {
                     toolResultText = `Your top spending category this month was 'Dining Out', with a total of $450. Your largest single purchase was for $299.99 at 'New Tech Gadget'.`;
                 }
                 
                 setMessages(prev => prev.map(m => m.id === toolMessage.id ? { ...m, toolExecution: { ...m.toolExecution!, state: 'success', result: toolResultText } } : m));
                 
                 // Send the result back to the model
                 // FIX: The sendMessage method expects a `SendMessageParameters` object. The function response part must be sent as the 'message' property within this object.
                 response = await chat.sendMessage({
                   message: [
                     {
                       functionResponse: {
                         name: toolCall.name,
                         response: {
                           result: toolResultText,
                         },
                       },
                     },
                   ],
                 });
            }
            
            const aiResponse: Message = { 
                id: Date.now().toString() + '-ai', 
                sender: 'ai', 
                text: response.text,
                confidenceScore: 98 // Add a mock score
            };
            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            console.error("AI Advisor send message error:", err);
            const errorResponse: Message = { id: 'error-' + Date.now(), sender: 'ai', text: "I encountered a problem processing that request. Could you try rephrasing it?" };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setStatus('idle');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-gray-800/30 rounded-t-xl border border-b-0 border-gray-700/50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                     <div className="text-center py-16">
                         <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 mb-4">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                         </div>
                         <h2 className="text-2xl font-semibold text-white">Quantum AI Advisor</h2>
                         <p className="text-gray-400 mt-2">Your personal financial assistant. How can I help you today?</p>
                     </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-cyan-600/50 flex items-center justify-center text-cyan-200 font-bold text-sm flex-shrink-0 mt-1">Q</div>}
                        <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            {msg.toolExecution && <ToolExecutionDisplay execution={msg.toolExecution} />}
                            {msg.confidenceScore && <ConfidenceScoreDisplay score={msg.confidenceScore} />}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/50 rounded-b-xl">
                 {messages.length === 0 && (
                     <div className="mb-4">
                         <p className="text-sm text-gray-400 mb-2 text-center">Not sure where to start? Try one of these:</p>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                             {examplePrompts.map((prompt, i) => (
                                 <button key={i} onClick={() => handleSendMessage(prompt)} className="text-sm text-left p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-cyan-200 transition-colors">
                                     {prompt}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={status !== 'idle' ? "Quantum is working..." : "Ask your AI Advisor anything..."}
                        className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        disabled={status !== 'idle'}
                    />
                    <button type="submit" disabled={status !== 'idle' || !input} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};
export default AIAdvisorView;