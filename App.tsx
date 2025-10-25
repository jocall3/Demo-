import React, { useState, FC, ReactNode, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Auth0Provider, useAuth0, AppState } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Local components (part of the shell)
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import VoiceControl from './components/VoiceControl';
import Card from './components/Card'; // For loading/error states
import { View, IllusionType } from './types';

// ===============================================================================================
// REDUX TOOLKIT SETUP (For Global UI State)
// Manages purely client-side UI state: active view, sidebar status, theme, etc.
// Server state is handled by Apollo Client & TanStack Query.
// ===============================================================================================

interface UiState {
    activeView: View;
    previousView: View | null;
    isSidebarOpen: boolean;
    // Personalization state is managed here as it's global UI state.
    customBackgroundUrl: string | null;
    activeIllusion: IllusionType;
}

const initialState: UiState = {
    activeView: View.Dashboard,
    previousView: null,
    isSidebarOpen: false,
    customBackgroundUrl: localStorage.getItem('customBackgroundUrl') || null,
    activeIllusion: (localStorage.getItem('activeIllusion') as IllusionType) || 'none',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setActiveView: (state, action: PayloadAction<View>) => {
            if (action.payload !== state.activeView) {
                state.previousView = state.activeView;
                state.activeView = action.payload;
            }
        },
        setIsSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isSidebarOpen = action.payload;
        },
        // ... other UI state reducers for personalization can be added here
    },
});

