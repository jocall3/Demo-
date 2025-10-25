import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

/**
 * @description Defines the possible theme modes for the application.
 */
export type Theme = 'light' | 'dark';

/**
 * @interface ThemeState
 * @description Represents the state structure for the theme slice.
 */
interface ThemeState {
  mode: Theme;
}

/**
 * @function getInitialTheme
 * @description Determines the initial theme mode for the application.
 * It checks local storage first for a persisted user preference. If none is found,
 * it falls back to the user's system color scheme preference. Defaults to 'dark'
 * if no preference is found or if running server-side.
 * The resolved theme is also immediately applied to the document's root element.
 * @returns {Theme} The resolved initial theme mode ('light' or 'dark').
 */
const getInitialTheme = (): Theme => {
  // This function should only run on the client side.
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      // Immediately apply the stored theme to the document element to prevent flash of unstyled content
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
  // Also apply the default theme to the document element.
  document.documentElement.className = 'dark';
  return 'dark';
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

/**
 * @reduxSlice
 * @description Manages the application's visual theme.
 * This slice stores the current theme mode ('light' or 'dark') and provides
 * reducers to change or toggle the theme. It also handles persisting the
 * theme preference to `localStorage` and applying the theme class to the
 * document's root element.
 * This is considered a 'shared state' managed by the central shell in a
 * micro-frontend architecture.
 */
export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * @reducer setTheme
     * @description Sets the application's theme to a specified mode.
     * The new theme is persisted to `localStorage` and applied as a class
     * to the `document.documentElement` to control global styling.
     * @param {ThemeState} state - The current theme state.
     * @param {PayloadAction<Theme>} action - The action containing the new theme mode ('light' or 'dark').
     */
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', action.payload);
        document.documentElement.className = action.payload;
      }
    },
    /**
     * @reducer toggleTheme
     * @description Toggles the application's theme between 'light' and 'dark'.
     * The new theme is persisted to `localStorage` and applied as a class
     * to the `document.documentElement`.
     * @param {ThemeState} state - The current theme state.
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

// Export the actions for use in components that need to dispatch theme changes.
export const { setTheme, toggleTheme } = themeSlice.actions;

/**
 * @selector selectTheme
 * @description A Redux selector that returns the current theme mode.
 * @param {RootState} state - The root Redux state.
 * @returns {Theme} The current theme mode ('light' or 'dark').
 */
export const selectTheme = (state: RootState): Theme => state.theme.mode;

// Export the reducer as the default export for the slice, to be combined in the store.
export default themeSlice.reducer;
