import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { User as Auth0User } from '@auth0/auth0-react';

// --- Type Definitions ---

/**
 * @interface AuthUser
 * @description A lean representation of the authenticated user's profile claims, aligned with standard OIDC claims.
 * This interface specifically maps to the relevant fields from Auth0's `User` object to keep the Redux state clean.
 */
export interface AuthUser {
  sub: string; // Subject - the user's unique ID from the identity provider
  name?: string;
  email?: string;
  picture?: string;
}

/**
 * @interface AuthState
 * @description The shape of the authentication state in the Redux store. It mirrors the essential state provided by the authentication SDK (e.g., Auth0).
 * This slice is part of the global client state, as per architectural directives.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null; // JWT for API calls, obtained from the auth provider
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // Reflects the auth provider's loading/error state
  error: string | null; // Error message from the auth provider or token acquisition
}

// --- Initial State ---

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  status: 'idle', // Initial state, before the auth provider finishes loading its state from storage
  error: null,
};

// --- Auth Slice ---

/**
 * @reduxSlice authSlice
 * @description Manages the client-side authentication state. This slice acts as a synchronized mirror
 * of the state managed by the external authentication provider (e.g., Auth0), rather than implementing
 * its own login/logout logic. This ensures a single source of truth for authentication status.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * @reducer setAuthState
     * @description Synchronizes the Redux auth state with the current state from the authentication SDK.
     * This action is dispatched from a component that has access to the auth provider's hooks (e.g., `useAuth0`).
     *
     * @param action.payload Contains the state from the auth provider (isAuthenticated, user, tokens, loading/error status).
     */
    setAuthState: (
      state,
      action: PayloadAction<{
        isAuthenticated: boolean;
        user: Auth0User | undefined;
        accessToken: string | undefined;
        isLoading: boolean;
        error?: Error;
      }>
    ) => {
      const { isAuthenticated, user, accessToken, isLoading, error } = action.payload;

      state.status = isLoading ? 'loading' : (error ? 'failed' : 'idle');
      state.error = error ? error.message : null;

      if (error) {
        // On error, reset to a clean unauthenticated state
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
      } else if (isAuthenticated && user && user.sub) {
        // If authenticated and user object is valid, populate the state
        state.isAuthenticated = true;
        state.user = {
          sub: user.sub,
          name: user.name,
          email: user.email,
          picture: user.picture,
        };
        state.accessToken = accessToken || null; // Token might be null briefly while being fetched silently
        state.status = 'succeeded';
      } else {
        // If not authenticated, not loading, and no error (e.g., after logout or initial page load without a session)
        Object.assign(state, initialState);
        state.status = 'idle';
      }
    },

    /**
     * @reducer clearAuthError
     * @description Clears any authentication-related error message from the state.
     */
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

// --- Actions ---

export const { setAuthState, clearAuthError } = authSlice.actions;

// --- Selectors ---

export const selectCurrentUser = (state: RootState): AuthUser | null => state.auth.user;
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const selectAccessToken = (state: RootState): string | null => state.auth.accessToken;
export const selectAuthStatus = (state: RootState): AuthState['status'] => state.auth.status;
export const selectAuthError = (state: RootState): string | null => state.auth.error;

// --- Reducer Export ---

export default authSlice.reducer;
