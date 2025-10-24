import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Define a type for the user profile information
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  avatarUrl?: string;
}

// Define a type for the slice state
interface UserState {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Define the initial state using that type
const initialState: UserState = {
  // For demonstration purposes, we'll start with a mock logged-in user.
  // In a real application, this would likely be null and populated after a login flow.
  profile: {
    id: 'user-visionary-001',
    name: 'The Visionary',
    email: 'visionary@demobank.com',
    title: 'Founder & Chief Visionary Officer',
  },
  isAuthenticated: true,
  status: 'succeeded',
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
    },
    logoutUser: (state) => {
      state.profile = null;
      state.isAuthenticated = false;
      state.status = 'idle';
    },
    updateProfileTitle: (state, action: PayloadAction<string>) => {
      if (state.profile) {
        state.profile.title = action.payload;
      }
    },
    // Example reducer for handling async thunk lifecycle (e.g., fetchUserById)
    // This would be used in conjunction with `extraReducers` for a real API call
    userLoading: (state) => {
      state.status = 'loading';
    },
  },
});

// Action creators are generated for each case reducer function
export const { setUser, logoutUser, updateProfileTitle, userLoading } = userSlice.actions;

// Selectors allow us to read data from the store
export const selectUserProfile = (state: RootState) => state.user.profile;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
export const selectUserStatus = (state: RootState) => state.user.status;

// The function below is called a thunk and allows us to perform async logic.
// In a real app, this might be in a separate file for organization.
// Example: dispatch(fetchUserById(123))
// Note: This is a placeholder and would require `createAsyncThunk` for a full implementation.
/*
export const fetchUserById = (userId: string): AppThunk => async (dispatch) => {
  try {
    dispatch(userLoading());
    const user = await userAPI.fetchById(userId); // Fictional API call
    dispatch(setUser(user));
  } catch (err) {
    // dispatch(userError(err.toString()));
  }
};
*/

export default userSlice.reducer;
