import React, { useState, useMemo, useCallback } from 'react';
import { gql, useQuery } from '@apollo/client';

// Assuming these components are either part of this MFE bundle or exposed as shared libraries.
// The paths are relative to the monorepo root for now.
import Card from '../../../components/Card';
import PlaidLinkButton from '../../../components/PlaidLinkButton';
import BalanceSummary from '../../../components/BalanceSummary';
import RecentTransactions from '../../../components/RecentTransactions';
import AIInsights from '../../../components/AIInsights';
import ImpactTracker from '../../../components/ImpactTracker';
import WealthTimeline from '../../../components/WealthTimeline';

// Recharts imports for rendering charts in modals (if needed)
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from 'recharts';

// Assuming View enum is a shared type accessible within the MFE context.
import { View, PlaidLinkSuccessMetadata, GamificationState, CreditScore, RewardPoints, Subscription, BudgetCategory, FinancialGoal, MarketMover } from '../../../types';

// ===============================================================================================
// GraphQL Query Definitions for the Dashboard MFE
// This single, comprehensive query fetches all necessary data for the dashboard's core widgets
// in one request to the Apollo Gateway (Supergraph).
// ===============================================================================================
const GET_DASHBOARD_DATA = gql`
  query GetDashboardCoreData {
    userData {
      # Data for BalanceSummary (assuming dedicated resolver returning aggregate)
      balanceSummary {
        totalBalance
        change30d
        chartData {
          name
          value
        }
      }
      # Data for RecentTransactions
      transactions(limit: 5) { # Limit to 5 for recent transactions widget
        id
        type
        category
        description
        amount
        date
        carbonFootprint
      }
      # Data for AIInsights
      aiInsights {
        id
        title
        description
        urgency
        chartData { # Optional chart data for insights
          name
          value
        }
      }
      # Data for ImpactTracker
      impact {
        treesPlanted
        progressToNextTree
      }
      # Data for WealthTimeline (example structure, adjust to actual schema)
      # Assuming it returns a time-series of balance values
      wealthTimeline {
        date
        balance
        projection
      }
      # For initial Plaid Link check: query for presence of linked accounts
      linkedAccounts {
        id
        name
      }
      # Data for GamificationProfile (assuming this entity exists in UserData)
      gamification {
        score
        level
        levelName
        progress
        credits
      }
      # Data for CreditScoreMonitor (assuming part of CreditHealth)
      creditHealth {
        score {
          score
          change
          rating
        }
      }
      # Data for RewardPointsWidget
      rewards {
        points {
          balance
          currency
        }
      }
      # Data for SubscriptionTracker
      subscriptions {
        id
        name
        amount
        nextPayment
        iconName
      }
      # Data for UpcomingBills
      upcomingBills {
        id
        name
        amount
        dueDate
      }
      # Data for CategorySpending (derived from budgets)
      budgets {
        id
        name
        limit
        spent
        color
      }
      # Data for SavingsGoals
      financialGoals {
        id
        name
        targetAmount
        currentAmount
        iconName
      }
      # Data for MarketMovers (assuming a global query or federated to UserData)
      marketMovers {
        ticker
        name
        price
        change
      }
      # Data for AI Predictive Bundle (assuming in UserData)
      aiPredictiveBundle {
        title
        description
        images
      }
    }
  }
`;

// ===============================================================================================
// MFE Communication Helper
// This function dispatches a custom event for inter-MFE or MFE-to-Shell communication.
// It replaces direct prop drilling for navigation.
// ===============================================================================================
const dispatchNavigationEvent = (view: View, data?: any) => {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view, data } }));
};

