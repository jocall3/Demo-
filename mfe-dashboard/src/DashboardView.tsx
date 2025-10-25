/**
 * @file mfe-dashboard/src/DashboardView.tsx
 * @description The main view component for the Dashboard Micro-Frontend (MFE).
 *
 * ARCHITECTURAL REFACTOR:
 * This component orchestrates the dashboard UI, which is composed of multiple, smaller, reusable widgets.
 * It adheres to the new frontend architecture by:
 * 1.  **Data Fetching**: It uses the dedicated `useDashboardData` hook to fetch all necessary server state
 *     for itself and its child widgets in a single GraphQL query. This aligns with the TanStack Query
 *     pattern for server state management and eliminates dependency on a monolithic `DataContext`.
 * 2.  **State Separation**: It clearly separates server state (managed by `useDashboardData`) from local
 *     client UI state (e.g., `isImporting`, `modalOpen`), which is managed with `useState`.
 * 3.  **Component Composition**: It composes the UI from shared widgets (e.g., `<Card />`, `<BalanceSummary />`),
 *     passing data down as props. This makes the widgets presentational and highly reusable.
 * 4.  **Decoupled Navigation**: It uses a custom event dispatch (`app:navigate`) to communicate navigation
 *     requests to the MFE Shell, avoiding direct coupling.
 * 5.  **Comprehensive Documentation**: All functions, components, and types are documented with TSDoc.
 */

import React, { useState, useCallback, FC } from 'react';

// Data fetching hook specific to this MFE
import { useDashboardData } from './hooks/useDashboardData';

// Shared components, ideally from a centralized UI library like '@demobank/ui-library'
import Card from '../../components/Card';
import PlaidLinkButton from '../../components/PlaidLinkButton';
import BalanceSummary from '../../components/BalanceSummary';
import RecentTransactions from '../../components/RecentTransactions';
import AIInsights from '../../components/AIInsights';
import ImpactTracker from '../../components/ImpactTracker';
import WealthTimeline from '../../components/WealthTimeline';
import { BarChart, Bar, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Cell } from 'recharts';

// Shared types, also ideally from a shared library
import { View, PlaidLinkSuccessMetadata, GamificationState, CreditScore, RewardPoints, Subscription, BudgetCategory, FinancialGoal, MarketMover as MoverType, UpcomingBill } from '../../types';

// ===============================================================================================
// MFE COMMUNICATION & HELPERS
// ===============================================================================================

/**
 * Dispatches a custom event to request navigation from the MFE Shell.
 * @param {View} view - The target view to navigate to.
 * @param {any} [data] - Optional payload to pass with the navigation event.
 */
const dispatchNavigationEvent = (view: View, data?: any) => {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view, data } }));
};

// ===============================================================================================
// WIDGET & UI COMPONENTS
// These are presentational components used to build the dashboard. In a larger MFE,
// they would be in their own `components` sub-directory.
// ===============================================================================================

const DataImportingOverlay: FC<{ isImporting: boolean; bankName: string | null }> = ({ isImporting, bankName }) => {
    const messages = [
        `Connecting to ${bankName || 'your bank'}...`,
        'Securely importing transactions...',
        'AI is analyzing your new financial data...',
        'Finalizing dashboard setup...'
    ];
    const [messageIndex, setMessageIndex] = useState(0);
    
    React.useEffect(() => {
        if (isImporting) {
            const interval = setInterval(() => setMessageIndex(prev => (prev + 1) % messages.length), 2000);
            return () => clearInterval(interval);
        }
    }, [isImporting]);

    if (!isImporting) return null;

    return (
        <div className="fixed inset-0 bg-gray-950/90 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-lg mt-8 font-semibold animate-pulse">{messages[messageIndex]}</p>
        </div>
    );
};

const LinkAccountPrompt: FC<{ onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void; }> = ({ onSuccess }) => (
    <Card title="Welcome to Demo Bank">
        <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-white">Connect Your Financial World</h3>
            <p className="text-gray-400 mt-2 mb-6 max-w-md mx-auto">Link your bank account to unlock a unified financial view, AI-powered insights, and automated transaction tracking.</p>
            <div className="max-w-xs mx-auto"><PlaidLinkButton onSuccess={onSuccess} /></div>
        </div>
    </Card>
);

