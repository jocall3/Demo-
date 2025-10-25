/**
 * @file components/AIAdvisorView.tsx
 * @description This file contains the AI Advisor chat component, refactored to align with the new frontend architecture.
 *
 * ARCHITECTURAL REFACTOR:
 * - Server State Management: All interactions with the backend (fetching responses, etc.) are now managed by TanStack Query (`useMutation`, `useQueryClient`), replacing the previous fetch-based implementation within `useReducer` and `useEffect`.
 * - Data Fetching: Communication is done via GraphQL mutations to the `ai-agent-service` subgraph, rather than a monolithic REST-like BFF endpoint.
 * - Decoupling: The component is now fully decoupled from the global `DataContext`. Side effects, such as updating transaction lists after a `send_money` tool call, are handled by invalidating the relevant React Query cache (`queryClient.invalidateQueries`), promoting a reactive and consistent UI.
 * - Documentation: Comprehensive TSDoc has been added to all types, components, and hooks to improve maintainability and developer experience, as per the new documentation mandate.
 */

import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View, Transaction } from '../types';
import Card from './Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

// --- GRAPHQL DEFINITIONS ---

const ASK_AI_ADVISOR_MUTATION = `
  mutation AskAIAdvisor($history: [ContentInput!]!, $message: String!) {
    askAIAdvisor(history: $history, message: $message) {
      messages {
        id
        role
        timestamp
        parts {
          text
          # In a full implementation, the backend would return structured tool calls/results
          # For now, we rely on text parsing for simplicity in this component.
        }
      }
    }
  }
`;

// --- INLINE SVG ICONS ---
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

// --- TYPES FOR CHAT & RICH CONTENT ---

/** @description A part of a message representing an AI tool call. */
export type ToolCallPart = { functionCall: { name: string; args: Record<string, any>; }; };
/** @description A part of a message representing the result of an AI tool execution. */
export type ToolResultPart = { functionResponse: { name: string; response: Record<string, any>; }; };
/** @description Represents structured, renderable content from the AI, like charts or tables. */
export type RichContent = { type: 'table'; data: { headers: string[]; rows: (string | number)[][]; }; } | { type: 'bar_chart'; data: { dataKey: string; items: Record<string, string | number>[]; }; } | { type: 'line_chart'; data: { dataKeyX: string; dataKeyY: string; items: Record<string, string | number>[]; }; } | { type: 'financial_summary'; data: { totalBalance: number; totalAssets: number; totalLiabilities: number; netWorth: number; }; } | { type: 'actionable_suggestion'; data: { title: string; description: string; actionText: string; actionPayload: Record<string, any>; }; };
/** @description A part of a message containing rich content. */
export type RichContentPart = { richContent: RichContent; };
/** @description A union type for all possible parts of a single message. */
export type MessagePart = { text: string } | ToolCallPart | ToolResultPart | RichContentPart;

/** @description Represents a single, complete message in the chat history. */
export type EnhancedMessage = { id: string; role: 'user' | 'model' | 'system_tool'; parts: MessagePart[]; timestamp: Date; };

/** @description The state shape for the AI chat managed by the reducer. */
export type ChatState = { conversationId: string; messages: EnhancedMessage[]; isLoading: boolean; error: string | null; isToolExecuting: boolean; toolExecutionName: string | null; };

/** @description The possible actions that can be dispatched to the chat reducer. */
export type ChatAction = | { type: 'START_MESSAGE_SEND' } | { type: 'ADD_USER_MESSAGE'; payload: EnhancedMessage } | { type: 'ADD_MODEL_RESPONSE'; payload: EnhancedMessage } | { type: 'SET_ERROR'; payload: string } | { type: 'CLEAR_ERROR' } | { type: 'START_TOOL_EXECUTION'; payload: string } | { type: 'END_TOOL_EXECUTION' } | { type: 'RESET_CHAT' };

// --- CONSTANTS AND CONFIGURATIONS ---

/** @description A map of suggested user prompts based on the previous view they navigated from. */
export const examplePrompts = {
    [View.Dashboard]: ["Summarize my financial health.", "Are there any anomalies I should be aware of?", "Project my balance for the next 6 months."],
    [View.Transactions]: ["Find all my transactions over $100.", "What was my biggest expense last month?", "Show my spending by category in a bar chart."],
    [View.Budgets]: ["How am I doing on my budgets?", "Suggest a new budget for 'Entertainment'.", "Where can I cut back on spending?"],
    [View.Investments]: ["What's the performance of my stock portfolio?", "Explain ESG investing to me.", "Simulate my portfolio growth with an extra $200/month."],
    DEFAULT: ["What's my total balance?", "Help me create a savings goal.", "Explain how my credit score is calculated."]
};

