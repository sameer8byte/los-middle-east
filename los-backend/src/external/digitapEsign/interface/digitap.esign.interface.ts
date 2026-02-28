// src/external/digitapEsign/interface/digitap.interface.ts

export interface DigitapEsignConfig {
  authKey: string; // Pre-encoded base64 auth key
  baseUrl: string;
}

export interface DigitapGenerateEsignRequest {
  uniqueId: string;
  signers: Array<{
    email: string;
    mobile: string;
    name: string;
  }>;
  reason: string;
  templateId: string;
  fileName: string;
  multiSignerDocId?: string;
}

export interface DigitapGenerateEsignResponse {
  code: string; // Can be "200" or other status codes
  model: {
    docId: string;
    url: string; // PUT URL for document upload
  };
  error?: string;
}

export interface DigitapGetEsignDocRequest {
  docId: string;
}

export interface DigitapEsignStatusResponse {
  code: string;
  model: {
    docId: string;
    url: string; // GET URL for signed document
    signers: Array<{
      name: string;
      gender: string;
      dob: string;
      email: string;
      mobile: string;
      aadhaarSuffix: string;
      location: string;
      signerName: string;
      signerState: string;
      postalCode: string;
      signerType: string;
      signedOn: string;
      state: "signed" | "notsigned";
    }>;
  };
  error?: string;
}

// Add webhook interface
export interface DigitapWebhookPayload {
  code: string;
  model: {
    docId: string;
    url: string;
    signers: Array<{
      name: string;
      gender: string;
      dob: string;
      email: string;
      mobile: string;
      aadhaarSuffix: string;
      location: string;
      signerName: string;
      signerState: string;
      postalCode: string;
      signerType: string;
      signedOn: string;
      state: "signed" | "notsigned";
    }>;
  };
}