import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Card from './Card';
import { useInvestmentPortfolio } from '../hooks/useInvestmentPortfolio'; // Decoupled from DataContext

/**
 * A custom tooltip component for the pie chart for improved styling and data presentation.
 * @param {any} { active, payload } - Props provided by Recharts, containing tooltip state and data.
 * @returns {React.ReactElement | null} The rendered tooltip component or null if not active.
 */
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900/80 p-3 border border-gray-600 rounded-md shadow-lg backdrop-blur-sm">
                <p className="text-gray-200 font-semibold">{data.name}</p>
                <p className="text-cyan-400">
                    Value: ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {data.performanceYTD !== undefined && (
                    <p className={`text-sm ${data.performanceYTD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        YTD: {data.performanceYTD.toFixed(2)}%
                    </p>
                )}
            </div>
        );
    }
    return null;
};

/**
 * @component InvestmentPortfolio
 * @description Displays the user's investment portfolio breakdown as a pie chart and summary.
 * 
 * ARCHITECTURAL REFACTOR:
 * This component has been refactored to fetch its own data via the `useInvestmentPortfolio`
 * custom hook, which uses TanStack Query. This change decouples the component from the global `DataContext`,
 * making it a self-contained, feature-sliced component that manages its own server state.
 * This aligns with the new architecture directive to separate server and client state management.
 * 
 * @returns {React.ReactElement} The rendered investment portfolio component.
 */
const InvestmentPortfolio: React.FC = () => {
    // The component is now completely decoupled from any global context for its data.
    // It relies on a dedicated hook that manages fetching, caching, and state transformations.
    const { portfolio: assets, isLoading, isError, error, totalValue, weightedPerformance } = useInvestmentPortfolio();

    // Use the Card component's built-in loading and error states for a consistent UX.
    if (isLoading) {
        // Provide a specific height to prevent layout shift during the loading skeleton's appearance.
        return <Card title="Investment Portfolio" isLoading={true} className="min-h-[380px]" />;
    }

    if (isError) {
        return <Card title="Investment Portfolio" errorState={error?.message || "Failed to load portfolio data."} className="min-h-[380px]" />;
    }
    
    // Handle the case where data fetching is successful but returns no data.
    if (!assets || assets.length === 0) {
         return (
            <Card title="Investment Portfolio" className="min-h-[380px]">
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <p>No investment data available.<br/>Start investing to see your portfolio here.</p>
                </div>
            </Card>
        );
    }

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
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center md:text-left">
            <p className="text-gray-400 text-sm">Total Value</p>
            <p className="text-5xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-gray-400 text-sm mt-4">Weighted Performance (YTD)</p>
            <p className={`text-2xl font-semibold ${weightedPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {weightedPerformance >= 0 ? '+' : ''}{weightedPerformance.toFixed(2)}%
            </p>
        </div>
      </div>
    </Card>
  );
};

export default InvestmentPortfolio;
