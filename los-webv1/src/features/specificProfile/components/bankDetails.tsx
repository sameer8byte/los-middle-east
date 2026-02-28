import { useEffect, useState } from "react";
import { updateUserBankAccount } from "../../../redux/slices/bankAccount";
import { getAccount } from "../../../services/api/user-bank-account.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { user_bank_verification_status } from "../../../types/user-bank-account";
import { maskAccountNumber } from "../../../utils/utils";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

export function BankDetails() {
  const userData = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const userBankAccount = useAppSelector((state) => state.bankAccount);
  const { fetchSignedUrl, loading, error } = useAwsSignedUrl();
  
  

  const [bankStatement, setBankStatement] = useState<
    {
      id: string;
      userId: string;
      userBankAccountId: string;
      filePrivateKey: string;
      fromDate: Date;
      toDate: Date;
      createdAt: Date;
      updatedAt: Date;
      filePassword: string | null;
    }[]
  >([]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await getAccount(userData.user.userBankAccountId);
        if (response) {
          dispatch(updateUserBankAccount(response));
          setBankStatement(response.BankAccountStatement);
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    };
    if (userData.user.userBankAccountId) {
      fetchUserDetails();
    }
  }, [userData.user.userBankAccountId, dispatch]);

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-brand shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center mb-6">
        <svg
          className="w-8 h-8 mr-2 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
        <h2 className="text-2xl font-semibold text-on-surface">
          Bank Account Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <DetailItem
            label="Account Number"
            value={
              userBankAccount.accountNumber
                ? maskAccountNumber(userBankAccount.accountNumber)
                : "-"
            }
          />
          <DetailItem
            label="Account Name"
            value={userBankAccount.accountHolderName}
          />
          <DetailItem
            label="Account Type"
            value={userBankAccount.accountType}
          />
          <div className="p-3 bg-surface text-on-surface rounded-brand">
            <span className="text-sm font-medium text-primary">
              Account Status:
            </span>
            <span
              className={`ml-2 px-2 py-1 rounded ${
                userBankAccount.verificationStatus ===
                user_bank_verification_status.VERIFIED
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {userBankAccount.verificationStatus}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <DetailItem label="Bank Name" value={userBankAccount.bankName} />
          <DetailItem label="IFSC Code" value={userBankAccount.ifscCode} />
          <DetailItem
            label="Verification Method"
            value={userBankAccount.verificationMethod || "-"}
          />
        </div>
      </div>

      <div>
        <h3 className="mt-6 text-xl font-semibold text-on-surface">
          Bank Statements
        </h3>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error.message}
          </div>
        )}

        {bankStatement?.length > 0 ? (
          bankStatement.map((statement) => (
            <div
              key={statement.id}
              className="p-4 mb-4 bg-gray-50 rounded-brand shadow-sm"
            >
              {/* <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Statement Period:
                </span>
                <span className="text-sm text-gray-800 font-mono">
                  {new Date(statement.fromDate).toLocaleDateString()} -{" "}
                  {new Date(statement.toDate).toLocaleDateString()}
                </span>
              </div> */}
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-600">
                  File Id: #{statement.id.split("-")[0].toLocaleUpperCase()}
                </span>
                <button
                  onClick={() => {
                    fetchSignedUrl(statement.filePrivateKey);
                  }}
                  className="text-primary hover:underline"
                >
                  {loading ? (
                    <span className="loader"></span>
                  ) : (
                    "Download"
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No bank statements available.</p>
        )}
      </div>
    </div>
  );
}

// Reusable detail item component
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-brand">
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <span className="text-sm text-gray-800 font-mono">{value || "-"}</span>
    </div>
  );
}
