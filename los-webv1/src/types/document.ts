export interface Document {
  id: string;
  userId: string;
  frontDocumentUrl: string;
  backDocumentUrl: string;
  fileType: string;
  verificationNotes: string;
  type: document_type_enum;
  documentNumber: string;
  status: string;
}



export enum document_type_enum {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
}
export interface CreateKycDto {
  type: document_type_enum;
  backDocumentUrl: string;
  frontDocumentUrl: string;
  fileType: string;
  documentNumber: string;
}

export enum document_status_enum {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}



// enum RelationshipEnum {
//   SPOUSE
//   BROTHER
//   SISTER
//   FATHER
//   MOTHER
//   OTHER
//   FRIEND
//   COLLEAGUE
// }

export enum RelationshipEnum {
  SPOUSE = "SPOUSE",
  BROTHER = "BROTHER",
  SISTER = "SISTER",
  FATHER = "FATHER",
  MOTHER = "MOTHER",
  OTHER = "OTHER",
  FRIEND = "FRIEND",
  COLLEAGUE = "COLLEAGUE",
}