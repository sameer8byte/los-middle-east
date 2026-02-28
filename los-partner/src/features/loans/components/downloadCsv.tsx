import { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";

import { LoanXlsxFileType } from "../../../constant/enum";
import { postLoansXlsx } from "../../../shared/services/api/loan.api";
import { getBrandBankAccounts } from "../../../shared/services/api/settings/brandBankAccount.setting.api";
import { Loan } from "../../../shared/types/loan";

export function DownloadCsv({ loans }: { loans: Loan[] }) {
  const { brandId } = useParams();
  const { getQuery, removeQuery } = useQueryParams();
  const downloadLoanId = getQuery("downloadLoanId");
  const [selectedLoan, setSelectedLoan] = useState<Loan[]>(
    downloadLoanId === "all"
      ? loans
      : loans.filter((loan) => loan.id === downloadLoanId)
  );
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [brandBankAccountId, setBrandBankAccountId] = useState("");
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

  async function handleDownloadCSV() {
    if (!brandId || !brandBankAccountId || !fileType) return;

    if (!downloadLoanId) {
      setError("Loan ID is required to download the CSV");
      return;
    }
    setError("");
    setIsDownloading(true);

    try {
      const response = await postLoansXlsx(brandId, {
        loanIds: selectedLoan.map((loan) => loan.id),
        brandId: brandId,
        brandBankAccountId: brandBankAccountId,
        fileType: fileType,
      });
      if (!response) {
        setError(response.message);
        return;
      }
      const url = response.url;
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      setError((error as Error).message || "Failed to download CSV");
    } finally {
      setIsDownloading(false);
    }
  }


 
     return (
      <div>
      <Dialog
        title="Download CSV"
        isOpen={!!downloadLoanId}
        onClose={() => removeQuery("downloadLoanId")}
      >
        <div>
          {downloadLoanId === "all" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                Select Loans to Download ({loans.length} loans)
              </label>
              <div className="max-h-48 overflow-y-auto border border-[var(--color-muted)] border-opacity-30 rounded-lg p-2">
                <div className="flex items-center space-x-2 p-2 hover:bg-[var(--color-background)]">
                  <input
                    type="checkbox"
                    checked={selectedLoan.length === loans.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLoan(loans);
                      } else {
                        setSelectedLoan([]);
                      }
                    }}
                    className="h-4 w-4 text-[var(--color-on-primary)] rounded border-[var(--color-muted)] border-opacity-50 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                {loans.map((loan) => (
                  <div key={loan.id} className="flex items-center space-x-2 p-2 hover:bg-[var(--color-background)]">
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
                      className="h-4 w-4 text-[var(--color-on-primary)] rounded border-[var(--color-muted)] border-opacity-50 focus:ring-blue-500"
                    />
                    <span className="text-sm text-[var(--color-on-surface)] opacity-80">
                      {/* #{loan.id.split("-")[0].toLocaleUpperCase()} */}
                      {loan.formattedLoanId}


                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
                    <Spinner theme='light' />
            </div>
          ) : (
            <>
              <div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    Bank Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    File Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                <div className="p-3 bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-md flex items-center text-[var(--color-on-error)] text-sm">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleDownloadCSV}
                disabled={!brandBankAccountId || !fileType || isDownloading}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-muted)] disabled:opacity-75 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                          <Spinner theme='light' />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download CSV</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
