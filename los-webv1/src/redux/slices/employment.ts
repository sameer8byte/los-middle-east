import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_EMPLOYMENT_SLICE_LABEL } from "../storeLabels";
import { Employment } from "../../types/employment";

export const initialEmploymentState: Employment = {
  id: "",
  userId: "",
  companyName: "",
  designation: "",
  officialEmail: "",
  joiningDate: null,
  salary: null,
  companyAddress: null,
  salaryExceedsBase: true  ,
  pinCode: null,
  uanNumber: null,
  expectedDateOfSalary: null,
  modeOfSalary: null,
};

export const EmploymentSlice = createSlice({
  name: USER_EMPLOYMENT_SLICE_LABEL,
  initialState: initialEmploymentState,
  reducers: {
    updateEmployment(state, action: PayloadAction<Employment>) {
     return {
        ...state,
        ...action.payload,
        };
    },
  },
});

export const { updateEmployment } = EmploymentSlice.actions;
