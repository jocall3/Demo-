import React, { useContext, useState } from 'react';
import Card from './Card';
import { DataContext } from '../context/DataContext';
import type { BudgetCategory, FinancialGoal } from '../types'; // Assuming FinancialGoal type exists in types.ts

// ================================================================================================
// MODAL & UI SUB-COMPONENTS
// ================================================================================================

const NewGoalModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, targetAmount: number, linkedBudgetId?: string) => void;
    budgets: BudgetCategory[];
}> = ({ isOpen, onClose, onAdd, budgets }) => {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [linkedBudgetId, setLinkedBudgetId] = useState<string | undefined>(undefined);

    const handleSubmit = () => {
        if (name && targetAmount) {
            onAdd(name, parseFloat(targetAmount), linkedBudgetId);
            onClose();
            setName('');
            setTargetAmount('');
            setLinkedBudgetId(undefined);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Create New Financial Goal</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Goal Name (e.g., New Car Fund)"
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                        type="number"
                        value={targetAmount}
                        onChange={e => setTargetAmount(e.target.value)}
                        placeholder="Target Amount ($)"
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                     <select
                        value={linkedBudgetId || ''}
                        onChange={e => setLinkedBudgetId(e.target.value || undefined)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        <option value="">No linked budget (Optional)</option>
                        {budgets.map(budget => (
                            <option key={budget.id} value={budget.id}>{budget.name}</option>
                        ))}
                    </select>
                    <button onClick={handleSubmit} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Create Goal</button>
                </div>
            </div>
        </div>
    );
};

const GoalProgressRing: React.FC<{ goal: FinancialGoal; }> = ({ goal }) => {
    const percentage = Math.min(Math.floor((goal.currentAmount / goal.targetAmount) * 100), 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    const ringColor = percentage >= 100 ? 'stroke-green-500' : percentage > 75 ? 'stroke-yellow-500' : 'stroke-blue-400';

    return (
        <div className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                    <circle
                        className={`transition-all duration-700 ease-in-out ${ringColor}`}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="45"
                        cx="50"
                        cy="50"
                        transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="52" className="text-xl font-bold fill-current text-white" textAnchor="middle">{percentage}%</text>
                </svg>
            </div>
            <p className="mt-2 font-semibold text-white">{goal.name}</p>
            <p className="text-sm text-gray-400">${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}</p>
        </div>
    );
};

// ================================================================================================
// MAIN BUDGET GOAL SETTING COMPONENT
// ================================================================================================

const BudgetGoalSetting: React.FC = () => {
    const context = useContext(DataContext);
    const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);

    if (!context) {
        throw new Error("BudgetGoalSetting must be a child of DataProvider.");
    }
    const { financialGoals, budgets, addFinancialGoal } = context;

    const handleAddGoal = (name: string, targetAmount: number, linkedBudgetId?: string) => {
        const newGoal: FinancialGoal = {
            id: `goal-${Date.now()}`,
            name,
            targetAmount,
            currentAmount: 0, // Starting at 0 for a new goal
            startDate: new Date().toISOString().split('T')[0], // Current date
            linkedBudgetId,
        };
        addFinancialGoal(newGoal);
    };

    return (
        <>
            <div className="space-y-6">
                <Card title="Financial Goals" headerActions={[{ id: 'add', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, onClick: () => setIsNewGoalModalOpen(true), label: 'Add new goal' }]}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {financialGoals.length > 0 ? (
                            financialGoals.map(goal => (
                                <GoalProgressRing key={goal.id} goal={goal} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-8">
                                <p className="text-gray-400">No financial goals set yet. Start by adding one!</p>
                                <button
                                    onClick={() => setIsNewGoalModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                                >
                                    Set Your First Goal
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
            <NewGoalModal
                isOpen={isNewGoalModalOpen}
                onClose={() => setIsNewGoalModalOpen(false)}
                onAdd={handleAddGoal}
                budgets={budgets}
            />
        </>
    );
};

export default BudgetGoalSetting;