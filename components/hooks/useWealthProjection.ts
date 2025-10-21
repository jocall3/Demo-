import React, { useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { Transaction } from '../../types'; // Assuming Transaction type is defined in the root types.ts file

interface WealthProjectionParams {
    projectionYears?: number; // Number of years to project forward
    monthlySavings?: number; // Additional amount saved/invested per month
    annualInvestmentReturnRate?: number; // Expected annual return rate, e.g., 0.07 for 7%
}

interface ProjectionDataPoint {
    year: number;
    projectedBalance: number;
}

interface WealthProjectionResult {
    currentBalance: number;
    wealthProjectionData: ProjectionDataPoint[];
}

/**
 * A custom React hook that calculates and provides future wealth projections
 * based on current financial data and user-defined parameters.
 *
 * @param {WealthProjectionParams} params - Configuration for the projection.
 * @param {number} [params.projectionYears=20] - The number of years to project into the future.
 * @param {number} [params.monthlySavings=500] - The additional amount of money saved/invested each month.
 * @param {number} [params.annualInvestmentReturnRate=0.07] - The assumed annual investment return rate (e.g., 0.07 for 7%).
 * @returns {WealthProjectionResult} An object containing the current balance and an array of projected wealth data points.
 */
const useWealthProjection = ({
    projectionYears = 20,
    monthlySavings = 500,
    annualInvestmentReturnRate = 0.07
}: WealthProjectionParams = {}): WealthProjectionResult => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useWealthProjection must be used within a DataProvider");
    }
    const { transactions } = context;

    const { currentBalance, wealthProjectionData } = useMemo(() => {
        // --- Calculate current total balance (mirroring logic from BalanceSummary.tsx) ---
        // Ensure transactions are sorted by date to accurately calculate the running balance.
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;

        // We assume a starting balance of 5000 for a more realistic base,
        // consistent with the `BalanceSummary` component's initial state.
        runningBalance = 5000; 

        for (const tx of sortedTx) {
            if (tx.type === 'income') {
                runningBalance += tx.amount;
            } else {
                runningBalance -= tx.amount;
            }
        }
        const calculatedCurrentBalance = parseFloat(runningBalance.toFixed(2));
        // --- End current balance calculation ---

        const projection: ProjectionDataPoint[] = [];
        let balance = calculatedCurrentBalance;
        const currentYear = new Date().getFullYear();

        // Add the current balance as the starting point for the projection.
        projection.push({ year: currentYear, projectedBalance: balance });

        for (let i = 1; i <= projectionYears; i++) {
            // Add monthly savings for the entire year
            balance += monthlySavings * 12;
            // Apply the annual investment return to the total balance
            balance *= (1 + annualInvestmentReturnRate);
            
            // Round to 2 decimal places to maintain currency precision
            projection.push({ year: currentYear + i, projectedBalance: parseFloat(balance.toFixed(2)) });
        }

        return {
            currentBalance: calculatedCurrentBalance,
            wealthProjectionData: projection,
        };
    }, [transactions, projectionYears, monthlySavings, annualInvestmentReturnRate]); // Dependencies for useMemo to re-calculate when inputs change

    return { currentBalance, wealthProjectionData };
};

export default useWealthProjection;