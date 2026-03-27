import { useEffect, useState } from "react";
import {
  FaHome,
  FaInfoCircle,
  FaListAlt,
  FaSpinner,
  FaCalendarAlt,
  FaRupeeSign,
  FaUser,
  FaHeadset,
  FaClock,
  FaShieldAlt,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { FiCheck, FiCopy, FiPhone, FiMail } from "react-icons/fi";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { motion } from "framer-motion";
import {
  getLoan,
  generateEsignDocument,
} from "../../../services/api/loans.api";
import { useAppSelector } from "../../../redux/store";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Loan } from "../../../types/loans";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { NeedHelpDialog } from "../../../layouts/needHelpDialog";
import { LoanStatusEnum } from "../../../constant/enum";


export function LoanRequest() {
  const brandConfig = useAppSelector((state) => state.index.brandConfig);
  const { setQuery } = useQueryParams();
  const navigate = useNavigate();
  const userData = useAppSelector((state) => state.user);
  const { loanId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loan, setLoan] = useState<Loan | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [isLoadingEsign, setIsLoadingEsign] = useState(false);
  const [esignWorkflowUrl, setEsignWorkflowUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoanData = async () => {
      try {
        if (!userData.user || !loanId) {
          navigate("/login");
          return;
        }

        const response = await getLoan(userData.user.id, loanId);
        setLoan(response);

        // Trigger confetti animation after successful load
        setTimeout(() => setShowConfetti(true), 500);
      } catch (err) {
        setError(
          (err as Error).message ||
            "An error occurred while fetching loan details.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanData();
  }, [loanId, userData.user, navigate]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleGenerateEsignDocument = async () => {
    if (!loan?.id || !userData.user?.id) {
      console.error("Loan ID or User ID is missing");
      return;
    }

    try {
      setIsLoadingEsign(true);
      const response = await generateEsignDocument({
        loanId: loan.id,
        userId: userData.user.id,
      });
      if (response) {
        if (response.workflowUrl) {
          setEsignWorkflowUrl(response.workflowUrl);
          setShowIframe(true);
        } else {
          // If no workflowUrl, show the success message
          setSuccessMessage(
            response.message || "Document generated successfully!",
          );
          // Auto-hide the message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Error generating esign document:", error);
    } finally {
      setIsLoadingEsign(false);
    }
  };

  // const formatCurrency = (value: number) => {
  //   return new Intl.NumberFormat("en-IN", {
  //     style: "currency",
  //     currency: "INR",
  //     minimumFractionDigits: 0,
  //     maximumFractionDigits: 0,
  //   }).format(value);
  // };

  const formatCurrency = (val: number) => {
    const bhd = (val / 242).toFixed(2);
    return `BHD ${bhd}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaSpinner className="animate-spin text-white text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading...
          </h3>
          <p className="text-gray-600 text-sm">Fetching your loan details</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaInfoCircle className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <NeedHelpDialog />
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-success-light)] via-white to-[var(--color-primary-light)] relative">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="confetti-animation">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: [
                      "var(--color-primary)",
                      "var(--color-secondary)",
                      "var(--color-success)",
                      "var(--color-warning)",
                      "var(--color-error)",
                    ][Math.floor(Math.random() * 5)],
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto px-4 pt-6 pb-32 md:pb-8">
          {/* Status Timeline */}
          <div className="bg-[var(--color-surface)] rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-5 md:p-6 mb-4 md:mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">
                Application Status
              </h2>
              <span className="px-3 py-1 bg-[var(--color-warning-light)] text-[var(--color-warning)] rounded-full text-xs md:text-sm font-medium">
                {loan?.status || "Processing"}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-8 h-8 bg-[var(--color-success)] rounded-full flex items-center justify-center flex-shrink-0">
                  <FiCheck className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm md:text-base">
                    Application Submitted
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 truncate">
                    {loan?.applicationDate
                      ? dayjs(loan.applicationDate).format(
                          "DD MMM, YYYY at HH:mm",
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-8 h-8 bg-[var(--color-warning)] rounded-full flex items-center justify-center animate-pulse flex-shrink-0">
                  <FaClock className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm md:text-base">
                    Under Review
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    Processing within 2-3 business hours
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4 opacity-50">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaRupeeSign className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-600 text-sm md:text-base">
                    Approval & Disbursement
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    Funds will be transferred to your account
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Esign Document Button */}
          {brandConfig.is_automated_reloan &&
            (loan?.status === LoanStatusEnum.APPROVED ||
              loan?.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED) &&
            loan.agreement?.status !== "SIGNED" && (
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={handleGenerateEsignDocument}
                disabled={isLoadingEsign}
                className={`w-full mb-4 md:mb-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all duration-300 animate-slide-up animation-delay-200
            ${
              isLoadingEsign
                ? "opacity-75 cursor-not-allowed scale-95"
                : "hover:from-purple-600 hover:to-purple-700 hover:shadow-xl hover:scale-105 active:scale-95"
            }`}
              >
                {isLoadingEsign ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-lg font-semibold tracking-wide">
                      Generating...
                    </span>
                  </>
                ) : (
                  <>
                    <HiOutlineDocumentText className="h-6 w-6" />
                    <span className="text-lg font-semibold tracking-wide">
                      Continue to e-Sign
                    </span>
                  </>
                )}
              </motion.button>
            )}
          {showIframe && esignWorkflowUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 bg-white"
            >
              {/* Close button at top */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 p-4 shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowIframe(false);
                    setEsignWorkflowUrl(null);
                  }}
                  className="flex items-center gap-2 text-white font-semibold hover:bg-white/20 rounded-lg px-4 py-2 transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>Close Workflow</span>
                </button>
              </div>

              {/* iframe */}
              <iframe
                src={esignWorkflowUrl || ""}
                className="w-full h-full pt-16"
                title="Workflow"
                allow="camera; microphone; geolocation"
              />
            </motion.div>
          )}

          {/* Loan Details Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-5 md:p-6 mb-4 md:mb-6 animate-slide-up animation-delay-200">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">
                Loan Details
              </h2>
              <button
                onClick={() => copyToClipboard(loan?.formattedLoanId || "")}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <FiCheck className="w-4 h-4 text-[var(--color-success)]" />
                ) : (
                  <FiCopy className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-xs md:text-sm text-gray-600">
                  {copied ? "Copied!" : "Copy ID"}
                </span>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <DetailCard
                icon={
                  <FaListAlt className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
                }
                label="Reference Number"
                value={loan?.formattedLoanId || "-"}
                highlight
              />
              <DetailCard
                icon={
                  <FaRupeeSign className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-success)]" />
                }
                label="Amount Requested"
                value={loan?.amount ? formatCurrency(loan.amount) : "-"}
                highlight
              />
              <DetailCard
                icon={
                  <FaCalendarAlt className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-secondary)]" />
                }
                label="Application Date"
                value={
                  loan?.applicationDate
                    ? dayjs(loan.applicationDate).format("DD MMM, YYYY")
                    : "-"
                }
              />
              <DetailCard
                icon={
                  <FaClock className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-error)]" />
                }
                label="Tenure"
                value={
                  loan?.loanDetails?.dueDate
                    ? `${dayjs(loan.loanDetails.dueDate).diff(dayjs(loan.applicationDate), "day")} days`
                    : "-"
                }
              />
              <DetailCard
                icon={
                  <FaClock className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
                }
                label="Due Date"
                value={
                  loan?.loanDetails?.dueDate
                    ? dayjs(loan.loanDetails.dueDate).format("DD MMM, YYYY")
                    : "-"
                }
              />

              <DetailCard
                icon={
                  <FaUser className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-warning)]" />
                }
                label="Purpose"
                value={loan?.purpose || "-"}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hidden md:block mb-6 animate-slide-up animation-delay-400">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-primary text-on-primary p-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all transform active:scale-95"
            >
              <div className="flex items-center justify-center gap-2">
                <FaHome className="text-lg" />
                <span>Continue to Dashboard</span>
              </div>
            </button>
          </div>

          {/* Support Section */}
          <div className="bg-gradient-to-r from-[var(--color-primary-light)] to-[var(--color-secondary-light)] rounded-2xl md:rounded-3xl p-5 md:p-6 mb-4 md:mb-6 animate-slide-up animation-delay-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center flex-shrink-0">
                <FaHeadset className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                Need Help?
              </h3>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Our support team is here to assist you with any questions about
              your loan application.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setQuery("needHelp", "true")}
                className="flex items-center justify-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <FiPhone className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-gray-700">Call</span>
              </button>

              <a
                href={`mailto:${userData.user?.email || ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <FiMail className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </a>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-success-light)] rounded-xl md:rounded-2xl p-4 flex items-start gap-3 animate-fade-in animation-delay-800">
            <FaShieldAlt className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              Your application is secure and encrypted. We'll notify you via SMS
              and email about status updates.
            </p>
          </div>
        </div>

        {/* Fixed Bottom Button for Mobile */}
        {brandConfig.is_automated_reloan &&
          (loan?.status === LoanStatusEnum.APPROVED ||
            loan?.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED) && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-40">
              <div className="max-w-md mx-auto space-y-3">
                <button
                  onClick={handleGenerateEsignDocument}
                  disabled={isLoadingEsign}
                  className={`w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-2xl font-semibold shadow-lg transition-all transform flex items-center justify-center gap-2 ${
                    isLoadingEsign
                      ? "opacity-75 cursor-not-allowed scale-95"
                      : "hover:shadow-xl hover:scale-105 active:scale-95"
                  }`}
                >
                  {isLoadingEsign ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineDocumentText className="text-lg" />
                      <span>Continue to e-Sign</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-[var(--color-primary-light)] transition-all flex items-center justify-center gap-2"
                >
                  <FaHome className="text-base" />
                  <span>Continue to Dashboard</span>
                </button>
              </div>
            </div>
          )}

        {/* Success Message Toast */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 md:bottom-20 left-4 right-4 z-40 max-w-md mx-auto"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <FaCheckCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm leading-relaxed">
                  {successMessage}
                </p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}

function DetailCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
        highlight
          ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100"
          : "bg-gray-50"
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-gray-600 mb-1">{label}</p>
        <p
          className={`font-semibold truncate ${
            highlight
              ? "text-gray-900 text-base md:text-lg"
              : "text-gray-800 text-sm md:text-base"
          }`}
        >
          {value} 
        </p>
      </div>
    </div>
  ); 
}
