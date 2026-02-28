import { useState, FC, useEffect } from "react";
import { FiAlertTriangle, FiUpload, FiDownload, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { bulkDisbursementFromCsv, BulkDisbursementResult } from "../../../shared/services/api/payment.api";
import { useToast } from "../../../context/toastContext";
import { getBrandBankAccounts } from "../../../shared/services/api/settings/brandBankAccount.setting.api";
import { PartnerTabsEnum } from "../../../constant/enum";

interface BulkDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  brandId: string;
}

export const BulkDisbursementModal: FC<BulkDisbursementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  brandId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkDisbursementResult | null>(null);
  const [error, setError] = useState<string>("");
  const [brandBankAccounts, setBrandBankAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const { showSuccess, showError } = useToast();

  // Fetch brand bank accounts when modal opens
  useEffect(() => {
    if (isOpen && brandId) {
      fetchBrandBankAccounts();
    }
  }, [isOpen, brandId]);

  const fetchBrandBankAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accounts = await getBrandBankAccounts(brandId);
      setBrandBankAccounts(accounts || []);
    } catch (err) {
      console.error("Error fetching brand bank accounts:", err);
      showError("Error", "Failed to load brand bank accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      setError("");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedBankAccountId) {
      setError("Please select a brand bank account first");
      showError("Bank Account Required", "Please select a brand bank account before uploading");
      return;
    }

    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const response = await bulkDisbursementFromCsv(file);
      setResult(response);
      
      if (response.success) {
        showSuccess(
          "Bulk Disbursement Completed",
          `Successfully disbursed ${response.successful} out of ${response.total} loans`
        );
        onSuccess?.();
      } else {
        showError(
          "Partial Success",
          `${response.successful} succeeded, ${response.failed} failed. Check details below.`
        );
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to process bulk disbursement";
      setError(errorMessage);
      showError("Bulk Disbursement Failed", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    if (!selectedBankAccountId) {
      setError("Please select a brand bank account first");
      showError("Bank Account Required", "Please select a brand bank account before downloading the template");
      return;
    }

    setDownloadingTemplate(true);
    setError("");
    try {
      // Use selected bank account ID
      const exampleBankAccountId = selectedBankAccountId;
      
      // Fetch loans ready for disbursement
      const { getAllLoans } = await import("../../../shared/services/api/loan.api");
      const { LoanStatusEnum } = await import("../../../constant/enum");
      
      let csvContent = "formattedLoanId,method,externalRef,brandBankAccountId,disbursementDate\n";
      
      try {
        const response = await getAllLoans(
          brandId,
          PartnerTabsEnum.LOAN_OPS,
          { page: 1, limit: 100, dateFilter: "" },
          {
            status: JSON.stringify([
              LoanStatusEnum.APPROVED,
              LoanStatusEnum.SANCTION_MANAGER_APPROVED
            ]),
            loanAgreementStatus: '["SIGNED"]',
          }
        );
        
        if (response.loans && response.loans.length > 0) {
          // Add real loans to CSV
          response.loans.forEach((loan: any) => {
            const formattedLoanId = loan.formattedLoanId || loan.id;
            const today = new Date().toISOString().split('T')[0];
            csvContent += `${formattedLoanId},MANUAL,,${exampleBankAccountId},${today}\n`;
          });
          
          showSuccess(
            "Template Generated",
            `CSV template created with ${response.loans.length} loan(s) ready for disbursement`
          );
        } else {
          // No loans found, add example rows
          csvContent += `LOAN-001,MANUAL,,${exampleBankAccountId},2025-01-15\n`;
          csvContent += `LOAN-002,NEFT,,${exampleBankAccountId},\n`;
          
          showError(
            "No Loans Found",
            "No loans ready for disbursement. Template contains example data."
          );
        }
      } catch (fetchError) {
        console.error("Error fetching loans for template:", fetchError);
        // Fallback to example data
        csvContent += `LOAN-001,MANUAL,,${exampleBankAccountId},2025-01-15\n`;
        csvContent += `LOAN-002,NEFT,,${exampleBankAccountId},\n`;
        
        showError(
          "Error Fetching Loans",
          "Using example data in template. Fill in with actual loan IDs."
        );
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_disbursement_template_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating template:", error);
      showError("Error", "Failed to generate template. Please try again.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Disbursement"
      size="xl"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Instructions
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li><strong>First, select a brand bank account below</strong> (Required)</li>
            <li>Download the CSV template - it will contain <strong>real loans</strong> ready for disbursement</li>
            <li>The template is pre-filled with loan IDs, payment method (MANUAL), your selected bank account ID, and today's date</li>
            <li>Fill in the <strong>externalRef</strong> column with your transaction reference numbers</li>
            <li>Optionally update the method (MANUAL) and disbursementDate (YYYY-MM-DD)</li>
            <li>Upload the completed CSV file to process bulk disbursements</li>
          </ol>
        </div>

        {/* Brand Bank Account Selection - REQUIRED */}
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-xs font-bold">
              !
            </span>{" "}
            Select Brand Bank Account <span className="text-red-600">*</span>
          </h4>
          {loadingAccounts ? (
            <div className="flex items-center gap-2">
              <CgSpinner className="animate-spin w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">Loading bank accounts...</span>
            </div>
          ) : brandBankAccounts.length > 0 ? (
            <div className="space-y-2">
              <select
                value={selectedBankAccountId}
                onChange={(e) => {
                  setSelectedBankAccountId(e.target.value);
                  setError("");
                }}
                className="w-full px-3 py-2.5 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white text-sm"
              >
                <option value="">-- Select a Bank Account --</option>
                {brandBankAccounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber} (IFSC: {account.ifscCode})
                  </option>
                ))}
              </select>
              {selectedBankAccountId && (
                <div className="bg-white p-3 rounded border border-amber-200 text-xs">
                  <div className="font-medium text-gray-900 mb-1">Selected Account ID:</div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono text-gray-700">
                    {selectedBankAccountId}
                  </code>
                  <div className="text-gray-600 mt-2 text-xs">
                    This account will be used for all disbursements in the CSV
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-amber-700">
              No brand bank accounts found. Please add a bank account in settings first.
            </div>
          )}
        </div>

        {/* Download Template */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              disabled={downloadingTemplate || loadingAccounts || !selectedBankAccountId}
              leftIcon={downloadingTemplate ? <CgSpinner className="w-4 h-4 animate-spin" /> : <FiDownload className="w-4 h-4" />}
            >
              {downloadingTemplate ? "Generating Template..." : "Download CSV Template"}
            </Button>
            {downloadingTemplate && (
              <span className="text-sm text-gray-600 ml-2">
                Fetching loans ready for disbursement...
              </span>
            )}
          </div>
          {!selectedBankAccountId && (
            <p className="text-xs text-amber-600">
              ⚠️ Please select a bank account above to download the template
            </p>
          )}
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label
                htmlFor="csv-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)]"
              >
                Choose CSV File{" "}
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={uploading}
                />
              </label>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold">{result.total}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Successful</div>
                <div className="text-2xl font-bold text-green-600">{result.successful}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h4 className="text-sm font-medium">Detailed Results</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.results.map((item, index) => (
                      <tr key={`${item.formattedLoanId}-${index}`} className={item.success ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {item.success ? (
                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <FiXCircle className="w-5 h-5 text-red-600" />
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">
                          {item.formattedLoanId}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600">
                          {item.error || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleClose}
            disabled={uploading}
            variant="outline"
            className="flex-1"
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedBankAccountId}
              variant="primary"
              className="flex-1"
            >
              {uploading ? (
                <>
                  <CgSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : !selectedBankAccountId ? (
                'Select Bank Account First'
              ) : (
                'Upload & Process'
              )}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