const store = configureStore({
    reducer: {
        ui: uiSlice.reducer,
    },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <TSelected extends unknown>(
    selector: (state: RootState) => TSelected
): TSelected => useSelector<RootState, TSelected>(selector);

// ===============================================================================================
// LAZY LOADED VIEWS (Micro-Frontends and Local Components)
// ===============================================================================================

// --- Remote Micro-Frontends ---
// These are dynamically imported from other deployments via Module Federation.
const DashboardMFE = lazy(() => import('dashboard/DashboardApp'));
const TransactionsMFE = lazy(() => import('transactions/TransactionsView'));
const InvestmentsMFE = lazy(() => import('investments/InvestmentsView'));

// --- Local Components (Code-Split) ---
// These are still part of the shell application but are code-split for performance.
const SendMoneyView = lazy(() => import('./components/SendMoneyView'));
const BudgetsView = lazy(() => import('./components/BudgetsView'));
const AIAdvisorView = lazy(() => import('./components/AIAdvisorView'));
const SecurityView = lazy(() => import('./components/SecurityView'));
const QuantumWeaverView = lazy(() => import('./components/QuantumWeaverView'));
const AgentMarketplaceView = lazy(() => import('./components/MarketplaceView'));
const CorporateCommandView = lazy(() => import('./components/CorporateCommandView'));
const OpenBankingView = lazy(() => import('./components/OpenBankingView'));
const FinancialDemocracyView = lazy(() => import('./components/FinancialDemocracyView'));
const AIAdStudioView = lazy(() => import('./components/AIAdStudioView'));
const CryptoView = lazy(() => import('./components/CryptoView'));
const FinancialGoalsView = lazy(() => import('./components/FinancialGoalsView'));
const RewardsView = lazy(() => import('./components/RewardsView'));
const CreditHealthView = lazy(() => import('./components/CreditHealthView'));
const SettingsView = lazy(() => import('./components/SettingsView'));

// Simple placeholder views for unimplemented sections
const PersonalizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Personalization</h2><p className="text-gray-400 mt-2">Personalization features coming soon!</p></div>;
const CardCustomizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Card Customization</h2><p className="text-gray-400 mt-2">Design your dream card! This feature is under development.</p></div>;
const TheVisionView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">The Winning Vision</h2><p className="text-gray-400 mt-2">Discover our philosophy and future roadmap for Demo Bank.</p></div>;
const APIIntegrationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">API Status & Integration</h2><p className="text-gray-400 mt-2">Monitor the health of our external API connections.</p></div>;


// ===============================================================================================
// AUTHENTICATION & LOGIN UI
// ===============================================================================================

const LoginScreen: FC = () => {
    const { loginWithRedirect } = useAuth0();
    return (
        <div className="flex items-center justify-center h-screen bg-gray-950">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg p-8 w-96 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Demo Bank</h1>
                <p className="text-gray-400 mb-6">Your AI-powered financial co-pilot.</p>
                <button
                    onClick={() => loginWithRedirect()}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg transition-transform transform hover:scale-105"
                >
                    Log In / Sign Up
                </button>
            </div>
        </div>
    );
};

// ===============================================================================================
// MAIN APP LAYOUT & LOGIC (The "Shell")
// ===============================================================================================

const App: FC = () => {
    const dispatch = useAppDispatch();
    const { activeView, previousView, isSidebarOpen, customBackgroundUrl, activeIllusion } = useAppSelector(state => state.ui);

    const setActiveView = useCallback((view: View) => {
        dispatch(uiSlice.actions.setActiveView(view));
    }, [dispatch]);

    const setIsSidebarOpen = useCallback((isOpen: boolean) => {
        dispatch(uiSlice.actions.setIsSidebarOpen(isOpen));
    }, [dispatch]);

    // This function now maps views to lazy-loaded components (local or remote MFEs).
    const renderActiveView = () => {
        // Props that might be needed by the view components
        const viewProps = { setActiveView, previousView };

        switch (activeView) {
            case View.Dashboard: return <DashboardMFE {...viewProps} />;
            case View.Transactions: return <TransactionsMFE {...viewProps} />;
            case View.Investments: return <InvestmentsMFE {...viewProps} />;
            // The rest are lazy-loaded local components
            case View.SendMoney: return <SendMoneyView {...viewProps} />;
            case View.Budgets: return <BudgetsView />;
            case View.AIAdvisor: return <AIAdvisorView {...viewProps} />;
            case View.Security: return <SecurityView />;
            case View.QuantumWeaver: return <QuantumWeaverView />;
            case View.Marketplace: return <AgentMarketplaceView />;
            case View.CorporateCommand: return <CorporateCommandView />;
            case View.OpenBanking: return <OpenBankingView />;
            case View.FinancialDemocracy: return <FinancialDemocracyView />;
            case View.AIAdStudio: return <AIAdStudioView />;
            case View.Crypto: return <CryptoView />;
            case View.Goals: return <FinancialGoalsView />;
            case View.Rewards: return <RewardsView />;
            case View.CreditHealth: return <CreditHealthView />;
            case View.Settings: return <SettingsView />;
            case View.Personalization: return <PersonalizationView />;
            case View.CardCustomization: return <CardCustomizationView />;
            case View.TheVision: return <TheVisionView />;
            case View.APIIntegration: return <APIIntegrationView />;
            default: return <DashboardMFE {...viewProps} />;
        }
    };

    const backgroundStyle: React.CSSProperties = customBackgroundUrl ? { backgroundImage: `url(${customBackgroundUrl})` } : {};

    return (
        <div id="app-container" style={backgroundStyle} className={`bg-cover bg-center bg-fixed ${activeIllusion === 'aurora' ? 'aurora-bg' : ''}`}>
             <div className="flex h-screen bg-gray-950/80 text-gray-200 backdrop-blur-xl">
                <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} setActiveView={setActiveView} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
                        <Suspense fallback={<Card isLoading={true} className="h-full w-full"/>}>
                            {renderActiveView()}
                        </Suspense>
                    </main>
                </div>
                <VoiceControl setActiveView={setActiveView} />
            </div>
            {activeIllusion === 'aurora' && <style>{`
                .aurora-bg { background: #030712; position: relative; overflow: hidden; }
                .aurora-bg::before, .aurora-bg::after { content: ''; position: absolute; width: 800px; height: 800px; border-radius: 50%; filter: blur(150px); opacity: 0.3; mix-blend-mode: screen; animation: aurora-flow 20s infinite linear; }
                .aurora-bg::before { background: radial-gradient(circle, #06b6d4, transparent); top: -20%; left: -20%; }
                .aurora-bg::after { background: radial-gradient(circle, #4f46e5, transparent); bottom: -20%; right: -20%; animation-delay: -10s; }
                @keyframes aurora-flow { 0% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(100px, 100px) rotate(180deg); } 100% { transform: translate(0, 0) rotate(360deg); } }
            `}</style>}
        </div>
    );
};

/**
 * Creates and configures an Apollo Client instance that automatically includes the
 * Auth0 JWT in the headers of every GraphQL request.
 */
const AuthenticatedApp: FC = () => {
    const { getAccessTokenSilently } = useAuth0();
    const queryClient = new QueryClient();

    const apolloClient = useMemo(() => {
        const httpLink = createHttpLink({
            uri: import.meta.env.VITE_GRAPHQL_GATEWAY_URL || '/graphql',
        });

        const authLink = setContext(async (_, { headers }) => {
            try {
                const token = await getAccessTokenSilently({
                    authorizationParams: {
                        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                    },
                });
                return {
                    headers: {
                        ...headers,
                        authorization: token ? `Bearer ${token}` : '',
                    },
                };
            } catch (error) {
                console.error('Error getting access token for Apollo', error);
                return { headers };
            }
        });

        return new ApolloClient({
            link: authLink.concat(httpLink),
            cache: new InMemoryCache(),
        });
    }, [getAccessTokenSilently]);

    return (
        <ApolloProvider client={apolloClient}>
            <QueryClientProvider client={queryClient}>
                <Provider store={store}>
                    <App />
                </Provider>
            </QueryClientProvider>
        </ApolloProvider>
    );
};

/**
 * This component acts as a controller, checking the authentication state and
 * rendering either the login screen or the main application.
 */
const AppController: FC = () => {
    const { isAuthenticated, isLoading, error } = useAuth0();

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading Authentication...</div>;
    }
  
    if (error) {
        return <div className="flex flex-col items-center justify-center h-screen bg-red-950 text-white p-8"><h1 className="text-2xl font-bold">Authentication Error</h1><p className="mt-2 text-center text-red-400">{error.message}</p></div>;
    }

    return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
};

// ===============================================================================================
// APP WRAPPER (Root Component with all Providers)
// ===============================================================================================

const AppWrapper: FC = () => {
    const onRedirectCallback = useCallback((appState?: AppState) => {
        window.history.replaceState(
            {},
            document.title,
            appState?.returnTo || window.location.pathname
        );
    }, []);

    const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

    if (!auth0Domain || !auth0ClientId || !auth0Audience) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-red-950 text-white p-8">
                <h1 className="text-2xl font-bold">Auth0 Configuration Missing</h1>
                <p className="mt-2 text-center">Please set <code className="bg-red-800 p-1 rounded">VITE_AUTH0_DOMAIN</code>, <code className="bg-red-800 p-1 rounded">VITE_AUTH0_CLIENT_ID</code>, and <code className="bg-red-800 p-1 rounded">VITE_AUTH0_AUDIENCE</code> in your .env file.</p>
            </div>
        );
    }

    return (
        <Auth0Provider
            domain={auth0Domain}
            clientId={auth0ClientId}
            onRedirectCallback={onRedirectCallback}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: auth0Audience,
                scope: 'openid profile email offline_access', // Request offline access for refresh tokens
            }}
            cacheLocation="localstorage"
        >
            <AppController />
        </Auth0Provider>
    );
};

export default AppWrapper;
