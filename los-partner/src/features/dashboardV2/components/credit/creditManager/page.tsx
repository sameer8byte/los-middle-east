import { useState } from 'react';
import DashboardHeader from './components/Header';
import CreditExecutivesSummary from './components/CreditExecutivesSummary';
import TeamPerformance from './components/TeamPerformance';
import {
  HiOutlineDocumentText,
  HiOutlineDocumentCheck,
  HiOutlineListBullet,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineDocumentMinus
} from "react-icons/hi2";
import CreditSummary, { SummaryItem } from '../creditExecutive/components/CreditSummary';
import CreditFunnel, { FunnelMetric, AmountMetric } from '../creditExecutive/components/CreditFunnel';
import { HiOutlineBookOpen } from "react-icons/hi2"; // You can use any icon from your set
import LoanPortfolio, { PortfolioStatus, PortfolioMetric } from '../creditExecutive/components/LoanPortfolio';
import ApprovalContribution, { ContributionData } from './components/ApprovalContribution';
import ConversionPerformance, { ConversionPerformanceData } from './components/ConversionPerformance';
import CreditApplicationTable, { CreditApplicationData } from './components/CreditApplicationTable';
import ApprovedLoanTable, { ApprovedLoanData } from './components/ApprovedLoanTable';
import CreditIntakeOverview, { EmployeeCreditData } from './components/CreditIntakeOverview';
const portfolioStatuses: PortfolioStatus[] = [
  { label: "T.Active Loans", count: 300, icon: HiOutlineBookOpen },
  { label: "Ongoing Loans", count: 224, icon: HiOutlineBookOpen },
  { label: "Overdue Loans", count: 44, icon: HiOutlineBookOpen },
  { label: "Closed Loans", count: 76, icon: HiOutlineBookOpen },
];

