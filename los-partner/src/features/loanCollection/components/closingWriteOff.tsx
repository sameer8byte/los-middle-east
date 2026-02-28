import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ClosingTypeEnum } from "../../../constant/enum";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { Loan } from "../../../shared/types/loan";
import {
  upsertClosingType,
  getLoanById,
} from "../../../shared/services/api/loan.api";
import { Button } from "../../../common/ui/button";

interface ClosingTypeProps {
  loanId: string;
}

export function ClosingWriteOffType({ loanId }: ClosingTypeProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const writeOffLoanId = getQuery("writeOffLoanId");
  const [loan, setLoan] = useState<Loan | null>(null);

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Auto dismiss message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleUpdate = async (newType: ClosingTypeEnum) => {
    if (!loanId || !brandId || !newType) {
      setMessage({ text: "Missing required fields.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await upsertClosingType({
        loanId,
        brandId,
      });
      if (res) {
        setMessage({
          text: "Closing type updated successfully",
          type: "success",
        });
        setShowConfirmation(false);
        // Auto close dialog after successful update
        setTimeout(() => {
          removeQuery("writeOffLoanId");
        }, 2000);
      } else {
        setMessage({ text: "Failed to update closing type", type: "error" });
      }
    } catch (error) {
      console.error(error);
      setMessage({
        text:
          (error as Error).message ||
          "An error occurred while updating closing type",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || !brandId) return;
      try {
        const response = await getLoanById(brandId, loanId);
        setLoan(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      }
    };

    fetchLoan();
  }, [loanId, brandId]);

  const handleClose = () => {
    setShowConfirmation(false);
    setMessage(null);
    removeQuery("writeOffLoanId");
  };

  const handleConfirmWriteOff = () => {
    setShowConfirmation(true);
    setMessage(null);
  };

  const handleFinalConfirm = () => {
    handleUpdate(ClosingTypeEnum.WRITE_OFF);
  };

  return (
    <Dialog
      isOpen={!!writeOffLoanId}
      onClose={handleClose}
      title="Write Off Loan"
    >
      <div >
        {/* Header section with loan details */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--color-secondary)] bg-opacity-10 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Loan Write-Off
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Loan ID:{" "}
                <span className="font-mono font-semibold text-[var(--foreground)]">
                  {loan?.formattedLoanId}
                  {loan?.isMigratedloan && (
                      <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                      Migrated ({loan.oldLoanId})
                    </span>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Message display */}
        {message && (
          <div
            role="alert"
            className={`
              flex items-center gap-3 px-4 py-4 mb-6 rounded-lg border text-sm transition-all duration-300 shadow-sm
              ${
                message.type === "success"
                  ? "bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 text-[var(--color-on-success)]"
                  : "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 text-[var(--color-on-error)]"
              }
            `}
          >
            {message.type === "success" ? (
              <FaCheckCircle className="w-5 h-5 text-[var(--color-on-success)] flex-shrink-0" />
            ) : (
              <FaTimesCircle className="w-5 h-5 text-[var(--color-on-error)] flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {!showConfirmation && !message && (
          <>
            {/* Information section */}
            <div className="bg-[var(--primary)] border border-[var(--primary)]/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-[var(--primary)] mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z"
                  />
                </svg>
                <div>
                  <h4 className="font-semibold text-[var(--color-on-primary)] mb-1">
                    Important Information
                  </h4>
                  <p className="text-sm text-[var(--color-on-primary)]">
                    Writing off a loan will permanently mark it as
                    uncollectible. This action affects:
                  </p>
                  <ul className="text-sm text-[var(--color-on-primary)] mt-2 ml-4 space-y-1">
                    <li>• Loan status and collection activities</li>
                    <li>• Financial reporting and accounting</li>
                    <li>• Customer credit history</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Warning section */}
            <div className="bg-[var(--color-secondary)] bg-opacity-10 border border border-[var(--color-warning)] border-opacity-30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-[var(--color-warning)]">
                  This action cannot be undone once confirmed.
                </p>
              </div>
            </div>

            {/* Action button */}
            <Button
              onClick={handleConfirmWriteOff}
              disabled={loading}
              className="w-full"
            >
              Proceed to Write Off
            </Button>

            <button
              className="w-full h-10 mt-3 bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80 text-sm font-medium rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition-colors duration-200"
              onClick={handleClose}
            >
              Cancel
            </button>
          </>
        )}

        {showConfirmation && !message && (
          <>
            {/* Final confirmation */}
            <div className="bg-[var(--color-error)] bg-opacity-10 border-2 border border-[var(--color-error)] border-opacity-30 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--color-error)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="w-8 h-8 text-[var(--color-on-error)]" />
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  Final Confirmation Required
                </h3>
                <p className="text-sm text-[var(--color-on-error)] mb-4">
                  You are about to write off loan{" "}
                  <span className="font-mono font-bold">
                    {loan?.formattedLoanId || "N/A"}
                  </span>
                  . This will permanently mark the loan as uncollectible.
                </p>
                <div className="bg-white border border border-[var(--color-error)] border-opacity-30 rounded-md p-3 mb-4">
                  <p className="text-xs text-[var(--color-on-error)] font-semibold uppercase tracking-wide">
                    ⚠️ PERMANENT ACTION - CANNOT BE REVERSED
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation buttons */}
            <div className="space-y-3">
              <button
                className="w-full h-12 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                onClick={handleFinalConfirm}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Processing Write-Off...
                  </div>
                ) : (
                  "Yes, Write Off This Loan"
                )}
              </button>

              <button
                className="w-full h-10 bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80 text-sm font-medium rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition-colors duration-200"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                No, Go Back
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