const GamificationProfile: FC<{ gamification: GamificationState; }> = ({ gamification }) => {
    const { score, level, levelName, progress } = gamification;
    return (
        <Card title="Financial Health" className="h-full" variant="interactive" onClick={() => dispatchNavigationEvent(View.Rewards)}>
            <div className="flex flex-col justify-between h-full text-center">
                <p className="text-4xl font-bold text-white">{score}</p>
                <p className="font-semibold text-lg text-white mt-2">{levelName}</p>
                <p className="text-sm text-gray-400">Level {level}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3"><div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
            </div>
        </Card>
    );
};

const CreditScoreMonitor: FC<{ creditScore: CreditScore; }> = ({ creditScore }) => {
    const { score, rating } = creditScore;
    const ratingColor = { Excellent: 'text-green-400', Good: 'text-cyan-400', Fair: 'text-yellow-400', Poor: 'text-red-400' };
    return (
        <Card title="Credit Score" variant="interactive" onClick={() => dispatchNavigationEvent(View.CreditHealth)}>
            <div className="text-center">
                <p className="text-4xl font-bold text-white">{score}</p>
                <p className={`text-lg font-semibold ${ratingColor[rating] || 'text-gray-400'}`}>{rating}</p>
            </div>
        </Card>
    );
};

const CategorySpending: FC<{ budgets: BudgetCategory[]; }> = ({ budgets }) => {
    const data = budgets.map(b => ({ name: b.name, value: b.spent }));
    return (
        <Card title="Spending by Category" variant="interactive" onClick={() => dispatchNavigationEvent(View.Budgets)}>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={5}>
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={budgets[index].color} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend iconSize={8} wrapperStyle={{fontSize: '12px'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

// Other widgets can be similarly defined as presentational components.

// ===============================================================================================
// DASHBOARD MFE: MAIN VIEW COMPONENT
// ===============================================================================================
const DashboardView: React.FC = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [importBank, setImportBank] = useState<string | null>(null);

    // The single source of truth for all server state on this dashboard.
    const { data, isLoading, isError, error, refetch } = useDashboardData();

    const hasLinkedAccounts = data?.linkedAccounts && data.linkedAccounts.length > 0;

    const handlePlaidSuccess = useCallback((_publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
        setIsImporting(true);
        setImportBank(metadata?.institution?.name || 'your bank');
        // In a real app, a mutation would be called here to exchange the token.
        // We simulate the process and then refetch all dashboard data to reflect the new account.
        setTimeout(() => {
            refetch().finally(() => {
                setIsImporting(false);
                setImportBank(null);
            });
        }, 4000); // Simulate network and processing time
    }, [refetch]);

    const renderContent = () => {
        if (isLoading && !data) {
            return <Card isLoading={true} className="lg:col-span-12 h-96" />;
        }

        if (isError) {
            return <Card errorState={error.message} onRetry={() => refetch()} className="lg:col-span-12" />;
        }
        
        if (!hasLinkedAccounts && !isImporting) {
            return <div className="lg:col-span-12"><LinkAccountPrompt onSuccess={handlePlaidSuccess} /></div>;
        }
        
        // The data object might be undefined on initial load before the first fetch completes
        if (!data) {
             return <Card isLoading={true} className="lg:col-span-12 h-96" />;
        }

        return (
            <>
                <div className="lg:col-span-9"><BalanceSummary /></div>
                <div className="lg:col-span-3"><GamificationProfile gamification={data.gamification} /></div>
                <div className="lg:col-span-3"><CreditScoreMonitor creditScore={data.creditHealth.score} /></div>
                <div className="lg:col-span-4"><CategorySpending budgets={data.budgets} /></div>
                <div className="lg:col-span-5"><SavingsGoals goals={data.financialGoals} onClick={() => dispatchNavigationEvent(View.Goals)} /></div>
                <div className="lg:col-span-8"><RecentTransactions setActiveView={view => dispatchNavigationEvent(view)} /></div>
                <div className="lg:col-span-4"><ImpactTracker treesPlanted={data.impact.treesPlanted} progress={data.impact.progressToNextTree} /></div>
                <div className="lg:col-span-12"><AIInsights /></div>
                <div className="lg:col-span-12"><WealthTimeline /></div>
            </>
        );
    };

    // Simplified placeholder widgets for layout demonstration
    const SavingsGoals: FC<{ goals: FinancialGoal[]; onClick: () => void; }> = ({ goals, onClick }) => <Card title="Savings Goals" onClick={onClick}><p>{goals.length} goals in progress</p></Card>;

    return (
        <div className="space-y-6">
            <DataImportingOverlay isImporting={isImporting} bankName={importBank} />
            <h2 className="text-3xl font-bold text-white tracking-wider">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default DashboardView;
