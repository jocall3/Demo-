import React, { useState, useEffect, useRef, useContext, useReducer, useCallback, useMemo } from 'react';
import { View, Transaction } from '../types';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

// --- INLINE SVG ICONS (Replaced react-icons) ---
const FaRobot: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 10h-2V7h2v3zm-2 2h2v2h-2v-2zm-3-2H7v2h2v-2zm8 0h-2v2h2v-2z"></path><circle cx="12" cy="12" r="2"></circle></svg>
);
const FaUser: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M12 6c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3zm0 10c-2.674 0-8 1.339-8 4v2h16v-2c0-2.661-5.326-4-8-4z"></path></svg>
);
const FaTools: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M20.84 3.9l-1.42 1.42c1.78 1.78 2.87 4.24 2.87 6.94s-1.08 5.16-2.87 6.94l1.42 1.42C23.43 18.07 24 15.14 24 12s-.57-6.07-3.16-8.1zm-3.54 3.54c.95.95 1.54 2.26 1.54 3.66s-.58 2.71-1.54 3.66l1.41 1.41c1.71-1.71 2.75-4.02 2.75-6.57s-1.04-4.86-2.75-6.57L17.3 7.44zM2 12c0-3.14.99-6.07 2.65-8.38L3.23 2.2C.57 5.93 0 8.86 0 12s.57 6.07 3.23 9.8l1.42-1.42C2.99 18.07 2 15.14 2 12z"></path><path d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"></path><path d="M8.11 6.38 6.7 4.96C5.04 6.63 4 8.94 4 11.4c0 .56.08 1.12.22 1.66l1.46-1.46c-.05-.23-.08-.47-.08-.7 0-1.77 1.02-3.29 2.5-4.02z"></path></svg>
);
const FaExclamationCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M11 11h2v6h-2zm0-4h2v2h-2z"></path></svg>
);
const FaClipboard: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM5 19V5h14l.002 14H5z"></path><path d="M10 10h4v4h-4zm-1-5h6v2h-6z"></path></svg>
);
const FaClipboardCheck: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="m13.354 11.646-2-2-.708.708L12.293 13l-1.647 1.646.708.708 2-2a.5.5 0 0 0 0-.708z"></path><path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM5 19V5h14l.002 14H5z"></path><path d="M9 4h6v2H9z"></path></svg>
);
const FaRedo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M21 8c-1.423 0-2.7.543-3.678 1.414L14.414 6.5C14.776 6.177 15 5.696 15 5.165V3c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v2c0 1.103.897 2 2 2h7.322l-4.702 4.702A4.954 4.954 0 0 0 5.014 13c-1.423 0-2.7.543-3.678 1.414A4.954 4.954 0 0 0 0 17.914C0 20.729 2.271 23 5.086 23c2.815 0 5.086-2.271 5.086-5.086 0-.704-.153-1.373-.418-2L13 12.678V16c0 1.103.897 2 2 2h5c1.103 0 2-.897 2-2v-2c0-1.103-.897-2-2-2zM5.086 21C3.391 21 2 19.609 2 17.914c0-1.139.63-2.13 1.554-2.617A2.96 2.96 0 0 1 5.086 15c1.695 0 3.086 1.391 3.086 3.086S6.781 21 5.086 21z"></path></svg>
);

// --- ENHANCED TYPES FOR A REAL-WORLD APPLICATION ---

export type ToolCallPart = {
    functionCall: {
        name: string;
        args: Record<string, any>;
    };
};

export type ToolResultPart = {
    functionResponse: {
        name: string;
        response: Record<string, any>;
    };
};

