
import api from "../axios";
 


class AutopayApi {
  async createAutopayTransaction(data: {
    brandId: string;
    userId: string;
    loanId: string;
  }) {
    const response = await api.post(
      `payment-autopay/autopay-transaction`,
      {
        userId: data.userId,
        loanId: data.loanId,
      }
    );
    return response.data;
  }
}
export const autopayApi = new AutopayApi();