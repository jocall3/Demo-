/**
 * @file mfe-shell/src/App.tsx
 * @description The root component for the Micro-Frontend Shell application.
 *
 * ARCHITECTURAL REFACTOR:
 * This file embodies the new federated micro-frontend architecture. It replaces the monolithic `App.tsx`.
 *
 * Core Responsibilities:
 * 1.  **Provider Setup**: Initializes and provides context for essential libraries: Redux (for global UI state), Auth0 (for authentication), Apollo Client (for GraphQL communication), and TanStack Query (for server state management).
 * 2.  **Authentication Flow**: Manages the application's top-level state, rendering a login screen for unauthenticated users and the main application shell for authenticated users.
 * 3.  **Layout Orchestration**: Renders the persistent shell layout, including the `Header`, `Sidebar`, and `VoiceControl` components.
 * 4.  **MFE Routing & Loading**: Manages the active view state via Redux and dynamically lazy-loads and renders the appropriate Micro-Frontend (MFE) component using React.Suspense, as per Module Federation principles.
 * 5.  **Global State Management**: Implements the refactored state management paradigm where Redux is used exclusively for global client-side UI state (e.g., active view, sidebar status), separating it from server state.
 */

import React, { useState, FC, ReactNode, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Auth0Provider, useAuth0, AppState } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Shared components from the UI library
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import VoiceControl from '../../components/VoiceControl';
import { View, IllusionType } from '../../types';

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
    geminiApiKey: string | null;
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
// In a real Module Federation setup, the import paths would be like 'dashboard/DashboardView'.
// ===============================================================================================

const MFE_Loading: FC = () => (
    <div className="p-6 text-xl text-center text-gray-400">Loading Module...</div>
);

// --- Remote MFEs --- 
const DashboardView = lazy(() => import('dashboard/DashboardView'));
const TransactionsView = lazy(() => import('transactions/TransactionsView'));
const InvestmentsView = lazy(() => import('investments/InvestmentsView'));

// --- Local "MFEs" (Components to be extracted) ---
const SendMoneyView = lazy(() => import('../../components/SendMoneyView'));
const AIAdvisorView = lazy(() => import('../../components/AIAdvisorView'));
const SecurityView = lazy(() => import('../../components/SecurityView'));
const BudgetsView = lazy(() => import('../../components/BudgetsView'));
const QuantumWeaverView = lazy(() => import('../../components/QuantumWeaverView'));
const AgentMarketplaceView = lazy(() => import('../../components/MarketplaceView'));
const CorporateCommandView = lazy(() => import('../../components/CorporateCommandView'));
const OpenBankingView = lazy(() => import('../../components/OpenBankingView'));
const FinancialDemocracyView = lazy(() => import('../../components/FinancialDemocracyView'));
const AIAdStudioView = lazy(() => import('../../components/AIAdStudioView'));
const CryptoView = lazy(() => import('../../components/CryptoView'));
const FinancialGoalsView = lazy(() => import('../../components/FinancialGoalsView'));

// --- Simple placeholder views for unimplemented sections ---
const RewardsView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Rewards Hub</h2></div>;
const CreditHealthView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Credit Health</h2></div>;
const PersonalizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Personalization</h2></div>;
const CardCustomizationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Card Customization</h2></div>;
const SettingsView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">Settings</h2></div>;
const TheVisionView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">The Vision</h2></div>;
const APIIntegrationView: FC = () => <div className="p-6"><h2 className="text-3xl font-bold text-white">API Integration</h2></div>;

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
    const { activeView, isSidebarOpen, customBackgroundUrl, activeIllusion } = useAppSelector(state => state.ui);

    const setActiveView = useCallback((view: View) => {
        dispatch(uiSlice.actions.setActiveView(view));
    }, [dispatch]);

    const setIsSidebarOpen = useCallback((isOpen: boolean) => {
        dispatch(uiSlice.actions.setIsSidebarOpen(isOpen));
    }, [dispatch]);

    // Event listener for inter-MFE navigation
    useEffect(() => {
        const handleNavigation = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.view) {
                setActiveView(customEvent.detail.view);
            }
        };
        window.addEventListener('app:navigate', handleNavigation);
        return () => window.removeEventListener('app:navigate', handleNavigation);
    }, [setActiveView]);

    const renderActiveView = () => {
        const viewMap: { [key in View]?: React.ComponentType<any> } = {
            [View.Dashboard]: DashboardView,
            [View.Transactions]: TransactionsView,
            [View.Investments]: InvestmentsView,
            [View.SendMoney]: SendMoneyView,
            [View.Budgets]: BudgetsView,
            [View.AIAdvisor]: AIAdvisorView,
            [View.QuantumWeaver]: QuantumWeaverView,
            [View.AIAdStudio]: AIAdStudioView,
            [View.Marketplace]: AgentMarketplaceView,
            [View.Security]: SecurityView,
            [View.Goals]: FinancialGoalsView,
            [View.Crypto]: CryptoView,
            [View.CorporateCommand]: CorporateCommandView,
            [View.OpenBanking]: OpenBankingView,
            [View.FinancialDemocracy]: FinancialDemocracyView,
            [View.Rewards]: RewardsView,
            [View.CreditHealth]: CreditHealthView,
            [View.Personalization]: PersonalizationView,
            [View.CardCustomization]: CardCustomizationView,
            [View.Settings]: SettingsView,
            [View.TheVision]: TheVisionView,
            [View.APIIntegration]: APIIntegrationView,
        };

        const Component = viewMap[activeView] || DashboardView;
        return <Component />;
    };

    const backgroundStyle: React.CSSProperties = customBackgroundUrl ? { backgroundImage: `url(${customBackgroundUrl})` } : {};

    return (
        <div id="app-container" style={backgroundStyle} className={`bg-cover bg-center bg-fixed ${activeIllusion === 'aurora' ? 'aurora-bg' : ''}`}>
             <div className={`flex h-screen bg-gray-950/80 text-gray-200 backdrop-blur-xl`}>
                <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} setActiveView={setActiveView} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto relative p-6">
                        <Suspense fallback={<MFE_Loading />}>
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
 * A wrapper that sets up Apollo Client and provides it, along with Redux and React Query,
 * to the main authenticated application.
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
 * rendering either the login screen or the main application shell.
 */
const AppController: FC = () => {
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;
  }
  
  if (error) {
    return <div className="flex flex-col items-center justify-center h-screen bg-red-950 text-white p-8 text-center"><h1>Authentication Error</h1><p className="mt-2">{error.message}</p></div>;
  }

  return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
};

// ===============================================================================================
// ROOT COMPONENT with Auth0 Provider
// ===============================================================================================

const ShellApp: FC = () => {
  const onRedirectCallback = useCallback((appState?: AppState) => {
    window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
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
        scope: 'openid profile email read:transactions write:transactions',
      }}
      cacheLocation="localstorage"
    >
      <AppController />
    </Auth0Provider>
  );
};

export default ShellApp;
