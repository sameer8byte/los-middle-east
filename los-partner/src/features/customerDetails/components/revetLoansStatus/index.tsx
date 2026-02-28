import { toast } from "react-toastify";
import { useQueryParams } from "../../../../hooks/useQueryParams";
import { useState } from "react";
 import { useParams } from "react-router-dom";
import Dialog from "../../../../common/dialog";
import { revertLoanStatus } from "../../../../shared/services/api/loan.api";

export function RevetLoansStatus() {
    const { brandId } = useParams<{ brandId: string }>();
    const {
        getQuery,
        removeQuery,
    } = useQueryParams();
    
    const [loading, setLoading] = useState(false);
    const revetLoanId = getQuery("revetLoanId");

    const handleRevertLoan = async (loanId: string) => {
        if (!loanId) {
            toast.error("Loan ID is required to revert loan status");
            return;
        }
        
        if (!brandId) {
            toast.error("Brand ID is required to revert loan status");
            return;
        }

        setLoading(true);
        try {
            const response = await revertLoanStatus(brandId, loanId);
            
            if (response.success) {
                toast.success("Loan status reverted successfully");
                removeQuery("revetLoanId");
            } else {
                toast.error(response.error || "Failed to revert loan status");
                console.error("Failed to revert loan status:", response.error);
            }
        } catch (error) {
            console.error("Error reverting loan status:", error);
            toast.error("An error occurred while reverting loan status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={!!revetLoanId}
            onClose={() => removeQuery("revetLoanId")}
            title="Revert Loan Status"
        >
            <div className="p-4">
                <p className="text-[var(--color-on-surface)] opacity-80 mb-4">
                    Are you sure you want to revert the status of this loan?
                </p>
                <div className="flex justify-end space-x-2">
                    <button
                        className="bg-[var(--color-primary)] bg-opacity-100 hover:bg-[var(--color-primary)] text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        onClick={() => handleRevertLoan(revetLoanId!)}
                        disabled={loading}
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {loading ? "Reverting..." : "Confirm"}
                    </button>
                    <button
                        className="bg-[var(--color-muted)] bg-opacity-50 hover:bg-[var(--color-muted)] text-[var(--color-on-surface)] opacity-80 px-4 py-2 rounded"
                        onClick={() => removeQuery("revetLoanId")}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Dialog>
    );
}