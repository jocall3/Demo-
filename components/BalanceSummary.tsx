

import React, { useContext, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';
import { DataContext } from '../context/DataContext';

const BalanceSummary: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("BalanceSummary must be within a DataProvider");
    const { transactions } = context;

    const { chartData, totalBalance, change30d } = useMemo(() => {
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;
        const balanceHistory: { date: Date, balance: number }[] = [];

        // We assume a starting balance of 5000 for a more realistic chart base
        runningBalance = 5000;
        balanceHistory.push({ date: new Date(sortedTx[0]?.date || Date.now()), balance: runningBalance });


        for (const tx of sortedTx) {
            if (tx.type === 'income') {
                runningBalance += tx.amount;
            } else {
                runningBalance -= tx.amount;
            }
            balanceHistory.push({ date: new Date(tx.date), balance: runningBalance });
        }
        
        const totalBalance = runningBalance;

        // For chart, group by month
        const monthlyData: { [key: string]: { date: Date, balance: number} } = {};
        for (const record of balanceHistory) {
            const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
            monthlyData[monthKey] = record; // Store last balance record of the month
        }
        
        const chartData = Object.values(monthlyData).map(record => ({ 
            name: record.date.toLocaleString('default', { month: 'short' }), 
            balance: record.balance 
        }));

        // 30 day change
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const lastKnownBalanceBefore30d = [...balanceHistory]
          .reverse()
          .find(h => h.date < thirtyDaysAgo)?.balance;

        const change30d = totalBalance - (lastKnownBalanceBefore30d || totalBalance);

        return { chartData, totalBalance, change30d };
    }, [transactions]);
    
    const changePercentage = (totalBalance - change30d) !== 0 ? (change30d / (totalBalance - change30d)) * 100 : 0;

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
                        <YAxis stroke="#9ca3af" fontSize={12} domain={['dataMin - 1000', 'dataMax + 1000']} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                borderColor: '#4b5563',
                                color: '#e5e7eb',
                            }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default BalanceSummary;