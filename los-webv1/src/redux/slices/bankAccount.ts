import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_BANK_ACCOUNT_LABEL } from "../storeLabels";
import {
  user_bank_verification_method,
  user_bank_verification_status,
  UserBankAccount,
} from "../../types/user-bank-account";

export const initialBanlAccountState: UserBankAccount = {
  id: "",
  userId: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  bankAddress: "",
  accountHolderName: "",
  verificationStatus: user_bank_verification_status.PENDING,
  verificationMethod: user_bank_verification_method.PENNY_DROP,
  accountType: "",
};

export const BankAccountSlice = createSlice({
  name: USER_BANK_ACCOUNT_LABEL,
  initialState: initialBanlAccountState,
  reducers: {
    // ? Update user data phone
    updateUserBankAccount: (state, action: PayloadAction<UserBankAccount>) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { updateUserBankAccount } = BankAccountSlice.actions;
