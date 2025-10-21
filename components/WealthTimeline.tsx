// "Let us grant the user foresight," Gemini proclaimed. "A view not just of their past, but of their potential future."
import React, { useContext, useMemo } from 'react'; // He summons React to build this new window in time.
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend } from 'recharts'; // He gathers advanced charting tools.
import Card from './Card'; // The chart will be housed within a Card.
import { DataContext } from '../context/DataContext';

// Gemini began to construct the timeline view.
const WealthTimeline: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("WealthTimeline must be within a DataProvider");
    const { transactions } = context;

    const timelineData = useMemo(() => {
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (sortedTx.length === 0) return [];
        
        let runningBalance = 5000; // Assume a starting balance
        const balanceHistory: { [key: string]: { date: Date, balance: number } } = {};
        const monthlyNet: { [key: string]: number } = {};

        for (const tx of sortedTx) {
            runningBalance += tx.type === 'income' ? tx.amount : -tx.amount;
            const txDate = new Date(tx.date);
            const monthKey = txDate.toISOString().substring(0, 7); // YYYY-MM
            
            balanceHistory[monthKey] = { date: txDate, balance: runningBalance };
            monthlyNet[monthKey] = (monthlyNet[monthKey] || 0) + (tx.type === 'income' ? tx.amount : -tx.amount);
        }

        const historicalData = Object.values(balanceHistory).map(record => ({
            month: record.date.toLocaleString('default', { month: 'short' }),
            balance: record.balance,
            projection: record.balance
        }));
        
        const last3MonthsNet = Object.values(monthlyNet).slice(-3);
        const avgNet = last3MonthsNet.reduce((a, b) => a + b, 0) / (last3MonthsNet.length || 1);
        
        let lastBalance = runningBalance;
        const projectionData = [];
        const lastDate = new Date(sortedTx[sortedTx.length - 1].date);

        for (let i = 1; i <= 6; i++) {
            const nextMonthDate = new Date(lastDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + i);
            lastBalance += avgNet;
            projectionData.push({
                month: nextMonthDate.toLocaleString('default', { month: 'short' }),
                projection: lastBalance,
            });
        }

        return [...historicalData, ...projectionData];
    }, [transactions]);


  // A function to format the numbers on the axis for clarity.
  const formatYAxis = (tick: number) => {
    return `$${(tick / 1000)}k`; // e.g., 50000 becomes $50k
  };

  return (
    <Card title="Wealth Timeline (Past & Projected)">
      {/* The card is titled to explain its dual nature. */}
      <div className="h-80">
        {/* A fixed height is given to the container. */}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {/* A ComposedChart is chosen, to layer different chart types together. */}
            {/* A gradient is defined for the area fill, for aesthetic beauty. */}
            <defs>
              <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* The axes and grid are defined, the skeleton of the chart. */}
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={formatYAxis} />
            <CartesianGrid strokeDasharray="1 5" stroke="#4b5563" />
            {/* The tooltip is styled to match the application's dark theme. */}
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                borderColor: '#4b5563',
                color: '#e5e7eb',
              }}
              // The 'name' property can be a number, so it must be cast to a string before using string methods.
              formatter={(value: number, name: string) => {
                  if (value === null || value === undefined) return null;
                  const formattedValue = `$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
                  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
                  return [formattedValue, formattedName];
                }
              }
            />
            <Legend />
            {/* The legend explains the different lines. */}
            {/* The solid area represents the past, a firm foundation. */}
            <Area type="monotone" dataKey="balance" name="History" stroke="#06b6d4" fillOpacity={1} fill="url(#colorHistory)" />
            {/* The dashed line represents the future, a path of potential. */}
            <Line type="monotone" dataKey="projection" name="Projection" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default WealthTimeline; // Gemini releases it to the Dashboard.