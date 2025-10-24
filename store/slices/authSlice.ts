import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// --- Type Definitions ---

/**
 * OIDC-compliant user profile derived from the ID token claims.
 */
export interface AuthUser {
  sub: string; // Subject - the user's unique ID
  name: string;
  email: string;
  picture?: string;
  // Other OIDC standard claims like email_verified, etc.
}

/**
 * The shape of the authentication state, reflecting an OAuth2/OIDC flow.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  idToken: string | null; // Storing the raw ID token can be useful for OIDC logout
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// --- Initial State ---

const initialState: AuthState = {
  user: null,
  accessToken: null,
  idToken: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

// --- Async Thunks for Session Management ---

/**
 * Async thunk to check the user's session status with the BFF.
 * The BFF is expected to have a secure, httpOnly cookie with a refresh token.
 * This thunk calls the BFF to get a new access token and user info if the session is valid.
 */
export const checkAuthSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      // This endpoint in the BFF would check the session cookie and return user data
      // and a fresh access token if the session is valid, or a 401 if not.
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        if (response.status === 401) {
          return null; // No active session, which is a valid and expected state.
        }
        const errorData = await response.json().catch(() => ({ message: 'Session check failed' }));
        throw new Error(errorData.message);
      }
      const sessionData = await response.json();
      return sessionData as { user: AuthUser; accessToken: string; idToken: string };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check session');
    }
  }
);

// NOTE: The logic for initiating login (redirecting to the IdP) and handling the callback
// (exchanging the code for tokens via the BFF) now lives outside of Redux.
// This is typically handled in a dedicated auth service/hook that dispatches actions to this slice.

// --- Auth Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Stores user credentials in the state after a successful login or session refresh.
     * This is intended to be dispatched after the OIDC/OAuth2 flow is completed.
     */
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; accessToken: string; idToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.idToken = action.payload.idToken;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
    },
    /**
     * Handles user logout by resetting the authentication state.
     * The actual redirection to the IdP's logout endpoint should be handled by the
     * component/service that dispatches this action.
     */
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.idToken = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuthSession.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(checkAuthSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.idToken = action.payload.idToken;
          state.isAuthenticated = true;
          state.status = 'succeeded';
        } else {
          // No session was found, reset to initial unauthenticated state.
          Object.assign(state, initialState);
        }
        state.error = null;
      })
      .addCase(checkAuthSession.rejected, (state, action) => {
        // An error during session check (e.g., network error) resets the state.
        Object.assign(state, initialState);
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

// --- Actions ---

export const { setCredentials, logout } = authSlice.actions;

// --- Selectors ---

export const selectCurrentUser = (state: RootState): AuthUser | null => state.auth.user;
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const selectAccessToken = (state: RootState): string | null => state.auth.accessToken;
export const selectAuthStatus = (state: RootState): 'idle' | 'loading' | 'succeeded' | 'failed' => state.auth.status;
export const selectAuthError = (state: RootState): string | null => state.auth.error;

// --- Reducer Export ---

export default authSlice.reducer;
