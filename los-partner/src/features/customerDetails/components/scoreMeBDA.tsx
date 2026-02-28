import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineMapPin,
} from "react-icons/hi2";
import { FiRefreshCw, FiEye, FiDownload, FiSettings } from "react-icons/fi";
import { toast } from "react-toastify";

import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { indianStatesWithCapitals } from "../../../constant/stateCode";
import {
  BdaInitiateResponse,
  getBdaReport,
  initiateRetailBdaRequest,
  validateBdaOtp,
} from "../../../shared/services/api/scoreMeBDA";
import { getManualVerificationDetails } from "../../../shared/services/api/customer.api";
import Dialog from "../../../common/dialog";

export function ScoreMeBds() {
  const { fetchSignedUrl } = useAwsSignedUrl();

  const { customerId, brandId } = useParams();
  const [initiating, setInitiating] = useState(false);
  const [validatingOtp, setValidatingOtp] = useState(false);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // BDA Request State
  const [bdaData, setBdaData] = useState<BdaInitiateResponse | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string>("");
  const [manualBody, setManualBody] = useState<{
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address?: string;
    state?: string;
    pincode?: string;
    city?: string;
    mobileNumber?: string;
    panNumber?: string;
    dateOfBirth?: string;
  }>({});

  // Form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Validation function
  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case "mobileNumber":
        if (value && !/^\d{10}$/.test(value)) {
          errors[field] = "Mobile number must be 10 digits";
        }
        break;
      case "panNumber":
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          errors[field] = "Invalid PAN format (e.g., ABCDE1234F)";
        }
        break;
      case "pincode":
        if (value && !/^\d{6}$/.test(value)) {
          errors[field] = "Pincode must be 6 digits";
        }
        break;
      case "firstName":
      case "lastName":
        if (showManualInput && !value.trim()) {
          errors[field] = "This field is required";
        }
        break;
    }

    setFormErrors((prev) => ({
      ...prev,
      ...errors,
      ...(Object.keys(errors).length === 0 && prev[field]
        ? { [field]: "" }
        : {}),
    }));
  };

  const handleInitiateBda = async () => {
    if (!customerId) {
      toast.error("Customer ID is required");
      return;
    }

    // Validate manual input if provided
    if (showManualInput) {
      const requiredFields = [
        "firstName",
        "lastName",
        "mobileNumber",
        "panNumber",
      ];
      const missingFields = requiredFields.filter(
        (field) => !manualBody[field as keyof typeof manualBody]?.trim()
      );

      if (missingFields.length > 0) {
        toast.error(
          `Please fill in required fields: ${missingFields.join(", ")}`
        );
        return;
      }
    }

    setInitiating(true);
    setError("");

    try {
      const response = await initiateRetailBdaRequest(
        customerId,
        showManualInput ? manualBody : {}
      );
      setBdaData(response);
      // Check if OTP was sent based on response code
      if (response.status === "otp_verification_in_progress") {
        toast.success(
          "OTP sent successfully. Please enter the OTP to proceed."
        );
      } else if (response.status === "report_generation_in_progress") {
        toast.success("BDA request initiated successfully");
        // Auto-fetch report if no OTP required
        handleFetchReport(response.referenceId);
      } else {
        toast.success("BDA request initiated successfully. Waiting for OTP.");
      }
    } catch (error) {
      setError((error as Error).message || "Failed to initiate BDA request");
      toast.error((error as Error).message || "Failed to initiate BDA request");
    } finally {
      setInitiating(false);
    }
  };

  const handleValidateOtp = async () => {
    if (!bdaData?.referenceId || !otp.trim()) {
      toast.error("Please enter a valid OTP");
      return;
    }

    setValidatingOtp(true);
    setError("");

    try {
      const response = await validateBdaOtp(bdaData.referenceId, otp);
      if (response.referenceId) {
        toast.success("OTP validated successfully");
        handleFetchReport(bdaData.referenceId);
      } else {
        toast.error("Invalid OTP. Please try again.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "OTP validation failed";
      if (
        errorMessage ===
        "Please wait for the report to be generated. Try again after 2 minutes."
      ) {
        setBdaData(
          (prev) => prev && { ...prev, status: "report_generation_in_progress" }
        );
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setValidatingOtp(false);
    }
  };

  const handleFetchReport = async (referenceId?: string) => {
    const refId = referenceId || bdaData?.referenceId;
    if (!refId) {
      toast.error("Reference ID not found");
      return;
    }

    setFetchingReport(true);
    setError("");

    try {
      const response = await getBdaReport(refId);
      setBdaData(response);
      toast.success("BDA report fetched successfully");
    } catch (error) {
      setError((error as Error).message || "Failed to fetch BDA report");
      toast.error((error as Error).message || "Failed to fetch BDA report");
    } finally {
      setFetchingReport(false);
    }
  };

  const handleManualInputChange = (field: string, value: string) => {
    setManualBody((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Validate field on change
    validateField(field, value);
  };

  const resetManualInput = () => {
    setManualBody({});
    setShowManualInput(false);
  };

  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchManualVerificationData = async () => {
      try {
        if (customerId && brandId) {
          const response = await getManualVerificationDetails(
            customerId,
            brandId
          );
          setManualBody(response);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchManualVerificationData();
  }, [brandId, customerId]);

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg p-3 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-muted)] rounded"></div>
            <div className="h-4 bg-[var(--color-muted)] rounded w-40"></div>
          </div>
          <div className="h-8 bg-[var(--color-muted)] rounded w-24"></div>
        </div>
      </div>
    );
  }

  // Summary Card Component
  const renderSummaryCard = () => {
    const hasReport = bdaData?.bdaReportXlsxPrivateKey;
    const isPending = bdaData && !hasReport;
    const isNotStarted = !bdaData;

    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center ${
                hasReport
                  ? "bg-green-100"
                  : isPending
                  ? "bg-yellow-100"
                  : "bg-gray-100"
              }`}
            >
              <HiOutlineShieldCheck
                className={`w-4 h-4 ${
                  hasReport
                    ? "text-green-600"
                    : isPending
                    ? "text-yellow-600"
                    : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-on-surface)]">
                ScoreMe BDA Analysis
              </h3>
              <p className="text-xs text-[var(--color-on-surface)] opacity-60">
                {hasReport
                  ? `Report Available • ${bdaData.referenceId}`
                  : isPending
                  ? `Processing • ${bdaData.referenceId}`
                  : "Not initiated"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasReport && (
              <button
                onClick={() => fetchSignedUrl(bdaData.bdaReportXlsxPrivateKey!)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                title="Download Report"
              >
                <FiDownload className="w-3 h-3" />
                Download
              </button>
            )}
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] rounded transition-colors font-medium"
            >
              {isNotStarted ? "Initiate" : "View Details"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderSummaryCard()}

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="ScoreMe BDA Credit Analysis"
      >
        <div className={`space-y-3`}>
          {/* Error Display */}
          {error && (
            <div className="mb-2 p-1.5 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-md flex items-center gap-1.5">
              <HiOutlineExclamationTriangle className="h-3.5 w-3.5 text-error" />
              <span className="text-[var(--color-on-error)] text-[10px]">
                {error}
              </span>
            </div>
          )}

          {!bdaData && (
            <div className="py-3">
              <div className="max-w-2xl mx-auto mb-3">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-[var(--color-muted)] bg-opacity-20 rounded-lg">
                  <button
                    onClick={() => setShowManualInput(false)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      !showManualInput
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                        : "text-[var(--color-on-surface)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <HiOutlineShieldCheck className="h-4 w-4" />
                      <span>Auto Mode</span>
                      <span className="text-[9px] opacity-80">
                        Use existing data
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowManualInput(true)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      showManualInput
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                        : "text-[var(--color-on-surface)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FiSettings className="h-4 w-4" />
                      <span>Manual Mode</span>
                      <span className="text-[9px] opacity-80">
                        Enter custom data
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="max-w-2xl mx-auto mb-3">
                {!showManualInput ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                    <div className="flex gap-2">
                      <HiOutlineShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-medium text-blue-900 mb-1">
                          Automatic Mode
                        </h4>
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          Uses customer's existing profile data (name, PAN,
                          mobile, address).
                          <span className="font-medium">
                            {" "}
                            Click "Start Analysis"
                          </span>{" "}
                          to begin. You may receive an OTP for verification.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <div className="flex gap-2">
                      <FiSettings className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-medium text-amber-900 mb-1">
                          Manual Mode
                        </h4>
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                          Override customer data by entering custom information
                          below.
                          <span className="font-medium">
                            {" "}
                            Fill required fields (*)
                          </span>{" "}
                          then click "Start Analysis".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Input Form */}
              {showManualInput && (
                <div className="max-w-2xl mx-auto mb-3 p-2.5 bg-[var(--color-background)] border border-[var(--color-muted)] rounded-lg">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[var(--color-muted)] border-opacity-30">
                    <div>
                      <h3 className="text-xs font-semibold text-[var(--color-on-background)]">
                        Enter Customer Details
                      </h3>
                      <p className="text-[9px] text-[var(--color-on-surface)] opacity-60 mt-0.5">
                        Fields marked with * are required
                      </p>
                    </div>
                    <button
                      onClick={resetManualInput}
                      className="text-[10px] text-[var(--color-error)] hover:text-[var(--color-error)] hover:opacity-80 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-[var(--color-on-surface)] opacity-80 mb-2 flex items-center gap-1">
                        <HiOutlineUser className="h-3 w-3" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={manualBody.firstName || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "firstName",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="First name"
                          />
                          {formErrors.firstName && (
                            <p className="mt-0.5 text-[9px] text-red-600">
                              {formErrors.firstName}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={manualBody.middleName || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "middleName",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Middle name"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={manualBody.lastName || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "lastName",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Last name"
                          />
                          {formErrors.lastName && (
                            <p className="mt-0.5 text-[9px] text-red-600">
                              {formErrors.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact & Identity */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-[var(--color-on-surface)] opacity-80 mb-2 flex items-center gap-1">
                        <HiOutlinePhone className="h-3 w-3" />
                        Contact & Identity
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Mobile Number{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={manualBody.mobileNumber || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "mobileNumber",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="10-digit mobile"
                            maxLength={10}
                          />
                          {formErrors.mobileNumber && (
                            <p className="mt-0.5 text-[9px] text-red-600">
                              {formErrors.mobileNumber}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            PAN Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={manualBody.panNumber || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "panNumber",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                            placeholder="ABCDE1234F"
                            maxLength={10}
                          />
                          {formErrors.panNumber && (
                            <p className="mt-0.5 text-[9px] text-red-600">
                              {formErrors.panNumber}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={manualBody.dateOfBirth || ""}
                            onChange={(e) =>
                              handleManualInputChange(
                                "dateOfBirth",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-[var(--color-on-surface)] opacity-80 mb-2 flex items-center gap-1">
                        <HiOutlineMapPin className="h-3 w-3" />
                        Address Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Address
                          </label>
                          <textarea
                            value={manualBody.address || ""}
                            onChange={(e) =>
                              handleManualInputChange("address", e.target.value)
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            placeholder="Full address"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            City
                          </label>
                          <input
                            type="text"
                            value={manualBody.city || ""}
                            onChange={(e) =>
                              handleManualInputChange("city", e.target.value)
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="City name"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            State
                          </label>
                          <select
                            value={manualBody.state || ""}
                            onChange={(e) =>
                              handleManualInputChange("state", e.target.value)
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select State</option>
                            {indianStatesWithCapitals.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-[var(--color-on-surface)] opacity-80 mb-0.5">
                            Pincode
                          </label>
                          <input
                            type="text"
                            value={manualBody.pincode || ""}
                            onChange={(e) =>
                              handleManualInputChange("pincode", e.target.value)
                            }
                            className="w-full px-2 py-1 text-[10px] border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="6-digit pincode"
                            maxLength={6}
                          />
                          {formErrors.pincode && (
                            <p className="mt-0.5 text-[9px] text-red-600">
                              {formErrors.pincode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="text-center">
                <button
                  onClick={handleInitiateBda}
                  disabled={initiating}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-primary)] disabled:opacity-50 text-[var(--color-on-primary)] px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 mx-auto text-xs shadow-sm"
                >
                  {initiating ? (
                    <>
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                      Initiating Analysis...
                    </>
                  ) : (
                    <>
                      <HiOutlineShieldCheck className="h-4 w-4" />
                      Start BDA Analysis
                    </>
                  )}
                </button>
                <p className="text-[9px] text-[var(--color-on-surface)] opacity-50 mt-1.5">
                  {showManualInput
                    ? "Analysis will use the custom data entered above"
                    : "Analysis will use existing customer profile data"}
                </p>
              </div>
            </div>
          )}

          {/* OTP Verification Section */}
          {bdaData?.status === "otp_verification_in_progress" && (
            <div className="mb-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-md">
              <div className="flex items-start gap-2">
                <HiOutlineShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1 text-xs">
                    Step 2: OTP Verification
                  </h4>
                  <p className="text-[10px] text-blue-700 mb-2 leading-relaxed">
                    An OTP has been sent to the mobile number. Please enter the
                    6-digit code below.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 px-2.5 py-1.5 text-xs border-2 border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      maxLength={6}
                    />
                    <button
                      onClick={handleValidateOtp}
                      disabled={validatingOtp || !otp.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md font-semibold transition-colors text-xs whitespace-nowrap shadow-sm"
                    >
                      {validatingOtp ? (
                        <>
                          <FiRefreshCw className="h-3.5 w-3.5 animate-spin inline mr-1" />
                          Verifying...
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </button>
                  </div>

                  <p className="text-[9px] text-blue-600 mt-1.5">
                    ⏱ OTP is valid for 5 minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Report Generation in Progress */}
          {bdaData &&
            bdaData.status === "report_generation_in_progress" &&
            !bdaData.bdaReportXlsxPrivateKey && (
              <div className="text-center py-4">
                <div className="mb-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-md">
                  <div className="flex items-start gap-2">
                    <FiRefreshCw className="h-5 w-5 text-amber-600 animate-spin flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-amber-900 mb-1 text-xs">
                        Step 3: Generating Report
                      </h4>
                      <p className="text-[10px] text-amber-700 mb-1.5 leading-relaxed">
                        Your BDA analysis report is being generated. This may
                        take 1-2 minutes.
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-200 rounded text-[9px] text-amber-900 font-mono">
                        Reference: {bdaData?.referenceId || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleFetchReport()}
                  disabled={fetchingReport}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 mx-auto text-xs shadow-sm"
                >
                  {fetchingReport ? (
                    <>
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                      Checking Status...
                    </>
                  ) : (
                    <>
                      <FiEye className="h-4 w-4" />
                      Check Report Status
                    </>
                  )}
                </button>
              </div>
            )}

          {/* Report Available */}
          {bdaData?.status === "report_generation_in_progress" &&
            bdaData?.bdaReportXlsxPrivateKey && (
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-md">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-1 text-xs">
                        ✅ Analysis Complete!
                      </h4>
                      <p className="text-[10px] text-green-700 mb-2 leading-relaxed">
                        Your BDA credit analysis report is ready for download.
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-200 rounded text-[9px] text-green-900 font-mono mb-2">
                        Reference: {bdaData.referenceId}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => {
                            fetchSignedUrl(
                              bdaData?.bdaReportXlsxPrivateKey
                                ? bdaData.bdaReportXlsxPrivateKey
                                : ""
                            );
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-semibold shadow-sm"
                        >
                          <FiDownload className="h-3.5 w-3.5" />
                          Download Excel Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Dialog>
    </>
  );
}
