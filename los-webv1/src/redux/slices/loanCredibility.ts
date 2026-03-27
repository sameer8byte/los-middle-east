import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_LOAN_RULES_SLICE_LABEL } from "../storeLabels";
import { ILoanCredibility } from "../../types/loans";
import { LoanRiskCategory } from "../../constant/enum";

export const initialLoanCredibilityState: ILoanCredibility = {
  id: "",
  ruleType: LoanRiskCategory.medium,
  minAmount: 0,
  maxAmount: 0,
  tenures: {
    id: "",
    minTermDays: 0,
    maxTermDays: 0,
  },
  suggestedAmount: 0,
  suggestedDueDate: null, // Default to current date, adjust as necessary
  isAllowed: false,
  loan: null, // Assuming loan can be null initially, adjust as necessary
  workflowUrl: null, // Assuming workflowUrl can be null initially, adjust as necessary
  maxCompleteLoanCount: 0,
  reloanAutomationResult: null,
  agreement: {
    id: "",
    status: ""
  }
};

export const LoanCredibilitySlice = createSlice({
  name: USER_LOAN_RULES_SLICE_LABEL,
  initialState: initialLoanCredibilityState,
  reducers: {
    // ? Update user data
    updateLoanRulesData: (state, action: PayloadAction<ILoanCredibility>) => {
      return { 
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { updateLoanRulesData } = LoanCredibilitySlice.actions;
