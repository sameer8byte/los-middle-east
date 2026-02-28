import { useAppSelector } from "../../../redux/store";

export function Profile() {
  const userDetails = useAppSelector((state) => state.userDetails);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          👤
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Personal Information
          </h3>
          <p className="text-sm text-gray-500">Your personal details</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProfileField
            icon="👨‍👦"
            label="Father's Name"
            value={userDetails.fathersName}
          />
          <ProfileField
            icon="📝"
            label="Middle Name"
            value={userDetails.middleName}
          />
        </div>

        <ProfileField
          icon="🏷️"
          label="Last Name"
          value={userDetails.lastName}
        />

        {/* Address Section */}
        <div className="border-t border-gray-100 pt-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="text-lg mr-2">🏠</span>
            Address Information
          </h4>
          <div className="space-y-3">
            <ProfileField
              label="Address"
              value={userDetails.address}
              isAddress={true}
            />
            <div className="grid grid-cols-2 gap-4">
              <ProfileField label="City" value={userDetails.city} />
              <ProfileField label="State" value={userDetails.state} />
            </div>
            <ProfileField label="Pincode" value={userDetails.pincode} />
          </div>
        </div>
      </div>
    </div>
  );
}

const ProfileField = ({
  icon,
  label,
  value,
  isAddress = false,
}: {
  icon?: string;
  label: string;
  value: string | null | undefined;
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
      className={`text-gray-900 font-medium transition-colors duration-200 group-hover:text-blue-600 ${
        isAddress ? "text-sm leading-relaxed" : "text-base"
      }`}
    >
      {value || (
        <span className="text-gray-400 italic">Not provided</span>
      )}
    </p>
  </div>
);