/**
 * @file store/slices/userSlice.ts
 * @description Redux slice for managing user-specific client-side preferences.
 *
 * As per the architectural directive to separate server and client state, this slice is strictly
 * for managing UI-related preferences that are persisted locally in the browser (e.g., in localStorage).
 * It does not handle user profile data fetched from the server (which is managed by TanStack Query).
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// --- TYPE DEFINITIONS ---

/**
 * @interface UserPreferences
 * @description Defines the shape of user-specific client-side preferences.
 * These settings are persisted in localStorage to maintain the user's choices across sessions.
 */
export interface UserPreferences {
  /**
   * The user's Google Gemini API key for enabling advanced AI features.
   * Stored locally in the browser and not sent to the backend, adhering to
   * client-side secret management principles for this specific feature.
   */
  geminiApiKey: string | null;

  /**
   * Determines whether to display carbon footprint data on transactions.
   */
  showCarbonFootprint: boolean;
}

/**
 * @interface UserState
 * @description Represents the state structure for the user slice.
 */
interface UserState {
  /**
   * A nested object containing all user preferences.
   */
  preferences: UserPreferences;
}

// --- INITIAL STATE --- 

const defaultPreferences: UserPreferences = {
  geminiApiKey: null,
  showCarbonFootprint: true,
};

/**
 * @function loadInitialState
 * @description Loads the initial user state from localStorage, providing defaults if no state is found or if parsing fails.
 * This ensures that user preferences are persisted across browser sessions.
 * @returns {UserState} The initial state for the user slice.
 */
const loadInitialState = (): UserState => {
  try {
    const serializedState = localStorage.getItem('userPreferences');
    if (serializedState === null) {
      return { preferences: defaultPreferences };
    }
    const storedPreferences = JSON.parse(serializedState);
    // Merge with defaults to gracefully handle new preference keys added in later versions.
    return {
      preferences: { ...defaultPreferences, ...storedPreferences },
    };
  } catch (error) {
    console.error("Could not load user preferences from localStorage", error);
    // Return default state if there's a parsing error.
    return { preferences: defaultPreferences };
  }
};

const initialState: UserState = loadInitialState();

// --- USER SLICE --- 

/**
 * @reduxSlice userSlice
 * @description Manages user-specific preferences, handling state changes and persisting them to localStorage.
 */
export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * @reducer updateUserPreferences
     * @description Updates one or more user preferences and persists the entire preferences object to localStorage.
     * @param {PayloadAction<Partial<UserPreferences>>} action - The action containing a partial preferences object to merge.
     */
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      try {
        localStorage.setItem('userPreferences', JSON.stringify(state.preferences));
      } catch (error) {
        console.error("Could not save user preferences to localStorage", error);
      }
    },
    /**
     * @reducer setGeminiApiKey
     * @description A specific action to update only the Gemini API key.
     * @param {PayloadAction<string | null>} action - The action containing the new API key or null.
     */
    setGeminiApiKey: (state, action: PayloadAction<string | null>) => {
      state.preferences.geminiApiKey = action.payload;
      try {
        localStorage.setItem('userPreferences', JSON.stringify(state.preferences));
      } catch (error) {
        console.error("Could not save user preferences to localStorage", error);
      }
    },
    /**
     * @reducer resetUserPreferences
     * @description Resets all user preferences to their default values and updates localStorage.
     */
    resetUserPreferences: (state) => {
      state.preferences = defaultPreferences;
      try {
        localStorage.setItem('userPreferences', JSON.stringify(state.preferences));
      } catch (error) {
        console.error("Could not save user preferences to localStorage", error);
      }
    },
  },
});

// --- ACTIONS --- 

export const { updateUserPreferences, setGeminiApiKey, resetUserPreferences } = userSlice.actions;

// --- SELECTORS --- 

/**
 * @selector selectUserPreferences
 * @description Selects the entire user preferences object from the state.
 * @param {RootState} state - The root Redux state.
 * @returns {UserPreferences} The user's current preferences.
 */
export const selectUserPreferences = (state: RootState): UserPreferences => state.user.preferences;

/**
 * @selector selectGeminiApiKey
 * @description Selects the user's Gemini API key from the state.
 * @param {RootState} state - The root Redux state.
 * @returns {string | null} The user's Gemini API key, or null if not set.
 */
export const selectGeminiApiKey = (state: RootState): string | null => state.user.preferences.geminiApiKey;

// --- REDUCER EXPORT ---

export default userSlice.reducer;
