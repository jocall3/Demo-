import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Define the type for the theme and the state
type Theme = 'light' | 'dark';

interface ThemeState {
  mode: Theme;
}

/**
 * Gets the initial theme from local storage or system preference.
 * This ensures that the user's theme choice is persisted across sessions.
 * @returns The initial theme ('light' or 'dark').
 */
const getInitialTheme = (): Theme => {
  // This function should only run on the client side.
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    // If no theme is stored, check the user's system preference.
    const userMedia = window.matchMedia('(prefers-color-scheme: light)');
    if (userMedia.matches) {
      return 'light';
    }
  }

  // Default to 'dark' if no preference is found or if running on the server.
  return 'dark';
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Sets the theme to a specific mode and persists it to local storage.
     * @param state The current theme state.
     * @param action The action containing the new theme as payload.
     */
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', action.payload);
        document.documentElement.className = action.payload;
      }
    },
    /**
     * Toggles the theme between 'light' and 'dark' and persists the new mode.
     * @param state The current theme state.
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

// Export the actions for use in components.
export const { setTheme, toggleTheme } = themeSlice.actions;

// Export a selector to easily access the theme mode from the store.
export const selectTheme = (state: RootState) => state.theme.mode;

// Export the reducer as the default export for the slice.
export default themeSlice.reducer;