// --- REDUCER FOR COMPLEX CHAT STATE MANAGEMENT ---

/**
 * @description The reducer function for managing the AI chat's complex state transitions.
 * @param {ChatState} state The current state.
 * @param {ChatAction} action The action to process.
 * @returns {ChatState} The new state.
 */
export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
        case 'START_MESSAGE_SEND': return { ...state, isLoading: true, error: null };
        case 'ADD_USER_MESSAGE': return { ...state, messages: [...state.messages, action.payload] };
        case 'ADD_MODEL_RESPONSE': return { ...state, messages: [...state.messages, action.payload], isLoading: false };
        case 'SET_ERROR': return { ...state, isLoading: false, isToolExecuting: false, error: action.payload };
        case 'CLEAR_ERROR': return { ...state, error: null };
        case 'START_TOOL_EXECUTION': return { ...state, isToolExecuting: true, toolExecutionName: action.payload };
        case 'END_TOOL_EXECUTION': return { ...state, isToolExecuting: false, toolExecutionName: null };
        case 'RESET_CHAT': return { ...initialChatState, conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
        default: return state;
    }
};

/** @description The initial state for a new chat session. */
export const initialChatState: ChatState = {
    conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    messages: [],
    isLoading: false,
    error: null,
    isToolExecuting: false,
    toolExecutionName: null,
};


// --- CUSTOM HOOK FOR AI CHAT LOGIC (TANSTACK QUERY ARCHITECTURE) ---

/**
 * @description API function to send a message to the AI advisor via the GraphQL gateway.
 * @param {object} variables The variables for the mutation, including history and new message.
 * @returns {Promise<EnhancedMessage[]>} A promise that resolves to the new messages from the AI.
 */
async function askAdvisorApi(variables: { history: any[], message: string }): Promise<EnhancedMessage[]> {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ASK_AI_ADVISOR_MUTATION, variables }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'The AI Advisor is currently unavailable.' }));
        throw new Error(errorData.message);
    }
    
    const { data, errors } = await response.json();
    if (errors) throw new Error(errors[0].message);
    return data.askAIAdvisor.messages;
}

/**
 * @description A hook to manage the entire AI Advisor chat lifecycle.
 * It uses TanStack Query for server state mutations and a local reducer for UI state.
 * @returns An object containing the chat state and functions to interact with the chat.
 */
