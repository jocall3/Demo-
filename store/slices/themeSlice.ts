/**
 * @file store/slices/themeSlice.ts
 * @description Redux Toolkit slice for managing the application's global UI theme.
 *
 * ARCHITECTURAL REFACTOR:
 * As per the "Refactor Frontend State Management" directive, the Redux store is now
 * exclusively for pure client-side UI state. This `themeSlice` is a prime example
 * of such state. It is managed by the Shell application and its state can be
 * potentially passed down to or consumed by remote Micro-Frontends (MFEs) if needed.
 *
 * This slice is responsible for:
 * 1. Determining the initial theme (from localStorage or system preference).
 * 2. Storing the current theme mode ('light' or 'dark').
 * 3. Providing actions (`setTheme`, `toggleTheme`) to change the theme.
 * 4. Persisting the user's theme choice to `localStorage`.
 * 5. Applying the current theme as a CSS class to the `<html>` element to enable
 *    global styling via Tailwind CSS's dark mode feature.
 *
 * This file also adheres to the "Mandate Comprehensive JSDoc/TSDoc" directive, with
 * detailed documentation for all exported members.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

/**
 * Defines the possible theme modes for the application.
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Represents the state structure for the theme slice.
 */
interface ThemeState {
  /** The current active theme mode. */
  mode: ThemeMode;
}

/**
 * Determines the initial theme mode for the application on client-side load.
 *
 * It checks for a user preference in `localStorage`. If not found, it falls back
 * to the user's operating system preference via `prefers-color-scheme`.
 * The default is 'dark' if no preference can be determined.
 *
 * IMPORTANT: This function has a side effect of applying the theme class to the
 * `document.documentElement` to prevent a Flash of Unstyled Content (FOUC).
 *
 * @returns {ThemeMode} The resolved initial theme mode ('light' or 'dark').
 */
const getInitialTheme = (): ThemeMode => {
  // This function should only run on the client side.
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      // Apply the stored theme to the document element immediately.
      document.documentElement.className = storedTheme;
      return storedTheme;
    }

    // If no theme is stored, check the user's system preference.
    const userMedia = window.matchMedia('(prefers-color-scheme: light)');
    if (userMedia.matches) {
      document.documentElement.className = 'light';
      return 'light';
    }
  }

  // Default to 'dark' if no preference is found or if running on the server.
  if (typeof document !== 'undefined') {
    document.documentElement.className = 'dark';
  }
  return 'dark';
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

/**
 * A Redux Toolkit slice for managing the application's visual theme.
 * It handles state changes, persistence to localStorage, and DOM manipulation
 * for applying theme styles.
 */
export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Sets the application's theme to a specified mode. This action persists
     * the new theme to `localStorage` and updates the class on the `<html>` element.
     *
     * @param state - The current Redux state for this slice.
     * @param action - The action containing the new theme mode.
     */
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', action.payload);
        document.documentElement.className = action.payload;
      }
    },
    /**
     * Toggles the application's theme between 'light' and 'dark'. This action
     * persists the new theme and updates the class on the `<html>` element.
     *
     * @param state - The current Redux state for this slice.
     */
    toggleTheme: (state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      state.mode = newMode;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', newMode);
        document.documentElement.className = newMode;
      }
    },
  },
});

// --- Actions ---
export const { setTheme, toggleTheme } = themeSlice.actions;

// --- Selectors ---
/**
 * A Redux selector that returns the current theme mode from the state.
 *
 * @param {RootState} state - The root Redux state of the application.
 * @returns {ThemeMode} The current theme mode ('light' or 'dark').
 */
export const selectCurrentTheme = (state: RootState): ThemeMode => state.theme.mode;

// --- Reducer Export ---
export default themeSlice.reducer;