export type RichContent = {
    type: 'table';
    data: {
        headers: string[];
        rows: (string | number)[][];
    };
} | {
    type: 'bar_chart';
    data: {
        dataKey: string;
        items: Record<string, string | number>[];
    };
} | {
    type: 'line_chart';
    data: {
        dataKeyX: string;
        dataKeyY: string;
        items: Record<string, string | number>[];
    };
} | {
    type: 'financial_summary';
    data: {
        totalBalance: number;
        totalAssets: number;
        totalLiabilities: number;
        netWorth: number;
    };
} | {
    type: 'actionable_suggestion';
    data: {
        title: string;
        description: string;
        actionText: string;
        actionPayload: Record<string, any>;
    };
};

export type RichContentPart = {
    richContent: RichContent;
};

export type MessagePart = { text: string } | ToolCallPart | ToolResultPart | RichContentPart;

export type EnhancedMessage = {
    id: string;
    role: 'user' | 'model' | 'system_tool';
    parts: MessagePart[];
    timestamp: Date;
};

export type ChatState = {
    conversationId: string;
    messages: EnhancedMessage[];
    isLoading: boolean;
    error: string | null;
    isToolExecuting: boolean;
    toolExecutionName: string | null;
};

export type ChatAction =
    | { type: 'START_MESSAGE_SEND' }
    | { type: 'ADD_USER_MESSAGE'; payload: EnhancedMessage }
    | { type: 'ADD_MODEL_RESPONSE'; payload: EnhancedMessage }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'CLEAR_ERROR' }
    | { type: 'START_TOOL_EXECUTION'; payload: string }
    | { type: 'END_TOOL_EXECUTION' }
    | { type: 'RESET_CHAT' };

// --- CONSTANTS AND CONFIGURATIONS ---

export const examplePrompts = {
    [View.Dashboard]: ["Summarize my financial health.", "Are there any anomalies I should be aware of?", "Project my balance for the next 6 months."],
    [View.Transactions]: ["Find all my transactions over $100.", "What was my biggest expense last month?", "Show my spending by category in a bar chart."],
    [View.Budgets]: ["How am I doing on my budgets?", "Suggest a new budget for 'Entertainment'.", "Where can I cut back on spending?"],
    [View.Investments]: ["What's the performance of my stock portfolio?", "Explain ESG investing to me.", "Simulate my portfolio growth with an extra $200/month."],
    DEFAULT: ["What's my total balance?", "Help me create a savings goal.", "Explain how my credit score is calculated."]
};

// --- REDUCER FOR COMPLEX CHAT STATE MANAGEMENT ---

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
        case 'START_MESSAGE_SEND':
            return { ...state, isLoading: true, error: null };
        case 'ADD_USER_MESSAGE':
            return { ...state, messages: [...state.messages, action.payload] };
        case 'ADD_MODEL_RESPONSE':
            return { ...state, messages: [...state.messages, action.payload], isLoading: false };
        case 'SET_ERROR':
            return { ...state, isLoading: false, isToolExecuting: false, error: action.payload };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'START_TOOL_EXECUTION':
            return { ...state, isToolExecuting: true, toolExecutionName: action.payload };
        case 'END_TOOL_EXECUTION':
            return { ...state, isToolExecuting: false, toolExecutionName: null };
        case 'RESET_CHAT':
            return {
                ...initialChatState,
                conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            };
        default:
            return state;
    }
};

export const initialChatState: ChatState = {
    conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    messages: [],
    isLoading: false,
    error: null,
    isToolExecuting: false,
    toolExecutionName: null,
};


// --- CUSTOM HOOK FOR AI CHAT LOGIC (BFF ARCHITECTURE) ---

/**
 * A comprehensive hook to manage the entire AI Advisor chat lifecycle, 
 * interacting with the Backend-for-Frontend (BFF) instead of directly with the AI SDK.
 */
