import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import themeReducer from './slices/themeSlice';

/**
 * @file store/store.ts
 * @description Configures the main Redux store for the application.
 *
 * ARCHITECTURAL REFACTOR:
 * As per the "Separate Server and Client State" directive, this Redux store is now exclusively for
 * managing purely global, client-side UI state. All server state (data fetched from APIs)
 * is managed by TanStack Query (React Query).
 *
 * This store consolidates state slices that are relevant across the entire application shell and potentially
 * shared with micro-frontends, such as authentication status and UI theme.
 */
export const store = configureStore({
  reducer: {
    /**
     * Manages authentication state received from the OIDC provider (e.g., Auth0).
     * This includes the user's authentication status, basic profile information (name, email, picture),
     * and tokens. This is considered global client state, essential for UI rendering and API requests.
     */
    auth: authReducer,

    /**
     * Manages client-side state related to the user's local preferences that are not stored on the server.
     * For example, UI customization settings that persist in localStorage.
     */
    user: userReducer,

    /**
     * Manages the application's visual theme (e.g., 'dark', 'light').
     * This is a classic example of global UI state appropriate for Redux.
     */
    theme: themeReducer,
  },

  // Middleware is automatically configured by `configureStore` to include redux-thunk and others.
  // No additional middleware is required for this lean, client-state-focused setup.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),

  // Enable Redux DevTools extension for debugging in development environments.
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Inferred type for the root state of the Redux store.
 * This provides strong typing for selectors across the application, ensuring type safety.
 * e.g., `useSelector((state: RootState) => ...)`
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Inferred type for the dispatch function of the Redux store.
 * This is used for typing the `useDispatch` hook to ensure dispatched actions are type-safe.
 * e.g., `const dispatch = useDispatch<AppDispatch>()`
 */
export type AppDispatch = typeof store.dispatch;
