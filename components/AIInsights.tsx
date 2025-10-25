import React, { useState } from 'react';
import Card from './Card';
import { AIInsight } from '../types';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * @description A styled indicator for the urgency of an AI insight.
 * Now displays a text label for clarity.
 */
const UrgencyIndicator: React.FC<{ urgency: 'low' | 'medium' | 'high' }> = ({ urgency }) => {
    const config = {
        low: { classes: 'bg-blue-500/20 text-blue-300', label: 'Info' },
        medium: { classes: 'bg-yellow-500/20 text-yellow-300', label: 'Suggestion' },
        high: { classes: 'bg-red-500/20 text-red-300', label: 'Alert' },
    };
    const { classes, label } = config[urgency];
    return (
        <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${classes}`}>
            {label}
        </span>
    );
};


/**
 * @description A custom tooltip component for the bar chart for improved styling.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/80 p-2 border border-gray-600 rounded-md shadow-lg backdrop-blur-sm">
                <p className="text-gray-300 text-sm capitalize">{`${label}: `}<span className="font-bold text-white">${payload[0].value.toFixed(2)}</span></p>
            </div>
        );
    }
    return null;
};


/**
 * @description Displays a list of AI-generated financial insights. This component has been
 * enhanced with client-side state management for dismissing insights and a more polished UI.
 */
const AIInsights: React.FC = () => {
    const { aiInsights, isLoading: isInsightsLoading } = useData();

    // Local state to track which insights the user has dismissed.
    const [dismissed, setDismissed] = useState<string[]>([]);

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent any parent click events
        if (!dismissed.includes(id)) {
            setDismissed(prev => [...prev, id]);
        }
    };

    const visibleInsights = aiInsights.filter(insight => !dismissed.includes(insight.id));
    
    /**
     * @description Renders a placeholder message when there are no insights to display.
     */
    const renderEmptyState = () => {
        // isLoading is handled by the parent Card component.
        if (isInsightsLoading) return null;
        
        const message = aiInsights.length === 0 
            ? "No new insights from Plato at the moment. Check back soon!"
            : "All insights cleared. You're all caught up!";

        return (
            <div className="text-center py-8 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <p className="mt-2 text-sm">{message}</p>
            </div>
        );
    };

    return (
        <Card title="Plato's Insights" className="h-full" isLoading={isInsightsLoading}>
            <div className="space-y-4">
                {visibleInsights.length > 0 ? visibleInsights.map(insight => (
                    // In a future enhancement, this card could be made clickable to navigate to a relevant view,
                    // e.g., an insight about budgets navigates to the BudgetsView.
                    <div 
                        key={insight.id} 
                        className="relative p-4 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-cyan-400/50 transition-all duration-200 group"
                    >
                        <UrgencyIndicator urgency={insight.urgency as 'low' | 'medium' | 'high'} />
                        
                        <button 
                            onClick={(e) => handleDismiss(e, insight.id)} 
                            className="absolute top-3 left-3 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            aria-label="Dismiss insight"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h4 className="font-bold text-gray-100 pr-24 ml-6">{insight.title}</h4>
                        <p className="text-sm text-gray-300 mt-1 ml-6">{insight.description}</p>
                        
                        {insight.chartData && insight.chartData.length > 0 && (
                            <div className="mt-4 h-32 pr-4 -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={insight.chartData} layout="vertical" margin={{ top: 5, right: 0, left: 20, bottom: 5 }}>
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            type="category" 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            fontSize={11} 
                                            stroke="#9ca3af" 
                                            width={100}
                                            style={{ textTransform: 'capitalize' }}
                                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(100,116,139,0.1)' }}
                                            content={<CustomTooltip />}
                                        />
                                        <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )) : renderEmptyState()}
            </div>
        </Card>
    );
};

export default AIInsights;
