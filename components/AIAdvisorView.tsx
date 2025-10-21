import React, { useState, useEffect, useRef, useContext, useReducer, useCallback, useMemo } from 'react';
import { View } from '../types';
import Card from './Card';
// FIX: Removed FunctionCallingMode as it's not a valid export. The mode will be set with a string literal.
import { GoogleGenAI, Chat, Content, Part, FunctionDeclaration, Tool } from "@google/genai";
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

export const DETAILED_SYSTEM_INSTRUCTION = `You are Quantum, an advanced AI financial advisor for Demo Bank. Your persona is helpful, professional, witty, and slightly futuristic. Be concise but informative.

You have access to a set of powerful tools to retrieve user data and perform financial calculations. Your primary goal is to assist the user with their financial inquiries by using these tools.

Tool Usage Rules:
1.  **Always Inform:** Before using a tool, tell the user what you are about to do. E.g., "I'll just access your recent transactions to check on that..."
2.  **Acknowledge Results:** After a tool runs, briefly acknowledge the result before presenting your analysis. E.g., "Okay, I've got the data. It looks like..."
3.  **Synthesize, Don't Dump:** Do not just output raw JSON data from tools. Analyze the data and present the key insights in a human-readable format. Use rich content components like tables and charts where appropriate.
4.  **Error Handling:** If a tool returns an error, apologize to the user, state that you couldn't retrieve the information, and ask if they'd like to try something else.
5.  **Proactive Suggestions:** Based on the user's data, provide proactive suggestions. Use the 'actionable_suggestion' rich content type for this.
6.  **Multi-turn Conversations:** Remember the context of the conversation. If a user asks a follow-up question, use the previous messages and tool results to answer.
7.  **Safety First:** Never ask for or store sensitive personal information like passwords or full social security numbers. All data access is handled securely through your tools.`;

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


// --- TOOL DEFINITIONS AND IMPLEMENTATIONS ---

/**
 * Defines the tools available to the AI model.
 * This structure is sent to the AI to inform it of its capabilities.
 */
export const toolDefinitions: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "getFinancialSummary",
                description: "Retrieves a high-level summary of the user's financial health, including total balances, assets, liabilities, and net worth.",
                parameters: { type: "OBJECT", properties: {}, required: [] },
            },
            {
                name: "getTransactions",
                description: "Fetches a list of recent transactions. Can be filtered by various criteria.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        count: { type: "NUMBER", description: "The number of transactions to retrieve. Defaults to 20." },
                        minAmount: { type: "NUMBER", description: "The minimum transaction amount to filter by." },
                        maxAmount: { type: "NUMBER", description: "The maximum transaction amount to filter by." },
                        category: { type: "STRING", description: "Filter transactions by a specific category (e.g., 'Groceries', 'Travel')." },
                    },
                    required: [],
                },
            },
            {
                name: "analyzeSpendingByCategory",
                description: "Calculates and returns the total spending for each category over the last 30 days.",
                parameters: { type: "OBJECT", properties: {}, required: [] },
            },
            {
                name: "simulateInvestmentGrowth",
                description: "Simulates the future value of an investment portfolio based on current holdings, additional monthly contributions, and an estimated annual return rate.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        additionalMonthlyContribution: { type: "NUMBER", description: "The extra amount to invest each month." },
                        years: { type: "NUMBER", description: "The number of years to simulate. Defaults to 10." },
                        annualReturnRate: { type: "NUMBER", description: "The estimated annual return rate as a percentage (e.g., 7 for 7%). Defaults to 7." },
                    },
                    required: ["additionalMonthlyContribution"],
                },
            },
        ],
    },
];

/**
 * Provides the actual implementations for the defined tools.
 * These functions interact with the application's DataContext.
 */
