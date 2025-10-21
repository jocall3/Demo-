import type { AIInsight } from '../../types';
import { API_BASE_URL } from '../../constants';

/**
 * Interface for AI Insight feedback.
 * This interface defines the structure for submitting user feedback on an AI insight.
 */
export interface AIInsightFeedback {
    insightId: string;
    feedbackType: 'helpful' | 'unhelpful' | 'resolved' | 'dismissed';
    comment?: string; // Optional comment from the user
}

/**
 * Fetches a list of AI insights from the API.
 * This function makes a GET request to retrieve all available AI insights.
 *
 * @returns A promise that resolves to an array of `AIInsight` objects.
 * @throws An error if the API request fails.
 */
export const fetchAIInsights = async (): Promise<AIInsight[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai-insights`);

        if (!response.ok) {
            const errorDetail = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to fetch AI insights: ${response.status} - ${errorDetail.message}`);
        }

        const data: AIInsight[] = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchAIInsights:", error);
        throw error; // Re-throw to allow component/hook to handle
    }
};

/**
 * Submits user feedback for a specific AI insight to the API.
 * This function sends a POST request with the user's feedback.
 *
 * @param feedback An `AIInsightFeedback` object containing the insight ID, feedback type, and an optional comment.
 * @returns A promise that resolves when the feedback is successfully submitted.
 * @throws An error if the API request fails.
 */
export const submitAIInsightFeedback = async (feedback: AIInsightFeedback): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai-insights/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any necessary authorization headers here, e.g., 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(feedback),
        });

        if (!response.ok) {
            const errorDetail = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to submit AI insight feedback: ${response.status} - ${errorDetail.message}`);
        }
    } catch (error) {
        console.error("Error in submitAIInsightFeedback:", error);
        throw error;
    }
};

/**
 * Updates the status of an AI insight (e.g., marking it as 'resolved' or 'dismissed').
 * This function sends a PUT request to update the insight's status on the backend.
 *
 * @param insightId The unique identifier of the AI insight to update.
 * @param status The new status for the insight, either 'resolved' or 'dismissed'.
 * @returns A promise that resolves when the insight's status is successfully updated.
 * @throws An error if the API request fails.
 */
export const updateAIInsightStatus = async (
    insightId: string,
    status: 'resolved' | 'dismissed'
): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai-insights/${insightId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                // Add any necessary authorization headers here
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const errorDetail = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to update AI insight status: ${response.status} - ${errorDetail.message}`);
        }
    } catch (error) {
        console.error(`Error in updateAIInsightStatus for insight ${insightId}:`, error);
        throw error;
    }
};