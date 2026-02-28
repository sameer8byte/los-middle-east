import { createSlice } from "@reduxjs/toolkit";
import { USER_SLICE_LABEL } from "../storeLabels";
import { Loan } from "../../types/loan";
export interface InitialUserState {
  loans: Loan[];
}
export const initialUserState: InitialUserState = {
  loans: [],
};

export const UserSlice = createSlice({
  name: USER_SLICE_LABEL,
  initialState: initialUserState,
  reducers: {
    updateLoanData: (state, action) => {
      state.loans = action.payload;
    },
  },
});
export const { updateLoanData } = UserSlice.actions;
