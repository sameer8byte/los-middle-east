
export interface IFSCResponse {
  MICR: string;
  BRANCH: string;
  ADDRESS: string;
  STATE: string;
  CONTACT: string;
  UPI: boolean;
  RTGS: boolean;
  CITY: string;
  CENTRE: string;
  DISTRICT: string;
  NEFT: boolean;
  IMPS: boolean;
  SWIFT: string | null;
  ISO3166: string;
  BANK: string;
  BANKCODE: string;
  IFSC: string;
}

export const fetchIFSCDetails = async (ifsc: string): Promise<IFSCResponse> => {
  if (!ifsc) throw new Error('IBAN code is required');

  const endpoint = `https://ifsc.razorpay.com/${ifsc}`; 

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch IBAN details. Status: ${response.status}`);
    }
    const data: IFSCResponse = await response.json();
    return data;
  } catch (err) {
    throw new Error((err as Error)?.message || 'Unknown error occurred while fetching IBAN details');
  }
};

