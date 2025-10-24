import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import userReducer from './features/user/userSlice';
import themeReducer from './features/theme/themeSlice';

/**
 * Configures the main Redux store for the application.
 *
 * This store is intended for managing truly global UI state that is shared across
 * different feature domains, such as authentication status, user profile information,
 * and the application's theme.
 *
 * Server state and data caching are handled by React Query, not by this Redux store.
 */
export const store = configureStore({
  reducer: {
    /**
     * Manages authentication state, such as JWT tokens, user authentication status (e.g., 'idle', 'loading', 'succeeded', 'failed'),
     * and any related error messages.
     */
    auth: authReducer,

    /**
     * Manages client-side state related to the user's profile, such as their name, email, and preferences.
     * This data is typically hydrated on login and can be updated by the user in a settings view.
     */
    user: userReducer,

    /**
     * Manages the application's visual theme (e.g., 'dark', 'light', 'system') and other UI-related
     * personalization settings that affect the entire application layout.
     */
    theme: themeReducer,
  },

  // Middleware is automatically configured by `configureStore` to include redux-thunk.
  // No additional middleware is required for this setup.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),

  // Enable Redux DevTools extension for debugging in development environments.
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Inferred type for the root state of the Redux store.
 * This provides strong typing for selectors, e.g., `useSelector((state: RootState) => ...)`
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Inferred type for the dispatch function of the Redux store.
 * This is used for typing the `useDispatch` hook to ensure dispatched actions are type-safe.
 */
export type AppDispatch = typeof store.dispatch;
