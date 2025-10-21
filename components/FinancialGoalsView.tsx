// components/FinancialGoalsView.tsx
import React, { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { DataContext } from '../context/DataContext';
import Card from './Card';
import { FinancialGoal, Contribution } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid, BarChart, Bar } from 'recharts';

const GOAL_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
    home: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    plane: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    car: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m14 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    education: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20" /></svg>,
    default: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    retirement: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    investment: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    gift: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>,
};
export const ALL_GOAL_ICONS = Object.keys(GOAL_ICONS);

export type ProjectionScenario = {
    name: string;
    monthlyContribution: number;
    annualReturn: number;
    data: { month: number; value: number }[];
};

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface ExtendedFinancialGoal extends FinancialGoal {
    contributions: Contribution[];
    riskProfile?: RiskProfile;
    status: 'on_track' | 'needs_attention' | 'achieved';
}

// --- UTILITY FUNCTIONS ---
export const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

export const monthsBetween = (date1: Date, date2: Date): number => {
    let months;
    months = (date2.getFullYear() - date1.getFullYear()) * 12;
    months -= date1.getMonth();
    months += date2.getMonth();
    return months <= 0 ? 0 : months;
};

export const calculateFutureValue = (principal: number, monthlyContribution: number, months: number, annualRate: number): number => {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
        return principal + monthlyContribution * months;
    }
    const futureValueOfPrincipal = principal * Math.pow(1 + monthlyRate, months);
    const futureValueOfContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    return futureValueOfPrincipal + futureValueOfContributions;
};

export class MonteCarloSimulator {
    private initialAmount: number;
    private monthlyContribution: number;
    private months: number;
    private annualMeanReturn: number;
    private annualVolatility: number;
    private numSimulations: number;

    constructor(
        initialAmount: number,
        monthlyContribution: number,
        months: number,
        annualMeanReturn: number, // e.g., 0.07 for 7%
        annualVolatility: number, // e.g., 0.15 for 15%
        numSimulations: number = 1000
    ) {
        this.initialAmount = initialAmount;
        this.monthlyContribution = monthlyContribution;
        this.months = months;
        this.annualMeanReturn = annualMeanReturn;
        this.annualVolatility = annualVolatility;
        this.numSimulations = numSimulations;
    }

