import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { User as Auth0User } from '@auth0/auth0-react';

// --- Type Definitions ---

/**
 * User profile claims, aligned with standard OIDC claims.
 * This interface specifically maps to the relevant fields from Auth0's `User` object.
 */
export interface AuthUser {
  sub: string; // Subject - the user's unique ID from Auth0
  name?: string;
  email?: string;
  picture?: string;
  // Add other standard OIDC claims that might be present in the Auth0 User object as needed.
}

/**
 * The shape of the authentication state in Redux, mirroring the Auth0 SDK's state.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null; // JWT for API calls, obtained from Auth0
  idToken: string | null; // OIDC ID Token, obtained from Auth0
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // Reflects Auth0's loading/error state
  error: string | null; // Error message from Auth0 or token acquisition
}

// --- Initial State ---

const initialState: AuthState = {
  user: null,
  accessToken: null,
  idToken: null,
  isAuthenticated: false,
  status: 'idle', // Initial state, before Auth0 finishes loading
  error: null,
};

// --- Auth Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Synchronizes the Redux auth state with the current state from the Auth0 SDK.
     * This action is intended to be dispatched whenever Auth0's `isAuthenticated`, `user`,
     * `isLoading`, `error`, or token status changes.
     *
     * @param action.payload Contains the raw Auth0 state and tokens.
     */
    syncAuth0State: (
      state,
      action: PayloadAction<{
        isAuthenticated: boolean;
        user: Auth0User | undefined;
        accessToken: string | undefined; // accessToken might not always be available immediately or on every state update
        idToken: string | undefined;
        isLoading: boolean;
        error?: Error;
      }>
    ) => {
      const { isAuthenticated, user, accessToken, idToken, isLoading, error } = action.payload;

      state.status = isLoading ? 'loading' : (error ? 'failed' : 'idle');
      state.error = error ? error.message : null;

      if (error) {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.idToken = null;
      } else if (isAuthenticated && user && user.sub) {
        // Successfully authenticated. Ensure `sub` is present for AuthUser.
        state.isAuthenticated = true;
        state.user = {
          sub: user.sub,
          name: user.name,
          email: user.email,
          picture: user.picture,
        };
        state.accessToken = accessToken || null; // Access token might be null briefly if not yet acquired silently
        state.idToken = idToken || null;
        state.status = 'succeeded';
      } else {
        // Not authenticated, not loading, no error (e.g., after logout or initial load without login)
        Object.assign(state, initialState);
        state.status = 'idle';
      }
    },
    // No specific 'logout' reducer is needed here, as `syncAuth0State` will
    // handle the state transition when Auth0 reports `isAuthenticated: false` after logout.
  },
});

// --- Actions ---

export const { syncAuth0State } = authSlice.actions;

// --- Selectors ---

export const selectCurrentUser = (state: RootState): AuthUser | null => state.auth.user;
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const selectAccessToken = (state: RootState): string | null => state.auth.accessToken;
export const selectIdToken = (state: RootState): string | null => state.auth.idToken;
export const selectAuthStatus = (state: RootState): AuthState['status'] => state.auth.status;
export const selectAuthError = (state: RootState): string | null => state.auth.error;

// --- Reducer Export ---

export default authSlice.reducer;
