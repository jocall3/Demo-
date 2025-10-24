import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import Card from './Card';
import { useBalanceSummary } from '../hooks/useBanking';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-gray-800/80 border border-gray-700 rounded-md shadow-lg text-sm">
                <p className="label text-gray-300">{`${label}`}</p>
                <p className="intro text-cyan-400">{`Balance: $${(payload[0].value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
            </div>
        );
    }
    return null;
};

const BalanceSummary: React.FC = () => {
    // Per the new architecture, data is fetched via a custom hook using React Query.
    // Complex calculations (running balance, 30d change) are now handled by the BFF.
    const { data: summary, isLoading, isError, error } = useBalanceSummary();

    // Destructure data with defaults to prevent errors during loading or if data is undefined.
    const { chartData = [], totalBalance = 0, change30d = 0 } = summary || {};
    
    // Simple derived UI state can remain in the component.
    const previousBalance = totalBalance - change30d;
    const changePercentage = previousBalance !== 0 ? (change30d / Math.abs(previousBalance)) * 100 : (change30d > 0 ? 100 : 0);

    const formatYAxis = (tick: number) => `$${(tick / 1000).toFixed(0)}k`;

    // The Card component now handles the loading skeleton and error states.
    return (
        <Card 
            title="Balance Summary" 
            isLoading={isLoading} 
            errorState={isError ? (error as Error)?.message || 'Could not load balance data.' : null}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-400 text-sm">Total Balance</p>
                    <p className="text-4xl font-bold text-white">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-sm">Change (30d)</p>
                    <p className={`text-lg font-semibold ${change30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change30d >= 0 ? '+' : ''}${change30d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({changePercentage.toFixed(1)}%)
                    </p>
                </div>
            </div>
            <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} domain={['dataMin - 1000', 'dataMax + 1000']} tickFormatter={formatYAxis} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="balance" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" name="Balance" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default BalanceSummary;
