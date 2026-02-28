import { useAppSelector } from "../../../redux/store";
import { user_bank_verification_status } from "../../../types/user-bank-account";

export function UserBankAccount() {
  const userBankAccount = useAppSelector((state) => state.bankAccount);
 
  

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          🏦
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>
          <p className="text-sm text-gray-500">Your banking information</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="border border-gray-100 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="text-lg mr-2">💳</span>
            Account Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BankField
              icon="👤"
              label="Account Holder"
              value={userBankAccount.accountHolderName}
            />
            <BankField
              icon="🔢"
              label="Account Number"
              value={userBankAccount.accountNumber ? `****${userBankAccount.accountNumber.slice(-4)}` : undefined}
            />
          </div>
          <div className="mt-4">
            <BankField
              icon="📋"
              label="Account Type"
              value={userBankAccount.accountType}
            />
          </div>
        </div>

        {/* Bank Details */}
        <div className="border border-gray-100 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="text-lg mr-2">🏛️</span>
            Bank Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BankField
              icon="🏢"
              label="Bank Name"
              value={userBankAccount.bankName}
            />
            <BankField
              icon="🔍"
              label="IFSC Code"
              value={userBankAccount.ifscCode}
            />
          </div>
          <div className="mt-4">
            <BankField
              icon="📍"
              label="Bank Address"
              value={userBankAccount.bankAddress}
              isAddress={true}
            />
          </div>
        </div>

        {/* Verification Status */}
        <div className="border border-gray-100 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="text-lg mr-2">✅</span>
            Verification Status
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Account Status</p>
              <VerificationStatusBadge status={userBankAccount.verificationStatus
              || user_bank_verification_status.PENDING

              } />
            </div>
            {userBankAccount.verificationMethod && (
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Verification Method</p>
                <span className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                  {userBankAccount.verificationMethod.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const BankField = ({ 
  icon, 
  label, 
  value, 
  isAddress = false 
}: { 
  icon?: string;
  label: string; 
  value: string | undefined;
  isAddress?: boolean;
}) => (
  <div className="group">
    <div className="flex items-center mb-1">
      {icon && <span className="text-sm mr-2">{icon}</span>}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
    </div>
    <p className={`text-gray-900 font-medium transition-colors duration-200 group-hover:text-indigo-600 ${
      isAddress ? 'text-sm leading-relaxed' : 'text-base'
    }`}>
      {value || <span className="text-gray-400 italic">Not provided</span>}
    </p>
  </div>
);

const VerificationStatusBadge = ({
  status,
}: {
  status: user_bank_verification_status;
}) => {
  const getStatusConfig = (status: user_bank_verification_status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
        };
      case 'failed':
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '🏦',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </div>
  );
};