export const useAIAdvisorChat = () => {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const queryClient = useQueryClient();

    const sendMessageMutation = useMutation({
        mutationFn: askAdvisorApi,
        onSuccess: (newMessages) => {
            for (const msg of newMessages) {
                // In a real implementation with structured tool results, this logic would be more robust.
                const toolResultText = msg.parts.find(p => 'text' in p && (p.text.includes('send_money') || p.text.includes('Sent to'))) as { text: string } | undefined;
                if (toolResultText) {
                    queryClient.invalidateQueries({ queryKey: ['transactions'] });
                    queryClient.invalidateQueries({ queryKey: ['balanceSummary'] });
                }
                dispatch({ type: 'ADD_MODEL_RESPONSE', payload: msg });
            }
        },
        onError: (error: Error) => {
            dispatch({ type: 'SET_ERROR', payload: error.message || "An unexpected error occurred." });
        }
    });

    useEffect(() => {
        if (state.messages.length > 0) return;
        dispatch({ type: 'START_MESSAGE_SEND' });
        sendMessageMutation.mutate({ history: [], message: 'INITIAL_GREETING' }); // Backend handles special greeting message
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.conversationId]);

    const sendMessage = useCallback((messageText: string) => {
        if (!messageText.trim()) return;
        dispatch({ type: 'START_MESSAGE_SEND' });

        const userMessage: EnhancedMessage = {
            id: `msg_user_${Date.now()}`,
            role: 'user',
            parts: [{ text: messageText }],
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
        
        const history = [...state.messages, userMessage].map(m => ({ 
            role: m.role, 
            parts: m.parts.filter(p => 'text' in p).map(p => ({ text: (p as {text:string}).text }))
        }));

        sendMessageMutation.mutate({ history, message: messageText });
    }, [state.messages, sendMessageMutation]);
    
    const resetChat = useCallback(() => {
        dispatch({ type: 'RESET_CHAT' });
    }, []);

    return { state, sendMessage, resetChat, isLoading: sendMessageMutation.isPending };
};

// --- RICH CONTENT RENDERER COMPONENTS ---

/** @description Renders a card with a snapshot of financial summary data. */
export const FinancialSummaryCard: React.FC<{ data: Extract<RichContent, { type: 'financial_summary' }>['data'] }> = ({ data }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h4 className="text-lg font-bold text-cyan-300 mb-3">Financial Snapshot</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="font-semibold text-gray-400">Total Balance:</div><div className="text-right text-white">${data.totalBalance.toLocaleString()}</div>
            <div className="font-semibold text-gray-400">Total Assets:</div><div className="text-right text-white">${data.totalAssets.toLocaleString()}</div>
            <div className="font-semibold text-gray-400">Total Liabilities:</div><div className="text-right text-red-400">${data.totalLiabilities.toLocaleString()}</div>
            <div className="col-span-2 border-t border-gray-600 my-1"></div>
            <div className="font-bold text-gray-300">Net Worth:</div><div className="text-right font-bold text-cyan-400">${data.netWorth.toLocaleString()}</div>
        </div>
    </div>
);

/** @description Renders data in a structured HTML table. */
export const DataTable: React.FC<{ data: Extract<RichContent, { type: 'table' }>['data'] }> = ({ data }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50"><tr>{data.headers.map(h => <th key={h} scope="col" className="px-4 py-2">{h}</th>)}</tr></thead>
            <tbody>{data.rows.map((row, i) => (<tr key={i} className="bg-gray-800/30 border-b border-gray-700 hover:bg-gray-700/50">{row.map((cell, j) => <td key={j} className="px-4 py-2">{typeof cell === 'number' ? `$${cell.toLocaleString()}` : cell}</td>)}</tr>))}</tbody>
        </table>
    </div>
);

/** @description Renders data as a bar chart using Recharts. */
export const DataBarChart: React.FC<{ data: Extract<RichContent, { type: 'bar_chart' }>['data'] }> = ({ data }) => (
    <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <ResponsiveContainer><BarChart data={data.items}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} /><Tooltip cursor={{ fill: '#4A5568' }} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }} /><Legend wrapperStyle={{fontSize: "12px"}}/><Bar dataKey={data.dataKey} fill="#2DD4BF" name="Amount" /></BarChart></ResponsiveContainer>
    </div>
);

/** @description Renders data as a line chart using Recharts. */
export const DataLineChart: React.FC<{ data: Extract<RichContent, { type: 'line_chart' }>['data'] }> = ({ data }) => (
     <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <ResponsiveContainer><LineChart data={data.items}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey={data.dataKeyX} stroke="#A0AEC0" fontSize={12} /><YAxis stroke="#A0AEC0" fontSize={12} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}/><Tooltip cursor={{ fill: '#4A5568' }} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }} formatter={(value:number) => `$${value.toLocaleString()}`} /><Legend wrapperStyle={{fontSize: "12px"}}/><Line type="monotone" dataKey={data.dataKeyY} stroke="#2DD4BF" strokeWidth={2} dot={false} name="Portfolio Value" /></LineChart></ResponsiveContainer>
    </div>
);

/** @description Renders an actionable suggestion from the AI with a button. */
export const ActionableSuggestion: React.FC<{ data: Extract<RichContent, { type: 'actionable_suggestion' }>['data'], onAction: (payload: any) => void }> = ({ data, onAction }) => (
    <div className="bg-cyan-900/50 p-4 rounded-lg border border-cyan-700"><h4 className="text-lg font-bold text-cyan-300 mb-2">{data.title}</h4><p className="text-gray-300 text-sm mb-4">{data.description}</p><button onClick={() => onAction(data.actionPayload)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors">{data.actionText}</button></div>
);

/** @description A component that dynamically renders different types of rich content from the AI. */
export const RichContentRenderer: React.FC<{ content: RichContent, onAction: (payload: any) => void }> = ({ content, onAction }) => {
    switch (content.type) {
        case 'table': return <DataTable data={content.data} />;
        case 'bar_chart': return <DataBarChart data={content.data} />;
        case 'line_chart': return <DataLineChart data={content.data} />;
        case 'financial_summary': return <FinancialSummaryCard data={content.data} />;
        case 'actionable_suggestion': return <ActionableSuggestion data={content.data} onAction={onAction} />;
        default: return <div className="text-red-500">Unsupported rich content type</div>;
    }
};

// --- UI COMPONENTS FOR CHAT ---

/** @description A button that copies the provided text to the clipboard. */
export const CopyToClipboardButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-600/50 rounded-md hover:bg-gray-500/50 text-gray-300 hover:text-white transition-colors">{copied ? <FaClipboardCheck /> : <FaClipboard />}</button>;
};

