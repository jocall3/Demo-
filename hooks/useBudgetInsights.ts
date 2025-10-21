import { useState, useRef, useEffect, useContext } from 'react';
import { DataContext } from '../context/DataContext';
import type { BudgetCategory, Transaction } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";

// Interface for messages in the AI conversation
interface InsightMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
}

/**
 * A custom React hook for integrating AI-powered budget insights,
 * managing conversation state, and interacting with the AI model.
 */
export const useBudgetInsights = () => {
    const context = useContext(DataContext);
    const [conversation, setConversation] = useState<InsightMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, useStateError] = useState(''); // Renamed to avoid conflict with built-in Error
    const [hasStarted, setHasStarted] = useState(false);
    const chatRef = useRef<Chat | null>(null);

    if (!context) {
        throw new Error("useBudgetInsights must be used within a DataProvider.");
    }
    const { budgets, transactions } = context; // 'transactions' included for potential future AI context if needed

    // Helper to set error messages
    const setError = (message: string) => {
        console.error(message);
        useStateError(message);
    };

    /**
     * Initializes the Google GenAI chat instance with a system instruction
     * based on the current budget data.
     * This function is designed to be called only when chatRef.current is null,
     * ensuring the system instruction is set once with the budgets available
     * at the time of the first AI interaction.
     */
    const initializeChat = () => {
        if (!process.env.API_KEY) {
            setError("AI API Key is not configured. Please ensure process.env.API_KEY is set.");
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // The AI's system instruction contextually uses the 'budgets' array.
            // Note: If 'budgets' change after initialization, the AI's initial context
            // within this chat session will not automatically update.
            const budgetContext = `You are Quantum, a specialized financial advisor AI focused on budget analysis. The user's current budget data is: ${JSON.stringify(budgets)}. Your goal is to provide concise, actionable advice to help them manage their spending effectively. Keep responses brief and to the point.`;

            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash', // Using gemini-2.5-flash as per seed
                config: {
                    systemInstruction: budgetContext
                }
            });
            useStateError(''); // Clear any previous errors on successful initialization
        } catch (err) {
            setError(`Failed to initialize AI insight model: ${(err as Error).message}`);
        }
    };

    /**
     * Sends a message to the AI and updates the conversation state with the response.
     * If the chat is not initialized, it will attempt to initialize it first.
     * @param messageText The user's message to send to the AI.
     */
    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        // Initialize chat if it hasn't been already
        if (!chatRef.current) {
            initializeChat();
        }
        // If initialization failed, stop here
        if (!chatRef.current) {
            return;
        }

        setIsLoading(true);
        useStateError(''); // Clear previous errors
        if (!hasStarted) setHasStarted(true); // Mark that interaction has begun

        const userMsg: InsightMessage = { id: Date.now().toString(), sender: 'user', text: messageText };
        setConversation(prev => [...prev, userMsg]);
        setUserInput(''); // Clear the input field immediately after sending

        try {
            const chat = chatRef.current;
            const stream = await chat.sendMessageStream({ message: messageText });

            let aiResponseText = '';
            const aiMsgId = Date.now().toString() + '-ai';
            // Add an empty AI message as a placeholder while streaming
            setConversation(prev => [...prev, { id: aiMsgId, sender: 'ai', text: '' }]);

            // Stream the AI response and update the message
            for await (const chunk of stream) {
                aiResponseText += chunk.text;
                setConversation(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiResponseText } : m));
            }
        } catch (err) {
            setError(`AI insight request failed: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Effect to trigger the first AI insight message automatically when the hook loads.
     * This mimics the behavior from the original BudgetsView component.
     */
    useEffect(() => {
        // Only trigger the initial message if the conversation hasn't started yet.
        if (!hasStarted) {
            const timer = setTimeout(() => {
                handleSendMessage("Analyze my current budgets and give me one key insight.");
            }, 500); // Small delay as in the original component
            return () => clearTimeout(timer); // Cleanup timeout
        }
    }, [hasStarted]); // Dependency on hasStarted ensures it runs only once per session start

    return {
        conversation,
        userInput,
        setUserInput,
        isLoading,
        error,
        handleSendMessage,
        hasStarted,
    };
};