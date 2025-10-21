import React, { useContext, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from './Card';
import { DataContext } from '../context/DataContext';

const COLORS = [
    '#0ea5e9', // Sky 500
    '#84cc16', // Lime 500
    '#facc15', // Yellow 400
    '#f43f5e', // Rose 500
    '#a855f7', // Purple 500
    '#14b8a6', // Teal 500
    '#ef4444', // Red 500
    '#eab308', // Amber 500
    '#ec4899', // Pink 500
    '#3b82f6', // Blue 500
    '#6b7280', // Gray 500 for 'Other' or uncategorized
];

const SpendingByCategory: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("SpendingByCategory must be within a DataProvider");
    const { transactions } = context;

    const { chartData, totalSpending } = useMemo(() => {
        const spendingMap: { [key: string]: number } = {};
        let total = 0;

        for (const tx of transactions) {
            if (tx.type === 'expense') {
                const category = tx.category || 'Uncategorized'; // Default to Uncategorized if not present
                spendingMap[category] = (spendingMap[category] || 0) + tx.amount;
                total += tx.amount;
            }
        }

        const chartData = Object.entries(spendingMap).map(([category, amount]) => ({
            name: category,
            value: amount,
        }));

        // Sort by value descending for better visualization
        chartData.sort((a, b) => b.value - a.value);

        return { chartData, totalSpending: total };
    }, [transactions]);

    // Custom Tooltip component for better formatting
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div
                    className="p-2 rounded shadow-md"
                    style={{
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', // bg-gray-800 with some opacity
                        borderColor: '#4b5563', // border-gray-600
                        color: '#e5e7eb', // text-gray-200
                        borderWidth: '1px',
                    }}
                >
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">
                        ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-2 text-gray-400">
                            {totalSpending > 0 ? `(${((data.value / totalSpending) * 100).toFixed(1)}%)` : '(0.0%)'}
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card title="Spending by Category">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-gray-400 text-sm">Total Spending</p>
                    <p className="text-3xl font-bold text-white">${totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>
            <div className="h-60">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                // Optional label inside the chart for value/percentage
                                // label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                // labelLine={false} // Disable label lines if using custom labels
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingLeft: '10px' }} // text-gray-400, text-xs
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-gray-500 text-center py-10">No spending data available for categories.</div>
                )}
            </div>
        </Card>
    );
};

export default SpendingByCategory;