export const useAIAdvisorChat = () => {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const dataContext = useContext(DataContext);

    // Effect to fetch initial welcome message from the BFF
    useEffect(() => {
        const fetchWelcomeMessage = async () => {
            if (state.messages.length > 0) return; // Only fetch if conversation is new

            dispatch({ type: 'START_MESSAGE_SEND' });
            try {
                // This endpoint starts a new session on the BFF and gets a greeting
                const response = await fetch('/api/advisor/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isNewSession: true }),
                });

                if (!response.ok) {
                    throw new Error('Failed to connect to AI Advisor.');
                }

                const newMessages: EnhancedMessage[] = await response.json();
                
                for (const msg of newMessages) {
                    dispatch({ type: 'ADD_MODEL_RESPONSE', payload: msg });
                }

            } catch (error) {
                console.error("AI Advisor initialization error:", error);
                dispatch({ type: 'SET_ERROR', payload: "Failed to connect to the AI Advisor. Please try again later." });
            }
        };

        fetchWelcomeMessage();
    }, [state.conversationId]); // Re-fetch welcome message if chat is reset

    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || !dataContext) return;

        dispatch({ type: 'START_MESSAGE_SEND' });

        const userMessage: EnhancedMessage = {
            id: `msg_user_${Date.now()}`,
            role: 'user',
            parts: [{ text: messageText }],
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
        
        const history = [...state.messages, userMessage];

        try {
            const response = await fetch('/api/advisor/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // The BFF receives the entire history to maintain context
                body: JSON.stringify({ history, conversationId: state.conversationId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'The AI Advisor is currently unavailable.'}));
                throw new Error(errorData.message);
            }

            // The BFF returns an array of messages representing the AI's full turn
            const newMessages: EnhancedMessage[] = await response.json();

            for (const msg of newMessages) {
                // Check for a special action from the BFF, e.g., to create a transaction
                const toolResult = msg.parts.find(p => 'functionResponse' in p) as ToolResultPart | undefined;
                if (toolResult?.functionResponse.name === 'send_money' && toolResult.functionResponse.response.success) {
                    const { recipient, amount } = toolResult.functionResponse.response.details;
                    dataContext.addTransaction({
                        id: `tx_${Date.now()}`,
                        type: 'expense',
                        category: 'Transfer',
                        description: `Sent to ${recipient}`,
                        amount: amount,
                        date: new Date().toISOString().split('T')[0],
                    });
                }
                
                dispatch({ type: 'ADD_MODEL_RESPONSE', payload: msg });
            }

        } catch (error) {
            console.error("AI Advisor Error:", error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : "An unexpected error occurred." });
        }
    }, [state.messages, state.conversationId, dataContext]);
    
    const resetChat = useCallback(() => {
        dispatch({ type: 'RESET_CHAT' });
    }, []);

    return { state, sendMessage, resetChat };
};

// --- RICH CONTENT RENDERER COMPONENTS ---

export const FinancialSummaryCard: React.FC<{ data: Extract<RichContent, { type: 'financial_summary' }>['data'] }> = ({ data }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h4 className="text-lg font-bold text-cyan-300 mb-3">Financial Snapshot</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="font-semibold text-gray-400">Total Balance:</div>
            <div className="text-right text-white">${data.totalBalance.toLocaleString()}</div>
            <div className="font-semibold text-gray-400">Total Assets:</div>
            <div className="text-right text-white">${data.totalAssets.toLocaleString()}</div>
            <div className="font-semibold text-gray-400">Total Liabilities:</div>
            <div className="text-right text-red-400">${data.totalLiabilities.toLocaleString()}</div>
            <div className="col-span-2 border-t border-gray-600 my-1"></div>
            <div className="font-bold text-gray-300">Net Worth:</div>
            <div className="text-right font-bold text-cyan-400">${data.netWorth.toLocaleString()}</div>
        </div>
    </div>
);

