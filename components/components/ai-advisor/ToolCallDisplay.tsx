import React from 'react';

interface ToolCallDisplayProps {
    functionCall: {
        name: string;
        args: Record<string, any>;
    };
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ functionCall }) => {
    return (
        <div className="text-xs text-gray-400 italic bg-gray-800/40 p-2 rounded-md">
            <p className="mb-1">
                <strong className="text-cyan-300">Tool Call:</strong> <code className="font-mono text-white">{functionCall.name}</code>
            </p>
            {Object.keys(functionCall.args).length > 0 ? (
                <pre className="text-xs mt-1 bg-gray-900/50 p-2 rounded">
                    <span className="text-gray-500">Args: </span>
                    {JSON.stringify(functionCall.args, null, 2)}
                </pre>
            ) : (
                <p className="text-xs text-gray-500">No arguments provided.</p>
            )}
        </div>
    );
};

export default ToolCallDisplay;