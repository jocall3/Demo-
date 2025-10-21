import React from 'react';

// --- INLINE SVG ICONS (Re-defined for this component for self-containment) ---
const FaRobot: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 10h-2V7h2v3zm-2 2h2v2h-2v-2zm-3-2H7v2h2v-2zm8 0h-2v2h2v-2z"></path><circle cx="12" cy="12" r="2"></circle></svg>
);
const FaTools: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M20.84 3.9l-1.42 1.42c1.78 1.78 2.87 4.24 2.87 6.94s-1.08 5.16-2.87 6.94l1.42 1.42C23.43 18.07 24 15.14 24 12s-.57-6.07-3.16-8.1zm-3.54 3.54c.95.95 1.54 2.26 1.54 3.66s-.58 2.71-1.54 3.66l1.41 1.41c1.71-1.71 2.75-4.02 2.75-6.57s-1.04-4.86-2.75-6.57L17.3 7.44zM2 12c0-3.14.99-6.07 2.65-8.38L3.23 2.2C.57 5.93 0 8.86 0 12s.57 6.07 3.23 9.8l1.42-1.42C2.99 18.07 2 15.14 2 12z"></path><path d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"></path><path d="M8.11 6.38 6.7 4.96C5.04 6.63 4 8.94 4 11.4c0 .56.08 1.12.22 1.66l1.46-1.46c-.05-.23-.08-.47-.08-.7 0-1.77 1.02-3.29 2.5-4.02z"></path></svg>
);

interface ChatLoadingIndicatorProps {
    isLoading: boolean;
    isToolExecuting: boolean;
    toolExecutionName: string | null;
}

const ChatLoadingIndicator: React.FC<ChatLoadingIndicatorProps> = ({ isLoading, isToolExecuting, toolExecutionName }) => {
    if (!isLoading && !isToolExecuting) {
        return null;
    }

    if (isToolExecuting) {
        return (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 p-2">
                 <FaTools className="animate-spin text-cyan-400" />
                 <span>Accessing tool: <strong>{toolExecutionName}...</strong></span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1"><FaRobot className="h-6 w-6 text-cyan-300"/></div>
                 <div className="max-w-lg p-3 rounded-lg shadow-md bg-gray-700 text-gray-200 flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
                 </div>
            </div>
        );
    }

    return null;
};

export default ChatLoadingIndicator;