const approvalData: ContributionData[] = [
  {
    id: "1",
    name: "Mahesh R",
    initials: "MR",
    rank: 1,
    approvedCount: 355,
    totalAssessed: 360,
    percentage: 95,
    colorVariant: "green",
    details: {
      fresh: { count: 210, percentage: 23 },
      repeat: { count: 150, percentage: 26 },
      target: "XX",
      achieved: 95,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  },
  {
    id: "2",
    name: "Kiran T",
    initials: "KR",
    rank: 2,
    approvedCount: 280,
    totalAssessed: 350,
    percentage: 80,
    colorVariant: "blue",
    details: {
      fresh: { count: 180, percentage: 20 },
      repeat: { count: 100, percentage: 30 },
      target: "XX",
      achieved: 80,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  },
  {
    id: "3",
    name: "Jasmine L",
    initials: "JL",
    rank: 3,
    approvedCount: 190,
    totalAssessed: 345,
    percentage: 55,
    colorVariant: "red",
    details: {
      fresh: { count: 100, percentage: 15 },
      repeat: { count: 90, percentage: 40 },
      target: "XX",
      achieved: 55,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  }
  , {
    id: "1",
    name: "Mahesh R",
    initials: "MR",
    rank: 1,
    approvedCount: 355,
    totalAssessed: 360,
    percentage: 95,
    colorVariant: "green",
    details: {
      fresh: { count: 210, percentage: 23 },
      repeat: { count: 150, percentage: 26 },
      target: "XX",
      achieved: 95,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  },
  {
    id: "2",
    name: "Kiran T",
    initials: "KR",
    rank: 2,
    approvedCount: 280,
    totalAssessed: 350,
    percentage: 80,
    colorVariant: "blue",
    details: {
      fresh: { count: 180, percentage: 20 },
      repeat: { count: 100, percentage: 30 },
      target: "XX",
      achieved: 80,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  },
  {
    id: "3",
    name: "Jasmine L",
    initials: "JL",
    rank: 3,
    approvedCount: 190,
    totalAssessed: 345,
    percentage: 55,
    colorVariant: "red",
    details: {
      fresh: { count: 100, percentage: 15 },
      repeat: { count: 90, percentage: 40 },
      target: "XX",
      achieved: 55,
      avgTicketSize: "XX,XXX",
      gap: "YY"
    }
  }
];
const conversionData: ConversionPerformanceData = {
  approvalRate: 80,
  approvedCount: 1248,
  totalLeads: 1850,
  avgConvertedAmount: "XX,XXX",
  freshLeads: { count: 210, total: 930, percentage: 23 },
  repeatLeads: { count: 150, total: 570, percentage: 26 },
  target: "85",
  gap: "5",
  rejection: {
    dropOffRate: 21,
    totalRejected: 320,
    totalAssessed: 1500,
    categories: [
      {
        label: "Low Cibil",
        count: 82,
        percentage: 26,
        color: "#BFDBFE" // blue-200
      },
      {
        label: "No Response",
        count: 64,
        percentage: 20,
        color: "#60A5FA" // blue-400
      },
      {
        label: "High FOIR",
        count: 52,
        percentage: 16,
        color: "#2563EB" // blue-600
      },
      {
        label: "Customer Declined",
        count: 48,
        percentage: 15,
        color: "#93C5FD" // blue-300
      },
    ]
  }
};
const portfolioMetrics: PortfolioMetric[] = [
  { amount: "6.8 Cr", label: "Total Loan Amount", accentColor: "#3B66F5" },
  { amount: "1.85 Cr", label: "Total Repayment Amount", accentColor: "#A855F7" },
  { amount: "1.32 Cr", label: "Total Amount Collected", accentColor: "#22C55E", percentage: "85%" },
  { amount: "53 L", label: "Outstanding Amount", accentColor: "#EAB308" },
  { amount: "18L", label: "Overdue Amount", accentColor: "#EF4444" },
  { amount: "72 L", label: "Closed Loan Amount", accentColor: "#EC4899" },
];
/* --- Funnel Metrics (Top Row) --- */
const funnelMetrics: FunnelMetric[] = [
  { count: 120, label: "Total Applications", variant: "blue" },
  { count: 85, label: "Sanctioned", variant: "yellow" },
  { count: 64, label: "Disbursed", variant: "green" },
  { count: 42, label: "Pending Disbursal", variant: "orange" },
  { count: 12, label: "Rejected", variant: "red" },
];
const approvedLoanMockData: ApprovedLoanData[] = [
  { srNo: 1, loanId: 'L1234', name: 'Lokesh S', loanType: 'Repeat', loanAmount: '21,00,000', amountDisbursed: '21,00,000', pendingDisbursal: '0', totalRepayment: '21,00,000', amountCollected: '11,00,000', outstanding: '10,00,000', loanStatus: 'Ongoing' },
  { srNo: 2, loanId: 'L1235', name: 'Aditi R', loanType: 'New', loanAmount: '15,00,000', amountDisbursed: '15,00,000', pendingDisbursal: '0', totalRepayment: '15,00,000', amountCollected: '7,50,000', outstanding: '7,50,000', loanStatus: 'Ongoing' },
  { srNo: 3, loanId: 'L1236', name: 'Rahul K', loanType: 'Repeat', loanAmount: '30,00,000', amountDisbursed: '30,00,000', pendingDisbursal: '0', totalRepayment: '30,00,000', amountCollected: '15,00,000', outstanding: '15,00,000', loanStatus: 'Ongoing' },
  { srNo: 4, loanId: 'L1237', name: 'Sneha P', loanType: 'New', loanAmount: '10,00,000', amountDisbursed: '10,00,000', pendingDisbursal: '0', totalRepayment: '10,00,000', amountCollected: '5,00,000', outstanding: '5,00,000', loanStatus: 'Ongoing' },
];
/* --- Financial Amounts (Bottom Row) --- */
const financialAmounts: AmountMetric[] = [
  { amount: "45,00,000", label: "Total Amount Sanctioned", accentColor: "#3B66F5" },
  { amount: "32,50,000", label: "Amount Disbursed", accentColor: "#22C55E" },
  { amount: "28,00,000", label: "Pending For Disbursal ", accentColor: "#F97316" },
  { amount: "4,50,000", label: "Avg Loan Ticket Size", accentColor: "#EAB308" },
];
const summaryData: SummaryItem[] = [
  {
    label: "Total Application",
    number: 420,
    icon: HiOutlineDocumentText,
    variant: "blue",
  },
  {
    label: "Application Assessed",
    number: 360,
    percentage: 86,
    icon: HiOutlineDocumentCheck,
    variant: "indigo",
  },
  {
    label: "Application In Queue",
    number: 52,
    percentage: 12,
    icon: HiOutlineListBullet,
    variant: "yellow",
  },
  {
    label: "Application On Hold",
    number: 8,
    percentage: 2,
    icon: HiOutlineExclamationTriangle,
    variant: "orange",
  },
  {
    label: "Approved Application",
    number: 248,
    percentage: 69,
    icon: HiOutlineCheckCircle,
    variant: "green",
  },
  {
    label: "Rejected Application",
    number: 112,
    percentage: 31,
    icon: HiOutlineDocumentMinus,
    variant: "red",
  },
];
const mockData: CreditApplicationData[] = [
  { srNo: 1, dateOfAssign: 'Jan 20 2025', leadId: 'L123', customerName: 'Jinosh D', phNo: '9987462735', email: 'jinosh@gmail.com', leadType: 'Fresh', loanAmount: '8,00,000', assignedTo: 'Harshad S', lastUpdated: 'Jan 21 2025', status: 'Followups' },
  { srNo: 2, dateOfAssign: 'Jan 22 2025', leadId: 'L124', customerName: 'Ayesha R', phNo: '9876543210', email: 'ayesha@gmail.com', leadType: 'In Progress', loanAmount: '6,00,000', assignedTo: 'Rohit K', lastUpdated: 'Jan 23 2025', status: 'Rejected' },
  { srNo: 3, dateOfAssign: 'Jan 24 2025', leadId: 'L125', customerName: 'Samir T', phNo: '9765432109', email: 'samir@gmail.com', leadType: 'Pending', loanAmount: '5,50,000', assignedTo: 'Priya M', lastUpdated: 'Jan 25 2025', status: 'Approved' },
  { srNo: 4, dateOfAssign: 'Jan 26 2025', leadId: 'L126', customerName: 'Nisha P', phNo: '9654321098', email: 'nisha@gmail.com', leadType: 'Completed', loanAmount: '7,20,000', assignedTo: 'Vikas J', lastUpdated: 'Jan 27 2025', status: 'Approved' },
  { srNo: 5, dateOfAssign: 'Jan 28 2025', leadId: 'L127', customerName: 'Karan S', phNo: '9543210987', email: 'karan@gmail.com', leadType: 'Fresh', loanAmount: '8,50,000', assignedTo: 'Deepa A', lastUpdated: 'Jan 29 2025', status: 'Followups' },
  { srNo: 6, dateOfAssign: 'Jan 30 2025', leadId: 'L128', customerName: 'Riya M', phNo: '9432109876', email: 'riya@gmail.com', leadType: 'In Progress', loanAmount: '9,00,000', assignedTo: 'Suresh N', lastUpdated: 'Jan 31 2025', status: 'Followups' },
];

const employeeIntakeData: EmployeeCreditData[] = [
  { name: "RAJESH R", totalApplication: 4600, assessed: 3900, inQueue: 3600, onHold: 4900, approved: 1400, rejected: 600 },
  { name: "ANITA S", totalApplication: 3600, assessed: 3900, inQueue: 3600, onHold: 4900, approved: 1400, rejected: 600 },
  { name: "CARLOS M", totalApplication: 4600, assessed: 900, inQueue: 4600, onHold: 4900, approved: 1400, rejected: 600 },
  { name: "DIANA K", totalApplication: 4800, assessed: 4900, inQueue: 4600, onHold: 4900, approved: 1400, rejected: 600 },
  { name: "ELENA T", totalApplication: 5000, assessed: 420, inQueue: 4360, onHold: 4452, approved: 8, rejected: 350 },
  { name: "FAISAL H", totalApplication: 1600, assessed: 2900, inQueue: 4600, onHold: 4400, approved: 1400, rejected: 600 },
  { name: "GINA L", totalApplication: 1600, assessed: 3900, inQueue: 4600, onHold: 4900, approved: 1400, rejected: 600 },
  { name: "HIROSHI N", totalApplication: 1600, assessed: 3900, inQueue: 4600, onHold: 4400, approved: 1400, rejected: 600 },
];

const CreditManager = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const executiveMetrics = [
    { label: "Variable A", count: 30 },
    { label: "Variable B", count: 30 },
    { label: "Variable C", count: 30 },
  ];

  return (
    /* 1. Main Root: Use min-h-screen to ensure background coverage */
    <div className="min-h-screen w-full bg-[#F8F9FB] flex flex-col font-sans">

      {/* ================= TOP ROW ================= */}
      {/* items-stretch ensures the sidebar matches the left column height */}
      <div className="flex flex-col lg:flex-row gap-6 p-5 lg:p-6 items-stretch">

        {/* ---------- LEFT COLUMN (Main Content) ---------- */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Header Section: Aligned to the top left of the content area */}
          <div className="z-10 flex-shrink-0">
            <DashboardHeader
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
            />
          </div>

          {/* Credit Executives Summary: Placed immediately below the header */}
          <CreditExecutivesSummary metrics={executiveMetrics} />
          <CreditSummary
            title="Credit Intake Summary (Across Executives)"
            data={summaryData}
          />
          <CreditFunnel
            title="Loan Application Funnel"
            metrics={funnelMetrics}
            amounts={financialAmounts}
          />
          <LoanPortfolio
            title="Loan Portfolio & Repayment Overview (Across Executive)"
            statuses={portfolioStatuses}
            metrics={portfolioMetrics}
          />

        </div>

        {/* ---------- RIGHT SIDEBAR (Team Performance) ---------- */}
        {/* Fixed width column aligned alongside the top cards */}
        {/* min-h-0 lets its child flex container shrink so scrolling works */}
        <div className=" w-full lg:w-[400px] h-full flex-shrink-0 min-h-0">
          <TeamPerformance />
        </div>
      </div>

      {/* ================= BOTTOM SECTION ================= */}
      <div className="px-5 lg:px-6 pb-10 space-y-8">

        {/* Side-by-side Flex Row for Performance and Contribution */}
        {/* Updated Bottom Section Wrapper */}
        <div className="flex flex-col xl:flex-row gap-6 items-start w-full overflow-hidden">

          {/* 1. Approval (%) Contribution - Removed w-[500px] on mobile */}
          <div className="w-full xl:w-[450px] shrink-0">
            <ApprovalContribution
              title="Approval (%) Contribution (By Executive)"
              data={approvalData}
            />
          </div>

          {/* 2. Conversion Approval Performance - min-w-0 prevents flex items from pushing outward */}
          <div className="flex-1 w-full min-w-0">
            <ConversionPerformance data={conversionData} />
          </div>
        </div>
        {/* ---------- INTEGRATED TABLE SECTION ---------- */}
        {/* This will span the full width of the dashboard */}
        <div className="w-full">
          <CreditApplicationTable data={mockData} />
        </div>

        <div className="w-full">
          <ApprovedLoanTable data={approvedLoanMockData} />
        </div>

        <CreditIntakeOverview data={employeeIntakeData} />
      </div>
    </div>
  );
};

export default CreditManager;