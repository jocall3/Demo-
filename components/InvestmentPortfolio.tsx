

import React, { useContext, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Card from './Card';
import { DataContext } from '../context/DataContext';

const InvestmentPortfolio: React.FC = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("InvestmentPortfolio must be within a DataProvider");
    const { assets } = context;

    const { totalValue, weightedPerformance } = useMemo(() => {
        const total = assets.reduce((sum, asset) => sum + asset.value, 0);
        const weightedPerf = total > 0 ? assets.reduce((sum, asset) => sum + asset.value * (asset.performanceYTD || 0), 0) / total : 0;
        return { totalValue: total, weightedPerformance: weightedPerf };
    }, [assets]);

  return (
    <Card title="Investment Portfolio">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assets}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {assets.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                 contentStyle={{
                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                    borderColor: '#4b5563'
                 }}
              />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center md:text-left">
            <p className="text-gray-400 text-sm">Total Value</p>
            <p className="text-5xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-gray-400 text-sm mt-4">Performance (YTD)</p>
            <p className="text-2xl font-semibold text-green-400">+{weightedPerformance.toFixed(2)}%</p>
        </div>
      </div>
    </Card>
  );
};

export default InvestmentPortfolio;