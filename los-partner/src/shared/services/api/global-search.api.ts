import api from "../axios";

export interface GlobalSearchParams {
  search: string;
}

export interface GlobalSearchResponse {
  users: {
    data: Array<{
      id: string;
      email: string;
      phoneNumber: string;
      formattedUserId: string;
      createdAt: string;
      userDetails: {
        firstName: string;
        middleName: string;
        lastName: string;
      } | null;
      allocated_partner_user_id: string | null;
      allocatedPartner: {
        name: string;
        email: string;
      };
      status_id: number | null;
      is_terms_accepted: boolean;
      occupation_type_id: number | null;
    }>;
    total: number;
  };
  loans: {
    data: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      status: string;
      createdAt: string;
      updatedAt: string;
      applicationDate: string | null;
      approvalDate: string | null;
      disbursementDate: string | null;
      closureDate: string | null;
      is_repeat_loan: boolean;
      oldLoanId: string | null;
      loanType: string | null;
      purpose: string | null;
      user: {
        id: string;
        email: string;
        phoneNumber: string;
        formattedUserId: string;
        userDetails: {
          firstName: string;
          middleName: string;
          lastName: string;
        } | null;
      };
      allottedPartners: Array<{
        partnerUser: {
          name: string;
          email: string;
        };
      }>;
      loanStatusHistory: Array<{
        status: string;
        createdAt: string;
        message: string | null;
        partnerUser: {
          name: string;
          email: string;
        } | null;
      }>;
      repayment: {
        totalObligation: number;
        totalFees: number;
      } | null;
      loanDetails: {
        dueDate?: string;
        durationDays?: number;
      } | null;
      paymentRequests: Array<{
        id: string;
        type: string;
        currency: string;
        status: string;
        createdAt: string;
        collectionTransactions: Array<{
          id: string;
          amount: string;
          status: string;
          method: string;
          completedAt: string | null;
          createdAt: string;
          currency: string;
          totalFees: number;
          totalTaxes: number;
          totalPenalties: number;
          opsApprovalStatus: string | null;
          externalRef: string | null;
          paymentLink: string | null;
          note: string | null;
        }>;
        disbursalTransactions: Array<{
          id: string;
          amount: string;
          status: string;
          method: string;
          completedAt: string | null;
          createdAt: string;
          currency: string;
          opsApprovalStatus: string | null;
          note: string | null;
        }>;
        partialCollectionTransactions: Array<{
          id: string;
          amount: number;
          status: string;
          method: string;
          completedAt: string | null;
          createdAt: string;
          currency: string;
          totalFees: number;
          totalTaxes: number;
          totalPenalties: number;
          principalAmount: number;
          opsApprovalStatus: string | null;
          externalRef: string | null;
          paymentLink: string | null;
          note: string | null;
        }>;
      }>;
    }>;
    total: number;
  };
  documents: {
    data: Array<{
      id: string;
      type: string;
      status: string;
      documentNumber: string;
      createdAt: string;
      updatedAt: string;
      user: {
        id: string;
        email: string;
        phoneNumber: string;
        formattedUserId: string;
        userDetails: {
          firstName: string;
          middleName: string;
          lastName: string;
        } | null;
      };
    }>;
    total: number;
  };
  totalResults: number;
}

export const globalSearch = async (
  brandId: string,
  params: GlobalSearchParams,
): Promise<GlobalSearchResponse> => {
  const { search } = params;

  const response = await api.get(
    `/partner/brand/${brandId}/global-search?search=${encodeURIComponent(search.trim())}`,
  );

  return response.data;
};

export const getUserById = async (brandId: string, userId: string) => {
  const response = await api.get(
    `/partner/brand/${brandId}/global-search/user/${userId}`,
  );

  return response.data;
};
