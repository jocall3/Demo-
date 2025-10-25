import React, { useState, FC, ReactNode, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Auth0Provider, useAuth0, AppState } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import VoiceControl from './components/VoiceControl';
import { View, IllusionType } from './types';

// ===============================================================================================
// REDUX TOOLKIT SETUP (For Global UI State)
// Manages client-side state like the active view, sidebar status, and theme.
// ===============================================================================================

interface UiState {
    activeView: View;
    previousView: View | null;
    isSidebarOpen: boolean;
    customBackgroundUrl: string | null;
    activeIllusion: IllusionType;
    geminiApiKey: string | null; // Moved here from DataContext as a client-side config
}

const initialState: UiState = {
    activeView: View.Dashboard,
    previousView: null,
    isSidebarOpen: false,
    customBackgroundUrl: localStorage.getItem('customBackgroundUrl') || null,
    activeIllusion: (localStorage.getItem('activeIllusion') as IllusionType) || 'none',
    geminiApiKey: localStorage.getItem('geminiApiKey') || null,
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
        setCustomBackgroundUrl: (state, action: PayloadAction<string>) => {
            state.customBackgroundUrl = action.payload;
            state.activeIllusion = 'none';
            localStorage.setItem('customBackgroundUrl', action.payload);
            localStorage.setItem('activeIllusion', 'none');
        },
        setActiveIllusion: (state, action: PayloadAction<IllusionType>) => {
            state.activeIllusion = action.payload;
            if (action.payload !== 'none') {
                state.customBackgroundUrl = null;
                localStorage.removeItem('customBackgroundUrl');
            }
            localStorage.setItem('activeIllusion', action.payload);
        },
        setGeminiApiKey: (state, action: PayloadAction<string>) => {
            state.geminiApiKey = action.payload;
            localStorage.setItem('geminiApiKey', action.payload);
        },
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
// LAZY LOADED MICRO-FRONTEND VIEWS
// These are dynamically imported based on the activeView, implementing the Micro-Frontend pattern.
// ===============================================================================================

const Dashboard = lazy(() => import('./components/Dashboard'));
const TransactionsView = lazy(() => import('./components/TransactionsView'));
const SendMoneyView = lazy(() => import('./components/SendMoneyView'));
const InvestmentsView = lazy(() => import('./components/InvestmentsView'));
const AIAdvisorView = lazy(() => import('./components/AIAdvisorView'));
const SecurityView = lazy(() => import('./components/SecurityView'));
const BudgetsView = lazy(() => import('./components/BudgetsView'));
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

// Simple placeholder views for unimplemented sections
const PersonalizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Personalization</h2><p className="text-gray-400 mt-2">Personalization features coming soon! Stay tuned for more ways to customize your experience.</p></div>;
const CardCustomizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Card Customization</h2><p className="text-gray-400 mt-2">Design your dream card! This feature is under development.</p></div>;
const SettingsView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Settings</h2><p className="text-gray-400 mt-2">Manage your preferences and account settings here.</p></div>;
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
// MAIN APP LAYOUT & LOGIC
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

    const renderActiveView = () => {
        const Component = (() => {
            switch (activeView) {
                case View.Dashboard: return Dashboard;
                case View.Transactions: return TransactionsView;
                case View.SendMoney: return SendMoneyView;
                case View.Budgets: return BudgetsView;
                case View.Investments: return InvestmentsView;
                case View.AIAdvisor: return AIAdvisorView;
                case View.QuantumWeaver: return QuantumWeaverView;
                case View.AIAdStudio: return AIAdStudioView;
                case View.Marketplace: return AgentMarketplaceView;
                case View.Personalization: return PersonalizationView;
                case View.CardCustomization: return CardCustomizationView;
                case View.Security: return SecurityView;
                case View.Goals: return FinancialGoalsView;
                case View.Crypto: return CryptoView;
                case View.CorporateCommand: return CorporateCommandView;
                case View.TheVision: return TheVisionView;
                case View.APIIntegration: return APIIntegrationView;
                case View.OpenBanking: return OpenBankingView;
                case View.Rewards: return RewardsView;
                case View.CreditHealth: return CreditHealthView;
                case View.Settings: return SettingsView;
                case View.FinancialDemocracy: return FinancialDemocracyView;
                default: return Dashboard;
            }
        })();
        return <Component previousView={previousView} setActiveView={setActiveView} />; // Pass props to dynamically loaded component
    };

    const backgroundStyle: React.CSSProperties = customBackgroundUrl ? { backgroundImage: `url(${customBackgroundUrl})` } : {};

    return (
        <div id="app-container" style={backgroundStyle} className={`bg-cover bg-center bg-fixed ${activeIllusion === 'aurora' ? 'aurora-bg' : ''}`}>
             <div className={`flex h-screen bg-gray-950/80 text-gray-200 backdrop-blur-xl`}>
                <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} setActiveView={setActiveView} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto relative">
                        <Suspense fallback={<div className="p-6 text-xl text-white">Loading view...</div>}>
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
  const queryClient = new QueryClient(); // Instantiate QueryClient here

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
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-red-400 p-8 text-center"><h1>Authentication Error</h1><p className="mt-2">{error.message}</p></div>;
  }

  return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
};

// ===============================================================================================
// APP WRAPPER (Root Component with Auth0 Provider)
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
        scope: 'openid profile email read:current_user read:accounts write:transactions',
      }}
      cacheLocation="localstorage"
    >
      <AppController />
    </Auth0Provider>
  );
};

export default AppWrapper;
