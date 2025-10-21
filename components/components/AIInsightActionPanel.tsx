import React from 'react';

interface AIInsightActionPanelProps {
    insightId: string;
    onTakeAction: (insightId: string) => void;
    onDismiss: (insightId: string) => void;
    onProvideFeedback: (insightId: string) => void;
}

const AIInsightActionPanel: React.FC<AIInsightActionPanelProps> = ({
    insightId,
    onTakeAction,
    onDismiss,
    onProvideFeedback,
}) => {
    return (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
            <button
                onClick={() => onTakeAction(insightId)}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
            >
                Take Action
            </button>
            <button
                onClick={() => onProvideFeedback(insightId)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold rounded-md transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
                Provide Feedback
            </button>
            <button
                onClick={() => onDismiss(insightId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
                Dismiss
            </button>
        </div>
    );
};

export default AIInsightActionPanel;