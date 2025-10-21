import React from 'react';
import Card from '../Card'; // Card is in the parent 'components' directory
import type { AIInsight } from '../../types/adStudio'; // AIInsight type is in types/adStudio.ts
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * Renders a small colored circle to indicate the urgency level of an insight.
 * This component is defined locally to maintain the pattern seen in AIInsights.tsx.
 */
const UrgencyIndicator: React.FC<{ urgency: 'low' | 'medium' | 'high' }> = ({ urgency }) => {
    const urgencyClasses = {
        low: 'bg-blue-500',
        medium: 'bg-yellow-500',
        high: 'bg-red-500',
    };
    return <span className={`absolute top-4 right-4 h-3 w-3 rounded-full ${urgencyClasses[urgency]}`}></span>;
};

interface AIInsightDetailProps {
    /** The single AI insight object to display in detail. */
    insight: AIInsight;
    /** Optional callback function when a "Take Action" button is clicked. */
    onTakeAction?: (insightId: string) => void;
    /** Optional callback function when a "Dismiss" button is clicked. */
    onDismiss?: (insightId: string) => void;
}

/**
 * AIInsightDetail component displays a single AI insight with more detailed information,
 * including potential charts and interactive action buttons.
 */
const AIInsightDetail: React.FC<AIInsightDetailProps> = ({ insight, onTakeAction, onDismiss }) => {
    return (
        <Card title={insight.title} className="p-6 relative">
            <UrgencyIndicator urgency={insight.urgency} />

            <h3 className="text-2xl font-bold text-gray-100 mb-3">{insight.title}</h3>
            <p className="text-md text-gray-300 leading-relaxed mb-6">{insight.description}</p>

            {/* Placeholder for additional detailed content or context for the insight */}
            <div className="text-sm text-gray-400 mt-4 border-t border-gray-700 pt-4">
                <p>This insight provides a deeper look into your financial trends and suggests optimal strategies.</p>
                <p className="mt-2">Reviewing the details below can help you make informed decisions.</p>
            </div>

            {/* Display chart data if available, with a larger emphasis for the detail view */}
            {insight.chartData && insight.chartData.length > 0 && (
                <div className="mt-8 h-48 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={insight.chartData} layout="vertical" margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                fontSize={12}
                                stroke="#9ca3af"
                                width={100}
                                style={{ textTransform: 'capitalize' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(100,116,139,0.1)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                    borderColor: '#4b5563',
                                    fontSize: '12px',
                                }}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                            />
                            {/* Using a slightly different fill color and bar size to differentiate from the summary view */}
                            <Bar dataKey="value" fill="#14b8a6" radius={[0, 6, 6, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Interactive elements: action buttons */}
            <div className="flex justify-end space-x-3 mt-10">
                {onDismiss && (
                    <button
                        onClick={() => onDismiss(insight.id)}
                        className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Dismiss Insight
                    </button>
                )}
                {onTakeAction && (
                    <button
                        onClick={() => onTakeAction(insight.id)}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
                    >
                        Take Action Now
                    </button>
                )}
            </div>
        </Card>
    );
};

export default AIInsightDetail;