export const DataTable: React.FC<{ data: Extract<RichContent, { type: 'table' }>['data'] }> = ({ data }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50">
                <tr>{data.headers.map(h => <th key={h} scope="col" className="px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
                {data.rows.map((row, i) => (
                    <tr key={i} className="bg-gray-800/30 border-b border-gray-700 hover:bg-gray-700/50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2">{typeof cell === 'number' ? `$${cell.toLocaleString()}` : cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const DataBarChart: React.FC<{ data: Extract<RichContent, { type: 'bar_chart' }>['data'] }> = ({ data }) => (
    <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <ResponsiveContainer>
            <BarChart data={data.items}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip cursor={{ fill: '#4A5568' }} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }} />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Bar dataKey={data.dataKey} fill="#2DD4BF" name="Amount" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const DataLineChart: React.FC<{ data: Extract<RichContent, { type: 'line_chart' }>['data'] }> = ({ data }) => (
     <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <ResponsiveContainer>
            <LineChart data={data.items}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey={data.dataKeyX} stroke="#A0AEC0" fontSize={12} />
                <YAxis stroke="#A0AEC0" fontSize={12} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}/>
                <Tooltip cursor={{ fill: '#4A5568' }} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }} formatter={(value:number) => `$${value.toLocaleString()}`} />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Line type="monotone" dataKey={data.dataKeyY} stroke="#2DD4BF" strokeWidth={2} dot={false} name="Portfolio Value" />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export const ActionableSuggestion: React.FC<{ data: Extract<RichContent, { type: 'actionable_suggestion' }>['data'], onAction: (payload: any) => void }> = ({ data, onAction }) => (
    <div className="bg-cyan-900/50 p-4 rounded-lg border border-cyan-700">
        <h4 className="text-lg font-bold text-cyan-300 mb-2">{data.title}</h4>
        <p className="text-gray-300 text-sm mb-4">{data.description}</p>
        <button
            onClick={() => onAction(data.actionPayload)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
        >
            {data.actionText}
        </button>
    </div>
);


export const RichContentRenderer: React.FC<{ content: RichContent, onAction: (payload: any) => void }> = ({ content, onAction }) => {
    switch (content.type) {
        case 'table':
            return <DataTable data={content.data} />;
        case 'bar_chart':
            return <DataBarChart data={content.data} />;
        case 'line_chart':
            return <DataLineChart data={content.data} />;
        case 'financial_summary':
            return <FinancialSummaryCard data={content.data} />;
        case 'actionable_suggestion':
            return <ActionableSuggestion data={content.data} onAction={onAction} />;
        default:
            return <div className="text-red-500">Unsupported rich content type</div>;
    }
};

// --- UI COMPONENTS FOR CHAT ---

export const CopyToClipboardButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-600/50 rounded-md hover:bg-gray-500/50 text-gray-300 hover:text-white transition-colors">
            {copied ? <FaClipboardCheck /> : <FaClipboard />}
        </button>
    );
};


export const MessageRenderer: React.FC<{ message: EnhancedMessage, onAction: (payload: any) => void }> = ({ message, onAction }) => {
    const { role, parts, timestamp } = message;

    const renderIcon = () => {
        switch (role) {
            case 'user': return <FaUser className="h-6 w-6 text-cyan-300" />;
            case 'model': return <FaRobot className="h-6 w-6 text-cyan-300" />;
            case 'system_tool': return <FaTools className="h-6 w-6 text-gray-400" />;
            default: return null;
        }
    };
    
    const isUser = role === 'user';
    const messageAlignment = isUser ? 'items-end' : 'items-start';
    const bubbleStyle = isUser
        ? 'bg-cyan-600 text-white'
        : 'bg-gray-700 text-gray-200';
    
    return (
        <div className={`flex flex-col ${messageAlignment} group`}>
            <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1">{renderIcon()}</div>
                <div className={`max-w-xl p-3 rounded-lg shadow-md relative ${bubbleStyle}`}>
                    <div className="space-y-3">
                    {parts.map((part, index) => {
                        if ('text' in part && part.text) {
                            return <p key={index} className="whitespace-pre-wrap">{part.text}</p>;
                        }
                        if ('functionCall' in part) {
                            return (
                                <div key={index} className="text-xs text-gray-400 italic bg-gray-800/40 p-2 rounded-md">
                                    <p><strong>Tool Call:</strong> <code>{part.functionCall.name}</code></p>
                                    <pre className="text-xs mt-1">Args: {JSON.stringify(part.functionCall.args, null, 2)}</pre>
                                </div>
                            );
                        }
                        if ('functionResponse' in part) {
                            return (
                                <div key={index} className="text-xs text-gray-400 italic bg-gray-800/40 p-2 rounded-md">
                                    <p><strong>Tool Result for <code>{part.functionResponse.name}</code>:</strong></p>
                                    <pre className="text-xs mt-1">{JSON.stringify(part.functionResponse.response, null, 2)}</pre>
                                </div>
                            );
                        }
                        if ('richContent' in part) {
                            return <RichContentRenderer key={index} content={part.richContent} onAction={onAction} />;
                        }
                        return null;
                    })}
                    </div>
                    {parts.some(p => 'text' in p) && <CopyToClipboardButton text={parts.filter(p => 'text' in p).map(p => (p as {text:string}).text).join('\n')} />}
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 px-11">{new Date(timestamp).toLocaleTimeString()}</p>
        </div>
    );
};

// --- MAIN AI ADVISOR VIEW COMPONENT ---

const AIAdvisorView: React.FC<{ previousView: View | null }> = ({ previousView }) => {
    const { state, sendMessage, resetChat } = useAIAdvisorChat();
    const { messages, isLoading, error, isToolExecuting, toolExecutionName } = state;
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim()) return;
        setInput('');
        await sendMessage(messageText);
    };

    const handleSuggestionClick = (prompt: string) => {
        handleSendMessage(prompt);
    };
    
    const handleAction = (payload: any) => {
        // In a real app, this would trigger a modal, navigation, or API call
        const actionMessage = `The user wants to perform an action: ${JSON.stringify(payload)}`;
        handleSendMessage(actionMessage);
    };

    const prompts = examplePrompts[previousView || 'DEFAULT'] || examplePrompts.DEFAULT;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white tracking-wider">AI Advisor (Quantum)</h2>
                <button 
                  onClick={resetChat} 
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  aria-label="Reset conversation"
                >
                    <FaRedo className="h-5 w-5" />
                </button>
            </div>
            <Card className="flex-1 flex flex-col" padding="none">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {messages.length <= 1 && !isLoading && !error && (
                        <div className="text-center p-6 text-gray-400">
                            <p className="mb-4">Since you just came from the <strong className="text-cyan-300">{previousView || 'Dashboard'}</strong>, you could ask:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {prompts.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handleSuggestionClick(p)}
                                        className="p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-cyan-200 transition-colors text-left"
                                    >
                                        "{p}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {messages.map((msg) => (
                       <MessageRenderer key={msg.id} message={msg} onAction={handleAction} />
                    ))}
                    
                    {isLoading && !isToolExecuting && (
                        <div className="flex items-start gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1"><FaRobot className="h-6 w-6 text-cyan-300"/></div>
                             <div className="max-w-lg p-3 rounded-lg shadow-md bg-gray-700 text-gray-200 flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
                             </div>
                        </div>
                    )}

                    {isToolExecuting && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 p-2">
                             <FaTools className="animate-spin text-cyan-400" />
                             <span>Accessing tool: <strong>{toolExecutionName}...</strong></span>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>
                
                {error && (
                    <div className="p-4 border-t border-red-500/50 bg-red-900/30 text-red-300 flex items-center gap-3">
                         <FaExclamationCircle className="h-5 w-5 flex-shrink-0" />
                         <p className="text-sm">{error}</p>
                    </div>
                )}

                <div className="p-4 border-t border-gray-700/60 bg-gray-800/50 rounded-b-xl">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Quantum anything..."
                            className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                            disabled={isLoading || !!error}
                            aria-label="Chat input for AI Advisor"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center w-24 transition-colors"
                            disabled={isLoading || !input.trim() || !!error}
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
            </Card>
        </div>
    );
};

export default AIAdvisorView;
