import  { useState } from 'react';
import DashboardHeader from "./components/Header";
import CreditSummary, { SummaryItem } from "./components/CreditSummary";
import CreditFunnel, { FunnelMetric, AmountMetric } from "./components/CreditFunnel";
import LoanPortfolio, { PortfolioMetric, PortfolioStatus } from './components/LoanPortfolio';
import MyPerformanceSidebar from "./components/MyPerformanceSidebar";
import ApplicantTable, { ApplicantRowData } from './components/ApplicantTable';
import ApprovedLoanTable, { ApprovedLoanRow } from './components/ApprovedLoanTable';
import CreditDecisionSummary from './components/CreditDecisionSummary';
// Icon Imports
import { HiOutlineDocumentCheck } from "react-icons/hi2";
import {
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from "react-icons/hi";
import {
  MdOutlinePauseCircleOutline,
  MdOutlineFormatListBulleted,
} from "react-icons/md";
import PerformanceTable, { TableRowData } from './components/PerformanceTable';

const CreditExecutiveDashboard = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const approvedLoanData: ApprovedLoanRow[] = [
  { srNo: 1, loanId: "L1234", name: "Lokesh S", loanType: "Repeat", loanAmount: "21,00,000", amountDisbursed: "21,00,000", pendingDisbursal: "0", totalRepayment: "21,00,000", amountCollected: "11,00,000", outstanding: "10,00,000", loanStatus: "Ongoing" },
  { srNo: 2, loanId: "L1235", name: "Aditi R", loanType: "New", loanAmount: "15,00,000", amountDisbursed: "15,00,000", pendingDisbursal: "0", totalRepayment: "15,00,000", amountCollected: "7,50,000", outstanding: "7,50,000", loanStatus: "Ongoing" },
  { srNo: 3, loanId: "L1236", name: "Rahul K", loanType: "Repeat", loanAmount: "30,00,000", amountDisbursed: "30,00,000", pendingDisbursal: "0", totalRepayment: "30,00,000", amountCollected: "15,00,000", outstanding: "15,00,000", loanStatus: "Ongoing" },
  { srNo: 4, loanId: "L1237", name: "Sneha P", loanType: "New", loanAmount: "10,00,000", amountDisbursed: "10,00,000", pendingDisbursal: "0", totalRepayment: "10,00,000", amountCollected: "5,00,000", outstanding: "5,00,000", loanStatus: "Ongoing" },
];

// Scalable Action Handler
const handleLoanAction = (type: string, row: ApprovedLoanRow) => {
  console.log(`Action: ${type} for Loan: ${row.loanId}`);
};

  // --- Data Definitions ---
  const summaryData: SummaryItem[] = [
    { icon: HiOutlineDocumentText, number: 420, label: "Total Application", variant: "blue" },
    { icon: HiOutlineClipboardList, number: 360, label: "Application Assessed", percentage: 86, variant: "indigo" },
    { icon: MdOutlineFormatListBulleted, number: 52, label: "Application In Queue", percentage: 12, variant: "yellow" },
    { icon: MdOutlinePauseCircleOutline, number: 8, label: "Application On Hold", percentage: 2, variant: "orange" },
    { icon: HiOutlineCheckCircle, number: 248, label: "Approved Application", percentage: 69, variant: "green" },
    { icon: HiOutlineXCircle, number: 112, label: "Rejected Application", percentage: 31, variant: "red" },
  ];

  const funnelMetrics: FunnelMetric[] = [
    { count: 360, label: "T.Assessed Appl.", variant: "blue" },
    { count: 52, label: "Under Evaluation", variant: "orange" },
    { count: 198, label: "Disbursed", variant: "green" },
    { count: 40, label: "Pending Disbursal", variant: "yellow" },
    { count: 70, label: "Rejected", variant: "red" },
  ];

  const funnelAmounts: AmountMetric[] = [
    { amount: "3.8 Cr", label: "T.Assessed Loan Amount", accentColor: "#3B66F5" },
    { amount: "3.1 Cr", label: "Amount Disbursed", accentColor: "#22C55E" },
    { amount: "0.52 Cr", label: "Pending For Disbursal", accentColor: "#EAB308" },
    { amount: "46,300", label: "Avg Loan Ticket Size", accentColor: "#A855F7" },
  ];

  const portfolioStatuses: PortfolioStatus[] = [
    { label: "T.Active Loans", count: 300, icon: HiOutlineDocumentCheck },
    { label: "Ongoing Loans", count: 224, icon: HiOutlineDocumentCheck },
    { label: "Overdue Loans", count: 44, icon: HiOutlineDocumentCheck },
    { label: "Closed Loans", count: 76, icon: HiOutlineDocumentCheck },
  ];

  const portfolioMetrics: PortfolioMetric[] = [
    { amount: "6.8 Cr", label: "Total Loan Amount", accentColor: "#3B66F5" },
    { amount: "1.85 Cr", label: "Total Repayment Amount", accentColor: "#A855F7" },
    { amount: "1.32 Cr", label: "Total Amount Collected", accentColor: "#22C55E", percentage: "85%" },
    { amount: "53 L", label: "Outstanding Amount", accentColor: "#EAB308" },
    { amount: "18L", label: "Overdue Amount", accentColor: "#EF4444" },
    { amount: "72 L", label: "Closed Loan Amount", accentColor: "#F472B6" },
  ];
  
  const performanceTableData: TableRowData[] = [
  { srNo: 1, month: "Jan 2025", employee: "Ashutosh", totalCaseCount: 240, totalLoanAmount: "20,00,000", closedLoans: 140, collectedLoanAmount: "15,00,000", closedLoanAmountIpc: "12,00,000", collectionPercentage: 86 },
  { srNo: 2, month: "Feb 2025", employee: "Bhavna", totalCaseCount: 300, totalLoanAmount: "25,00,000", closedLoans: 160, collectedLoanAmount: "18,00,000", closedLoanAmountIpc: "14,00,000", collectionPercentage: 90 },
  { srNo: 3, month: "Mar 2025", employee: "Chirag", totalCaseCount: 350, totalLoanAmount: "30,00,000", closedLoans: 180, collectedLoanAmount: "20,00,000", closedLoanAmountIpc: "15,50,000", collectionPercentage: 92 },
  { srNo: 4, month: "Apr 2025", employee: "Deepa", totalCaseCount: 400, totalLoanAmount: "35,00,000", closedLoans: 200, collectedLoanAmount: "22,50,000", closedLoanAmountIpc: "16,00,000", collectionPercentage: 93 },
  { srNo: 5, month: "May 2025", employee: "Esha", totalCaseCount: 450, totalLoanAmount: "40,00,000", closedLoans: 220, collectedLoanAmount: "25,00,000", closedLoanAmountIpc: "17,00,000", collectionPercentage: 95 },
  { srNo: 6, month: "Jun 2025", employee: "Farhan", totalCaseCount: 500, totalLoanAmount: "45,00,000", closedLoans: 240, collectedLoanAmount: "28,00,000", closedLoanAmountIpc: "18,50,000", collectionPercentage: 94 },
  { srNo: 7, month: "Jul 2025", employee: "Gita", totalCaseCount: 550, totalLoanAmount: "50,00,000", closedLoans: 260, collectedLoanAmount: "30,00,000", closedLoanAmountIpc: "20,00,000", collectionPercentage: 97 },
  { srNo: 8, month: "Aug 2025", employee: "Harshit", totalCaseCount: 600, totalLoanAmount: "55,00,000", closedLoans: 280, collectedLoanAmount: "32,00,000", closedLoanAmountIpc: "21,00,000", collectionPercentage: 98 },
  { srNo: 9, month: "Sep 2025", employee: "Isha", totalCaseCount: 650, totalLoanAmount: "60,00,000", closedLoans: 300, collectedLoanAmount: "35,00,000", closedLoanAmountIpc: "23,00,000", collectionPercentage: 99 },
  { srNo: 10, month: "Oct 2025", employee: "Jatin", totalCaseCount: 700, totalLoanAmount: "65,00,000", closedLoans: 320, collectedLoanAmount: "38,00,000", closedLoanAmountIpc: "24,50,000", collectionPercentage: 100 },
  { srNo: 11, month: "Nov 2025", employee: "Kavya", totalCaseCount: 750, totalLoanAmount: "70,00,000", closedLoans: 340, collectedLoanAmount: "40,00,000", closedLoanAmountIpc: "26,00,000", collectionPercentage: 101 },
];

const applicantTableData: ApplicantRowData[] = [
  { srNo: 1, date: "Jan 2025", applicationId: "APL123", applicantName: "Kishore S", phNo: "9988456372", email: "kishore@gmail.com", loanAmount: "21,00,000", loanType: "Fresh", status: "Assessed", lastUpdated: "Jan 22 2.30 PM" },
  { srNo: 2, date: "Feb 2025", applicationId: "APL124", applicantName: "Anjali R", phNo: "9988456373", email: "anjali@gmail.com", loanAmount: "18,50,000", loanType: "Pending", status: "Assessed", lastUpdated: "Feb 20 3.00 PM" },
  { srNo: 3, date: "Mar 2025", applicationId: "APL125", applicantName: "Rajesh K", phNo: "9988456374", email: "rajesh@gmail.com", loanAmount: "25,00,000", loanType: "Completed", status: "Assessed", lastUpdated: "Mar 15 11.00 AM" },
  { srNo: 4, date: "Apr 2025", applicationId: "APL126", applicantName: "Sneha P", phNo: "9988456375", email: "sneha@gmail.com", loanAmount: "30,00,000", loanType: "Fresh", status: "Assessed", lastUpdated: "Apr 10 1.00 PM" },
  { srNo: 5, date: "May 2025", applicationId: "APL127", applicantName: "Vikram T", phNo: "9988456376", email: "vikram@gmail.com", loanAmount: "22,50,000", loanType: "Pending", status: "Assessed", lastUpdated: "May 5 4.00 PM" },
];
// Inside CreditExecutiveDashboard component
const decisionSummaryData = {
  sanctionRate: { ratio: "360/420", percentage: 86 },
  distribution: { successPercent: 86, pendingPercent: 10, rejectedPercent: 4 },
  categories: [
    {
      title: "Pending/Hold",
      totalCases: 30,
      color: "bg-yellow-400",
      borderColor: "border-yellow-200",
      remarks: [
        { label: "Documents Missing", count: 7 },
        { label: "Documents Pending", count: 5 },
        { label: "Documents Reviewed", count: 12 },
        { label: "Documents Approved", count: 9 },
        { label: "Bank Statement Pending", count: 5 },
        { label: "Needs Field Verification", count: 4 },
        { label: "BENEFIT Credit Bureau Clarification", count: 3 },
      ]
    },
    {
      title: "Rejected",
      totalCases: 30,
      color: "bg-red-500",
      borderColor: "border-red-200",
      remarks: [
        { label: "Documents Missing", count: 7 },
        { label: "Documents Reviewed", count: 15 },
        { label: "Documents Approved", count: 5 },
        { label: "Documents Rejected", count: 3 },
        { label: "Bank Statement Pending", count: 5 },
        { label: "Needs Field Verification", count: 4 },
        { label: "BENEFIT Credit Bureau Clarification", count: 3 },
      ]
    }
  ]
};

return (
  <div className="min-h-screen w-full bg-[#F8F9FB] flex flex-col font-sans">

    {/* ================= TOP ROW ================= */}
    {/* items-stretch ensures both columns have equal height */}
    <div className="flex flex-col lg:flex-row gap-6 p-5 lg:p-6 items-stretch">

      {/* ---------- LEFT COLUMN (Dashboard Content) ---------- */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <DashboardHeader
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />

        <CreditSummary data={summaryData} />

        <CreditFunnel
          metrics={funnelMetrics}
          amounts={funnelAmounts}
        />

        <LoanPortfolio
          statuses={portfolioStatuses}
          metrics={portfolioMetrics}
        />
      </div>

      {/* ---------- RIGHT SIDEBAR ---------- */}
      {/* h-full ensures it matches the Left Column height */}
      <div className="w-full lg:w-[380px] flex-shrink-0">
        <MyPerformanceSidebar />
      </div>

    </div>

    {/* ================= BOTTOM SECTION (Full Width) ================= */}
    <div className="px-5 lg:px-6 pb-10 space-y-8">
      <PerformanceTable data={performanceTableData} />
      <ApplicantTable data={applicantTableData} />
      <ApprovedLoanTable
        data={approvedLoanData}
        onActionClick={handleLoanAction}
      />
      <CreditDecisionSummary {...decisionSummaryData} />
    </div>
  </div>
);
};

export default CreditExecutiveDashboard;