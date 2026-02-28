import api from '../axios';

export interface LoanComment {
  id: string;
  loanId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  partnerUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateLoanCommentRequest {
  loanId: string;
  comment: string;
}

export interface CreateLoanCommentResponse {
  success: boolean;
  comment: LoanComment;
  message: string;
}

export interface GetLoanCommentsResponse {
  success: boolean;
  comments: LoanComment[];
  total: number;
}

/**
 * Add a comment to a loan
 */
export const addLoanComment = async (
  brandId: string,
  data: CreateLoanCommentRequest
): Promise<CreateLoanCommentResponse> => {
  const response = await api.post(`/partner/brand/${brandId}/loans/${data.loanId}/comments`, {
    comment: data.comment,
    brandId,
  });
  return response.data;
};

/**
 * Get all comments for a loan
 */
export const getLoanComments = async (
  brandId: string,
  loanId: string
): Promise<GetLoanCommentsResponse> => {
  const response = await api.get(`/partner/brand/${brandId}/loans/${loanId}/comments`);
  return response.data;
};


