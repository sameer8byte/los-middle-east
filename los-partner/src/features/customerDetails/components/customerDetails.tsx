import { useEffect, useState, useCallback } from "react";
import { Conversion } from "../../../utils/conversion";
import { useParams } from "react-router-dom";
import { FiCopy, FiMonitor } from "react-icons/fi";
import {
  GenderEnum,
  getUserStatusDisplay,
  MaritalStatusEnum,
} from "../../../constant/enum";
import { formatDate } from "../../../lib/utils";
import { Address } from "./address";
import {
  getCustomerDetails,
  getCustomerAlternatePhoneLoans,
  getCustomerById,
  getCustomerEmployment,
  fetchPhoneAgeApi,
  getCustomerDeviceInfo,
  updateResidenceType,
  updateReligion,
  updateMaritalStatus,
  updateDateOfBirth,
  updateGender,
  checkIpAddressAssociation,
  updateAlternatePhone1,
  updateAlternatePhone2,
} from "../../../shared/services/api/customer.api";
import { useToast } from "../../../context/toastContext";
import dayjs from "dayjs";
import { useAppSelector } from "../../../shared/redux/store";
import { MdContentCopy, MdVerified } from "react-icons/md";
import { FaCheckCircle, FaUser, FaMobileAlt, FaLink } from "react-icons/fa";
import { Customer } from "../../../shared/types/customers";
import { UserStatusReasonsDialog } from "./UserStatusReasonsDialog";
import { AlternatePhoneNumbers } from "./alternatePhoneNumbers";
import { Button } from "../../../common/ui/button";
import { ensureS3Url } from "../../../constant/s3Config";

interface AlternatePhoneLoan {
  loanId: string;
  formattedLoanId: string;
  amount: number;
  status: string;
  createdAt: string;
  matchedUser: {
    id: string;
    formattedUserId: string;
    phoneNumber: string;
    name: string;
  };
  viaAlternatePhone: {
    phone: string;
    name: string;
    relationship: string;
  };
}

interface AlternatePhoneLoansResponse {
  hasAlternateNumbers: boolean;
  alternatePhoneCount: number;
  alternatePhoneNumbers: Array<{
    phone: string;
    name: string;
    relationship: string;
  }>;
  loansViaAlternateNumbers: AlternatePhoneLoan[];
  originalUserName: string;
}

interface DeviceInfo {
  deviceType: string;
  ipAddress: string;
  osType: string;
}

interface IpCheckResponse {
  success: boolean;
  ipAddress: string;
  deviceInfo: {
    deviceType: string;
    osType: string;
  };
  associatedUsers: Array<{
    userId: string;
    formattedUserId: string;
    email?: string;
    phoneNumber?: string;
  }>;
  count: number;
  summary: string;
  message?: string;
}

