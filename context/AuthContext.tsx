/**
 * @file context/AuthContext.tsx
 * @description Provides a comprehensive authentication context for the application.
 *
 * ARCHITECTURAL OVERVIEW:
 * As per the new security framework, this context integrates with a dedicated OIDC-compliant
 * Identity Provider (e.g., Auth0, Keycloak). It uses the `auth0-react` library to handle
 * the complex OAuth 2.0 / OIDC flows (login, logout, token acquisition, session management).
 *
 * This file encapsulates all authentication logic for the frontend:
 * 1.  Configures and wraps the `Auth0Provider` with application-specific settings from environment variables.
 * 2.  Provides a custom React Context (`AuthContext`) that abstracts away the underlying `auth0-react` implementation.
 * 3.  Exports a `useAuth` hook, which is the single entry point for any component in the app to access
 *     authentication state (e.g., `isAuthenticated`, `user`) and functions (`loginWithRedirect`, `logout`, `getAccessTokenSilently`).
 *
 * USAGE:
 * The `AppAuthProvider` should be wrapped around the root of the application (e.g., in `index.tsx` or `App.tsx`).
 * Any child component can then use the `useAuth()` hook to interact with the authentication system.
 *
 * DEPENDENCIES:
 * This implementation requires the `@auth0/auth0-react` package.
 * `npm install @auth0/auth0-react`
 */

import React, { createContext, useContext, ReactNode, FC } from 'react';
import {
  Auth0Provider,
  useAuth0,
  AppState,
  Auth0ContextInterface,
} from '@auth0/auth0-react';

// --- Type Definition for our Custom Auth Context ---

// We create a custom context type that mirrors the essential properties from Auth0's context.
// This creates an abstraction layer, allowing us to switch the underlying auth provider
// in the future by only modifying this file.
export type AuthContextType = Pick<
  Auth0ContextInterface,
  |
    'isAuthenticated' |
    'user' |
    'isLoading' |
    'error' |
    'loginWithRedirect' |
    'logout' |
    'getAccessTokenSilently'
>;

// --- Context Creation ---

// The context is created with a `null` default value. A runtime check in `useAuth`
// will ensure it's only ever accessed within its provider.
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access the authentication context.
 * Provides a clean, abstracted way for components to get auth state and methods.
 * @returns {AuthContextType} The authentication context.
 * @throws {Error} If used outside of an `AppAuthProvider`.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AppAuthProvider');
  }
  return context;
};

// --- Internal Provider Component ---

interface AuthProviderInternalProps {
  children: ReactNode;
}

/**
 * An internal component that consumes the `useAuth0` hook and provides its
 * values to our custom `AuthContext`.
 */
const AuthProviderInternal: FC<AuthProviderInternalProps> = ({ children }) => {
  const auth0 = useAuth0();

  // We explicitly map the properties from `useAuth0` to our `AuthContextType`.
  const contextValue: AuthContextType = {
    isAuthenticated: auth0.isAuthenticated,
    user: auth0.user,
    isLoading: auth0.isLoading,
    error: auth0.error,
    loginWithRedirect: auth0.loginWithRedirect,
    logout: auth0.logout,
    getAccessTokenSilently: auth0.getAccessTokenSilently,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// --- Main Exported Provider Component ---

interface AppAuthProviderProps {
  children: ReactNode;
}

/**
 * The main authentication provider for the application.
 * This component configures the `Auth0Provider` with environment variables
 * and wraps the entire application, making the `useAuth` hook available everywhere.
 */
export const AppAuthProvider: FC<AppAuthProviderProps> = ({ children }) => {
  // Fetch Auth0 configuration from Vite environment variables.
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  // Handles redirecting the user back to the page they were on before logging in.
  const onRedirectCallback = (appState?: AppState) => {
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname,
    );
  };

  // If configuration is missing, render an informative error message.
  // This prevents the app from crashing and aids developers in setup.
  if (!domain || !clientId || !audience) {
    console.error('Auth0 configuration is missing. Please check your .env file for VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE.');
    return (
      <div style={{ padding: '20px', backgroundColor: '#2d3748', color: '#e53e3e', height: '100vh' }}>
        <h1>Authentication Provider Configuration Error</h1>
        <p>One or more required Auth0 environment variables are missing.</p>
        <p>Please ensure VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE are set in your .env file.</p>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        // The 'audience' is crucial for requesting a JWT that can be used to call your protected API.
        audience: audience,
        // Scopes define the permissions the application is requesting.
        scope: 'openid profile email offline_access read:transactions write:transactions',
      }}
      onRedirectCallback={onRedirectCallback}
      // Use local storage to cache authentication data, allowing sessions to persist across browser tabs.
      cacheLocation="localstorage"
    >
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </Auth0Provider>
  );
};
