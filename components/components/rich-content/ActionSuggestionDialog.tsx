import React from 'react';
import { RichContent } from '../../AIAdvisorView'; // Assuming RichContent is exported from AIAdvisorView

// --- INLINE SVG ICON (Replicated from AIAdvisorView.tsx) ---
const FaExclamationCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M11 11h2v6h-2zm0-4h2v2h-2z"></path></svg>
);

interface ActionSuggestionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: Record<string, any>) => void;
    suggestion: Extract<RichContent, { type: 'actionable_suggestion' }>['data'] | null;
}

const ActionSuggestionDialog: React.FC<ActionSuggestionDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    suggestion,
}) => {
    if (!isOpen || !suggestion) {
        return null;
    }

    const handleConfirm = () => {
        onConfirm(suggestion.actionPayload);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-md w-full p-6 relative transform transition-all duration-300 scale-100 opacity-100"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex items-center text-red-400 mb-4">
                    <FaExclamationCircle className="h-6 w-6 mr-2" />
                    <h3 className="text-xl font-bold text-white">{suggestion.title}</h3>
                </div>
                <p className="text-gray-300 text-base mb-6">{suggestion.description}</p>
                
                {/* Displaying payload for transparency, if available */}
                {suggestion.actionPayload && Object.keys(suggestion.actionPayload).length > 0 && (
                    <div className="bg-gray-700/50 p-3 rounded-md text-xs text-gray-400 mb-6 max-h-40 overflow-auto">
                        <p className="font-semibold text-cyan-300 mb-1">Proposed Action Details:</p>
                        <pre className="whitespace-pre-wrap text-wrap break-all">{JSON.stringify(suggestion.actionPayload, null, 2)}</pre>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        {suggestion.actionText || 'Confirm Action'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionSuggestionDialog;