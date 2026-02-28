export interface AadhaarResponse {
  data: AadhaarData;
  referenceId: string;
  responseMessage: string;
  responseCode: string;
}

export interface AadhaarData {
  documentType: string; // e.g., "AADHAAR"
  name: string;
  dateOfBirth: string; // e.g., "2001-07-10"
  gender: string; // e.g., "MALE"
  careOf: string;
  house: string;
  street: string;
  district: string;
  subDistrict: string;
  landmark: string;
  locality: string;
  postOfficeName: string;
  state: string;
  pincode: string;
  country: string;
  vtcName: string;
  mobile: string;
  email: string;
  photoBase64: string;
  maskAadhaarNumber: string;
  xmlBase64: string;
}