export const useToolImplementations = () => {
    // FIX: useContext returns the context value directly, not an object with a `data` property.
    const context = useContext(DataContext);

    return useMemo(() => ({
        getFinancialSummary: async () => {
            if (!context) return { error: "User data not available." };
            // FIX: Re-implemented logic based on available context data.
            const { transactions, assets } = context;
            const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let runningBalance = 5000; // Assume starting balance from BalanceSummary component
            for (const tx of sortedTx) {
                runningBalance += tx.type === 'income' ? tx.amount : -tx.amount;
            }
            const totalBalance = runningBalance;
            const totalAssetsValue = assets.reduce((sum, asset) => sum + asset.value, 0);
            const totalAssets = totalBalance + totalAssetsValue;
            const totalLiabilities = 0; // Liabilities data not available in context
            const netWorth = totalAssets - totalLiabilities;
            return { totalBalance, totalAssets, totalLiabilities, netWorth };
        },
        getTransactions: async ({ count = 20, minAmount, maxAmount, category }: { count?: number, minAmount?: number, maxAmount?: number, category?: string }) => {
            if (!context) return { error: "User data not available." };
            let filteredTransactions = context.transactions;
            if (minAmount) {
                filteredTransactions = filteredTransactions.filter(t => t.amount >= minAmount);
            }
            if (maxAmount) {
                filteredTransactions = filteredTransactions.filter(t => t.amount <= maxAmount);
            }
            if (category) {
                filteredTransactions = filteredTransactions.filter(t => t.category.toLowerCase() === category.toLowerCase());
            }
            return { transactions: filteredTransactions.slice(0, count) };
        },
        analyzeSpendingByCategory: async () => {
            if (!context) return { error: "User data not available." };
             // FIX: Corrected logic to filter by expense type.
            const spending = context.transactions.reduce<Record<string, number>>((acc, t) => {
                if (t.type === 'expense') {
                    acc[t.category] = (acc[t.category] || 0) + t.amount;
                }
                return acc;
            }, {});
            const sortedSpending = Object.entries(spending)
                .sort(([, a], [, b]) => b - a)
                .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }));
            return { spendingByCategory: sortedSpending };
        },
        // FIX: Replaced Number() with parseFloat() and parseInt() for more robust parsing of potential string values from the AI. This resolves type errors during arithmetic operations.
        simulateInvestmentGrowth: async ({ additionalMonthlyContribution, years = 10, annualReturnRate = 7 }: { additionalMonthlyContribution: any, years?: any, annualReturnRate?: any }) => {
            if (!context) return { error: "User data not available." };
            const P = context.assets.reduce((sum, asset) => sum + asset.value, 0); // Principal
            // FIX: Use parseFloat for more robust parsing of AI-provided string values.
            const PMT = parseFloat(additionalMonthlyContribution);
            // FIX: Use parseFloat for more robust parsing of AI-provided string values.
            const r = parseFloat(annualReturnRate) / 100 / 12; // Monthly interest rate
            // FIX: Use parseInt for more robust parsing of AI-provided string values.
            const n = parseInt(years, 10) * 12; // Number of months
            const simulationData = [];
            let futureValue: number = P;

            for (let i = 1; i <= n; i++) {
                // FIX: All inputs are now consistently numbers, preventing type errors.
                futureValue = futureValue * (1 + r) + PMT;
                if (i % 12 === 0) { // Record data yearly
                    simulationData.push({
                        year: i / 12,
                        value: parseFloat(futureValue.toFixed(2)),
                    });
                }
            }

            return { finalValue: parseFloat(futureValue.toFixed(2)), simulationData };
        },
    }), [context]);
};


// --- CUSTOM HOOK FOR AI CHAT LOGIC ---

/**
 * A comprehensive hook to manage the entire AI Advisor chat lifecycle.
 */
