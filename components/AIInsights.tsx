

import React, { useContext } from 'react';
import Card from './Card';
import type { AIInsight } from '../types';
import { DataContext } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';


const UrgencyIndicator: React.FC<{ urgency: 'low' | 'medium' | 'high' }> = ({ urgency }) => {
    const urgencyClasses = {
        low: 'bg-blue-500',
        medium: 'bg-yellow-500',
        high: 'bg-red-500',
    };
    return <span className={`absolute top-2 right-2 h-3 w-3 rounded-full ${urgencyClasses[urgency]}`}></span>;
};


const AIInsights: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("AIInsights must be within a DataProvider");
    const { aiInsights, isInsightsLoading } = context;

  return (
    <Card title="AI Advisor Insights" className="h-full" isLoading={isInsightsLoading}>
        <div className="space-y-4">
            {aiInsights.map(insight => (
                <div key={insight.id} className="relative p-4 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-cyan-400/50 transition-all duration-200">
                    <UrgencyIndicator urgency={insight.urgency} />
                    <h4 className="font-bold text-gray-100">{insight.title}</h4>
                    <p className="text-sm text-gray-300 mt-1">{insight.description}</p>
                    {insight.chartData && insight.chartData.length > 0 && (
                        <div className="mt-3 h-28 pr-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={insight.chartData} layout="vertical" margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        fontSize={11} 
                                        stroke="#9ca3af" 
                                        width={85}
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
                                    <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </Card>
  );
};

export default AIInsights;