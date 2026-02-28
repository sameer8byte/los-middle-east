// Digitap PAN Details Response
export interface DigitapPanDetailsResponse {
  http_response_code: number;
  result_code: number;
  request_id: string;
  client_ref_num: string;
  result: {
    pan: string;
    pan_type: "Individual" | "Company" | "Firm" | "HUF" | "Trust" | string;
    fullname: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: "male" | "female" | "other" | string;
    aadhaar_number: string;
    aadhaar_linked: boolean;
    dob: string; // format: 'DD/MM/YYYY'
    address: {
      building_name: string;
      locality: string;
      street_name: string;
      pincode: string;
      city: string;
      state: string;
      country: string;
    };
    mobile: string;
    email: string;
  };
}

// ScoreMe PAN Details Response
export interface ScoreMePanDetailsResponse {
  status: string;
  message: string;
  data: {
    pan: string;
    name: string;
    firstName: string;
    middleName: string;
    lastName: string;
    category: string;
    panStatus: string;
    lastUpdatedOn: string;
    aadhaarSeedingStatus: string;
  };
  requestId: string;
}

