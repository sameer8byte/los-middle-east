import { useAppSelector } from "../../../redux/store";
import { useState } from "react";
import {
  FaRegClock,
  FaRupeeSign,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { LoanStatusEnum } from "../../../constant/enum";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { LoanPayNow } from "../../specificProfile/components/loanPayNow";
import { LoanRepaymentCalculationResponse } from "../../../types/loans";
import {
  postCurrentRepayment,
  generateEsignDocument,
} from "../../../services/api/loans.api";

export function NotAllowed() {
  const brandConfig = useAppSelector((state) => state.index.brandConfig);
  const loanCredibility = useAppSelector((state) => state.loanCredibility);
  const loan = loanCredibility.loan;
  const userData = useAppSelector((state) => state.user);
  const { setQuery } = useQueryParams();

  const [paymentSummary, setPaymentSummary] =
    useState<LoanRepaymentCalculationResponse | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [isLoadingEsign, setIsLoadingEsign] = useState(false);
  const [esignWorkflowUrl, setEsignWorkflowUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePayNow = async () => {
    if (!loan?.id || !userData.user.id) return;

    try {
      setIsLoadingPayment(true);
      const response = await postCurrentRepayment(userData.user.id, loan.id);
      if (response) {
        setPaymentSummary(response);
        setQuery("payNowLoanId", loan.id);
      }
    } catch (error) {
      console.error("Error fetching repayment details:", error);
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleGenerateEsignDocument = async () => {
    if (!loan?.id || !userData.user.id) return;

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
          setSuccessMessage(
            response.message || "Document generated successfully!",
          );
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      }
    } catch (error) {
      console.error("Error generating esign document:", error);
    } finally {
      setIsLoadingEsign(false);
    }
  };

  const workflowUrl = loanCredibility?.workflowUrl;
  const statusMapping: Record<string, string> = {
    PENDING:
      "Your application is under review. You'll get notified in 2–3 business hours.",
    APPROVED: "Your loan is approved! Please proceed to e-Sign the agreement.",
    DISBURSED: "Your loan has been disbursed. You can view the details below.",
    ACTIVE:
      "Your loan is active. You can make repayments and view details below.",
    PARTIALLY_PAID:
      "Your loan is partially paid. Please check the details and make payments accordingly.",
    PAID: "Your loan is fully paid. Thank you for your payments!",
    OVERDUE:
      "Your loan is overdue. Please make the payment as soon as possible to avoid penalties.",
    DEFAULTED:
      "Your loan is overdue. Please make the payment as soon as possible to avoid penalties.",
    REJECTED:
      "Your loan application was rejected. Please contact support for more information.",
    CANCELLED:
      "Your loan application was rejected. Please contact support for more information.",
    COMPLETED: "Your loan process is completed. Thank you for choosing us!",
    POST_ACTIVE:
      "Your loan is in post-active stage. Please check the details and make payments accordingly.",
    CREDIT_EXECUTIVE_APPROVED:
      "Your loan is in the approval stage. Please proceed to e-Sign the agreement.",
    SANCTION_MANAGER_APPROVED:
      "Your loan is in the approval stage. Please proceed to e-Sign the agreement.",
    SETTLED:
      "Your loan is settled. Thank you for your payments! you are not eligible for a new loan at this point in time.",
    WRITE_OFF:
      "Your loan has been written off. Thank you for your payments! you are not eligible for a new loan at this point in time.",
    ONBOARDING:
      "Your loan application is in onboarding stage. Please complete the required steps.",
  };
  return (
    <div className="max-w-md mx-auto px-4 pb-32 md:pb-6">
      {/* Continue to Esign (Desktop) */}
      {workflowUrl && !showIframe && (
        <button
          onClick={() => setShowIframe(true)}
          className="hidden md:flex w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg items-center justify-center gap-3 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <HiOutlineDocumentText className="h-6 w-6" />
          Continue to e-Sign
        </button>
      )}

      {/* Generate Esign */}
      {!workflowUrl &&
        brandConfig.is_automated_reloan &&
        (loan?.status === LoanStatusEnum.APPROVED ||
          loan?.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED) &&
        loan.agreement?.status !== "SIGNED" && (
          <button
            onClick={handleGenerateEsignDocument}
            disabled={isLoadingEsign}
            className={`hidden md:flex w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg items-center justify-center gap-3 transition-all duration-300 ${
              isLoadingEsign
                ? "opacity-75 cursor-not-allowed"
                : "hover:from-purple-600 hover:to-purple-700 hover:shadow-xl hover:scale-105 active:scale-95"
            }`}
          >
            {isLoadingEsign ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <HiOutlineDocumentText className="h-6 w-6" />
                Continue to e-Sign
              </>
            )}
          </button>
        )}

      {/* Iframe Fullscreen */}
      {showIframe && (esignWorkflowUrl || workflowUrl) && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="absolute top-0 left-0 right-0 bg-blue-600 p-4">
            <button
              onClick={() => {
                setShowIframe(false);
                setEsignWorkflowUrl(null);
              }}
              className="text-white font-semibold"
            >
              Close Workflow
            </button>
          </div>
          <iframe
            src={esignWorkflowUrl || workflowUrl || ""}
            className="w-full h-full pt-16"
            title="Workflow"
          />
        </div>
      )}

      {/* Status Card */}
      {loan?.status !== LoanStatusEnum.ACTIVE && (
        <div className="mt-4 bg-white rounded-3xl p-6 shadow-lg border text-center">
          <div className="bg-blue-500 p-4 rounded-full inline-block">
            <FaRegClock className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {statusMapping[loan?.status || "PENDING"]}
          </p>
        </div>
      )}

      {/* Pay Now */}
      {loan?.status === LoanStatusEnum.ACTIVE && (
        <button
          onClick={handlePayNow}
          disabled={isLoadingPayment}
          className={`w-full mt-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all duration-300 ${
            isLoadingPayment
              ? "opacity-75 cursor-not-allowed"
              : "hover:scale-105 active:scale-95"
          }`}
        >
          {isLoadingPayment ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <FaRupeeSign className="h-6 w-6" />
              Pay Now
            </>
          )}
        </button>
      )}

      {/* Loan Details */}
      {loan && (
        <div className="mt-6 bg-white rounded-3xl shadow-lg border overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 font-bold">
            Application Details
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Loan ID</span>
              <span className="font-semibold">{loan.formattedLoanId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-bold">
                BHD {loan.amount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="font-semibold">{loan.status}</span>
            </div>
            {loan.applicationDate && (
              <div className="flex justify-between">
                <span>Applied On</span>
                <span className="font-semibold">
                  {" "}
                  {new Date(loan.applicationDate).toLocaleDateString()}{" "}
                </span>
              </div>
            )}
            {loan.disbursementDate && (
              <div className="flex justify-between">
                <span>Disbursed On</span>
                <span className="font-semibold">
                  {" "}
                  {new Date(loan.disbursementDate).toLocaleDateString()}{" "}
                </span>
              </div>
            )}
            {loan.agreement?.status && (
              <div className="flex justify-between">
                {" "}
                <span>Agreement Status</span>
                <span className="font-semibold"> {loan.agreement.status} </span>
              </div>
            )}
            {/* dueDate.  */}
            {loan.loanDetails?.dueDate && (
              <div className="flex justify-between">
                <span>Due Date</span>
                <span className="font-semibold">
                  {new Date(loan.loanDetails.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-green-600 text-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheckCircle />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Loan Payment Dialog */}
      {paymentSummary && (
        <LoanPayNow
          paymentSummary={paymentSummary}
          setPaymentSummary={setPaymentSummary}
        />
      )}
    </div>
  );
}
