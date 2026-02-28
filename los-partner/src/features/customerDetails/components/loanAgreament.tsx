import { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
import {
  FaDownload,
  FaExpand,
  FaCompress,
  FaFileAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import { FaArrowUpRightDots } from "react-icons/fa6";
import {
  AgreementStatusEnum,
  BrandProviderType,
  BrandProviderName,
} from "../../../constant/enum";
import { formatDateWithTime } from "../../../lib/utils";
import {
  getAgreements,
  sendDocumentForSigning,
} from "../../../shared/services/api/agreament.api";
import { LoanAgreement } from "../../../shared/types/loan";
import { Button } from "../../../common/ui/button";
import { useAppSelector } from "../../../shared/redux/store";
import { selectProvidersByType } from "../../../shared/redux/slices/brand.slice";

interface LoanAgreementsProps {
  fatchLoans: () => void;
  agreementId: string | null;
  agreementUserId: string | null;
  onClose: () => void;
}

export function LoanAgreements({
  fatchLoans,
  agreementId,
  agreementUserId,
  onClose,
}: LoanAgreementsProps) {
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.LOAN_AGREEMENT)
  );

  const [agreement, setLoanAgreement] = useState<{
    loanAgreement: LoanAgreement | null;
  }>({
    loanAgreement: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<BrandProviderName | null>(null);
  const [pdfExpanded, setPdfExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);

    if (!agreementId) {
      setLoading(false);
      setError("❌ No agreement ID provided.");
      return;
    }

    const fetchLoanAgreement = async () => {
      try {
        const response = await getAgreements(agreementId);
        setLoanAgreement(response);
        setError(null);
      } catch (err) {
        setError(
          (err as Error).message || "❌ Failed to load loan agreement details."
        );
        console.error("Error fetching loan agreement:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoanAgreement();
  }, [agreementId]);

  const handleSendLoanAgreement = async () => {
    if (!agreementId || !agreementUserId) return;

    try {
      setSending(true);
      await sendDocumentForSigning(
        agreementUserId,
        agreementId,
        selectedProvider
      );
      const updatedAgreement = await getAgreements(agreementId);

      setLoanAgreement(updatedAgreement);
    } catch (err) {
      setError("❌ Failed to send document for signing.");
      console.error("Error sending document:", err);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setLoading(false);
    setSending(false);
    setError(null);
    setLoanAgreement({ loanAgreement: null });
    setSelectedProvider(null);
    onClose();
    fatchLoans();
  };
  const signdeskProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.SIGNDESK
  );
  const signzyProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.SIGNZY
  );
  const digitapProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.DIGITAP
  );

  // Set default provider on mount
  useEffect(() => {
    if (!selectedProvider) {
      if (signdeskProvider) {
        setSelectedProvider(BrandProviderName.SIGNDESK);
      } else if (signzyProvider) {
        setSelectedProvider(BrandProviderName.SIGNZY);
      } else if (digitapProvider) {
        setSelectedProvider(BrandProviderName.DIGITAP);
      }
    }
  }, [signdeskProvider, signzyProvider, digitapProvider, selectedProvider]);

  return (
    <Dialog
      title={
        `Loan Agreement Details - ${agreement.loanAgreement?.id.split("-")[0]} - status: ${agreement.loanAgreement?.status}`
      }
      isOpen={!!agreementId}
      onClose={() => handleClose()}
      size="xl"
    >
      <div className="text-sm text-[var(--color-on-background)]">
        {error && (
          <div className="bg-[var(--color-error)]/20 text-[var(--color-on-error)] border border-[var(--color-error)]/30 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
            <FaExclamationTriangle className="text-[var(--color-error)] h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
            {/* PDF Viewer Skeleton */}
            <div className="space-y-4">
              <div className="bg-[var(--color-surface)] rounded-xl p-4">
                <div className="h-6 w-32 bg-[var(--color-on-surface)] rounded mb-4"></div>
                <div className="aspect-[3/4] bg-[var(--color-on-surface)] rounded-lg"></div>
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="space-y-4">
              <div className="bg-[var(--color-surface)] rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-[var(--color-on-surface)] rounded"></div>
                    <div className="h-4 w-32 bg-[var(--color-on-surface)] opacity-60 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-[var(--color-on-surface)] rounded"></div>
                    <div className="h-4 w-20 bg-[var(--color-on-surface)] opacity-60 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          agreement.loanAgreement && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF Viewer Section */}
              <div className="space-y-4">
                {agreement?.loanAgreement?.unsignedData ? (
                  <div className="bg-[var(--color-surface)] backdrop-blur-sm border border-[var(--color-outline)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
                        <FaFileAlt className="h-4 w-4" />
                        Document Preview
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPdfExpanded(!pdfExpanded)}
                          className="p-2 rounded-md hover:bg-[var(--color-on-surface)]/10 transition-colors text-[var(--color-on-surface)] opacity-70 hover:opacity-100"
                          title={pdfExpanded ? "Minimize" : "Expand"}
                        >
                          {pdfExpanded ? (
                            <FaCompress className="h-4 w-4" />
                          ) : (
                            <FaExpand className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={`data:application/pdf;base64,${agreement.loanAgreement.unsignedData}`}
                          download="UnsignedLoanAgreement.pdf"
                          className="p-2 rounded-md hover:bg-[var(--color-on-surface)]/10 transition-colors text-[var(--color-primary)] hover:opacity-80"
                          title="Download PDF"
                        >
                          <FaDownload className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    <div
                      className={`overflow-hidden rounded-lg bg-[var(--color-background)] ${
                        pdfExpanded ? "aspect-[3/5]" : "aspect-[3/4]"
                      }`}
                    >
                      <iframe
                        src={`data:application/pdf;base64,${agreement.loanAgreement.unsignedData}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full border-0"
                        title="Loan Agreement PDF"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--color-surface)] opacity-50 border border-[var(--color-outline)] rounded-xl p-8 text-center">
                    <FaFileAlt className="text-[var(--color-on-surface)] opacity-50 text-6xl mb-4 mx-auto" />
                    <p className="text-[var(--color-on-surface)] font-medium">
                      No PDF available
                    </p>
                    <p className="text-[var(--color-on-surface)] opacity-70 text-sm">
                      The document is not yet generated
                    </p>
                  </div>
                )}
              </div>

              {/* Agreement Details Section */}
              <div className="space-y-4">
                {agreement.loanAgreement.loan && (
                  <div>
                    {/* HEADER: Sticky, compact single line for ID and Status */}
                    <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] z-10 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[var(--color-on-surface)]">
                          Loan Details
                        </span>
                        <span className="font-mono text-xs bg-[var(--color-surface-variant)] px-2 py-0.5 rounded text-[var(--color-on-surface)]">
                          {agreement.loanAgreement.loan.formattedLoanId}
                        </span>
                      </div>
                      <div>
                        {/* eslint-disable-next-line unicorn/prefer-string-replace-all */}
                        {agreement.loanAgreement.loan.status
                          ?.toLowerCase()
                          .replace(/_/g, " ")}
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div>
                      {/* SECTION 1: High Level Stats (3-Column Grid for Density) */}
                      <div className="grid grid-cols-3 gap-y-3 gap-x-2 bg-[var(--color-surface-variant)]/20 p-3 rounded-md border border-[var(--color-outline-variant)]/50">
                        <div>
                          <div className="text-[10px] uppercase text-[var(--color-on-surface)] opacity-50 font-semibold tracking-wide">
                            Loan Amount
                          </div>
                          <div className="font-semibold text-[var(--color-on-surface)]">
                            ₹
                            {agreement.loanAgreement.loan.amount?.toLocaleString(
                              "en-IN"
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-[var(--color-on-surface)] opacity-50 font-semibold tracking-wide">
                            Principal
                          </div>
                          <div className="font-semibold text-[var(--color-on-surface)]">
                            ₹
                            {agreement.loanAgreement.loan?.amount?.toLocaleString(
                              "en-IN"
                            ) || "N/A"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-[var(--color-on-surface)] opacity-50 font-semibold tracking-wide">
                            Duration
                          </div>
                          <div className="font-medium text-[var(--color-on-surface)]">
                            {
                              agreement.loanAgreement.loan.loanDetails
                                ?.durationDays
                            }{" "}
                            days
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase text-[var(--color-on-surface)] opacity-50 font-semibold tracking-wide">
                            Created
                          </div>
                          <div className="text-xs text-[var(--color-on-surface)]">
                            {
                              formatDateWithTime(
                                agreement.loanAgreement.loan.createdAt
                              ).split(",")[0]
                            }
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-[10px] uppercase text-[var(--color-on-surface)] opacity-50 font-semibold tracking-wide">
                            Due Date
                          </div>
                          <div>
                            {agreement.loanAgreement.loan.loanDetails?.dueDate
                              ? formatDateWithTime(
                                  agreement.loanAgreement.loan.loanDetails
                                    .dueDate
                                )
                              : "N/A"}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: Disbursement (Money In) */}
                      {agreement.loanAgreement.loan.disbursement && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px bg-[var(--color-outline-variant)] flex-1"></div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface)] opacity-70">
                              Disbursement
                            </h4>
                            <div className="h-px bg-[var(--color-outline-variant)] flex-1"></div>
                          </div>

                          <div className="space-y-1 text-xs">
                            {/* Top Line Summary */}
                            <div className="flex justify-between px-1">
                              <span className="opacity-70">Gross Amount</span>
                              <span className="font-medium">
                                ₹
                                {agreement.loanAgreement.loan.disbursement.grossAmount?.toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            </div>

                            {/* Detailed Deductions List */}
                            {((agreement.loanAgreement.loan.disbursement
                              .deductions?.length ?? 0) > 0 ||
                              agreement.loanAgreement.loan.disbursement
                                .processing_fee) && (
                              <div className="bg-[var(--color-surface-variant)]/30 rounded border border-[var(--color-outline-variant)]/50 p-2 my-1 space-y-2">
                                {agreement.loanAgreement.loan.disbursement.deductions?.map(
                                  (deduction) => (
                                    <div
                                      key={deduction.id}
                                      className="relative group"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="pr-2">
                                          <div className="font-medium text-[var(--color-on-surface)] capitalize leading-tight">
                                            {/* eslint-disable-next-line unicorn/prefer-string-replace-all */}
                                            {deduction.type
                                              ?.toLowerCase()
                                              .replace(/_/g, " ")}
                                          </div>
                                          <div className="text-[10px] text-[var(--color-on-surface)] opacity-50 leading-tight mt-0.5">
                                            {deduction.chargeValue}% (
                                            {deduction.calculationValueType}) •{" "}
                                            {deduction.chargeMode?.toLowerCase()}
                                            {deduction.isRecurringDaily &&
                                              " • Daily"}
                                            {deduction.calculationTaxAmount >
                                              0 &&
                                              ` • Tax: ₹${deduction.calculationTaxAmount?.toLocaleString(
                                                "en-IN"
                                              )}`}
                                          </div>

                                          {/* Nested Taxes */}
                                          {deduction.taxes &&
                                            deduction.taxes.length > 0 && (
                                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                {deduction.taxes.map((tax) => (
                                                  <span
                                                    key={tax.id}
                                                    className="text-[10px] text-[var(--color-on-surface)] opacity-40"
                                                  >
                                                    ↳ {tax.type} (
                                                    {tax.chargeValue}%): ₹
                                                    {tax.amount?.toLocaleString(
                                                      "en-IN"
                                                    )}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                        <span className="text-[var(--color-error)] font-medium whitespace-nowrap">
                                          -₹
                                          {deduction.total?.toLocaleString(
                                            "en-IN"
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}

                                {/* Processing Fee */}
                                {agreement.loanAgreement.loan.disbursement
                                  .processing_fee !== null && (
                                  <div className="flex justify-between items-start pt-1">
                                    <div className="text-[var(--color-on-surface)] text-xs">
                                      Processing Fee
                                    </div>
                                    <span className="text-[var(--color-error)] font-medium">
                                      -₹
                                      {agreement.loanAgreement.loan.disbursement.processing_fee?.toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="border-t border-dashed border-[var(--color-outline-variant)] mt-1 pt-1 flex justify-between">
                                  <span className="text-[10px] uppercase opacity-60">
                                    Total Deductions
                                  </span>
                                  <span className="text-[var(--color-error)] text-xs">
                                    -₹
                                    {agreement.loanAgreement.loan.disbursement.totalDeductions?.toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Net Result */}
                            <div className="flex justify-between items-center bg-[var(--color-success)]/5 px-2 py-1.5 rounded border border-[var(--color-success)]/20 mt-1">
                              <span className="font-semibold text-[var(--color-success)] uppercase text-[10px] tracking-wide">
                                Net Disbursement
                              </span>
                              <span className="font-bold text-[var(--color-success)]">
                                ₹
                                {agreement.loanAgreement.loan.disbursement.netAmount?.toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECTION 3: Repayment (Money Out) */}
                      {agreement.loanAgreement.loan.repayment && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 pt-2">
                            <div className="h-px bg-[var(--color-outline-variant)] flex-1"></div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface)] opacity-70">
                              Repayment
                            </h4>
                            <div className="h-px bg-[var(--color-outline-variant)] flex-1"></div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between px-1">
                              <span className="opacity-70">
                                Principal Repayment
                              </span>
                              <span className="font-medium">
                                ₹
                                {agreement.loanAgreement.loan?.amount?.toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            </div>

                            {/* Fee Breakdown */}
                            {agreement.loanAgreement.loan.repayment
                              .feeBreakdowns &&
                              agreement.loanAgreement.loan.repayment
                                .feeBreakdowns.length > 0 && (
                                <div className="bg-[var(--color-surface-variant)]/30 rounded border border-[var(--color-outline-variant)]/50 p-2 my-1 space-y-2">
                                  {agreement.loanAgreement.loan.repayment.feeBreakdowns.map(
                                    (fee) => (
                                      <div
                                        key={fee.id}
                                        className="flex justify-between items-start"
                                      >
                                        <div className="pr-2">
                                          <div className="font-medium text-[var(--color-on-surface)] capitalize leading-tight">
                                            {/* eslint-disable-next-line unicorn/prefer-string-replace-all */}
                                            {fee.type
                                              ?.toLowerCase()
                                              .replace(/_/g, " ")}
                                          </div>
                                          <div className="text-[10px] text-[var(--color-on-surface)] opacity-50 leading-tight mt-0.5">
                                            {fee.chargeValue}% (
                                            {fee.calculationValueType}) •{" "}
                                            {fee.chargeMode?.toLowerCase()}
                                            {fee.isRecurringDaily && " • Daily"}
                                            {fee.calculationTaxAmount > 0 &&
                                              ` • Tax: ₹${fee.calculationTaxAmount?.toLocaleString(
                                                "en-IN"
                                              )}`}
                                          </div>

                                          {/* Nested Taxes for Fees */}
                                          {fee.taxes &&
                                            fee.taxes.length > 0 && (
                                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                {fee.taxes.map((tax) => (
                                                  <span
                                                    key={tax.id}
                                                    className="text-[10px] text-[var(--color-on-surface)] opacity-40"
                                                  >
                                                    ↳ {tax.type} (
                                                    {tax.chargeValue}
                                                    %): ₹
                                                    {tax.amount?.toLocaleString(
                                                      "en-IN"
                                                    )}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                        <span className="text-[var(--color-on-surface)] font-medium whitespace-nowrap">
                                          +₹{fee.total?.toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    )
                                  )}
                                  <div className="border-t border-dashed border-[var(--color-outline-variant)] mt-1 pt-1 flex justify-between">
                                    <span className="text-[10px] uppercase opacity-60">
                                      Total Fees
                                    </span>
                                    <span className="text-[var(--color-on-surface)] text-xs">
                                      +₹
                                      {agreement.loanAgreement.loan.repayment.totalFees?.toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Total Obligation */}
                            <div className="flex justify-between items-center bg-[var(--color-surface-variant)] px-2 py-1.5 rounded border border-[var(--color-outline-variant)] mt-1">
                              <span className="font-semibold text-[var(--color-on-surface)] uppercase text-[10px] tracking-wide">
                                Total Obligation
                              </span>
                              <span className="font-bold text-[var(--color-on-surface)]">
                                ₹
                                {agreement.loanAgreement.loan.repayment.totalObligation?.toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Provider Selection & Actions */}
                {agreement.loanAgreement.status ===
                  AgreementStatusEnum.NOT_SENT && (
                  <div className="flex justify-end gap-3 items-center">
                    <Button
                      onClick={() => handleClose()}
                      disabled={sending}
                      variant="surface"
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <select
                      value={selectedProvider || ""}
                      onChange={(e) =>
                        setSelectedProvider(e.target.value as BrandProviderName)
                      }
                      className="px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    >
                      {signdeskProvider && (
                        <option value={BrandProviderName.SIGNDESK}>
                          SignDesk
                        </option>
                      )}
                      {signzyProvider && (
                        <option value={BrandProviderName.SIGNZY}>Signzy</option>
                      )}
                      {digitapProvider && (
                        <option value={BrandProviderName.DIGITAP}>
                          Digitap
                        </option>
                      )}
                    </select>
                    <Button
                      onClick={() => handleSendLoanAgreement()}
                      disabled={sending || !selectedProvider}
                      loading={sending}
                      className="px-6"
                    >
                      <FaArrowUpRightDots className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </Dialog>
  );
}
