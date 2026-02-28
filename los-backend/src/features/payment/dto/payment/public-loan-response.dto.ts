export class LoanDetailsDto {
  id: string;
  formattedLoanId: string;
  userId: string;
  status: string;
  amount: number;
  purpose?: string;
  applicationDate: Date;
  approvalDate?: Date;
  disbursementDate?: Date;
  closureDate?: Date;
  loanType: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PublicLoanInquiryResponseDto {
  sessionId: string;
  message: string;
  identifier: string;
  identifierType: "MOBILE" | "PAN";
  expiresIn: number; // in seconds
}

export class PublicLoanDetailsResponseDto {
  success: boolean;
  data: {
    userIdentifier: string;
    identifierType: "MOBILE" | "PAN";
    loans: LoanDetailsDto[];
    message?: string;
    totalLoans: number;
    activeLoans: number;
  };
}
