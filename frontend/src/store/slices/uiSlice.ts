import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  pageTitle: string;
}

const initialState: UIState = {
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  pageTitle: 'MediFlow',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
      document.title = `${action.payload} — MediFlow`;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, setPageTitle } = uiSlice.actions;
export default uiSlice.reducer;