// ===============================================================================================
// Dashboard Micro-Frontend Root Component
// This component fetches all necessary data for the dashboard via a single GraphQL query
// and orchestrates the rendering of its various widgets.
// ===============================================================================================
const DashboardView: React.FC = () => {
    // --- State for internal UI logic --- 
    const [isDataImportingOverlayVisible, setIsDataImportingOverlayVisible] = useState(false);
    const [dataImportingBankName, setDataImportingBankName] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<{ type: string; data: any } | null>(null);

    // --- Fetching all dashboard data from the Apollo Gateway --- 
    const { loading, error, data, refetch } = useQuery(GET_DASHBOARD_DATA);

    // --- Derived state and data destructuring with safe defaults ---
    const userData = data?.userData;
    const {
        balanceSummary = { totalBalance: 0, change30d: 0, chartData: [] },
        transactions = [],
        aiInsights = [],
        impact = { treesPlanted: 0, progressToNextTree: 0 },
        wealthTimeline = [], // Placeholder, needs actual structure in query
        linkedAccounts = [],
        gamification = { score: 0, level: 0, levelName: 'Novice', progress: 0, credits: 0 } as GamificationState,
        creditHealth = { score: { score: 0, change: 0, rating: 'POOR' }, factors: [] },
        rewards = { points: { balance: 0, currency: 'Points' }, items: [] },
        subscriptions = [],
        upcomingBills = [],
        budgets = [],
        financialGoals = [],
        marketMovers = [],
        aiPredictiveBundle,
    } = userData || {};

    const hasLinkedAccounts = linkedAccounts && linkedAccounts.length > 0;

    // --- Handlers for interactions --- 

    // Callback for successful Plaid Link flow. Refetches all dashboard data.
    const handlePlaidLinkSuccess = useCallback((_publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
        setIsDataImportingOverlayVisible(true);
        setDataImportingBankName(metadata?.institution?.name || 'your bank');

        // Simulate backend exchange process. In a real MFE, this would involve
        // dispatching an event to the shell or a shared service to handle the token exchange.
        setTimeout(() => {
            // After successful token exchange (simulated), refetch all dashboard data.
            refetch();
            setIsDataImportingOverlayVisible(false);
            setDataImportingBankName(null);
        }, 2500);
    }, [refetch]);

    // Handles various quick actions, potentially leading to navigation or modals.
    const handleQuickAction = useCallback((action: string) => {
        switch (action) {
            case 'Send Money':
                dispatchNavigationEvent(View.SendMoney);
                break;
            case 'Pay Bill':
                setActiveModal({ type: 'payBill', data: null }); // Data could be picked from upcomingBills
                break;
            case 'Deposit':
                setActiveModal({ type: 'generic', data: { title: 'Deposit Check', content: 'Mobile check deposit functionality would be here.' } });
                break;
            default:
                console.log(`Unhandled quick action: ${action}`);
        }
    }, []);

    // Handles selection of a market mover, opening a detail modal.
    const handleMarketMoverSelect = useCallback((mover: MarketMover) => {
        setActiveModal({ type: 'stockDetail', data: mover });
    }, []);

    // --- Render logic for conditional content and layout ---

    const renderDashboardWidgets = () => {
        // If no accounts are linked, display the onboarding prompt.
        if (!hasLinkedAccounts && !isDataImportingOverlayVisible) {
            return (
                <div className="lg:col-span-12">
                    <Card title="Welcome to Demo Bank" variant="default">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white">Connect Your Financial World</h3>
                            <p className="text-gray-400 mt-2 mb-6 max-w-md mx-auto">To unlock the full power of Demo Bank, connect your primary bank account. This will enable a unified financial view, AI-powered insights, and automated transaction tracking.</p>
                            <div className="max-w-xs mx-auto"><PlaidLinkButton onSuccess={handlePlaidLinkSuccess} /></div>
                        </div>
                    </Card>
                </div>
            );
        }

        // Render the full suite of dashboard widgets.
        return (
            <>
                {/* Each of these sections represents a widget. In a true MFE, these could be dynamically loaded remote components. */}
                <div className="lg:col-span-9"><BalanceSummary {...balanceSummary} isLoading={loading} error={error?.message} /></div>
                <div className="lg:col-span-3"><GamificationProfile gamification={gamification} onClick={() => dispatchNavigationEvent(View.Rewards)} /></div>
                <div className="lg:col-span-12"><AIPredictiveBundle bundle={aiPredictiveBundle} isLoading={loading} /></div>
                <div className="lg:col-span-3"><QuickActions onAction={handleQuickAction} /></div>
                <div className="lg:col-span-3"><CreditScoreMonitor creditScore={creditHealth.score} onClick={() => dispatchNavigationEvent(View.CreditHealth)} /></div>
                <div className="lg:col-span-3"><RewardPointsWidget rewards={rewards.points} onClick={() => dispatchNavigationEvent(View.Rewards)} /></div>
                {/* Security Status would need its own component and data. Placeholder for now. */}
                <div className="lg:col-span-3"><Card title="Security Status"><p className="text-gray-500">Security status widget goes here.</p></Card></div>
                <div className="lg:col-span-5"><SubscriptionTracker subscriptions={subscriptions} onClick={() => dispatchNavigationEvent(View.Budgets)} /></div>
                <div className="lg:col-span-7"><SavingsGoals goals={financialGoals} onClick={() => dispatchNavigationEvent(View.Goals)} /></div>
                <div className="lg:col-span-8"><CashFlowAnalysis transactions={transactions} onClick={() => dispatchNavigationEvent(View.Transactions)} /></div>
                <div className="lg:col-span-4"><CategorySpending budgets={budgets} onClick={() => dispatchNavigationEvent(View.Budgets)} /></div>
                <div className="lg:col-span-6"><MarketMovers movers={marketMovers} onSelect={handleMarketMoverSelect} /></div>
                <div className="lg:col-span-6"><UpcomingBills bills={upcomingBills} onPay={(bill: any) => setActiveModal({ type: 'payBill', data: bill })} /></div>
                <div className="lg:col-span-8"><RecentTransactions transactions={transactions} setActiveView={(view) => dispatchNavigationEvent(view)} /></div>
                <div className="lg:col-span-4"><ImpactTracker {...impact} /></div>
                <div className="lg:col-span-12"><AIInsights aiInsights={aiInsights} isLoading={loading} error={error?.message} /></div>
                <div className="lg:col-span-12"><WealthTimeline data={wealthTimeline} isLoading={loading} error={error?.message} /></div>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">Dashboard Overview</h2>
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                    {/* Render skeleton loaders while data is fetching */}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`lg:col-span-${(i % 3 === 0) ? 12 : ((i % 2 === 0) ? 6 : 3)}`}>
                            <Card isLoading={true} />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <Card errorState={error.message || "Failed to load dashboard data."} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                    {renderDashboardWidgets()}
                </div>
            )}

            {/* Global overlay for data importing (e.g., from Plaid Link) */}
            {isDataImportingOverlayVisible && (
                <div className="fixed inset-0 bg-gray-950/90 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                        <div className="absolute inset-4 border-4 border-t-cyan-500 border-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white text-lg mt-8 font-semibold animate-pulse">
                        Connecting to {dataImportingBankName || 'your bank'}...
                    </p>
                </div>
            )}

            {/* Generic Modal for quick actions (e.g., Deposit, Pay Bill confirmation) */}
            {activeModal?.type === 'generic' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-4">{activeModal.data.title}</h3>
                        <p className="text-gray-400">{activeModal.data.content}</p>
                        <button onClick={() => setActiveModal(null)} className="w-full mt-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Close</button>
                    </div>
                </div>
            )}

            {/* Modal for Pay Bill confirmation */}
            {activeModal?.type === 'payBill' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-4">Pay Bill: {activeModal.data.name}</h3>
                        <p className="text-gray-400">Confirm payment of <span className="font-bold text-white">${activeModal.data.amount?.toFixed(2)}</span> for {activeModal.data.name} bill due {activeModal.data.dueDate}.</p>
                        <button onClick={() => { alert('Payment simulated successfully!'); setActiveModal(null); }} className="w-full mt-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Confirm Payment</button>
                    </div>
                </div>
            )}

            {/* Modal for Stock Detail view */}
            {activeModal?.type === 'stockDetail' && (
                 <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-4">{activeModal.data.name} ({activeModal.data.ticker})</h3>
                         <p className="text-3xl font-bold text-white">${activeModal.data.price?.toFixed(2)}</p>
                         <p className={`font-semibold ${activeModal.data.change > 0 ? 'text-green-400' : 'text-red-400'}`}>{activeModal.data.change > 0 ? '+' : ''}{activeModal.data.change?.toFixed(2)}</p>
                         {/* Placeholder for a chart component that might be another MFE or local to dashboard */}
                         <div className="h-40 bg-gray-700/50 rounded-lg mt-4 flex items-center justify-center text-gray-500">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={Array.from({ length: 30 }, (_, i) => ({ day: i, price: (activeModal.data.price || 100) - 15 + Math.random() * 30 }))}>
                                    <defs><linearGradient id="stockColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }}/>
                                    <Area type="monotone" dataKey="price" stroke="#06b6d4" fill="url(#stockColor)" />
                                </AreaChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="flex gap-4 mt-4">
                            <button onClick={() => { alert('Buy simulated!'); setActiveModal(null); }} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Buy</button>
                            <button onClick={() => { alert('Sell simulated!'); setActiveModal(null); }} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Sell</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
