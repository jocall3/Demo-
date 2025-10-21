import React from 'react';
import {
    MessagePart,
    ToolCallPart,
    ToolResultPart,
    RichContentPart,
    RichContentRenderer
} from '../../AIAdvisorView';

interface MessagePartRendererProps {
    part: MessagePart;
    onAction: (payload: any) => void;
}

export const MessagePartRenderer: React.FC<MessagePartRendererProps> = ({ part, onAction }) => {
    if ('text' in part && part.text) {
        return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if ('functionCall' in part) {
        const toolCallPart = part as ToolCallPart;
        return (
            <div className="text-xs text-gray-400 italic bg-gray-800/40 p-2 rounded-md">
                <p><strong>Tool Call:</strong> <code>{toolCallPart.functionCall.name}</code></p>
                <pre className="text-xs mt-1">Args: {JSON.stringify(toolCallPart.functionCall.args, null, 2)}</pre>
            </div>
        );
    }
    if ('functionResponse' in part) {
        const toolResultPart = part as ToolResultPart;
        return (
            <div className="text-xs text-gray-400 italic bg-gray-800/40 p-2 rounded-md">
                <p><strong>Tool Result for <code>{toolResultPart.functionResponse.name}</code>:</strong></p>
                <pre className="text-xs mt-1">{JSON.stringify(toolResultPart.functionResponse.response, null, 2)}</pre>
            </div>
        );
    }
    if ('richContent' in part) {
        const richContentPart = part as RichContentPart;
        return <RichContentRenderer content={richContentPart.richContent} onAction={onAction} />;
    }
    return null;
};