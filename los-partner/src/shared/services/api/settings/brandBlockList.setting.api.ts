import api from "../../axios";

interface BlocklistPayload {
  brandId: string;
  customerName?: string;
  reason?: string;
  dpd?: number;
  partnerUserName?: string;
  pancard?: string;
  mobile?: string;
  aadharNumber?: string;
}

export const postBlocklistPan = async (payload: BlocklistPayload) => {
  try {
    const response = await api.post(`/blocklist/pan`, {
        ...payload,
        dpd:Number(payload.dpd) || 0, // Ensure dpd is a number
    });
    return response.data;
  } catch (error) {
    console.error("Error upserting PAN blocklist:", error);
    throw error;
  }
};

export const postBlocklistMobile = async (payload: BlocklistPayload) => {
  try {
    const response = await api.post(`/blocklist/mobile`, payload);
    return response.data;
  } catch (error) {
    console.error("Error upserting Mobile blocklist:", error);
    throw error;
  }
};

export const postBlocklistAadhar = async (payload: BlocklistPayload) => {
  try {
    const response = await api.post(`/blocklist/aadhar`, payload);
    return response.data;
  } catch (error) {
    console.error("Error upserting Aadhaar blocklist:", error);
    throw error;
  }
};




// @Post('pincode')
// async upsertPincode(@Body() dto: UpsertBlocklistDto) {
//   return this.service.upsertPincode(dto);
// }
export const postBlocklistPincode = async (payload: BlocklistPayload) => {
  try {
    const response = await api.post(`/blocklist/pincode`, payload);
    return response.data;
  } catch (error) {
    console.error("Error upserting Pincode blocklist:", error);
    throw error;
  }
};

// @Post('account-number')
// async upsertAccountNumber(@Body() dto: UpsertBlocklistDto) {
//   return this.service.upsertAccountNumber(dto);
// }
export const postBlocklistAccountNumber = async (payload: BlocklistPayload) => {
  try {
    const response = await api.post(`/blocklist/account-number`, payload);
    return response.data;
  } catch (error) {
    console.error("Error upserting Account Number blocklist:", error);
    throw error;
  }
};