export function CustomerDetails() {
  const { brandId, customerId } = useParams();
  const auth = useAppSelector((state) => state.auth.data);
  const [customerDetails, setCustomerDetails] = useState<null | {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    middleName: string;
    gender: GenderEnum;
    dateOfBirth: Date;
    profilePicUrl: string;
    profileVideoUrl: string;
    address: string;
    aAdharName?: string;
    aAdharDOB?: Date;
    city: string;
    state: string;
    pincode: string;
    maritalStatus: MaritalStatusEnum;
    spouseName: string;
    fathersName: string;
    mothersName: string;
    isCommunicationAddress: boolean;
    userDataStatus: string;
    religion: string;
    residenceType: string;
    filePrivateKey: string;
    addressProofType: string;
    creditScore: number;
    createdAt: Date;
    updatedAt: Date;
    subdomain?: string;
    marketingSource?: string;

  }>(null);
  const [customer, setCustomer] = useState<null | Customer>(null);
  const [employment, setEmployment] = useState<{ salary?: number } | null>(
    null,
  );
  const [phoneAge, setPhoneAge] = useState<number | null>(null);
  const [showAge, setShowAge] = useState(false);
  const [isPhoneAgeLoading, setIsPhoneAgeLoading] = useState(false);
  const [isUserStatusReasonsDialogOpen, setIsUserStatusReasonsDialogOpen] =
    useState(false);

  // Device info states
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoadingDeviceInfo, setIsLoadingDeviceInfo] = useState(false);

  // Residence type edit states
  const [isEditingResidenceType, setIsEditingResidenceType] = useState(false);
  const [editResidenceType, setEditResidenceType] = useState("");
  const [isUpdatingResidenceType, setIsUpdatingResidenceType] = useState(false);

  // Religion edit states
  const [isEditingReligion, setIsEditingReligion] = useState(false);
  const [editReligion, setEditReligion] = useState("");
  const [isUpdatingReligion, setIsUpdatingReligion] = useState(false);

  // Marital status edit states
  const [isEditingMaritalStatus, setIsEditingMaritalStatus] = useState(false);
  const [editMaritalStatus, setEditMaritalStatus] = useState("");
  const [isUpdatingMaritalStatus, setIsUpdatingMaritalStatus] = useState(false);

  // Date of birth edit states
  const [isEditingDateOfBirth, setIsEditingDateOfBirth] = useState(false);
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [isUpdatingDateOfBirth, setIsUpdatingDateOfBirth] = useState(false);

  // Gender edit states
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [editGender, setEditGender] = useState("");
  const [isUpdatingGender, setIsUpdatingGender] = useState(false);

  // Alternate phone 1 edit states
  const [isEditingAlternatePhone1, setIsEditingAlternatePhone1] = useState(false);
  const [editAlternatePhone1, setEditAlternatePhone1] = useState("");
  const [isUpdatingAlternatePhone1, setIsUpdatingAlternatePhone1] = useState(false);

  // Alternate phone 2 edit states
  const [isEditingAlternatePhone2, setIsEditingAlternatePhone2] = useState(false);
  const [editAlternatePhone2, setEditAlternatePhone2] = useState("");
  const [isUpdatingAlternatePhone2, setIsUpdatingAlternatePhone2] = useState(false);

  // IP check states
  const [ipCheckData, setIpCheckData] = useState<IpCheckResponse | null>(null);
  const [alternatePhoneLoans, setAlternatePhoneLoans] =
    useState<AlternatePhoneLoansResponse>({
      hasAlternateNumbers: false,
      alternatePhoneCount: 0,
      alternatePhoneNumbers: [],
      loansViaAlternateNumbers: [],
      originalUserName: "",
    });

  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedFormattedId, setCopiedFormattedId] = useState(false);

  // Fetch device info function
  const fetchDeviceInfo = async () => {
    if (!customerId || !brandId) return;

    setIsLoadingDeviceInfo(true);
    try {
      const response = await getCustomerDeviceInfo(customerId, brandId);

      // Handle both response formats
      if (response?.success && response?.data?.deviceType) {
        setDeviceInfo(response.data);
      } else if (response?.deviceType) {
        setDeviceInfo({
          deviceType: response.deviceType,
          ipAddress: response.ipAddress,
          osType: response.osType,
        });
      } else {
        setDeviceInfo({
          osType: "",
          deviceType: "",
          ipAddress: "",
        });
      }
    } catch (error) {
      console.error("Error fetching device info:", error);
      setDeviceInfo({
        osType: "",
        deviceType: "",
        ipAddress: "",
      });
    } finally {
      setIsLoadingDeviceInfo(false);
    }
  };

  // Fetch IP check data - Now runs automatically on component load
  const fetchIpCheck = async () => {
    if (!customerId || !brandId) {
      return;
    }

    try {
      const response = await checkIpAddressAssociation(customerId, brandId);

      if (response.success === false) {
        // Don't show error for no IP found, just return
        setIpCheckData(response);
        return;
      }

      setIpCheckData(response);

      // Update device info with data from IP check response
      if (response.deviceInfo) {
        setDeviceInfo((prev) => ({
          ...(prev || {
            osType: "",
            deviceType: "",
            ipAddress: "",
          }),
          deviceType: response.deviceInfo.deviceType,
          osType: response.deviceInfo.osType,
          ipAddress: response.ipAddress,
        }));
      }
    } catch (error) {
      console.error("Error checking IP association:", error);
      // Don't show error toast for automatic check
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (customerId && brandId) {
          const [customerData, loansResponse, employmentData] =
            await Promise.all([
              getCustomerDetails(customerId, brandId),
              getCustomerAlternatePhoneLoans(customerId, brandId),
              getCustomerEmployment(customerId, brandId),
            ]);
          setCustomerDetails(customerData);
          setAlternatePhoneLoans(
            loansResponse || {
              hasAlternateNumbers: false,
              alternatePhoneCount: 0,
              alternatePhoneNumbers: [],
              loansViaAlternateNumbers: [],
              originalUserName: "",
            },
          );
          setEmployment(employmentData);

          // Fetch device info and IP check
          await fetchDeviceInfo();
          await fetchIpCheck();
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        setAlternatePhoneLoans({
          hasAlternateNumbers: false,
          alternatePhoneCount: 0,
          alternatePhoneNumbers: [],
          loansViaAlternateNumbers: [],
          originalUserName: "",
        });
        setEmployment(null);
      }
    };
    fetchData();
  }, [brandId, customerId]);

  // Add helper functions for device info
  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <FiMonitor className="w-3 h-3" />;

    const lowerType = deviceType.toLowerCase();
    if (lowerType.includes("mobile") || lowerType.includes("phone")) {
      return <FaMobileAlt className="w-3 h-3" />;
    }
    return <FiMonitor className="w-3 h-3" />;
  };

  const formatDeviceType = (deviceType?: string) => {
    if (!deviceType) return "Unknown";

    const lowerType = deviceType.toLowerCase();
    if (lowerType.includes("mobile")) return "Mobile";
    if (lowerType.includes("android")) return "Android";
    if (lowerType.includes("ios")) return "iOS";
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  };

  // Update copyCustomerInfo to include device info
  const copyCustomerInfo = useCallback(() => {
    if (!customerDetails) return;

    const fullName = [
      customerDetails.firstName,
      customerDetails.middleName,
      customerDetails.lastName,
    ]
      .filter((part) => part?.trim())
      .join(" ");

    const alternateLoansText =
      alternatePhoneLoans?.loansViaAlternateNumbers?.length > 0
        ? `🔗 Alternate Phone Loans (${alternatePhoneLoans.loansViaAlternateNumbers?.length
        }):
${alternatePhoneLoans.loansViaAlternateNumbers
          .map(
            (loan) =>
              `   • ${loan.formattedLoanId} (${loan.viaAlternatePhone.phone} - ${loan.viaAlternatePhone.relationship}) - ${loan.status}`,
          )
          .join("\n")}
━━━━━━━━━━━━━━━━━━━━━━`
        : "";

    // Add device info to copy text
    const deviceInfoText = deviceInfo?.deviceType
      ? `📱 Device Information:
   Type: ${formatDeviceType(deviceInfo.deviceType)}
   ${deviceInfo.ipAddress ? `IP Address: ${deviceInfo.ipAddress}` : ""}
   ${deviceInfo.osType ? `OS: ${deviceInfo.osType}` : ""}
━━━━━━━━━━━━━━━━━━━━━━`
      : "📱 Device Information: No device data available\n━━━━━━━━━━━━━━━━━━━━━━";

    // Add IP check info if available
    const ipCheckText =
      ipCheckData && ipCheckData.success
        ? `🔍 IP Address Check:
   IP: ${ipCheckData.ipAddress}
   Associated Accounts: ${ipCheckData.count}
   ${ipCheckData.associatedUsers.length > 0
          ? `Linked IDs: ${ipCheckData.associatedUsers.map((user) => user.formattedUserId).join(", ")}`
          : "No other accounts linked"
        }
━━━━━━━━━━━━━━━━━━━━━━`
        : "";

    const copyText = `📋 Customer Profile Information
━━━━━━━━━━━━━━━━━━━━━━
👤 Full Name: ${fullName}
${customerDetails.aAdharName
        ? `📄 Aadhaar Name: ${customerDetails.aAdharName}\n`
        : ""
      }━━━━━━━━━━━━━━━━━━━━━━
${alternateLoansText}
${deviceInfoText}
${ipCheckText}
👤 Personal Details:
   Gender: ${customerDetails.gender || "N/A"}
   Date of Birth: ${formatDate(customerDetails.dateOfBirth)}
   ${customerDetails.aAdharDOB
        ? `Aadhaar DOB: ${formatDate(customerDetails.aAdharDOB)}\n   `
        : ""
      }Marital Status: ${customerDetails.maritalStatus || "N/A"}
   ${customerDetails.maritalStatus === MaritalStatusEnum.MARRIED &&
        customerDetails.spouseName
        ? `Spouse: ${customerDetails.spouseName}\n   `
        : ""
      }Father's Name: ${customerDetails.fathersName || "N/A"}
   ${customerDetails.mothersName
        ? `Mother's Name: ${customerDetails.mothersName}\n   `
        : ""
      }Religion: ${customerDetails.religion || "N/A"}
   Residence Type: ${customerDetails.residenceType || "N/A"}
━━━━━━━━━━━━━━━━━━━━━━
📍 Address Details:
   ${customerDetails.address || "N/A"}
   City: ${customerDetails.city || "N/A"}
   State: ${customerDetails.state || "N/A"}
   Pincode: ${customerDetails.pincode || "N/A"}
━━━━━━━━━━━━━━━━━━━━━━
📊 Other Details:
   Credit Score: ${customerDetails.creditScore || "N/A"}
   ${employment?.salary
        ? `Employment Salary: ${Conversion.formatCurrency(employment.salary, "BHD")}\n   `
        : ""
      }Status: ${customerDetails.userDataStatus || "N/A"}
   ${customerDetails.addressProofType
        ? `Address Proof: ${customerDetails.addressProofType}\n   `
        : ""
      }Created: ${formatDate(customerDetails.createdAt)}
   Updated: ${formatDate(customerDetails.updatedAt)}
═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${auth.name
      }) -  ${auth?.role || "N/A"}
