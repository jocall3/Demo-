import React, { useState, useMemo, useCallback, FC } from 'react';
import { gql, useQuery } from '@apollo/client';

// As per the micro-frontend architecture, these shared components would ideally be consumed from a shared UI library.
// For this monorepo context, we use relative paths to the centralized component definitions.
import Card from '../../../components/Card';
import PlaidLinkButton from '../../../components/PlaidLinkButton';
import BalanceSummary from '../../../components/BalanceSummary';
import RecentTransactions from '../../../components/RecentTransactions';
import AIInsights from '../../../components/AIInsights';
import ImpactTracker from '../../../components/ImpactTracker';
import WealthTimeline from '../../../components/WealthTimeline';

// Shared types are crucial for ensuring a consistent data contract between the shell and micro-frontends.
import { View, PlaidLinkSuccessMetadata, GamificationState, CreditScore, RewardPoints, Subscription, BudgetCategory, FinancialGoal, MarketMover as MoverType, UpcomingBill, Transaction, Asset, AIInsight } from '../../../types';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Legend, AreaChart, Area } from 'recharts';

// ===============================================================================================
// GRAPHQL QUERY DEFINITION
// This single, comprehensive query fetches all necessary data for the dashboard's widgets
// in one request to the Apollo Gateway (Supergraph), aligning with the new state management strategy.
// ===============================================================================================
const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    userData {
      balanceSummary { totalBalance change30d chartData { name value } }
      transactions(limit: 5) { id type category description amount date carbonFootprint }
      aiInsights { id title description urgency chartData { name value } }
      impact { treesPlanted progressToNextTree }
      wealthTimeline { month balance projection }
      linkedAccounts { id name }
      gamification { score level levelName progress }
      creditHealth { score { score change rating } }
      rewards { points { balance currency } }
      subscriptions { id name amount nextPayment iconName }
      upcomingBills { id name amount dueDate }
      budgets { id name limit spent color }
      financialGoals { id name targetAmount currentAmount iconName }
      aiPredictiveBundle { title description images }
    }
    marketMovers { ticker name price change }
  }
