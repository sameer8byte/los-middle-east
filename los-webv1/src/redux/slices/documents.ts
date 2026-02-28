import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_DOCUMENTS_SLICE_LABEL } from "../storeLabels";
import { Document } from "../../types/document";

export interface IInitialDocumentsState {
  documents: Document[];
}

export const IInitialDocumentsState: IInitialDocumentsState = {
  documents: [],
};

export const DocumetnsSlice = createSlice({
  name: USER_DOCUMENTS_SLICE_LABEL,
  initialState: IInitialDocumentsState,
  reducers: {

    upsertDocument(state, action: PayloadAction<Document>) {
      const index = state.documents.findIndex(
        (doc) => doc.id === action.payload.id
      );

      if (index !== -1) {
        // Update existing document
        state.documents[index] = action.payload;
      } else {
        // Add new document
        state.documents.push(action.payload);
      }
    },

    updateDocuments(state, action: PayloadAction<Document[]>) {
      state.documents = action.payload;
    },
  },
});

export const {
  upsertDocument,
  updateDocuments,
} = DocumetnsSlice.actions;