    private generateRandomNormal(): number {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    public runSimulation(): number[][] {
        const results: number[][] = [];
        const monthlyMeanReturn = this.annualMeanReturn / 12;
        const monthlyVolatility = this.annualVolatility / Math.sqrt(12);

        for (let i = 0; i < this.numSimulations; i++) {
            const simulationPath: number[] = [this.initialAmount];
            let currentAmount = this.initialAmount;

            for (let j = 0; j < this.months; j++) {
                const randomShock = this.generateRandomNormal();
                const monthlyReturn = Math.exp(monthlyMeanReturn - (monthlyVolatility ** 2) / 2 + monthlyVolatility * randomShock) - 1;
                currentAmount = currentAmount * (1 + monthlyReturn) + this.monthlyContribution;
                simulationPath.push(Math.max(0, currentAmount));
            }
            results.push(simulationPath);
        }
        return results;
    }

    public static analyzeResults(simulationResults: number[][]): {
        medianPath: number[];
        p10Path: number[];
        p90Path: number[];
        finalOutcomes: number[];
        successProbability: (target: number) => number;
    } {
        if (!simulationResults.length) {
            return { medianPath: [], p10Path: [], p90Path: [], finalOutcomes: [], successProbability: () => 0 };
        }
        
        const numSteps = simulationResults[0].length;
        const numSimulations = simulationResults.length;
        const medianPath: number[] = [];
        const p10Path: number[] = [];
        const p90Path: number[] = [];

        for (let step = 0; step < numSteps; step++) {
            const valuesAtStep = simulationResults.map(sim => sim[step]).sort((a, b) => a - b);
            medianPath.push(valuesAtStep[Math.floor(numSimulations * 0.5)]);
            p10Path.push(valuesAtStep[Math.floor(numSimulations * 0.1)]);
            p90Path.push(valuesAtStep[Math.floor(numSimulations * 0.9)]);
        }

        const finalOutcomes = simulationResults.map(sim => sim[sim.length - 1]);

        const successProbability = (target: number) => {
            const successfulSims = finalOutcomes.filter(outcome => outcome >= target).length;
            return (successfulSims / numSimulations) * 100;
        };

        return { medianPath, p10Path, p90Path, finalOutcomes, successProbability };
    }
}


// --- NEW SUB-COMPONENTS ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm">
                <p className="label text-gray-300">{`Month: ${label}`}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color }} className="intro">
                        {`${pld.name}: $${pld.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


export const ContributionHistory: React.FC<{ goal: ExtendedFinancialGoal; onAddContribution: (goalId: string, amount: number) => void }> = ({ goal, onAddContribution }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newContribution, setNewContribution] = useState('');

    const handleAdd = () => {
        const amount = parseFloat(newContribution);
        if (!isNaN(amount) && amount > 0) {
            onAddContribution(goal.id, amount);
            setNewContribution('');
            setIsModalOpen(false);
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-white">Contribution History</h4>
                <button onClick={() => setIsModalOpen(true)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-xs font-medium">Add Contribution</button>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Date</th>
                            <th scope="col" className="px-4 py-3">Amount</th>
                            <th scope="col" className="px-4 py-3">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goal.contributions.length > 0 ? (
                            goal.contributions
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(c => (
                                    <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                        <td className="px-4 py-3">{formatDate(c.date)}</td>
                                        <td className="px-4 py-3 text-green-400">+${c.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3 capitalize">{c.type}</td>
                                    </tr>
                                ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="text-center py-8 text-gray-500">No contributions yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Manual Contribution">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="contribution-amount" className="block text-sm font-medium text-gray-300">Amount</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                id="contribution-amount"
                                value={newContribution}
                                onChange={e => setNewContribution(e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white block w-full pl-7 pr-12 sm:text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium">Cancel</button>
                        <button onClick={handleAdd} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">Add</button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};


export const ProjectionSimulator: React.FC<{ goal: ExtendedFinancialGoal }> = ({ goal }) => {
    const [monthlyContribution, setMonthlyContribution] = useState(goal.plan?.monthlyContribution || 100);
    const [annualReturn, setAnnualReturn] = useState(7); // default 7%
    const [inflationRate, setInflationRate] = useState(2.5);
    const monthsRemaining = useMemo(() => monthsBetween(new Date(), new Date(goal.targetDate)), [goal.targetDate]);

    const projectionData = useMemo(() => {
        const data = [];
        let currentValue = goal.currentAmount;
        let inflationAdjustedTarget = goal.targetAmount;
        const monthlyRate = annualReturn / 100 / 12;
        const monthlyInflation = inflationRate / 100 / 12;

        for (let i = 1; i <= monthsRemaining; i++) {
            currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
            inflationAdjustedTarget = inflationAdjustedTarget * (1 + monthlyInflation);
            data.push({
                month: i,
                projectedValue: parseFloat(currentValue.toFixed(2)),
                target: parseFloat(goal.targetAmount.toFixed(2)),
                inflationAdjustedTarget: parseFloat(inflationAdjustedTarget.toFixed(2)),
            });
        }
        return data;
    }, [goal.currentAmount, goal.targetAmount, monthsRemaining, monthlyContribution, annualReturn, inflationRate]);

    const finalProjectedValue = projectionData.length > 0 ? projectionData[projectionData.length - 1].projectedValue : goal.currentAmount;
    const isOnTrack = finalProjectedValue >= goal.targetAmount;

    return (
        <Card>
             <h4 className="text-lg font-semibold text-white mb-4">Projection Simulator</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400">Monthly Contribution (${monthlyContribution.toLocaleString()})</label>
                    <input type="range" min="0" max={goal.targetAmount / 12} step="50" value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Expected Annual Return ({annualReturn}%)</label>
                    <input type="range" min="0" max="20" step="0.5" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Assumed Inflation ({inflationRate}%)</label>
                    <input type="range" min="0" max="10" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            <div className="h-80 w-full mb-4">
                <ResponsiveContainer>
                    <LineChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="month" label={{ value: 'Months from now', position: 'insideBottom', offset: -10 }} stroke="#A0AEC0" />
                        <YAxis tickFormatter={(tick) => `$${(tick / 1000).toLocaleString()}k`} stroke="#A0AEC0"/>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="projectedValue" name="Projected Growth" stroke="#38B2AC" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="target" name="Target Amount" stroke="#E53E3E" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="inflationAdjustedTarget" name="Target (Inflation Adjusted)" stroke="#F6E05E" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className={`p-4 rounded-lg ${isOnTrack ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <h5 className="font-bold text-white">Simulation Result</h5>
                <p className={`text-sm ${isOnTrack ? 'text-green-300' : 'text-red-300'}`}>
                    With these settings, your projected balance in {monthsRemaining} months will be
                    <span className="font-bold text-white text-lg"> ${finalProjectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>.
                    This is {isOnTrack ? 'enough to reach your goal' : `short of your $${goal.targetAmount.toLocaleString()} target`}.
                </p>
            </div>
        </Card>
    );
};

export const MonteCarloAnalysis: React.FC<{goal: ExtendedFinancialGoal}> = ({ goal }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [volatility, setVolatility] = useState(0.15); // 15% standard deviation
    const [simulations, setSimulations] = useState(1000);
    const monthlyContribution = goal.plan?.monthlyContribution || 100;
    const annualReturn = 0.07; // 7%

    const run = useCallback(() => {
        setIsRunning(true);
        setResults(null);
        setTimeout(() => { // Simulate async operation
            const monthsRemaining = monthsBetween(new Date(), new Date(goal.targetDate));
            const simulator = new MonteCarloSimulator(
                goal.currentAmount,
                monthlyContribution,
                monthsRemaining,
                annualReturn,
                volatility,
                simulations
            );
            const rawResults = simulator.runSimulation();
            const analysis = MonteCarloSimulator.analyzeResults(rawResults);
            
            const chartData = analysis.medianPath.map((val, index) => ({
                month: index,
                median: val,
                p10: analysis.p10Path[index],
                p90: analysis.p90Path[index]
            }));
            
            setResults({ ...analysis, chartData });
            setIsRunning(false);
        }, 500);

    }, [goal, monthlyContribution, annualReturn, volatility, simulations]);

    const distributionData = useMemo(() => {
        if (!results) return [];
        const finalOutcomes = results.finalOutcomes;
        const min = Math.min(...finalOutcomes);
        const max = Math.max(...finalOutcomes);
        const numBins = 20;
        const binSize = (max - min) / numBins;
        const bins = Array(numBins).fill(0).map((_, i) => ({
            range: `${(min + i * binSize).toFixed(0)} - ${(min + (i + 1) * binSize).toFixed(0)}`,
            count: 0
        }));

        for (const outcome of finalOutcomes) {
            let binIndex = Math.floor((outcome - min) / binSize);
            if (binIndex >= numBins) binIndex = numBins - 1;
            bins[binIndex].count++;
        }
        return bins;
    }, [results]);

    return (
        <Card>
            <h4 className="text-lg font-semibold text-white mb-4">Monte Carlo Outcome Analysis</h4>
            <div className="flex flex-wrap gap-4 items-end mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400">Market Volatility ({ (volatility*100).toFixed(0) }%)</label>
                    <input type="range" min="0.05" max="0.4" step="0.01" value={volatility} onChange={(e) => setVolatility(Number(e.target.value))} className="w-48 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Simulations ({simulations.toLocaleString()})</label>
                    <input type="range" min="100" max="10000" step="100" value={simulations} onChange={(e) => setSimulations(Number(e.target.value))} className="w-48 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <button onClick={run} disabled={isRunning} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isRunning ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>
            {isRunning && <div className="text-center py-10 text-gray-400">Calculating thousands of possible futures...</div>}
            {results && (
                <div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                             <h5 className="font-semibold text-white mb-2">Projected Growth Range</h5>
                             <div className="h-80 w-full">
                                <ResponsiveContainer>
                                    <AreaChart data={results.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="month" stroke="#A0AEC0" />
                                        <YAxis tickFormatter={(tick) => `$${(tick / 1000).toLocaleString()}k`} stroke="#A0AEC0"/>
                                        <Tooltip content={<CustomTooltip />} />
                                        <defs>
                                            <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38B2AC" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#38B2AC" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="p90" stroke={false} fill="none" name="90th Percentile" />
                                        <Area type="monotone" dataKey="p10" stackId="1" stroke={false} fill="url(#colorRange)" name="10th Percentile" />
                                        <Line type="monotone" dataKey="median" stroke="#F6E05E" strokeWidth={2} dot={false} name="Median Outcome" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div>
                            <h5 className="font-semibold text-white mb-2">Distribution of Final Outcomes</h5>
                             <div className="h-80 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={distributionData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="range" stroke="#A0AEC0" tick={{fontSize: 10}} interval={3} />
                                        <YAxis stroke="#A0AEC0" />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(127, 209, 213, 0.1)'}} />
                                        <Bar dataKey="count" name="Number of Simulations" fill="#38B2AC" />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>
                    <div className="mt-6 p-4 rounded-lg bg-cyan-500/10">
                        <h5 className="font-bold text-white">Simulation Summary</h5>
                        <p className="text-sm text-cyan-200">
                           Based on {simulations.toLocaleString()} simulations, there is a <span className="font-bold text-white text-lg">{results.successProbability(goal.targetAmount).toFixed(1)}%</span> chance of reaching your target of ${goal.targetAmount.toLocaleString()}.
                        </p>
                        <div className="mt-2 text-xs grid grid-cols-3 gap-2 text-cyan-300">
                            <span>Pessimistic Outcome (10%): <strong className="text-white">${Math.round(results.p10Path[results.p10Path.length - 1]).toLocaleString()}</strong></span>
                            <span>Median Outcome (50%): <strong className="text-white">${Math.round(results.medianPath[results.medianPath.length - 1]).toLocaleString()}</strong></span>
                            <span>Optimistic Outcome (90%): <strong className="text-white">${Math.round(results.p90Path[results.p90Path.length - 1]).toLocaleString()}</strong></span>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

// --- VIEWS ---

export const CreateGoalView: React.FC<{
    onGoalCreate: (newGoal: Omit<FinancialGoal, 'id' | 'currentAmount' | 'plan'>) => void;
    onBack: () => void;
}> = ({ onGoalCreate, onBack }) => {
    const [step, setStep] = useState(1);
    const [goalData, setGoalData] = useState({
        name: '',
        targetAmount: '',
        targetDate: '',
        iconName: 'default',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateStep = () => {
        const newErrors: { [key: string]: string } = {};
        if (step === 1) {
            if (!goalData.name) newErrors.name = 'Goal name is required.';
            if (Number(goalData.targetAmount) <= 0) newErrors.targetAmount = 'Target amount must be positive.';
            if (!goalData.targetDate) newErrors.targetDate = 'Target date is required.';
            else if (new Date(goalData.targetDate) <= new Date()) newErrors.targetDate = 'Target date must be in the future.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(s => s + 1);
        }
    };

    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = () => {
        if (validateStep()) {
            onGoalCreate({
                ...goalData,
                targetAmount: parseFloat(goalData.targetAmount),
            });
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">Goal Name</label>
                            <input type="text" value={goalData.name} onChange={e => setGoalData({...goalData, name: e.target.value})} className="mt-1 w-full bg-gray-900 border-gray-600 text-white rounded-md focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., Buy a new car"/>
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-300">Target Amount</label>
                                <input type="number" value={goalData.targetAmount} onChange={e => setGoalData({...goalData, targetAmount: e.target.value})} className="mt-1 w-full bg-gray-900 border-gray-600 text-white rounded-md focus:ring-cyan-500 focus:border-cyan-500" placeholder="50000" />
                                {errors.targetAmount && <p className="text-red-400 text-xs mt-1">{errors.targetAmount}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300">Target Date</label>
                                <input type="date" value={goalData.targetDate} onChange={e => setGoalData({...goalData, targetDate: e.target.value})} className="mt-1 w-full bg-gray-900 border-gray-600 text-white rounded-md focus:ring-cyan-500 focus:border-cyan-500" />
                                {errors.targetDate && <p className="text-red-400 text-xs mt-1">{errors.targetDate}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">Choose an Icon</label>
                            <div className="flex flex-wrap gap-2">
                                {ALL_GOAL_ICONS.map(iconName => {
                                    const Icon = GOAL_ICONS[iconName];
                                    return (
                                        <button key={iconName} onClick={() => setGoalData({...goalData, iconName})} className={`p-3 rounded-full ${goalData.iconName === iconName ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                                            <Icon className="w-6 h-6" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 2:
                // Placeholder for a potential second step, e.g., initial contribution or linking accounts.
                return (
                     <div className="text-center">
                        <h3 className="text-lg font-semibold text-white">Review your goal</h3>
                        <div className="text-left mt-4 p-4 bg-gray-700/50 rounded-lg space-y-2">
                            <p className="text-gray-400">Name: <strong className="text-white">{goalData.name}</strong></p>
                            <p className="text-gray-400">Target: <strong className="text-white">${parseFloat(goalData.targetAmount).toLocaleString()}</strong> by <strong className="text-white">{formatDate(goalData.targetDate)}</strong></p>
                            <p className="text-gray-400 flex items-center gap-2">Icon: <span className="p-1 bg-cyan-500/20 rounded-full"><Icon className="w-5 h-5 text-cyan-300" /></span></p>
                        </div>
                    </div>
                );
        }
    };
    const Icon = GOAL_ICONS[goalData.iconName];


    return (
         <div>
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-white tracking-wider">Create New Goal</h2>
                 <button onClick={onBack} className="text-sm text-cyan-400 hover:text-cyan-200">Back to List</button>
            </div>
            <Card>
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="relative h-2 bg-gray-700 rounded-full">
                         <div className="absolute top-0 left-0 h-2 bg-cyan-500 rounded-full" style={{ width: `${(step - 1) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span className={step >= 1 ? 'text-white' : ''}>Details</span>
                        <span className={step >= 2 ? 'text-white' : ''}>Confirm</span>
                    </div>
                </div>

                {renderStep()}
                
                <div className="flex justify-between mt-8">
                    <button onClick={prevStep} disabled={step === 1} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                        Back
                    </button>
                    {step < 2 ? (
                        <button onClick={nextStep} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                           Create Goal
                        </button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export const GoalDetailView: React.FC<{
    goal: ExtendedFinancialGoal;
    onBack: () => void;
    onGeneratePlan: (goalId: string) => Promise<void>;
    onAddContribution: (goalId: string, amount: number) => void;
    loadingGoalId: string | null;
}> = ({ goal, onBack, onGeneratePlan, onAddContribution, loadingGoalId }) => {
    type Tab = 'overview' | 'contributions' | 'projections' | 'insights' | 'monte-carlo';
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const Icon = GOAL_ICONS[goal.iconName] || GOAL_ICONS.default;
    const monthsRemaining = monthsBetween(new Date(), new Date(goal.targetDate));
    const requiredMonthlySaving = (goal.targetAmount - goal.currentAmount) / (monthsRemaining > 0 ? monthsRemaining : 1);

    const tabs: {id: Tab, label: string}[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'contributions', label: 'Contributions' },
        { id: 'projections', label: 'Projections' },
        { id: 'monte-carlo', label: 'Risk Analysis' },
        { id: 'insights', label: 'AI Insights' },
    ];

    return (
         <div>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div className="flex items-center gap-4">
                     <div className="flex-shrink-0 w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300">
                         <Icon className="w-8 h-8" />
                     </div>
                     <div>
                        <h2 className="text-3xl font-bold text-white tracking-wider">{goal.name}</h2>
                        <p className="text-gray-400">Target: ${goal.targetAmount.toLocaleString()} by {formatDate(goal.targetDate)}</p>
                    </div>
                </div>
                 <button onClick={onBack} className="mt-2 md:mt-0 text-sm text-cyan-400 hover:text-cyan-200 self-start md:self-center">Back to List</button>
            </div>
            
            <div className="border-b border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                             <Card>
                                <h4 className="text-lg font-semibold text-white mb-4">Goal Progress</h4>
                                <div className="w-full bg-gray-700 rounded-full h-4 relative">
                                    <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-gray-400">Current Amount</p>
                                        <p className="text-xl font-bold text-white">${goal.currentAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Remaining</p>
                                        <p className="text-xl font-bold text-white">${(goal.targetAmount - goal.currentAmount).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Time Left</p>
                                        <p className="text-xl font-bold text-white">{monthsRemaining} months</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Required Monthly</p>
                                        <p className="text-xl font-bold text-white">${requiredMonthlySaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                             </Card>
                        </div>
                        <div className="lg:col-span-1">
                             <Card>
                                 <h4 className="text-lg font-semibold text-white mb-2">Goal Status</h4>
                                 <p className="text-sm text-gray-400">{goal.status === 'on_track' ? 'You are on track to meet your goal.' : 'You may need to adjust your plan.'}</p>
                                 <div className={`mt-3 w-full p-2 rounded-md flex items-center gap-2 ${goal.status === 'on_track' ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                                    {goal.status === 'on_track' ? <span>✓</span> : <span>!</span>}
                                    <span className="capitalize font-medium text-sm">{goal.status.replace('_', ' ')}</span>
                                 </div>
                             </Card>
                        </div>
                    </div>
                )}

                 {activeTab === 'contributions' && (
                    <ContributionHistory goal={goal} onAddContribution={onAddContribution}/>
                 )}

                 {activeTab === 'projections' && <ProjectionSimulator goal={goal} />}

                 {activeTab === 'monte-carlo' && <MonteCarloAnalysis goal={goal} />}
                
                 {activeTab === 'insights' && (
                     <Card>
                        <h4 className="text-lg font-semibold text-white mb-4">AI-Generated Plan & Insights</h4>
                        {goal.plan ? (
                            <div className="space-y-4 text-gray-300">
                                <p><strong className="text-white">Feasibility Summary:</strong> {goal.plan.feasibilitySummary}</p>
                                <p><strong className="text-white">Recommended Monthly Contribution:</strong> ${goal.plan.monthlyContribution.toLocaleString()}</p>
                                <div>
                                    <strong className="text-white">Actionable Steps:</strong>
                                    <ul className="mt-2 space-y-3">
                                        {goal.plan.steps.map((step, index) => 
                                            <li key={index} className="p-3 bg-gray-700/50 rounded-lg">
                                                <p className="font-semibold text-white">{step.title} <span className="text-xs text-cyan-400 ml-2">{step.category}</span></p>
                                                <p className="text-sm text-gray-400">{step.description}</p>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">No plan has been generated for this goal yet.</p>
                                <button onClick={() => onGeneratePlan(goal.id)} disabled={loadingGoalId === goal.id} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {loadingGoalId === goal.id ? 'Generating Plan...' : 'Generate AI Plan'}
                                </button>
                            </div>
                        )}
                     </Card>
                 )}
            </div>
         </div>
    );
};

// --- MAIN COMPONENT ---

const FinancialGoalsView: React.FC = () => {
    type GoalView = 'LIST' | 'CREATE' | 'DETAIL';
    const [currentView, setCurrentView] = useState<GoalView>('LIST');
    const [selectedGoal, setSelectedGoal] = useState<ExtendedFinancialGoal | null>(null);
    const [loadingGoalId, setLoadingGoalId] = useState<string | null>(null);

    const context = useContext(DataContext);
    if (!context) throw new Error("FinancialGoalsView must be within a DataProvider.");
    const { financialGoals: originalGoals, addFinancialGoal, generateGoalPlan, contributeToGoal } = context;

    // Extend original goals with mock data for a richer experience
    const financialGoals: ExtendedFinancialGoal[] = useMemo(() => {
        return originalGoals.map(g => ({
            ...g,
            contributions: g.contributions || [
                { id: 'c1', amount: g.currentAmount * 0.4, date: '2023-01-15T10:00:00Z', type: 'manual' },
                { id: 'c2', amount: g.currentAmount * 0.6, date: '2023-03-20T10:00:00Z', type: 'manual' },
            ],
            status: g.currentAmount / g.targetAmount > 0.6 ? 'on_track' : 'needs_attention'
        }));
    }, [originalGoals]);
    
    const handleGeneratePlan = async (goalId: string) => {
        setLoadingGoalId(goalId);
        await generateGoalPlan(goalId);
        setLoadingGoalId(null);
    };

    const handleCreateGoal = (newGoalData: Omit<FinancialGoal, 'id' | 'currentAmount' | 'plan'>) => {
        addFinancialGoal(newGoalData);
        setCurrentView('LIST');
    };

    const handleAddContribution = (goalId: string, amount: number) => {
        contributeToGoal(goalId, amount);
    };

    useEffect(() => {
        if(currentView === 'DETAIL' && selectedGoal) {
            const updatedGoal = financialGoals.find(g => g.id === selectedGoal.id);
            if(updatedGoal) {
                setSelectedGoal(updatedGoal);
            }
        }
    }, [financialGoals, currentView, selectedGoal]);
    
    const GoalListView: React.FC = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white tracking-wider">Financial Goals</h2>
                <button onClick={() => setCurrentView('CREATE')} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">New Goal</button>
            </div>
            {financialGoals.map(goal => {
                 const progress = (goal.currentAmount / goal.targetAmount) * 100;
                 const Icon = GOAL_ICONS[goal.iconName] || GOAL_ICONS.default;
                 return (
                    <Card key={goal.id} variant="interactive" onClick={() => { setSelectedGoal(goal); setCurrentView('DETAIL'); }}>
                         <div className="flex flex-col md:flex-row gap-6">
                             <div className="flex-shrink-0 w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-300 mx-auto">
                                 <Icon className="w-12 h-12" />
                             </div>
                             <div className="flex-grow">
                                <div className="flex justify-between items-baseline">
                                     <h3 className="text-xl font-semibold text-white">{goal.name}</h3>
                                     <p className="text-sm text-gray-400">Target: {formatDate(goal.targetDate)}</p>
                                </div>
                                <p className="text-lg text-gray-300 mt-2">
                                     <span className="text-white font-bold">${goal.currentAmount.toLocaleString()}</span> / ${goal.targetAmount.toLocaleString()}
                                </p>
                                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                    <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                             </div>
                         </div>
                    </Card>
                 );
            })}
        </div>
    );
    
    const renderCurrentView = () => {
        switch (currentView) {
            case 'CREATE':
                return <CreateGoalView onGoalCreate={handleCreateGoal} onBack={() => setCurrentView('LIST')} />;
            case 'DETAIL':
                return selectedGoal ? (
                     <GoalDetailView
                        goal={selectedGoal}
                        onBack={() => setCurrentView('LIST')}
                        onGeneratePlan={handleGeneratePlan}
                        onAddContribution={handleAddContribution}
                        loadingGoalId={loadingGoalId}
                     />
                 ) : <GoalListView />;
            case 'LIST':
            default:
                return <GoalListView />;
        }
    };

    return (
        <>
            {renderCurrentView()}
        </>
    );
};

export default FinancialGoalsView;
