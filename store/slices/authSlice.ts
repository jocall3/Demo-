import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store'; // Assuming store is at ../store.ts

// --- Type Definitions ---

// A simplified user type for authentication purposes.
// In a real application, this would likely be more detailed and imported from a shared types file.
interface User {
  id: string;
  name: string;
  email: string;
  // ...other properties like roles, permissions, etc.
}

// The shape of the authentication state.
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Type for login credentials passed to the async thunk.
interface LoginCredentials {
  email: string;
  password?: string; // Password might not be needed for all auth methods
}

// --- Initial State ---

const initialState: AuthState = {
  user: null,
  token: null, // In a real app, you might try to load this from localStorage
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

// --- Async Thunks ---

/**
 * An async thunk for handling user login.
 * In a real application, this would make an API call to an authentication endpoint.
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      //
      // MOCK API CALL: Replace this with your actual auth service call.
      // e.g., const response = await authAPI.login(credentials);
      //
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      if (credentials.email === 'visionary@demobank.com') {
        const user: User = { id: 'user-123', name: 'The Visionary', email: credentials.email };
        const token = `mock-jwt-token-${Date.now()}`;
        return { user, token };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// --- Auth Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Handles user logout by resetting the authentication state.
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      // In a real app, you might also clear tokens from localStorage here.
    },
    /**
     * A reducer to manually set an error message.
     */
    setAuthError: (state, action: PayloadAction<string>) => {
        state.error = action.payload;
        state.status = 'failed';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      });
  },
});

// --- Actions ---

export const { logout, setAuthError } = authSlice.actions;

// --- Selectors ---

/**
 * Selects the current user from the auth state.
 */
export const selectCurrentUser = (state: RootState): User | null => state.auth.user;

/**
 * Selects the authentication status.
 */
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;

/**
 * Selects the current auth token.
 */
export const selectAuthToken = (state: RootState): string | null => state.auth.token;

/**
 * Selects the loading status of authentication operations.
 */
export const selectAuthStatus = (state: RootState): 'idle' | 'loading' | 'succeeded' | 'failed' => state.auth.status;

/**
 * Selects any authentication-related error message.
 */
export const selectAuthError = (state: RootState): string | null => state.auth.error;


// --- Reducer Export ---

export default authSlice.reducer;
