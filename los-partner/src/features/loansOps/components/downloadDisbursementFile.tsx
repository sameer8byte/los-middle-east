import { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import { LoanXlsxFileType, PartnerUserRoleEnum } from "../../../constant/enum";
import { postLoansXlsx, postLoansCsv, getSignedAgreementLoansForDownload } from "../../../shared/services/api/loan.api";
import { getBrandBankAccounts } from "../../../shared/services/api/settings/brandBankAccount.setting.api";
import { Loan } from "../../../shared/types/loan";

enum FileFormat {
  CSV = "CSV",
  XLSX = "XLSX"
}

export function DownloadDisbursementFile({
  downloadLoanId,
  setDownloadLoanId

}:{
  downloadLoanId: string;
  setDownloadLoanId: (id: string | null) => void;
}) {
  const { brandId } = useParams();
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingAllLoans, setIsLoadingAllLoans] = useState(false);
  const [error, setError] = useState("");
  const [brandBankAccountId, setBrandBankAccountId] = useState("");
  const [fileFormat, setFileFormat] = useState<FileFormat>(FileFormat.XLSX);
  const [fileType, setFileType] = useState<LoanXlsxFileType>(
    LoanXlsxFileType.PAYOUT
  );
  const [brandBankAccount, setBrandBankAccount] = useState<
    {
      id: string;
      brandId: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName: string;
      upiId: string;
      isPrimaryAccount: boolean;
      isActive: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (!downloadLoanId) return;
    if (!brandId) return;
    setLoading(true);

    const fetchBrandBanks = async () => {
      try {
        const response = await getBrandBankAccounts(brandId as string);
        setBrandBankAccount(response);
      } catch (error) {
        console.error("Error fetching CSV data:", error);
        setError("Failed to load bank accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchBrandBanks();
  }, [brandId, downloadLoanId]);

  // Fetch all loans when "all" is selected
  useEffect(() => {
    if (downloadLoanId === "all" && brandId) {
      fetchAllLoans();
    }
  }, [downloadLoanId, brandId]);

  const fetchAllLoans = async () => {
    if (!brandId) return;
    
    setIsLoadingAllLoans(true);
    setError("");
    
    try {
      const response = await getSignedAgreementLoansForDownload(
        brandId,
        PartnerUserRoleEnum.LOAN_OPS
      );
      
      const loansData = response.loans || response.data || response;
      setAllLoans(loansData);
      setSelectedLoan(loansData);
    } catch (error) {
      console.error("Error fetching all loans:", error);
      setError("Failed to load all loans. Please try again.");
    } finally {
      setIsLoadingAllLoans(false);
    }
  };

  async function handleDownloadCSV() {
    if (!brandId || !brandBankAccountId || !fileType) return;

    if (!downloadLoanId) {
      setError("Loan ID is required to download the file");
      return;
    }
    setError("");
    setIsDownloading(true);

    try {
      const payload = {
        loanIds: selectedLoan.map((loan) => loan.id),
        brandId: brandId,
        brandBankAccountId: brandBankAccountId,
        fileType: fileType,
      };

      const response = fileFormat === FileFormat.CSV 
        ? await postLoansCsv(brandId, payload)
        : await postLoansXlsx(brandId, payload);

      if (!response) {
        setError(response.message);
        return;
      }
      const url = response.url;
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileType}_template.${fileFormat === FileFormat.CSV ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      setError((error as Error).message || "Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog
      title="Download Disbursement File"
      isOpen={!!downloadLoanId}
      onClose={() => 
        setDownloadLoanId(null)
      }
    >
      <div className="space-y-4">
        {downloadLoanId === "all" ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[var(--color-on-surface)]">
                  Select Loans ({selectedLoan.length}/{allLoans.length})
                </label>
                {!isLoadingAllLoans && allLoans.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedLoan.length === allLoans.length) {
                        setSelectedLoan([]);
                      } else {
                        setSelectedLoan(allLoans);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-on-primary)] hover:bg-opacity-20 transition-colors"
                  >
                    {selectedLoan.length === allLoans.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {isLoadingAllLoans ? (
                <div className="h-32 border border-[var(--color-muted)] border-opacity-30 rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-sm text-[var(--color-on-surface)] opacity-80">
                      Loading loans...
                    </span>
                  </div>
                </div>
              ) : (
              <div className="max-h-40 overflow-y-auto border border-[var(--color-muted)] border-opacity-30 rounded-lg">
                {allLoans.length > 0 && (
                  <div className="px-3 py-2 bg-[var(--color-surface)] bg-opacity-30 border-b border-[var(--color-muted)] border-opacity-20 flex items-center justify-between text-xs text-[var(--color-on-surface)] opacity-70">
                    <span>Loan ID</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Payout</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Beneficiary</span>
                      </div>
                    </div>
                  </div>
                )}

                {allLoans.map((loan: Loan) => {
                  const hasPayoutFile = loan.xlsxFiles?.some(
                    (file: any) => file.fileType === LoanXlsxFileType.PAYOUT
                  );
                  const hasBeneficiaryFile = loan.xlsxFiles?.some(
                    (file: any) => file.fileType === LoanXlsxFileType.BENEFICIARY
                  );
                  return (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-surface)] hover:bg-opacity-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedLoan.some((l) => l.id === loan.id)}
                          onChange={() => {
                            setSelectedLoan((prev) =>
                              prev.some((l) => l.id === loan.id)
                                ? prev.filter((l) => l.id !== loan.id)
                                : [...prev, loan]
                            );
                          }}
                          className="h-4 w-4 text-[var(--color-primary)] rounded border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-[var(--color-on-surface)]">
                          {loan.formattedLoanId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${hasPayoutFile ? 'bg-green-500' : 'bg-red-500'}`} title={hasPayoutFile ? 'Payout file available' : 'No payout file'}></div>
                        <div className={`w-2 h-2 rounded-full ${hasBeneficiaryFile ? 'bg-green-500' : 'bg-red-500'}`} title={hasBeneficiaryFile ? 'Beneficiary file available' : 'No beneficiary file'}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[var(--color-surface)] bg-opacity-30 rounded-lg">
              <label className="text-sm font-medium text-[var(--color-on-surface)] mb-2 block">
                Selected Loan
              </label>
              {selectedLoan.map((loan: Loan) => {
                const hasPayoutFile = loan.xlsxFiles?.some(
                  (file: any) => file.fileType === LoanXlsxFileType.PAYOUT
                );
                const hasBeneficiaryFile = loan.xlsxFiles?.some(
                  (file: any) => file.fileType === LoanXlsxFileType.BENEFICIARY
                );
                return (
                  <div key={loan.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                        {loan.formattedLoanId}
                      </span>
                      {loan?.isMigratedloan && (
                        <span className="inline-flex items-center bg-[var(--color-warning)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-warning)] rounded">
                          Migrated
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasPayoutFile ? 'bg-green-500' : 'bg-red-500'}`} title={hasPayoutFile ? 'Payout file available' : 'No payout file'}></div>
                      <div className={`w-2 h-2 rounded-full ${hasBeneficiaryFile ? 'bg-green-500' : 'bg-red-500'}`} title={hasBeneficiaryFile ? 'Beneficiary file available' : 'No beneficiary file'}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Spinner theme="light" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                    File Format <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-[var(--color-surface)] bg-opacity-50"
                    value={fileFormat}
                    onChange={(e) => setFileFormat(e.target.value as FileFormat)}
                  >
                    <option value={FileFormat.XLSX}>Excel (.xlsx)</option>
                    <option value={FileFormat.CSV}>CSV (.csv)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                    Bank Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-[var(--color-surface)] bg-opacity-50"
                    value={brandBankAccountId}
                    onChange={(e) => setBrandBankAccountId(e.target.value)}
                  >
                    <option value="">Select Bank Account</option>
                    {brandBankAccount.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName} - {account.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                    File Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-[var(--color-surface)] bg-opacity-50"
                    value={fileType}
                    onChange={(e) =>
                      setFileType(e.target.value as LoanXlsxFileType)
                    }
                  >
                    {Object.values(LoanXlsxFileType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-md text-[var(--color-on-error)] text-sm">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <span className="block">{error}</span>
                      {downloadLoanId === "all" && error.includes("Failed to load all loans") && (
                        <button
                          onClick={fetchAllLoans}
                          disabled={isLoadingAllLoans}
                          className="text-xs underline hover:no-underline disabled:opacity-50 mt-1"
                        >
                          {isLoadingAllLoans ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => 
                    setDownloadLoanId(null)
                  }
                  className="flex-1 px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-md text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] hover:bg-opacity-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadCSV}
                  disabled={!brandBankAccountId || !fileType || isDownloading || selectedLoan.length === 0}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-muted)] disabled:opacity-75 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  {isDownloading ? (
                    <>
                      <Spinner theme="light" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>Download {fileFormat === FileFormat.XLSX ? "Excel" : "CSV"}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
      </div>
    </Dialog>
  );
}
