// 🔴 API INTEGRATION POINT - Collection Overview Cards
export interface CollectionOverviewData {
  totalCalls: number;
  totalCallsChange: number;
  connectedCalls: number;
  connectedCallsChange: number;
  ptp: number;
  ptpChange: number;
  brokenPtp: number;
  brokenPtpChange: number;
}

// 🔴 API INTEGRATION POINT - Collection Summary
export interface CollectionSummaryData {
  totalLoanDueAmount: number;
  totalLoanAmountCollected: number;
  totalAmountOutstanding: number;
}

// 🔴 API INTEGRATION POINT - Application & Credit Pipeline
export interface ApplicationData {
  totalApplications: number;
  inProgress: number;
  approved: number;
  rejected: number;
}

// 🔴 API INTEGRATION POINT - Performance Score
export interface PerformanceScoreData {
  score: number;
  maxScore: number;
  rank: number;
  totalExecutives: number;
}
