import { useContext, useMemo } from 'react';
import { DataContext } from '../context/DataContext';
import type { AIInsight } from '../types';

interface UseAIInsightsResult {
    insights: AIInsight[];
    isLoading: boolean;
    // Future additions could include error state, filtering functions, etc.
}

/**
 * A custom React hook for fetching, filtering, and interacting with AI insights data.
 * It consumes the AI insights data from the DataContext.
 */
const useAIInsights = (): UseAIInsightsResult => {
    const context = useContext(DataContext);

    if (!context) {
        // Enforce usage within a DataProvider, consistent with sibling components.
        throw new Error("useAIInsights must be used within a DataProvider");
    }

    const { aiInsights, isInsightsLoading } = context;

    // Memoize the insights array to prevent unnecessary re-renders of consuming components
    // and to prepare for potential filtering logic to be added here.
    const insights = useMemo(() => {
        // If filtering logic were to be implemented, it would go here.
        // For example:
        // const filteredInsights = aiInsights.filter(insight => insight.status === 'active');
        // return filteredInsights;
        return aiInsights || []; // Ensure an empty array is returned if aiInsights is null/undefined
    }, [aiInsights]); // Re-run memoization only if the aiInsights array reference changes

    return {
        insights,
        isLoading: isInsightsLoading,
    };
};

export default useAIInsights;