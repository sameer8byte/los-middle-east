import { useAppSelector } from "../../../redux/store";

export function Employment() {
  const userEmployment = useAppSelector((state) => state.employment);

    const formatCurrency = (val: number) => {
    const bhd = (val / 242).toFixed(2);
    return `BHD ${bhd}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          💼
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Employment Details
          </h3>
          <p className="text-sm text-gray-500">Your work information</p>
        </div>
      </div>

      {userEmployment ? (
        <div className="space-y-6">
          {/* Company Information */}
          <div className="border border-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-lg mr-2">🏢</span>
              Company Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmploymentField
                icon="🏷️"
                label="Company Name"
                value={userEmployment.companyName}
              />
              <EmploymentField
                icon="👔"
                label="Designation"
                value={userEmployment.designation}
              />
              <EmploymentField
                icon="📧"
                label="Official Email"
                value={userEmployment.officialEmail}
              />
            </div>
            <div className="mt-4">
              <EmploymentField
                icon="📍"
                label="Company Address"
                value={userEmployment.companyAddress}
                isAddress={true}
              />
            </div>
          </div>

          {/* Salary Information */}
          <div className="border border-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-lg mr-2">💰</span>
              Salary Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmploymentField
                icon="💵"
                label="Monthly Salary"
                value={
                  userEmployment.salary
                    ? `${formatCurrency(userEmployment.salary)}`
                    : undefined
                }
              />
              <EmploymentField
                icon="📅"
                label="Salary Date"
                value={
                  userEmployment.expectedDateOfSalary
                    ? `${userEmployment.expectedDateOfSalary}th of every month`
                    : undefined
                }
              />
            </div>
            <div className="mt-4">
              <EmploymentField
                icon="🏦"
                label="Payment Mode"
                value={userEmployment.modeOfSalary}
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="border border-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-lg mr-2">📋</span>
              Additional Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmploymentField
                icon="📅"
                label="Joining Date"
                value={
                  userEmployment.joiningDate
                    ? new Date(userEmployment.joiningDate).toLocaleDateString(
                        "en-IN"
                      )
                    : undefined
                }
              />
              <EmploymentField
                icon="🏛️"
                label="UAN Number"
                value={userEmployment.uanNumber}
              />
            </div>
            <div className="mt-4">
              <EmploymentField
                icon="📮"
                label="PIN Code"
                value={userEmployment.pinCode}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">💼</span>
          </div>
          <p className="text-gray-500">No employment information available</p>
        </div>
      )}
    </div>
  );
}

const EmploymentField = ({
  icon,
  label,
  value,
  isAddress = false,
}: {
  icon?: string;
  label: string;
  value: string | number | undefined | null;
  isAddress?: boolean;
}) => (
  <div className="group">
    <div className="flex items-center mb-1">
      {icon && <span className="text-sm mr-2">{icon}</span>}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
    </div>
    <p
      className={`text-gray-900 font-medium transition-colors duration-200 group-hover:text-purple-600 ${
        isAddress ? "text-sm leading-relaxed" : "text-base"
      }`}
    >
      {value || (
        <span className="text-gray-400 italic">Not provided</span>
      )}
    </p>
  </div>
);
