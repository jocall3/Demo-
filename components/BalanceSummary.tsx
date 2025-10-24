import React, { useContext, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import Card from './Card';
import { DataContext } from '../context/DataContext';
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
    const context = useContext(DataContext);
    if (!context) throw new Error("BalanceSummary must be within a DataProvider");
    const { transactions } = context;

    const { chartData, totalBalance, change30d } = useMemo(() => {
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const balanceHistory: { date: Date, balance: number }[] = [];
        const startingBalance = 5000; // Assume a starting balance for demo purposes
        let runningBalance = startingBalance;

        // Add initial balance point, dated at the first transaction or now.
        balanceHistory.push({ date: new Date(sortedTx[0]?.date || Date.now()), balance: runningBalance });

        for (const tx of sortedTx) {
            runningBalance += tx.type === 'income' ? tx.amount : -tx.amount;
            balanceHistory.push({ date: new Date(tx.date), balance: runningBalance });
        }
        
        const totalBalance = runningBalance;

        // For chart, group by month, taking the last balance record of each month
        const monthlyData: { [key: string]: { date: Date, balance: number} } = {};
        for (const record of balanceHistory) {
            const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
            monthlyData[monthKey] = record; 
        }
        
        const chartData = Object.values(monthlyData).map(record => ({ 
            name: record.date.toLocaleString('default', { month: 'short' }), 
            balance: record.balance 
        }));

        // Robust 30-day change calculation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const lastKnownBalanceBefore30d = [...balanceHistory]
          .reverse()
          .find(h => h.date < thirtyDaysAgo)?.balance;

        // If no balance is found before 30 days (e.g., new account), use the very first balance in history.
        const referenceBalance = lastKnownBalanceBefore30d ?? (balanceHistory[0]?.balance ?? 0);
        const change30d = totalBalance - referenceBalance;

        return { chartData, totalBalance, change30d };
    }, [transactions]);
    
    const previousBalance = totalBalance - change30d;
    const changePercentage = previousBalance !== 0 ? (change30d / previousBalance) * 100 : (change30d !== 0 ? 100 : 0);

    const formatYAxis = (tick: number) => `$${(tick / 1000).toFixed(0)}k`;

    return (
        <Card title="Balance Summary">
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
