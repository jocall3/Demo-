import React, { useContext } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import type { BudgetCategory } from '../types';

// ================================================================================================
// SUB-COMPONENTS
// ================================================================================================

const BudgetComparisonItem: React.FC<{ budget: BudgetCategory }> = ({ budget }) => {
  const percentageSpent = Math.min((budget.spent / budget.limit) * 100, 100);
  const barColor = percentageSpent > 95 ? 'bg-red-500' : percentageSpent > 80 ? 'bg-yellow-500' : 'bg-cyan-500';

  return (
    <div className="mb-4 last:mb-0 p-3 bg-gray-700/50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-white text-sm md:text-base">{budget.name}</h4>
        <div className="text-right text-sm">
          <p className="text-gray-200">${budget.spent.toFixed(2)} / <span className="text-gray-400">${budget.limit.toFixed(2)}</span></p>
          <p className={`text-xs ${percentageSpent > 95 ? 'text-red-300' : percentageSpent > 80 ? 'text-yellow-300' : 'text-cyan-300'}`}>{percentageSpent.toFixed(0)}% Used</p>
        </div>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div 
          className={`${barColor} h-2 rounded-full transition-all duration-700 ease-out`} 
          style={{ width: `${percentageSpent}%` }}
        ></div>
      </div>
    </div>
  );
};

// ================================================================================================
// MAIN BUDGET COMPARISON CHART COMPONENT
// ================================================================================================

const BudgetComparisonChart: React.FC = () => {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("BudgetComparisonChart must be a child of DataProvider.");
  }
  const { budgets } = context;

  // For historical trends, one would typically need historical budget data or aggregated transaction data over time.
  // For this example, we'll focus on current month's performance comparison.
  // A placeholder for showing 'trends' would involve dynamic data over multiple periods.

  return (
    <Card title="Budget Performance Comparison" className="col-span-12 lg:col-span-6">
      <div className="space-y-4">
        {budgets.length > 0 ? (
          budgets.map(budget => (
            <BudgetComparisonItem key={budget.id} budget={budget} />
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No budgets defined yet. Create one to see comparisons.</p>
        )}
      </div>

      <div className="mt-6 border-t border-gray-700 pt-4">
        <h3 className="text-md font-semibold text-white mb-3">Insights & Trends (Coming Soon)</h3>
        <p className="text-gray-400 text-sm">
          Visualizations of historical budget performance and spending trends will appear here.
          This would compare your current spending patterns against previous months or budget periods to identify areas for improvement or consistent performance.
        </p>
        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-gray-500 text-xs">
          Example: "Last month, your 'Dining Out' budget was 10% under limit, showing great control compared to this month's 5% overage."
        </div>
      </div>
    </Card>
  );
};

export default BudgetComparisonChart;