---- LOAN COMPLETED ----
═══════════════════════════════`;

    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        setCopied(true);
        showSuccess(
          "Copied!",
          "Customer profile information copied to clipboard",
        );
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  }, [
    customerDetails,
    alternatePhoneLoans,
    deviceInfo,
    ipCheckData,
    showSuccess,
    auth,
  ]);

  const fetchPhoneAge = async (phoneNumber?: string) => {
    if (!phoneNumber || !customerId || !brandId) {
      console.warn("Missing phoneNumber, customerId, or brandId");
      return;
    }

    setIsPhoneAgeLoading(true);
    try {
      const age = await fetchPhoneAgeApi(phoneNumber, customerId, brandId);
      setPhoneAge(age);
    } catch {
      setPhoneAge(null);
    } finally {
      setIsPhoneAgeLoading(false);
      setShowAge(true);
    }
  };

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        if (customerId && brandId) {
          const response = await getCustomerById(customerId, brandId);
          setCustomer(response);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };
    fetchCustomerData();
  }, [brandId, customerId]);

  const handleUserStatusReasonsSuccess = async () => {
    const freshCustomer = await getCustomerById(customerId!, brandId!);
    setCustomer(freshCustomer);
  };

  const handleCopyId = async () => {
    if (customer?.id) {
      try {
        await navigator.clipboard.writeText(customer.id.toUpperCase());

        setCopiedId(true);

        setTimeout(() => setCopiedId(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleCopyFormattedId = async () => {
    if (customer?.formattedUserId) {
      try {
        await navigator.clipboard.writeText(
          customer.formattedUserId.toUpperCase(),
        );

        setCopiedFormattedId(true);

        setTimeout(() => setCopiedFormattedId(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleUpdateResidenceType = async () => {
    if (!customerId || !brandId || !editResidenceType.trim()) {
      return;
    }

    setIsUpdatingResidenceType(true);
    try {
      await updateResidenceType(customerId, brandId, editResidenceType);
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          residenceType: editResidenceType,
        };
      });
      setIsEditingResidenceType(false);
      setEditResidenceType("");
      showSuccess("Success", "Residence type updated successfully");
    } catch (error) {
      console.error("Error updating residence type:", error);
    } finally {
      setIsUpdatingResidenceType(false);
    }
  };

  const handleUpdateReligion = async () => {
    if (!customerId || !brandId || !editReligion.trim()) {
      return;
    }

    setIsUpdatingReligion(true);
    try {
      await updateReligion(customerId, brandId, editReligion);
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          religion: editReligion,
        };
      });
      setIsEditingReligion(false);
      setEditReligion("");
      showSuccess("Success", "Religion updated successfully");
    } catch (error) {
      console.error("Error updating religion:", error);
    } finally {
      setIsUpdatingReligion(false);
    }
  };

  const handleUpdateMaritalStatus = async () => {
    if (!customerId || !brandId || !editMaritalStatus.trim()) {
      return;
    }

    setIsUpdatingMaritalStatus(true);
    try {
      await updateMaritalStatus(customerId, brandId, editMaritalStatus);
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          maritalStatus: editMaritalStatus as MaritalStatusEnum,
        };
      });
      setIsEditingMaritalStatus(false);
      setEditMaritalStatus("");
      showSuccess("Success", "Marital status updated successfully");
    } catch (error) {
      console.error("Error updating marital status:", error);
    } finally {
      setIsUpdatingMaritalStatus(false);
    }
  };

  const handleUpdateDateOfBirth = async () => {
    if (!customerId || !brandId || !editDateOfBirth.trim()) {
      return;
    }

    setIsUpdatingDateOfBirth(true);
    try {
      await updateDateOfBirth(customerId, brandId, editDateOfBirth);
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dateOfBirth: new Date(editDateOfBirth),
        };
      });
      setIsEditingDateOfBirth(false);
      setEditDateOfBirth("");
      showSuccess("Success", "Date of birth updated successfully");
    } catch (error) {
      console.error("Error updating date of birth:", error);
    } finally {
      setIsUpdatingDateOfBirth(false);
    }
  };

  const handleUpdateGender = async () => {
    if (!customerId || !brandId || !editGender.trim()) {
      return;
    }

    setIsUpdatingGender(true);
    try {
      await updateGender(customerId, brandId, editGender);
      setCustomerDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gender: editGender as GenderEnum,
        };
      });
      setIsEditingGender(false);
      setEditGender("");
      showSuccess("Success", "Gender updated successfully");
    } catch (error) {
      console.error("Error updating gender:", error);
    } finally {
      setIsUpdatingGender(false);
    }
  };

  const handleUpdateAlternatePhone1 = async () => {
    if (!customerId || !brandId || !editAlternatePhone1.trim()) {
      return;
    }

    setIsUpdatingAlternatePhone1(true);
    try {
      await updateAlternatePhone1(customerId, brandId, editAlternatePhone1);
      setCustomer(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alternate_phone_1: editAlternatePhone1,
        };
      });
      setIsEditingAlternatePhone1(false);
      setEditAlternatePhone1("");
      showSuccess("Success", "Alternate Phone 1 updated successfully");
    } catch (error) {
      console.error("Error updating alternate phone 1:", error);
    } finally {
      setIsUpdatingAlternatePhone1(false);
    }
  };

  const handleUpdateAlternatePhone2 = async () => {
    if (!customerId || !brandId || !editAlternatePhone2.trim()) {
      return;
    }

    setIsUpdatingAlternatePhone2(true);
    try {
      await updateAlternatePhone2(customerId, brandId, editAlternatePhone2);
      setCustomer(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alternate_phone_2: editAlternatePhone2,
        };
      });
      setIsEditingAlternatePhone2(false);
      setEditAlternatePhone2("");
      showSuccess("Success", "Alternate Phone 2 updated successfully");
    } catch (error) {
      console.error("Error updating alternate phone 2:", error);
    } finally {
      setIsUpdatingAlternatePhone2(false);
    }
  };

  // Helper to calculate age from dateOfBirth
  function getAge(dateOfBirth: Date) {
    if (!dateOfBirth) return "N/A";
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  // Add Device Type display component
  const DeviceTypeDisplay = () => {
    if (isLoadingDeviceInfo) {
      return (
        <DetailItem
          label="Device Type"
          value={
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          }
        />
      );
    }

    if (!deviceInfo?.deviceType) {
      return (
        <DetailItem
          label="Device Type"
          value={
            <div className="flex items-center space-x-2 text-gray-500">
              <FiMonitor className="w-3 h-3" />
              <span className="text-xs">Not available</span>
            </div>
          }
        />
      );
    }

    return (
      <DetailItem
        label="Device Type"
        value={
          <div className="flex items-center space-x-2">
            {getDeviceIcon(deviceInfo.deviceType)}
            <span className="text-xs font-medium">
              {formatDeviceType(deviceInfo.deviceType)}
              {deviceInfo.osType ? ` - ${deviceInfo.osType}` : ""}
            </span>
          </div>
        }
      />
    );
  };
  if (!customerDetails) {
    return (
      <div className="space-y-3">
        {/* Profile Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-36 animate-pulse mb-1" />
              <div className="h-3 bg-gray-200 rounded w-28 animate-pulse mb-1" />
              <div className="h-3 bg-gray-200 rounded w-28 animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Contact Information Skeleton */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
          </div>
        </div>

        {/* Phone Numbers Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-3" />
          <div className="space-y-2">
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* User Status Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        </div>

        {/* Onboarding Journey Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>

        {/* Personal Details Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          {/* Profile Picture Skeleton */}
          <div className="mb-3">
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
          </div>

          {/* Personal Info Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "fullname",
              "aadhaarname",
              "gender",
              "dob",
              "aadhaardob",
              "marital",
              "spouse",
              "father",
              "mother",
              "religion",
              "residence",
              "credit",
              "deviceType",
              "ipAddress",
              "ipAssociatedUsers",
              "otherloans",
            ].map((field) => (
              <div key={`skeleton-${field}`}>
                <div className="h-3 w-20 bg-gray-200 animate-pulse rounded mb-1.5" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Address Section Skeleton */}
          <div className="mt-3 pt-3 border-t">
            <div className="h-4 w-28 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="space-y-1.5">
              <div>
                <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-1.5" />
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="flex gap-3">
                {["city", "state", "pincode"].map((field) => (
                  <div key={`skeleton-${field}`} className="flex-1">
                    <div className="h-3 w-12 bg-gray-200 animate-pulse rounded mb-1.5" />
                    <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Address Component Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-3" />
          <div className="space-y-2">
            {["addr-1", "addr-2", "addr-3"].map((field) => (
              <div
                key={`skeleton-${field}`}
                className="h-16 bg-gray-100 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    active: {
      color: "bg-[var(--color-success)] text-white",
      label: "Active",
      icon: FaCheckCircle,
    },
    overdue: {
      color: "bg-[var(--color-error)] text-white",
      label: "Overdue",
      icon: MdVerified,
    },
    new: {
      color:
        "bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)]",
      label: "New User",
      icon: FaUser,
    },
  };

  const status = customer?.onboardingStep === 12 ? "active" : "new";

  function handleOpenUserStatusReasons(): import("react").MouseEventHandler<HTMLButtonElement> {
    return (e) => {
      e.preventDefault();
      setIsUserStatusReasonsDialogOpen(true);
    };
  }

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2 relative">
        {/* Copy Button */}
        <div className="relative "></div>

        {/* Profile Picture */}
        <div className="mb-3 flex  ">
          {customerDetails.profilePicUrl && brandId && (
            <img
              src={ensureS3Url(customerDetails.profilePicUrl, brandId)}
              alt="Profile"
              className="w-17 h-14 rounded-full object-cover"
            />
          )}
          <div className="flex items-center gap-1 m-4 -mt-5">
            <DetailItem
              label="Profile ID"
              value={
                <div className="flex items-start  ">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">
                      {customer?.formattedUserId}
                      {customer?.formattedUserId && (
                        <button
                          onClick={handleCopyFormattedId}
                          className="p-1 text-primary hover:text-opacity-70 transition cursor-pointer"
                        >
                          <MdContentCopy className="w-3.5 h-3.5 text-gray-600 hover:text-gray-800" />
                        </button>
                      )}
                      {copiedFormattedId && (
                        <span className=" text-green-600">Copied!</span>
                      )}
                    </p>

                    <div className="flex items-center space-x-2 text-xs text-gray-600 truncate mt-1">
                      <span className="truncate">
                        ID: #{customer?.id.split("-")[0].toUpperCase()}
                      </span>

                      <button
                        onClick={handleCopyId}
                        className="p-1 hover:bg-gray-100 rounded transition"
                        title="Copy ID"
                      >
                        <MdContentCopy className="w-3.5 h-3.5 text-gray-600 hover:text-gray-800" />
                      </button>

                      {copiedId && (
                        <span className="text-green-600">Copied!</span>
                      )}
                    </div>
                  </div>
                </div>
              }
            />
          </div>
          <span className="flex items-center justify-end w-full mr-2">
            <div className="mx-6">
              <DetailItem
                label="User Status"
                value={
                  <Button
                    onClick={handleOpenUserStatusReasons()}
                    variant="outline"
                  >
                    <div className="flex items-center gap-1">
                      {customer?.status_id && (
                        <span className="capitalize">
                          {getUserStatusDisplay(customer.status_id)}
                        </span>
                      )}
                      <span className="text-xs font-normal ">
                        (Click to View/Edit)
                      </span>
                    </div>
                  </Button>
                }
              />
              <div className="flex flex-wrap items-center gap-2 mt-2 mx-2">
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusConfig[status].color}`}
                >
                  {(() => {
                    const StatusIcon = statusConfig[status].icon;
                    return <StatusIcon className="w-3 h-3" />;
                  })()}
                  <span>{statusConfig[status].label}</span>
                </span>
                {customer?.onboardingStep === 12 && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full">
                    <FaCheckCircle className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={copyCustomerInfo}
              className={`
            right-5 
          w-12 h-12 
          rounded-md shadow-lg
          flex items-center justify-center
          transition duration-200
          hover:bg-[var(--color-background)]
           border-opacity-50 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] 
          ${copied
                  ? "bg-green-500 text- scale-110"
                  : "bg-[var(--color-surface)] "
                }
        `}
              title="Copy customer profile information"
            >
              {copied ? (
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <FiCopy className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </span>
        </div>

        {/* Personal Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <DetailItem
            label="Full Name"
            value={[
              customerDetails?.firstName,
              customerDetails?.middleName,
              customerDetails?.lastName,
            ]
              .filter((part) => part?.trim())
              .join(" ")}
          />

          {customerDetails?.aAdharName && (
            <DetailItem
              label="CPR Card Name"
              value={customerDetails.aAdharName}
            />
          )}

          <DetailItem
            label="Gender"
            value={
              isEditingGender ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button
                    onClick={handleUpdateGender}
                    disabled={isUpdatingGender || !editGender}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {isUpdatingGender ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingGender(false);
                      setEditGender("");
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{customerDetails.gender}</span>
                  <button
                    onClick={() => {
                      setIsEditingGender(true);
                      setEditGender(customerDetails.gender || "");
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )
            }
          />

          <DetailItem
            label="Date of Birth"
            value={
              isEditingDateOfBirth ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <button
                    onClick={handleUpdateDateOfBirth}
                    disabled={isUpdatingDateOfBirth || !editDateOfBirth}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {isUpdatingDateOfBirth ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingDateOfBirth(false);
                      setEditDateOfBirth("");
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{formatDate(customerDetails.dateOfBirth)}</span>
                  <button
                    onClick={() => {
                      setIsEditingDateOfBirth(true);
                      const dob = new Date(customerDetails.dateOfBirth);
                      setEditDateOfBirth(dob.toISOString().split("T")[0]);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )
            }
          />

          <DetailItem label="Age" value={getAge(customerDetails.dateOfBirth)} />

          {customerDetails.aAdharDOB && (
            <DetailItem
              label="CPR Card DOB"
              value={formatDate(customerDetails.aAdharDOB)}
            />
          )}

          <DetailItem
            label="Marital Status"
            value={
              isEditingMaritalStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editMaritalStatus}
                    onChange={(e) => setEditMaritalStatus(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">Select marital status</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                  <button
                    onClick={handleUpdateMaritalStatus}
                    disabled={isUpdatingMaritalStatus || !editMaritalStatus}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {isUpdatingMaritalStatus ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingMaritalStatus(false);
                      setEditMaritalStatus("");
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{customerDetails.maritalStatus}</span>
                  <button
                    onClick={() => {
                      setIsEditingMaritalStatus(true);
                      setEditMaritalStatus(customerDetails.maritalStatus || "");
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )
            }
          />

          {customerDetails.maritalStatus === MaritalStatusEnum.MARRIED && (
            <DetailItem
              label="Spouse Name"
              value={customerDetails.spouseName}
            />
          )}

          <DetailItem
            label="Father's Name"
            value={customerDetails.fathersName}
          />

          {customerDetails.mothersName && (
            <DetailItem
              label="Mother's Name"
              value={customerDetails.mothersName}
            />
          )}

          <DetailItem
            label="Religion"
            value={
              isEditingReligion ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editReligion}
                    onChange={(e) => setEditReligion(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">Select religion</option>
                    <option value="HINDUISM">Hinduism</option>
                    <option value="ISLAM">Islam</option>
                    <option value="SIKHISM">Sikhism</option>
                    <option value="CHRISTIANITY">Christianity</option>
                    <option value="BUDDHISM">Buddhism</option>
                    <option value="JAINISM">Jainism</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button
                    onClick={handleUpdateReligion}
                    disabled={isUpdatingReligion || !editReligion}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {isUpdatingReligion ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingReligion(false);
                      setEditReligion("");
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{customerDetails.religion}</span>
                  <button
                    onClick={() => {
                      setIsEditingReligion(true);
                      setEditReligion(customerDetails.religion || "");
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )
            }
          />

          <DetailItem
            label="Residence Type"
            value={
              isEditingResidenceType ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editResidenceType}
                    onChange={(e) => setEditResidenceType(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">Select residence type</option>
                    <option value="OWNED">Owned</option>
                    <option value="RENTED">Rented</option>
                  </select>
                  <button
                    onClick={handleUpdateResidenceType}
                    disabled={isUpdatingResidenceType || !editResidenceType}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {isUpdatingResidenceType ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingResidenceType(false);
                      setEditResidenceType("");
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{customerDetails.residenceType}</span>
                  <button
                    onClick={() => {
                      setIsEditingResidenceType(true);
                      setEditResidenceType(customerDetails.residenceType || "");
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )
            }
          />

          {customer?.alternate_phone_1 ? (
            <DetailItem
              label="Alternate Phone 1"
              value={
                isEditingAlternatePhone1 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={editAlternatePhone1}
                      onChange={(e) => setEditAlternatePhone1(e.target.value)}
                      placeholder="Enter phone number"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleUpdateAlternatePhone1}
                      disabled={isUpdatingAlternatePhone1 || !editAlternatePhone1}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isUpdatingAlternatePhone1 ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone1(false);
                        setEditAlternatePhone1("");
                      }}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{customer.alternate_phone_1}</span>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone1(true);
                        setEditAlternatePhone1(customer.alternate_phone_1 || "");
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Edit
                    </button>
                  </div>
                )
              }
            />
          ) : (
            <DetailItem
              label="Alternate Phone 1"
              value={
                isEditingAlternatePhone1 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={editAlternatePhone1}
                      onChange={(e) => setEditAlternatePhone1(e.target.value)}
                      placeholder="Enter phone number"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleUpdateAlternatePhone1}
                      disabled={isUpdatingAlternatePhone1 || !editAlternatePhone1}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isUpdatingAlternatePhone1 ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone1(false);
                        setEditAlternatePhone1("");
                      }}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 italic">Not added</span>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone1(true);
                        setEditAlternatePhone1("");
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Add
                    </button>
                  </div>
                )
              }
            />
          )}

          {customer?.alternate_phone_2 ? (
            <DetailItem
              label="Alternate Phone 2"
              value={
                isEditingAlternatePhone2 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={editAlternatePhone2}
                      onChange={(e) => setEditAlternatePhone2(e.target.value)}
                      placeholder="Enter phone number"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleUpdateAlternatePhone2}
                      disabled={isUpdatingAlternatePhone2 || !editAlternatePhone2}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isUpdatingAlternatePhone2 ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone2(false);
                        setEditAlternatePhone2("");
                      }}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{customer.alternate_phone_2}</span>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone2(true);
                        setEditAlternatePhone2(customer.alternate_phone_2 || "");
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Edit
                    </button>
                  </div>
                )
              }
            />
          ) : (
            <DetailItem
              label="Alternate Phone 2"
              value={
                isEditingAlternatePhone2 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={editAlternatePhone2}
                      onChange={(e) => setEditAlternatePhone2(e.target.value)}
                      placeholder="Enter phone number"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleUpdateAlternatePhone2}
                      disabled={isUpdatingAlternatePhone2 || !editAlternatePhone2}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isUpdatingAlternatePhone2 ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone2(false);
                        setEditAlternatePhone2("");
                      }}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 italic">Not added</span>
                    <button
                      onClick={() => {
                        setIsEditingAlternatePhone2(true);
                        setEditAlternatePhone2("");
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Add
                    </button>
                  </div>
                )
              }
            />
          )}

          <DetailItem
            label="Credit Score"
            value={customerDetails.creditScore || 650}
          />

          {employment?.salary && (
            <DetailItem
              label="Employment Salary"
              value={Conversion.formatCurrency(employment.salary, "BHD")}
            />
          )}

          <DetailItem
            label="User Data Status"
            value={customerDetails.userDataStatus}
          />

          {customerDetails.addressProofType && (
            <DetailItem
              label="Address Proof Type"
              value={customerDetails.addressProofType}
            />
          )}

          <DetailItem
            label="Account Created"
            value={formatDate(customerDetails.createdAt)}
          />

          <DetailItem
            label="Last Updated"
            value={formatDate(customerDetails.updatedAt)}
          />
          <DetailItem
            label="User Email"
            value={
              customer?.email ? (
                <>
                  {customer.email}
                  {customer?.isEmailVerified && (
                    <span className="ml-2 inline-flex items-center space-x-1 text-xs px-3 py-1 rounded-full bg-[var(--color-success)] text-white font-medium">
                      <MdVerified className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  )}
                  {customer.googleId && (
                    <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)] font-medium ml-2">
                      Google
                    </span>
                  )}
                </>
              ) : (
                "N/A"
              )
            }
          />

          {/* Add Device Type Field */}
          <DeviceTypeDisplay />
          {(customerDetails.subdomain || customerDetails.marketingSource) && (
            <>
              <DetailItem
                label="Marketing Domain"
                value={customerDetails.subdomain || "—"}
              />

              <DetailItem
                label="Marketing Source"
                value={customerDetails.marketingSource || "—"}
              />
            </>
          )}
        </div>

        {/* Address Section */}
        <div className="mt-3 pt-2.5 border-t">
          <h3 className="font-medium text-xs mb-1.5 text-gray-900">
            Address Details
          </h3>
          <div className="space-y-1.5">
            <DetailItem label="Address" value={customerDetails.address} />
            <div className="flex gap-2.5">
              <DetailItem label="City" value={customerDetails.city} />
              <DetailItem label="State" value={customerDetails.state} />
              <DetailItem label="Pincode" value={customerDetails.pincode} />
            </div>
            <DetailItem
              label="Communication Address"
              value={customerDetails.isCommunicationAddress ? "Yes" : "No"}
            />
          </div>
        </div>
        <div className="grid grid-cols-1   gap-2.5 mb-4 border-t mt-4 pt-4">
          <DetailItem
            label=""
            value={
              <AlternatePhoneNumbers
                primaryPhone={customer?.phoneNumber}
                isPrimaryPhoneVerified={customer?.isPhoneVerified}
                onFetchPhoneAge={fetchPhoneAge}
                phoneAge={phoneAge}
                showAge={showAge}
                isPhoneAgeLoading={isPhoneAgeLoading}
              />
            }
          />
        </div>

        {/* Loans Via Alternate Numbers Section */}
        {alternatePhoneLoans.loansViaAlternateNumbers?.length > 0 && (
          <div className="mt-3 pt-2.5 border-t">
            <div className="flex items-center gap-2 mb-2">
              <FaLink className="w-4 h-4 text-gray-700" />
              <h3 className="font-medium text-sm text-gray-900">
                Loans Via Alternate Numbers
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Found {alternatePhoneLoans.loansViaAlternateNumbers?.length}{" "}
              {alternatePhoneLoans.loansViaAlternateNumbers?.length === 1
                ? "loan"
                : "loans"}{" "}
              linked to alternate phone numbers
            </p>
            <div className="space-y-2">
              {alternatePhoneLoans.loansViaAlternateNumbers.map((loan) => (
                <div key={loan.loanId} className="py-3">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500">Loan ID</p>
                      <p className="font-medium">{loan.formattedLoanId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Amount</p>
                      <p className="font-medium">
                        {Conversion.formatCurrency(loan.amount, "BHD")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Status</p>
                      <p className="font-medium">{loan.status}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Via Phone</p>
                      <p className="font-medium">
                        {loan.viaAlternatePhone.phone}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {loan.viaAlternatePhone.name} (
                        {loan.viaAlternatePhone.relationship})
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500">Matched User</p>
                    <p className="font-medium text-xs">
                      {loan.matchedUser.name} -{" "}
                      {loan.matchedUser.formattedUserId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Address />

      {/* User Status Reasons Dialog */}
      <UserStatusReasonsDialog
        isOpen={isUserStatusReasonsDialogOpen}
        onClose={() => setIsUserStatusReasonsDialogOpen(false)}
        brandId={brandId!}
        customerId={customerId!}
        customer={customer}
        onSuccess={handleUserStatusReasonsSuccess}
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: string | number | React.ReactNode;
}>) {
  return (
    <div>
      <p className="text-[10px] text-gray-600">{label}</p>
      <div className="font-medium text-xs leading-tight">{value || "-"}</div>
    </div>
  );
}