export const useAIAdvisorChat = () => {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const chatRef = useRef<Chat | null>(null);
    const toolImplementations = useToolImplementations();
    // FIX: useContext returns the context value directly.
    const context = useContext(DataContext);

    useEffect(() => {
        if (!chatRef.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                chatRef.current = ai.chats.create({
                    // FIX: Updated model name from deprecated version.
                    model: 'gemini-2.5-pro',
                    config: {
                        systemInstruction: DETAILED_SYSTEM_INSTRUCTION
                    },
                    tools: toolDefinitions,
                    // FIX: Use string literal "AUTO" for the mode.
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                });
            } catch (error) {
                console.error("Failed to initialize GoogleGenAI:", error);
                dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize the AI model. Please check your API key.' });
            }
        }
    }, []);
    
    // Prime the AI with initial context when data is available
    useEffect(() => {
        const primeAI = async () => {
             // FIX: Use `context` directly. Simplified logic to just show a generic welcome.
             if (context && chatRef.current && state.messages.length === 0) {
                const welcomeMessage: EnhancedMessage = {
                    id: `msg_${Date.now()}`,
                    role: 'model',
                    parts: [{ text: "Hello! I'm Quantum, your AI financial advisor. I've reviewed your current financial standing. How can I assist you today?" }],
                    timestamp: new Date(),
                };
                dispatch({ type: 'ADD_MODEL_RESPONSE', payload: welcomeMessage });
            }
        };
        primeAI();
    }, [context, state.messages.length]);


    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || !chatRef.current) return;

        dispatch({ type: 'START_MESSAGE_SEND' });

        const userMessage: EnhancedMessage = {
            id: `msg_user_${Date.now()}`,
            role: 'user',
            parts: [{ text: messageText }],
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
        
        try {
            // FIX: Removed incorrect `history` parameter. The Chat object manages its own history.
            let response = await chatRef.current.sendMessage({ message: messageText });

            while (response.functionCalls && response.functionCalls.length > 0) {
                const toolCalls = response.functionCalls;
                
                const modelMessageWithToolCalls: EnhancedMessage = {
                    id: `msg_model_${Date.now()}`,
                    role: 'model',
                    parts: [...(response.text ? [{text: response.text}] : []), ...toolCalls.map(tc => ({functionCall: tc}))],
                    timestamp: new Date(),
                };
                dispatch({ type: 'ADD_MODEL_RESPONSE', payload: modelMessageWithToolCalls });

                const toolResults: ToolResultPart[] = [];
                for (const call of toolCalls) {
                    dispatch({ type: 'START_TOOL_EXECUTION', payload: call.name });
                    const toolImplementation = (toolImplementations as Record<string, Function>)[call.name];
                    if (toolImplementation) {
                        try {
                            const toolResponseData = await toolImplementation(call.args);
                            toolResults.push({
                                functionResponse: { name: call.name, response: toolResponseData },
                            });
                        } catch (e) {
                             console.error(`Error executing tool ${call.name}:`, e);
                             toolResults.push({
                                functionResponse: { name: call.name, response: { error: `Tool execution failed: ${(e as Error).message}` } },
                            });
                        }
                    } else {
                         toolResults.push({
                            functionResponse: { name: call.name, response: { error: "Tool not found." } },
                        });
                    }
                    dispatch({ type: 'END_TOOL_EXECUTION' });
                }
                
                const toolResultMessage: EnhancedMessage = {
                     id: `msg_tool_${Date.now()}`,
                     role: 'system_tool',
                     parts: toolResults,
                     timestamp: new Date(),
                };
                dispatch({ type: 'ADD_MODEL_RESPONSE', payload: toolResultMessage });

                // Send tool results back to the model
                 // FIX: Pass the toolResults object directly instead of a stringified version.
                 response = await chatRef.current.sendMessage({
                     message: toolResults,
                     isToolResponse: true
                 });
            }

            const finalModelMessage: EnhancedMessage = {
                id: `msg_model_final_${Date.now()}`,
                role: 'model',
                parts: [{ text: response.text }],
                timestamp: new Date(),
            };
            dispatch({ type: 'ADD_MODEL_RESPONSE', payload: finalModelMessage });

        } catch (error) {
            console.error("AI Advisor Error:", error);
            dispatch({ type: 'SET_ERROR', payload: "I apologize, but I've encountered a system error. Please try your request again." });
        }
    }, [toolImplementations]);
    
    const resetChat = useCallback(() => {
        chatRef.current = null; // Force re-initialization on next message
        dispatch({ type: 'RESET_CHAT' });
    }, []);

    return { state, sendMessage, resetChat };
};

// --- RICH CONTENT RENDERER COMPONENTS ---

// FIX: Corrected prop typing for all Rich Content components using `Extract` to avoid type errors.
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
                    {messages.length <= 1 && !isLoading && (
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
            </Card>
        </div>
    );
};

export default AIAdvisorView;
