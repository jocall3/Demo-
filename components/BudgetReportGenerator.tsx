import React, { useContext, useState, useMemo } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import type { BudgetCategory, Transaction } from '../types';

// ================================================================================================
// HELPER FUNCTIONS
// ================================================================================================

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

// ================================================================================================
// MAIN BUDGET REPORT GENERATOR COMPONENT
// ================================================================================================

const BudgetReportGenerator: React.FC = () => {
    const context = useContext(DataContext);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Month is 1-indexed for display

    if (!context) {
        throw new Error("BudgetReportGenerator must be a child of DataProvider.");
    }
    const { budgets, transactions } = context;

    // Get available years from transactions, defaulting to current year if no transactions exist
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        transactions.forEach(tx => years.add(new Date(tx.date).getFullYear()));
        if (years.size === 0) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a, b) => b - a); // Sort in descending order
    }, [transactions]);

    // Filter transactions based on the selected year and month
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonth;
        });
    }, [transactions, selectedYear, selectedMonth]);

    // Calculate budget performance and financial summary for the filtered period
    const { budgetPerformance, totalIncome, totalExpenses, netSavings } = useMemo(() => {
        const performanceMap = new Map<string, { spent: number; limit: number; }>();
        budgets.forEach(budget => {
            performanceMap.set(budget.name.toLowerCase(), { spent: 0, limit: budget.limit });
        });

        let income = 0;
        let expenses = 0;

        filteredTransactions.forEach(tx => {
            if (tx.type === 'income') {
                income += tx.amount;
            } else if (tx.type === 'expense') {
                expenses += tx.amount;
                const budgetKey = tx.category.toLowerCase();
                if (performanceMap.has(budgetKey)) {
                    const current = performanceMap.get(budgetKey)!;
                    performanceMap.set(budgetKey, { ...current, spent: current.spent + tx.amount });
                }
            }
        });

        const budgetPerformanceArray = Array.from(performanceMap.entries()).map(([name, data]) => ({
            name: name,
            spent: data.spent,
            limit: data.limit,
            remaining: data.limit - data.spent,
            percentage: data.limit > 0 ? (data.spent / data.limit) * 100 : 0
        }));

        return {
            budgetPerformance: budgetPerformanceArray,
            totalIncome: income,
            totalExpenses: expenses,
            netSavings: income - expenses
        };
    }, [budgets, filteredTransactions]);

    // Calculate spending patterns by category for the filtered period
    const spendingByCategory = useMemo(() => {
        const categoryMap = new Map<string, number>();
        filteredTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
            const currentAmount = categoryMap.get(tx.category) || 0;
            categoryMap.set(tx.category, currentAmount + tx.amount);
        });
        return Array.from(categoryMap.entries()).sort(([, a], [, b]) => b - a); // Sort by highest spend
    }, [filteredTransactions]);

    const months = [
        { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
        { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
        { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
        { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' },
    ];

    return (
        <div className="space-y-6">
            <Card title="Report Filters">
                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label htmlFor="year-select" className="block text-sm font-medium text-gray-400 mb-1">Year</label>
                        <select
                            id="year-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="month-select" className="block text-sm font-medium text-gray-400 mb-1">Month</label>
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card title="Financial Summary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-400">Total Income</p>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-400">Total Expenses</p>
                        <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-400">Net Savings</p>
                        <p className={`text-xl font-bold ${netSavings >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatCurrency(netSavings)}</p>
                    </div>
                </div>
            </Card>

            <Card title="Budget Performance">
                {budgetPerformance.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No budgets or budget-related transactions for this period.</p>
                ) : (
                    <div className="space-y-4">
                        {budgetPerformance.map(budget => (
                            <div key={budget.name} className="p-3 bg-gray-900/50 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-white capitalize">{budget.name}</p>
                                    <p className="text-sm text-gray-400">{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</p>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-full rounded-full ${budget.percentage > 95 ? 'bg-red-500' : budget.percentage > 80 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Spent: {formatCurrency(budget.spent)}</span>
                                    {budget.remaining >= 0 ? (
                                        <span className="text-green-400">Remaining: {formatCurrency(budget.remaining)}</span>
                                    ) : (
                                        <span className="text-red-400">Overspent: {formatCurrency(Math.abs(budget.remaining))}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card title="Spending Patterns by Category">
                {spendingByCategory.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No expenses recorded for this period.</p>
                ) : (
                    <div className="space-y-3">
                        {spendingByCategory.map(([category, amount]) => (
                            <div key={category} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg">
                                <p className="text-white capitalize">{category}</p>
                                <p className="font-mono text-red-400">{formatCurrency(amount)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BudgetReportGenerator;