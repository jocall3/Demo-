import { useState, useEffect, useCallback } from 'react';
import { EnhancedMessage } from '../AIAdvisorView'; // Assuming AIAdvisorView defines EnhancedMessage

const LOCAL_STORAGE_KEY = 'aiAdvisorChatHistory';

/**
 * Manages and persists the conversation history for the AI Advisor,
 * storing messages in localStorage.
 *
 * This hook provides functions to load, add, and clear chat messages,
 * ensuring that interactions can be reviewed across sessions.
 */
export const useChatHistory = () => {
    const [messages, setMessages] = useState<EnhancedMessage[]>([]);

    // Load history from localStorage on initial component mount
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedHistory) {
                const parsedHistory: EnhancedMessage[] = JSON.parse(storedHistory);
                // Re-hydrate Date objects from string representations
                const hydratedHistory = parsedHistory.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(hydratedHistory);
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage:", error);
            // If parsing fails, it might be corrupted data. Clear it.
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setMessages([]);
        }
    }, []);

    /**
     * Adds a new message to the chat history and persists the updated history to localStorage.
     * @param newMessage The EnhancedMessage object to add.
     */
    const addMessageToHistory = useCallback((newMessage: EnhancedMessage) => {
        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, newMessage];
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedMessages));
            } catch (error) {
                console.error("Failed to save message to localStorage:", error);
            }
            return updatedMessages;
        });
    }, []);

    /**
     * Overwrites the entire chat history with a new array of messages and persists it to localStorage.
     * This can be useful for initializing or resetting the full history.
     * @param newHistory An array of EnhancedMessage objects to set as the new history.
     */
    const setFullHistory = useCallback((newHistory: EnhancedMessage[]) => {
        setMessages(newHistory);
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
        } catch (error) {
            console.error("Failed to set full history to localStorage:", error);
        }
    }, []);

    /**
     * Clears all chat history from the state and localStorage.
     */
    const clearChatHistory = useCallback(() => {
        setMessages([]);
        try {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear chat history from localStorage:", error);
        }
    }, []);

    return {
        chatHistory: messages,
        addMessageToHistory,
        setFullHistory,
        clearChatHistory,
    };
};