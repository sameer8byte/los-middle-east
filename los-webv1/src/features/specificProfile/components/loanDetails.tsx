import { useEffect, useState } from "react";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useAppSelector } from "../../../redux/store";
import { getLoanDetails } from "../../../services/api/loans.api";
import Dialog from "../../../common/dialog";
import dayjs from "dayjs";
import { Loan } from "../../../types/loans";
import {
  FaCheckCircle,
  FaCreditCard,
  FaCalendarAlt,
  FaChartLine,
  FaWallet,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
} from "react-icons/fa";
export function LoanDetails() {
  const userData = useAppSelector((state) => state.user);
  const [loading, setLoading] = useState(true);
  const { getQuery, removeQuery } = useQueryParams();
  const loanId = getQuery("loanId");
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);

  useEffect(() => {
    if (!loanId || loanId === "") return;

    const fetchLoanHistory = async () => {
      try {
        setLoading(true);
        const response = await getLoanDetails(userData.user.brandId, loanId);
        setLoanDetails(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoanHistory();
  }, [userData.user.brandId, loanId]);

  return (
    <Dialog
      isOpen={!!loanId}
      onClose={() => {
        removeQuery("loanId");
        setLoanDetails(null);
      }}
      title="Loan Details"
    >
      <div>
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 bg-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-4"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading loan details...
            </p>
          </div>
        ) : loanDetails ? (
          <div className="flex flex-col gap-6 py-3">
            {/* App Header */}
            <div className="bg-primary-light text-on-primary p-6 rounded-brand">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">Loan Details</h1>
                  <p className=" text-sm">Manage your repayment</p>
                </div>
                <div className="bg-primary text-on-primary  rounded-2xl p-3">
                  <FaCreditCard className="text-2xl" />
                </div>
              </div>

              {/* Loan Amount Highlight */}
              <div className="bg-primary-focus text-on-primary rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Loan Amount
                    </p>
                    <h2 className="text-3xl font-bold">
                      ₹{loanDetails.amount}
                    </h2>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={loanDetails.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className=" grid grid-cols-2 gap-3">
              <QuickStatCard
                icon={<FaCalendarAlt className="text-blue-600" />}
                label="Applied"
                value={formatDate(loanDetails.applicationDate)}
                bgColor="bg-blue-50"
              />
              <QuickStatCard
                icon={<FaCalendarAlt className="text-green-600" />}
                label="Due Date"
                value={formatDate(loanDetails?.loanDetails?.dueDate || "")}
                bgColor="bg-green-50"
              />
            </div>

            {/* Timeline Card */}
            {(loanDetails.approvalDate || loanDetails.disbursementDate) && (
              <div>
                <AppCard
                  title="Loan Timeline"
                  icon={<FaChartLine className="text-purple-600" />}
                >
                  <div className="space-y-4">
                    <TimelineItem
                      title="Application Submitted"
                      date={formatDate(loanDetails.applicationDate)}
                      status="completed"
                    />
                    {loanDetails.approvalDate && (
                      <TimelineItem
                        title="Loan Approved"
                        date={formatDate(loanDetails.approvalDate)}
                        status="completed"
                      />
                    )}
                    {loanDetails.disbursementDate && (
                      <TimelineItem
                        title="Amount Disbursed"
                        date={formatDate(loanDetails.disbursementDate)}
                        status="completed"
                      />
                    )}
                    <TimelineItem
                      title="Due Date"
                      date={formatDate(loanDetails?.loanDetails?.dueDate || "")}
                      status="pending"
                    />
                  </div>
                </AppCard>
              </div>
            )}

            {/* Repayment Summary */}
            <div>
              <AppCard
                title="Repayment Summary"
                icon={<FaWallet className="text-green-600" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <HighlightCard
                      label="Total Obligation"
                      value={`₹${loanDetails?.repayment?.totalObligation}`}
                      variant="primary"
                    />
                    <HighlightCard
                      label="Total Fees"
                      value={`₹${loanDetails?.repayment?.totalFees}`}
                      variant="secondary"
                    />
                  </div>

                  {/* Fee Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FaInfoCircle className="text-blue-500 text-sm" />
                      Fee Breakdown
                    </h4>
                    {loanDetails?.repayment?.feeBreakdowns.map((fee) => (
                      <FeeCard key={fee.id} fee={fee} />
                    ))}
                  </div>
                </div>
              </AppCard>
            </div>

            {/* Quick Actions */}
            <div className=" grid grid-cols-2 gap-3">
              <ActionCard
                title="Early Repayment"
                subtitle={`₹${loanDetails?.earlyRepayment?.totalAmount}/day`}
                icon={<FaCheckCircle className="text-green-600" />}
                bgColor="bg-green-50"
                textColor="text-green-700"
              />
              {loanDetails.penalties?.map((penalty) => (
                <ActionCard
                  key={penalty.id}
                  title={penalty.type}
                  subtitle={`
                    ${
                      penalty.valueType === "percentage"
                        ? `${penalty.chargeValue}%`
                        : `₹${penalty.chargeValue}`
                    }
                    `}
                  icon={<FaExclamationTriangle className="text-red-600" />}
                  bgColor="bg-red-50"
                  textColor="text-red-700"
                />
              ))}
            </div>

            {/* Disbursement Details */}
              <AppCard
                title="Disbursement Breakdown"
                icon={<FaArrowRight className="text-purple-600" />}
              >
                <div className="space-y-4">
                  {/* Amount Flow */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        Gross Amount
                      </span>
                      <span className="text-lg font-bold text-purple-700">
                        ₹{loanDetails?.disbursement?.grossAmount}
                      </span>
                    </div>
               
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        Total Deductions
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        -₹{loanDetails?.disbursement?.totalDeductions}
                      </span>
                    </div>

                    <div className="border-t border-purple-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-gray-800">
                          Net Amount
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          ₹{loanDetails.disbursement?.netAmount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FaInfoCircle className="text-blue-500 text-sm" />
                      Deduction Details
                    </h4>
                    {loanDetails?.disbursement?.deductions.map((deduction) => (
                      <DeductionCard key={deduction.id} deduction={deduction} />
                    ))}
                  </div>
                </div>
              </AppCard>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center p-8">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <FaInfoCircle className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Loan Details
            </h3>
            <p className="text-gray-500">
              Unable to load loan information at this time
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// Enhanced Helper Components
const AppCard = ({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
    <h2 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-800">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500 text-white";
      case "REJECTED":
        return "bg-red-500 text-white";
      case "PENDING":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getStatusStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
};

const QuickStatCard = ({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) => (
  <div
    className={`${bgColor} rounded-2xl p-4 border border-white/50 shadow-sm`}
  >
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
    <p className="font-bold text-gray-800 text-sm">{value}</p>
  </div>
);

const TimelineItem = ({
  title,
  date,
  status,
}: {
  title: string;
  date: string;
  status: "completed" | "pending";
}) => (
  <div className="flex items-center gap-3">
    <div
      className={`w-3 h-3 rounded-full ${
        status === "completed" ? "bg-green-500" : "bg-gray-300"
      }`}
    />
    <div className="flex-1">
      <p className="font-medium text-gray-800 text-sm">{title}</p>
      <p className="text-xs text-gray-500">{date}</p>
    </div>
  </div>
);

const HighlightCard = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "primary" | "secondary";
}) => (
  <div
    className={`p-4 rounded-2xl ${
      variant === "primary"
        ? "bg-blue-50 border border-blue-200"
        : "bg-gray-50 border border-gray-200"
    }`}
  >
    <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
    <p
      className={`font-bold text-lg ${
        variant === "primary" ? "text-blue-700" : "text-gray-700"
      }`}
    >
      {value}
    </p>
  </div>
);

const FeeCard = ({ fee }: { fee: any }) => (
  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-gray-800">{fee.type}</span>
      <span className="font-bold text-gray-900">₹{fee.total}</span>
    </div>
    {fee.taxes.length > 0 && (
      <div className="border-t border-gray-200 pt-2 mt-2">
        <p className="text-xs font-medium text-gray-500 mb-1">Tax Breakdown:</p>
        {fee.taxes.map((tax: any) => (
          <div
            key={tax.id}
            className="flex justify-between text-xs text-gray-600"
          >
            <span>
              {tax.type} ({tax.rate}%)
            </span>
            <span>₹{tax.amount}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ActionCard = ({
  title,
  subtitle,
  icon,
  bgColor,
  textColor,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}) => (
  <div
    className={`${bgColor} rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className={`text-sm font-semibold ${textColor}`}>{title}</span>
    </div>
    <p className={`font-bold ${textColor}`}>{subtitle}</p>
  </div>
);

const DeductionCard = ({ deduction }: { deduction: any }) => (
  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-gray-800">{deduction.type}</span>
      <span className="font-bold text-gray-900">₹{deduction.total}</span>
    </div>
    {deduction.taxes.length > 0 && (
      <div className="border-t border-gray-200 pt-2 mt-2">
        <p className="text-xs font-medium text-gray-500 mb-1">Tax Details:</p>
        {deduction.taxes.map((tax: any) => (
          <div
            key={tax.id}
            className="flex justify-between text-xs text-gray-600 mb-1"
          >
            <span>
              {tax.type} ({tax.rate}%){" "}
              <small className="text-secondary">
                {tax.isInclusive ? "(Inc.)" : "(Exc.)"}
              </small>
            </span>
            <span>₹{tax.amount}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Date formatting helper
const formatDate = (dateString: string) =>
  dayjs(dateString).isValid() ? dayjs(dateString).format("DD MMM YYYY") : "-";