/** @description Renders a single message in the chat, handling different roles and content types. */
export const MessageRenderer: React.FC<{ message: EnhancedMessage, onAction: (payload: any) => void }> = ({ message, onAction }) => {
    const { role, parts, timestamp } = message;
    const renderIcon = () => { switch (role) { case 'user': return <FaUser className="h-6 w-6 text-cyan-300" />; case 'model': return <FaRobot className="h-6 w-6 text-cyan-300" />; case 'system_tool': return <FaTools className="h-6 w-6 text-gray-400" />; default: return null; } };
    const isUser = role === 'user';
    const messageAlignment = isUser ? 'items-end' : 'items-start';
    const bubbleStyle = isUser ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200';
    return (
        <div className={`flex flex-col ${messageAlignment} group`}>
            <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1">{renderIcon()}</div>
                <div className={`max-w-xl p-3 rounded-lg shadow-md relative ${bubbleStyle}`}>
                    <div className="space-y-3">
                    {parts.map((part, index) => {
                        if ('text' in part && part.text) { return <p key={index} className="whitespace-pre-wrap">{part.text}</p>; }
                        if ('richContent' in part) { return <RichContentRenderer key={index} content={part.richContent} onAction={onAction} />; }
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

/**
 * @description The main view for the AI Advisor chat interface.
 * @param {object} props The component props.
 * @param {View | null} props.previousView The view the user navigated from, used for contextual prompts.
 * @returns {React.ReactElement} The rendered AI Advisor component.
 */
const AIAdvisorView: React.FC<{ previousView: View | null }> = ({ previousView }) => {
    const { state, sendMessage, resetChat, isLoading } = useAIAdvisorChat();
    const { messages, error, isToolExecuting, toolExecutionName } = state;
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSendMessage = (messageText: string) => { if (!messageText.trim()) return; setInput(''); sendMessage(messageText); };
    const handleSuggestionClick = (prompt: string) => { handleSendMessage(prompt); };
    const handleAction = (payload: any) => { const actionMessage = `The user wants to perform an action: ${JSON.stringify(payload)}`; handleSendMessage(actionMessage); };

    const prompts = examplePrompts[previousView || 'DEFAULT'] || examplePrompts.DEFAULT;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-white tracking-wider">AI Advisor (Quantum)</h2><button onClick={resetChat} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Reset conversation"><FaRedo className="h-5 w-5" /></button></div>
            <Card className="flex-1 flex flex-col" padding="none">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {messages.length <= 1 && !isLoading && !error && (
                        <div className="text-center p-6 text-gray-400">
                            <p className="mb-4">Since you just came from the <strong className="text-cyan-300">{previousView || 'Dashboard'}</strong>, you could ask:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {prompts.map(p => <button key={p} onClick={() => handleSuggestionClick(p)} className="p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-cyan-200 transition-colors text-left">"{p}"</button>)}
                            </div>
                        </div>
                    )}
                    {messages.map((msg) => <MessageRenderer key={msg.id} message={msg} onAction={handleAction} />)}
                    {isLoading && !isToolExecuting && (<div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1"><FaRobot className="h-6 w-6 text-cyan-300"/></div><div className="max-w-lg p-3 rounded-lg shadow-md bg-gray-700 text-gray-200 flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75"></div><div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div><div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></div></div></div>)}
                    {isToolExecuting && (<div className="flex items-center justify-center gap-2 text-sm text-gray-400 p-2"><FaTools className="animate-spin text-cyan-400" /><span>Accessing tool: <strong>{toolExecutionName}...</strong></span></div>)}
                    <div ref={messagesEndRef} />
                </div>
                {error && (<div className="p-4 border-t border-red-500/50 bg-red-900/30 text-red-300 flex items-center gap-3"><FaExclamationCircle className="h-5 w-5 flex-shrink-0" /><p className="text-sm">{error}</p></div>)}
                <div className="p-4 border-t border-gray-700/60 bg-gray-800/50 rounded-b-xl">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-center gap-2">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Quantum anything..." className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" disabled={isLoading || !!error} aria-label="Chat input for AI Advisor" />
                        <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center w-24 transition-colors" disabled={isLoading || !input.trim() || !!error} aria-label="Send message">{isLoading ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : ('Send')}</button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2 text-center">Quantum can make mistakes. Consider checking important information.</p>
                </div>
            </Card>
        </div>
    );
};

export default AIAdvisorView;