`;

// ===============================================================================================
// MFE COMMUNICATION HELPER
// This function dispatches a custom event for inter-MFE or MFE-to-Shell communication,
// replacing direct prop drilling for navigation.
// ===============================================================================================
const dispatchNavigationEvent = (view: View, data?: any) => {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view, data } }));
};

// ===============================================================================================
// WIDGET & UI COMPONENTS
// These are presentational components used to build the dashboard UI. In a real MFE, these might
// also be shared or self-contained.
// ===============================================================================================

const DataImportingOverlay: FC<{ isImporting: boolean; bankName: string | null }> = ({ isImporting, bankName }) => {
    const messages = [
        `Connecting to ${bankName || 'your bank'}...`,
        'Securely importing transactions...',
        'AI is analyzing your new financial data...',
        'Updating your dashboard...'
    ];
    const [messageIndex, setMessageIndex] = useState(0);
    
    React.useEffect(() => {
        if (isImporting) {
            const interval = setInterval(() => setMessageIndex(prev => (prev + 1) % messages.length), 1500);
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
        <div className="text-center">
            <h3 className="text-xl font-semibold text-white">Connect Your Financial World</h3>
            <p className="text-gray-400 mt-2 mb-6 max-w-md mx-auto">Link your bank account to unlock a unified financial view, AI-powered insights, and automated transaction tracking.</p>
            <div className="max-w-xs mx-auto"><PlaidLinkButton onSuccess={onSuccess} /></div>
        </div>
    </Card>
);

const GamificationProfile: FC<{ gamification: GamificationState; onClick: () => void; }> = ({ gamification, onClick }) => {
    const { score, level, levelName, progress } = gamification;
    return (
        <Card title="Financial Health" className="h-full" variant="interactive" onClick={onClick}>
            <div className="flex flex-col justify-between h-full text-center">
                <p className="text-3xl font-bold text-white">{score}</p>
                <p className="font-semibold text-lg text-white mt-2">{levelName}</p>
                <p className="text-sm text-gray-400">Level {level}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3"><div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
            </div>
        </Card>
    );
};

// Many more widget components would be defined here following the same pattern...
// For brevity in this example, only a few are fully defined.
const QuickActions: FC<{ onAction: (action: string) => void }> = ({ onAction }) => <Card title="Quick Actions"><div className="text-gray-500">Quick Actions Widget</div></Card>;
const CreditScoreMonitor: FC<{ creditScore: CreditScore; onClick: () => void; }> = ({ creditScore, onClick }) => <Card title="Credit Score" onClick={onClick}><div className="text-center text-4xl font-bold">{creditScore.score}</div></Card>;
const RewardPointsWidget: FC<{ rewards: RewardPoints; onClick: () => void; }> = ({ rewards, onClick }) => <Card title="Rewards" onClick={onClick}><div className="text-center text-4xl font-bold">{rewards.balance}</div></Card>;
const SecurityStatus: FC<{ onClick: () => void }> = ({ onClick }) => <Card title="Security" onClick={onClick}><div className="text-green-400">All Systems Secure</div></Card>;
const SubscriptionTracker: FC<{ subscriptions: Subscription[]; onClick: () => void; }> = ({ subscriptions, onClick }) => <Card title="Subscriptions" onClick={onClick}><p>{subscriptions.length} active</p></Card>;
const SavingsGoals: FC<{ goals: FinancialGoal[]; onClick: () => void; }> = ({ goals, onClick }) => <Card title="Savings Goals" onClick={onClick}><p>{goals.length} in progress</p></Card>;
const CashFlowAnalysis: FC<{ transactions: Transaction[]; onClick: () => void; }> = ({ transactions, onClick }) => <Card title="Cash Flow" onClick={onClick}><p>Analysis of {transactions.length} transactions.</p></Card>;
const CategorySpending: FC<{ budgets: BudgetCategory[]; onClick: () => void; }> = ({ budgets, onClick }) => <Card title="Spending" onClick={onClick}><p>{budgets.length} categories</p></Card>;
const MarketMovers: FC<{ movers: MoverType[]; onSelect: (mover: MoverType) => void; }> = ({ movers, onSelect }) => <Card title="Market Movers"><ul className="text-xs">{movers.map(m => <li key={m.ticker} onClick={() => onSelect(m)}>{m.ticker}: ${m.price}</li>)}</ul></Card>;
const UpcomingBills: FC<{ bills: UpcomingBill[]; onPay: (bill: any) => void; }> = ({ bills, onPay }) => <Card title="Upcoming Bills"><p>{bills.length} bills due.</p></Card>;
const AIPredictiveBundle: FC<{ bundle: any; isLoading: boolean; }> = ({ bundle, isLoading }) => <Card title="AI Bundle" isLoading={isLoading}>{bundle && <p>{bundle.title}</p>}</Card>;


// ===============================================================================================
// DASHBOARD MFE: MAIN VIEW COMPONENT
// ===============================================================================================
const DashboardView: React.FC = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [importBank, setImportBank] = useState<string | null>(null);

    const { loading, error, data, refetch } = useQuery(GET_DASHBOARD_DATA);

    const userData = data?.userData;
    const hasLinkedAccounts = (userData?.linkedAccounts?.length ?? 0) > 0;

    const handlePlaidSuccess = useCallback((_publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
        setIsImporting(true);
        setImportBank(metadata?.institution?.name || 'your bank');
        // The token exchange would happen in a shared service or in the shell.
        // We simulate a delay for the process, then refetch data to update the UI.
        setTimeout(() => {
            refetch();
            setIsImporting(false);
            setImportBank(null);
        }, 3000);
    }, [refetch]);

    const renderContent = () => {
        if (loading && !data) {
            return <Card isLoading={true} className="lg:col-span-12 h-64" />;
        }

        if (error) {
            return <Card errorState={error.message} onRetry={refetch} className="lg:col-span-12" />;
        }

        if (!hasLinkedAccounts) {
            return <div className="lg:col-span-12"><LinkAccountPrompt onSuccess={handlePlaidSuccess} /></div>;
        }

        return (
            <>
                <div className="lg:col-span-9"><BalanceSummary /></div>
                <div className="lg:col-span-3"><GamificationProfile gamification={userData.gamification} onClick={() => dispatchNavigationEvent(View.Rewards)} /></div>
                <div className="lg:col-span-12"><AIPredictiveBundle bundle={userData.aiPredictiveBundle} isLoading={loading} /></div>
                <div className="lg:col-span-3"><QuickActions onAction={(action) => dispatchNavigationEvent(View.SendMoney)} /></div>
                <div className="lg:col-span-3"><CreditScoreMonitor creditScore={userData.creditHealth.score} onClick={() => dispatchNavigationEvent(View.CreditHealth)} /></div>
                <div className="lg:col-span-3"><RewardPointsWidget rewards={userData.rewards.points} onClick={() => dispatchNavigationEvent(View.Rewards)} /></div>
                <div className="lg:col-span-3"><SecurityStatus onClick={() => dispatchNavigationEvent(View.Security)} /></div>
                <div className="lg:col-span-5"><SubscriptionTracker subscriptions={userData.subscriptions} onClick={() => dispatchNavigationEvent(View.Budgets)} /></div>
                <div className="lg:col-span-7"><SavingsGoals goals={userData.financialGoals} onClick={() => dispatchNavigationEvent(View.Goals)} /></div>
                <div className="lg:col-span-8"><CashFlowAnalysis transactions={userData.transactions} onClick={() => dispatchNavigationEvent(View.Transactions)} /></div>
                <div className="lg:col-span-4"><CategorySpending budgets={userData.budgets} onClick={() => dispatchNavigationEvent(View.Budgets)} /></div>
                <div className="lg:col-span-6"><MarketMovers movers={data.marketMovers || []} onSelect={(mover) => dispatchNavigationEvent(View.Investments, { ticker: mover.ticker })} /></div>
                <div className="lg:col-span-6"><UpcomingBills bills={userData.upcomingBills} onPay={(bill: any) => dispatchNavigationEvent(View.SendMoney, { prefill: bill })} /></div>
                <div className="lg:col-span-8"><RecentTransactions setActiveView={view => dispatchNavigationEvent(view)} /></div>
                <div className="lg:col-span-4"><ImpactTracker treesPlanted={userData.impact.treesPlanted} progress={userData.impact.progressToNextTree} /></div>
                <div className="lg:col-span-12"><AIInsights /></div>
                <div className="lg:col-span-12"><WealthTimeline /></div>
            </>
        );
    };

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
