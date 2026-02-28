import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CommonState {
  isFiltersVisible: boolean;
}

const initialState: CommonState = {
  isFiltersVisible: false,
};

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {
    setFiltersVisible: (state, action: PayloadAction<boolean>) => {
      state.isFiltersVisible = action.payload;
    },
    toggleFiltersVisible: (state) => {
      state.isFiltersVisible = !state.isFiltersVisible;
    },
  },
});

export const { setFiltersVisible, toggleFiltersVisible } = commonSlice.actions;
export default commonSlice.reducer;