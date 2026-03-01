import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaDatabase,
  FaSync,
  FaDownload,
  FaFilePdf,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaRupeeSign,
  FaInfoCircle,
  FaCopy,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { AAApiService } from "../../../../shared/services/api/aa.api";
import {
  AAConsentRequest,
  AAConsentStatus,
  AADataSession,
} from "../../../../shared/types/aa-consent-request";
import { Spinner } from "../../../../common/ui/spinner";
import { Button } from "../../../../common/ui/button";
import { Badge } from "../../../../common/ui/badge";
import { Input } from "../../../../common/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../../common/ui/card";
import { formatDateWithTime } from "../../../../lib/utils";
import Dialog from "../../../../common/dialog";
import dayjs from "dayjs";
import { CustomerReportOverview } from "./customerReportOverview";
import { CustomerStatementOverview } from "./customerStatementOverview";
import { CustomerFinancialComparison } from "./customerFinancialComparison";
import { useAppSelector } from "../../../../shared/redux/store";
import {
  BrandProviderName,
  BrandProviderType,
} from "../../../../constant/enum";
import { selectProvidersByType } from "../../../../shared/redux/slices/brand.slice";

export const CustomerDetailsTabs = () => {
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.ACCOUNT_AGGREGATION)
  );
  const aaProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.FINDUIT
  );
  if (!aaProvider) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-1.5">
          Account Aggregation Not Configured
        </h3>
        <p className="text-xs text-[var(--color-on-surface)] opacity-60 max-w-sm mx-auto mb-5">
          Please configure an Account Aggregation provider to access AA
          features. 
        </p>
      </div>
    );
  }
  const { customerId, brandId } = useParams();
  const [consentRequests, setConsentRequests] = useState<AAConsentRequest[]>(
    []
  );
  const [selectedConsent, setSelectedConsent] =
    useState<AAConsentRequest | null>(null);
  const [dataSessions, setDataSessions] = useState<AADataSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDataSessions, setIsLoadingDataSessions] = useState(false);
  const [isFetchingPeriodicData, setIsFetchingPeriodicData] = useState(false);
  const [activeTab, setActiveTab] = useState<"consents" | "data">("consents");
  const [showDataModal, setShowDataModal] = useState(false);
  const [selectedRawData, setSelectedRawData] = useState<any>(null);
  const [showManualConsentModal, setShowManualConsentModal] = useState(false);
  const [manualConsentForm, setManualConsentForm] = useState({
    handleId: "",
    mobile: "",
    isCreatingManual: false,
  });

  // Fetch user consent requests
  const fetchConsentRequests = async () => {
    if (!customerId) return;

    try {
      setIsLoading(true);
      const response = await AAApiService.getUserConsentRequests(customerId);
      setConsentRequests(response);
    } catch (error) {
      console.error("Error fetching consent requests:", error);
      toast.error("Failed to load consent requests");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data sessions for a consent
  const fetchDataSessions = async (consentRequestId: string) => {
    try {
      setIsLoadingDataSessions(true);
      const response = await AAApiService.getDataSessions(consentRequestId);
      setDataSessions(response);
    } catch (error) {
      console.error("Error fetching data sessions:", error);
      toast.error("Failed to load data sessions");
    } finally {
      setIsLoadingDataSessions(false);
    }
  };

  // Handle consent selection
  const handleConsentSelect = (consent: AAConsentRequest) => {
    setSelectedConsent(consent);
    setActiveTab("data");
    fetchDataSessions(consent.id);
  };

  // Create a new consent request
  const handleCreateConsent = async (options: { brandId: string }) => {
    if (!customerId) {
      toast.error("Customer ID not found");
      return;
    }
    if (!options?.brandId) {
      toast.error("Please select a brand to create consent");
      return;
    }

    try {
      setIsLoading(true);

      // Create a new consent request with basic parameters
      const response = await AAApiService.createConsentRequest({
        userId: customerId,
        brandId: options?.brandId,
      });

      toast.success("New consent request created successfully!");
      // Refresh consent requests to show the new one
      fetchConsentRequests();
      return response;
    } catch (error) {
      console.error("Error creating consent request:", error);
      toast.error("Failed to create consent request");
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  // Create consent and send email
  const handleCreateAndSendEmail = async (options: { brandId: string }) => {
    if (!options?.brandId) {
      toast.error("Please select a brand to create consent");
      return;
    }
    const consentResponse = await handleCreateConsent(options);

    if (consentResponse?.consentRequestId && customerId) {
      try {
        // Send email for the newly created consent
        const emailResponse = await AAApiService.sendConsentRequestEmail(
          customerId
        );

        if (emailResponse.success) {
          toast.success("Consent created and email sent successfully!");
        } else {
          toast.warning("Consent created but email sending failed");
        }
      } catch (error) {
        console.error("Error sending email for new consent:", error);
        toast.warning("Consent created but email sending failed");
      }
    }
  };

  // Create consent and copy URL
  const handleCreateAndCopyUrl = async (options: { brandId: string }) => {
    if (!options?.brandId) {
      toast.error("Please select a brand to create consent");
      return;
    }
    const consentResponse = await handleCreateConsent(options);
    if (consentResponse?.redirectionUrl) {
      try {
        await navigator.clipboard.writeText(consentResponse.redirectionUrl);
        toast.success("New consent created and URL copied to clipboard!");
      } catch (clipboardError) {
        console.warn("Clipboard API not supported:", clipboardError);
        prompt("Copy this new consent URL:", consentResponse.redirectionUrl);
        toast.success("New consent created! URL is ready to share.");
      }
    }
  };

  // Handle manual consent creation
  const handleManualConsentCreation = async () => {
    if (!customerId) {
      toast.error("Customer ID not found");
      return;
    }

    if (!brandId) {
      toast.error("Brand ID not found");
      return;
    }
    if (!manualConsentForm.mobile.trim()) {
      toast.error("Please provide both Handle ID and Mobile number");
      return;
    }

    // Validate mobile number format (basic validation)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(manualConsentForm.mobile.replace(/\D/g, ""))) {
      toast.error("Please provide a valid 10-digit mobile number");
      return;
    }

    try {
      setManualConsentForm((prev) => ({ ...prev, isCreatingManual: true }));

      const response = await AAApiService.createManualConsentRequest({
        userId: customerId,
        // handleId: manualConsentForm.handleId,
        mobile: manualConsentForm.mobile,
        brandId: brandId,
      });

      toast.success("Manual consent request created successfully!");
      fetchConsentRequests();
      setShowManualConsentModal(false);
      setManualConsentForm({
        handleId: "",
        mobile: "",
        isCreatingManual: false,
      });
      return response;
    } catch (error) {
      console.error("Error creating manual consent request:", error);
      toast.error("Failed to create manual consent request");
      return null;
    } finally {
      setManualConsentForm((prev) => ({ ...prev, isCreatingManual: false }));
    }
  };

  // Fetch periodic data for selected consent
  const handleFetchPeriodicData = async () => {
    if (!selectedConsent) {
      toast.error("Please select a consent request");
      return;
    }

    if (!customerId) {
      toast.error("Customer ID not found");
      return;
    }

    try {
      setIsFetchingPeriodicData(true);

      const response = await AAApiService.fetchPeriodicData({
        userId: customerId,
        consentRequestId: selectedConsent.id,
      });

      if (response.success) {
        toast.success("Periodic data fetched successfully!");
        // Refresh data sessions to show the new data
        fetchDataSessions(selectedConsent.id);
      } else {
        toast.error(response.message || "Failed to fetch periodic data");
      }
    } catch (error: any) {
      console.error("Error fetching periodic data:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch periodic data";
      toast.error(errorMessage);
    } finally {
      setIsFetchingPeriodicData(false);
    }
  };

  // Get status badge styling with theme-aware Badge component
  const getStatusBadge = (status: AAConsentStatus) => {
    switch (status) {
      case AAConsentStatus.PENDING:
        return (
          <Badge variant="warning" className="gap-1">
            <FaClock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case AAConsentStatus.ACTIVE:
        return (
          <Badge variant="success" className="gap-1">
            <FaCheckCircle className="w-3 h-3" />
            Active
          </Badge>
        );
      case AAConsentStatus.REJECTED:
        return (
          <Badge variant="danger" className="gap-1">
            <FaTimesCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case AAConsentStatus.EXPIRED:
        return (
          <Badge variant="default" className="gap-1">
            <FaExclamationTriangle className="w-3 h-3" />
            Expired
          </Badge>
        );
      case AAConsentStatus.REVOKED:
        return (
          <Badge variant="danger" className="gap-1">
            <FaTimesCircle className="w-3 h-3" />
            Revoked
          </Badge>
        );
      case AAConsentStatus.PAUSED:
        return (
          <Badge variant="warning" className="gap-1">
            <FaClock className="w-3 h-3" />
            Paused
          </Badge>
        );
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  useEffect(() => {
    fetchConsentRequests();
  }, [customerId]);

  // Show raw data modal
  const showRawDataModal = (rawData: any) => {
    setSelectedRawData(rawData);
    setShowDataModal(true);
  };

  // Format account balance with currency
  const formatCurrency = (amount: string | number, currency = "INR") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Render data modal
  const renderDataModal = () => {
    if (!showDataModal || !selectedRawData) return null;

    // Handle both data session format and raw API format
    // Check if it's raw data with dataDetail or a session object with jsonData directly
    const accountData =
      selectedRawData?.dataDetail?.jsonData?.Account ||
      selectedRawData?.jsonData?.Account;
    const holder = accountData?.Profile?.Holders?.Holder;
    const summary = accountData?.Summary;
    const transactions = accountData?.Transactions;

    // Use the metadata from the raw data or fallback to session data
    const fipName =
      selectedRawData.fipname ||
      selectedRawData.fipName ||
      "Financial Institution";
    const maskedAccount =
      selectedRawData.maskedAccountNumber ||
      selectedRawData.maskedAccNumber ||
      "N/A";
    const txnId = selectedRawData.txnid || selectedRawData.id;
    const consentId =
      selectedRawData.consentid || selectedRawData.consentRequestId;
    const customerId = selectedRawData.customerId;
    const timestamp = selectedRawData.timestamp || selectedRawData.receivedAt;
    const purpose = selectedRawData.purpose || "Data Access";
    const dataRequested =
      selectedRawData.datarequested || "Account Information";

    return (
      <Dialog
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        title={`${fipName} - Account Details | Account: ${maskedAccount}`}
      >
        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(65vh-120px)]">
          <div className="space-y-6">
            {/* Account Holder Information */}
            {holder && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                  <FaUser className="w-5 h-5 text-[var(--color-on-primary)]" />
                  <h4 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Account Holder
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Name
                    </span>
                    <p className="text-base font-semibold text-[var(--color-on-background)]">
                      {holder.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      PAN
                    </span>
                    <p className="text-base font-mono text-[var(--color-on-background)]">
                      {holder.pan}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Mobile
                    </span>
                    <p className="text-base font-mono text-[var(--color-on-background)]">
                      {holder.mobile}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Date of Birth
                    </span>
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className="w-3 h-3 text-[var(--color-on-surface)] opacity-70" />
                      <p className="text-base text-[var(--color-on-background)]">
                        {holder.dob}
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Address
                    </span>
                    <p className="text-base text-[var(--color-on-background)]">
                      {holder.address}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Email
                    </span>
                    <p className="text-base text-[var(--color-on-background)]">
                      {holder.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      CKYC Compliance
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        holder.ckycCompliance === "YES"
                          ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                          : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                      }`}
                    >
                      {holder.ckycCompliance === "YES" ? (
                        <FaCheckCircle className="w-3 h-3" />
                      ) : (
                        <FaTimesCircle className="w-3 h-3" />
                      )}
                      {holder.ckycCompliance}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Summary */}
            {summary && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-4">
                  <FaRupeeSign className="w-5 h-5 text-[var(--color-on-success)]" />
                  <h4 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Account Summary
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Current Balance
                    </span>
                    <p className="text-xl font-bold text-[var(--color-on-success)]">
                      {formatCurrency(summary.currentBalance, summary.currency)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Account Type
                    </span>
                    <p className="text-base font-semibold text-[var(--color-on-background)] capitalize">
                      {summary.type?.toLowerCase()} -{" "}
                      {summary.accountType?.toLowerCase()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        summary.status === "ACTIVE"
                          ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                          : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                      }`}
                    >
                      {summary.status === "ACTIVE" ? (
                        <FaCheckCircle className="w-3 h-3" />
                      ) : (
                        <FaTimesCircle className="w-3 h-3" />
                      )}
                      {summary.status}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Branch
                    </span>
                    <p className="text-base font-semibold text-[var(--color-on-background)]">
                      {summary.branch}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      IBAN Code
                    </span>
                    <p className="text-base font-mono text-[var(--color-on-background)]">
                      {summary.ifscCode}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Opening Date
                    </span>
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className="w-3 h-3 text-[var(--color-on-surface)] opacity-70" />
                      <p className="text-base text-[var(--color-on-background)]">
                        {summary.openingDate}
                      </p>
                    </div>
                  </div>
                  {summary.drawingLimit && summary.drawingLimit !== "0.00" && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Drawing Limit
                      </span>
                      <p className="text-base font-semibold text-[var(--color-on-background)]">
                        {formatCurrency(summary.drawingLimit, summary.currency)}
                      </p>
                    </div>
                  )}
                  {summary.currentODLimit &&
                    summary.currentODLimit !== "0.00" && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                          Tawarruq Limit
                        </span>
                        <p className="text-base font-semibold text-[var(--color-on-background)]">
                          {formatCurrency(
                            summary.currentODLimit,
                            summary.currency
                          )}
                        </p>
                      </div>
                    )}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Last Updated
                    </span>
                    <p className="text-sm text-[var(--color-on-background)]">
                      {new Date(summary.balanceDateTime).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Period Info */}
            {transactions && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-5 border border-orange-100">
                <div className="flex items-center gap-2 mb-4">
                  <FaCalendarAlt className="w-5 h-5 text-orange-600" />
                  <h4 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Transaction Period
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      Start Date
                    </span>
                    <p className="text-base font-semibold text-[var(--color-on-background)]">
                      {transactions.startDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                      End Date
                    </span>
                    <p className="text-base font-semibold text-[var(--color-on-background)]">
                      {transactions.endDate}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Metadata */}
            {(txnId || consentId || customerId) && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                  <FaInfoCircle className="w-5 h-5 text-purple-600" />
                  <h4 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Transaction Info
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {txnId && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Transaction ID
                      </span>
                      <p className="text-sm font-mono text-[var(--color-on-background)] break-all">
                        {txnId}
                      </p>
                    </div>
                  )}
                  {consentId && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Consent ID
                      </span>
                      <p className="text-sm font-mono text-[var(--color-on-background)] break-all">
                        {consentId}
                      </p>
                    </div>
                  )}
                  {customerId && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Customer ID
                      </span>
                      <p className="text-sm font-mono text-[var(--color-on-background)]">
                        {customerId}
                      </p>
                    </div>
                  )}
                  {dataRequested && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Data Requested
                      </span>
                      <p className="text-sm text-[var(--color-on-background)]">
                        {dataRequested}
                      </p>
                    </div>
                  )}
                  {timestamp && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Timestamp
                      </span>
                      <p className="text-sm text-[var(--color-on-background)]">
                        {new Date(timestamp).toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                  {purpose && (
                    <div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
                        Purpose
                      </span>
                      <p className="text-sm text-[var(--color-on-background)]">
                        {purpose}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="py-4 border-t border-[var(--color-muted)] border-opacity-30 bg-[var(--color-background)]">
          <div className="flex justify-end gap-3">
            <Button
              variant="danger"
              onClick={() => setShowDataModal(false)}
              // className="px-4 py-2 bg-[var(--color-background)]0 text-white rounded-lg hover:bg-[var(--color-on-surface)] opacity-70 transition-all duration-200"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(selectedRawData, null, 2)],
                  {
                    type: "application/json",
                  }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `aa-raw-data-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Raw data downloaded successfully");
              }}
              variant="primary"
              // className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-200"
            >
              <FaDownload className="w-4 h-4" />
              Download Raw Data
            </Button>
          </div>
        </div>
      </Dialog>
    );
  };

  // Render consent requests content
  const renderConsentRequestsContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Spinner theme="dark" />
            <p className="text-sm text-[var(--color-muted)]">
              Loading consent requests...
            </p>
          </div>
        </div>
      );
    }

    // Filter logic: Hide pending requests if there are non-pending requests
    const nonPendingRequests = consentRequests.filter(
      (request) => request.consentStatus !== "PENDING"
    );
    const pendingRequests = consentRequests.filter(
      (request) => request.consentStatus === "PENDING"
    );

    // Show non-pending requests if they exist, otherwise show all (including pending)
    const filteredRequests =
      nonPendingRequests.length > 0 ? consentRequests : consentRequests;

    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-[var(--color-primary)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <FaDatabase className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-1.5">
            No consent requests found
          </h3>
          <p className="text-xs text-[var(--color-on-surface)] opacity-60 max-w-sm mx-auto mb-5">
            Create a new consent request to initiate the data access process.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FaSync className="w-3.5 h-3.5" />}
              onClick={() =>
                handleCreateAndSendEmail({ brandId: brandId || "" })
              }
            >
              Create & Send Email
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FaCopy className="w-3.5 h-3.5" />}
              onClick={() => handleCreateAndCopyUrl({ brandId: brandId || "" })}
            >
              Create & Copy URL
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<FaEdit className="w-3.5 h-3.5" />}
              onClick={() => setShowManualConsentModal(true)}
            >
              Manual Consent
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Show info if pending requests are hidden */}
        {nonPendingRequests.length > 0 && pendingRequests.length > 0 && (
          <div className="mb-3 p-2.5 bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] border-opacity-30 rounded-lg">
            <p className="text-xs text-[var(--color-on-primary)] opacity-80 flex items-start gap-2">
              <FaInfoCircle className="w-3.5 h-3.5 text-[var(--color-on-primary)] flex-shrink-0 mt-0.5" />
              <span>
                Showing {nonPendingRequests.length} processed request(s).
                {pendingRequests.length} pending request(s) are hidden.
              </span>
            </p>
          </div>
        )}

        {/* Show email send and copy buttons if there are only pending requests */}
        {nonPendingRequests.length === 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-center">
              <h4 className="text-sm font-semibold text-amber-900 mb-1.5 flex items-center justify-center gap-1.5">
                <FaClock className="w-3.5 h-3.5" />
                Pending Consent Requests
              </h4>
              <p className="text-xs text-amber-700 mb-3 opacity-90">
                You have {pendingRequests.length} pending request(s). Send a
                reminder or copy the URL.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FaSync className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    if (!customerId) {
                      toast.error("Customer ID not found");
                      return;
                    }

                    try {
                      const response =
                        await AAApiService.sendConsentRequestEmail(customerId);
                      if (response.success) {
                        toast.success(
                          "Consent reminder email sent successfully!"
                        );
                        // Refresh consent requests to show any updates
                        fetchConsentRequests();
                      } else {
                        toast.error(
                          response.message || "Failed to send reminder email"
                        );
                      }
                    } catch (error) {
                      console.error("Error sending reminder email:", error);
                      toast.error("Failed to send reminder email");
                    }
                  }}
                >
                  Send Reminder
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<FaCopy className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    if (!customerId) {
                      toast.error("Customer ID not found");
                      return;
                    }

                    // Use the existing pending consent URL if available
                    const existingPendingConsent = pendingRequests[0];
                    if (existingPendingConsent?.redirectionUrl) {
                      try {
                        await navigator.clipboard.writeText(
                          existingPendingConsent.redirectionUrl
                        );
                        toast.success(
                          "Existing consent URL copied to clipboard!"
                        );
                      } catch (clipboardError) {
                        console.warn(
                          "Clipboard API not supported:",
                          clipboardError
                        );
                        prompt(
                          "Copy this consent URL:",
                          existingPendingConsent.redirectionUrl
                        );
                        toast.success("Consent URL is ready to share!");
                      }
                    } else {
                      // Fallback to generate new URL if existing one doesn't have URL
                      try {
                        const response = await AAApiService.generateConsentUrl(
                          customerId,
                          brandId || ""
                        );
                        if (response.success && response.consentUrl) {
                          try {
                            await navigator.clipboard.writeText(
                              response.consentUrl
                            );
                            toast.success("Consent URL copied to clipboard!");
                          } catch (clipboardError) {
                            console.warn(
                              "Clipboard API not supported:",
                              clipboardError
                            );
                            prompt(
                              "Copy this consent URL:",
                              response.consentUrl
                            );
                            toast.success("Consent URL is ready to share!");
                          }
                          fetchConsentRequests();
                        } else {
                          toast.error(
                            response.message || "Failed to get consent URL"
                          );
                        }
                      } catch (error) {
                        console.error("Error getting consent URL:", error);
                        toast.error("Failed to get consent URL");
                      }
                    }
                  }}
                >
                  Copy URL
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FaEdit className="w-3.5 h-3.5" />}
                  onClick={() => setShowManualConsentModal(true)}
                >
                  Manual
                </Button>
              </div>
            </div>
          </div>
        )}

        {filteredRequests.length > 0 && nonPendingRequests.length !== 0 && (
          <div className="mb-3 flex flex-wrap gap-2 justify-end">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FaSync className="w-3.5 h-3.5" />}
              onClick={() =>
                handleCreateAndSendEmail({ brandId: brandId || "" })
              }
            >
              Create & Email
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FaCopy className="w-3.5 h-3.5" />}
              onClick={() => handleCreateAndCopyUrl({ brandId: brandId || "" })}
            >
              Create & Copy
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<FaEdit className="w-3.5 h-3.5" />}
              onClick={() => setShowManualConsentModal(true)}
            >
              Manual
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-muted)] border-opacity-20">
                <th className=" text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Handle ID
                </th>
                <th className=" py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Mobile
                </th>
                <th className=" py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Retry
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-10 ">
              {filteredRequests.map((consent) => (
                <tr
                  key={consent.id}
                  className={`transition-all duration-200 hover:bg-[var(--color-surface)] hover:bg-opacity-50 ${
                    selectedConsent?.id === consent.id
                      ? "bg-[var(--color-primary)] bg-opacity-5"
                      : ""
                  }`}
                >
                  <td className=" py-3 whitespace-nowrap">
                    {getStatusBadge(consent.consentStatus)}
                  </td>
                  <td className=" py-3 whitespace-nowrap px-2">
                    <div className="text-[10px] font-medium text-[var(--color-on-background)]">
                      {consent.aaCustomerHandleId || "-"}
                    </div>
                  </td>
                  <td className=" py-3 whitespace-nowrap px-2">
                    <div className="text-[10px] text-[var(--color-on-surface)] opacity-70">
                      {consent.aaCustomerMobile || "-"}
                    </div>
                  </td>
                  <td className=" py-3 whitespace-nowrap">
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                      {consent.retryCount > 0 ? (
                        <Badge variant="success" className="gap-1">
                          <FaSync className="w-2.5 h-2.5" />
                          {consent.retryCount}
                        </Badge>
                      ) : (
                        <span className="text-[var(--color-on-surface)] opacity-50">
                          -
                        </span>
                      )}
                    </div>
                  </td>
                  <td className=" py-3 ">
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70 px-2">
                      <p>
                        {consent.createdAt
                          ? dayjs(consent.createdAt).format(
                              "MMM D, YYYY h:mm A"
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </td>
                  <td className=" py-3 ">
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70 px-2">
                      <p>
                        {consent.updatedAt
                          ? dayjs(consent.updatedAt).format(
                              "MMM D, YYYY h:mm A"
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </td>
                  <td className="">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConsentSelect(consent)}
                      >
                        View
                      </Button>

                      {consent.redirectionUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(consent.redirectionUrl, "_blank")
                          }
                        >
                          Open
                        </Button>
                      )}

                      {/* Additional actions for pending requests */}
                      {consent.consentStatus === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!customerId) {
                                toast.error("Customer ID not found");
                                return;
                              }

                              try {
                                const response =
                                  await AAApiService.sendConsentRequestEmail(
                                    customerId
                                  );
                                if (response.success) {
                                  toast.success(
                                    "Reminder email sent successfully!"
                                  );
                                } else {
                                  toast.error(
                                    response.message ||
                                      "Failed to send reminder email"
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error sending reminder email:",
                                  error
                                );
                                toast.error("Failed to send reminder email");
                              }
                            }}
                            title="Send reminder email"
                          >
                            Resend
                          </Button>

                          {consent.redirectionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    consent.redirectionUrl!
                                  );
                                  toast.success(
                                    "Consent URL copied to clipboard!"
                                  );
                                } catch (clipboardError) {
                                  console.warn(
                                    "Clipboard API not supported:",
                                    clipboardError
                                  );
                                  prompt(
                                    "Copy this consent URL:",
                                    consent.redirectionUrl
                                  );
                                  toast.success(
                                    "Consent URL is ready to share!"
                                  );
                                }
                              }}
                              title="Copy consent URL"
                            >
                              Copy
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render data sessions content
  const renderDataSessionsContent = () => {
    if (!selectedConsent) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-[var(--color-primary)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <FaDatabase className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-1.5">
            No consent selected
          </h3>
          <p className="text-xs text-[var(--color-on-surface)] opacity-60 max-w-sm mx-auto">
            Select a consent request from the Consents tab to view its data
            sessions.
          </p>
        </div>
      );
    }

    return (
      <div>
        {/* Selected Consent Info */}
        <div className="bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] border-opacity-30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 className="font-semibold text-[var(--color-on-primary)] text-xs mb-1">
                Selected Consent
                {/* {JSON.stringify(selectedConsent)} */}
              </h4>
              <p className="text-xs text-[var(--color-on-primary)] opacity-70 flex items-center gap-2">
                {selectedConsent.aaCustomerHandleId}
                <span>•</span>
                {getStatusBadge(selectedConsent.consentStatus)}
              </p>
            </div>

            <div className="flex gap-2">
              {selectedConsent.consentStatus === "ACTIVE" && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <FaDownload
                      className={`w-3.5 h-3.5 ${
                        isFetchingPeriodicData ? "animate-spin" : ""
                      }`}
                    />
                  }
                  onClick={handleFetchPeriodicData}
                  disabled={isFetchingPeriodicData}
                  title="Fetch latest periodic financial data"
                >
                  {isFetchingPeriodicData ? "Fetching..." : "Fetch Data"}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                leftIcon={
                  <FaSync
                    className={`w-3.5 h-3.5 ${
                      isLoadingDataSessions ? "animate-spin" : ""
                    }`}
                  />
                }
                onClick={() => fetchDataSessions(selectedConsent.id)}
                disabled={isLoadingDataSessions}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
        {renderDataSessionsList()}
      </div>
    );
  };

  // Render data sessions list
  const renderDataSessionsList = () => {
    if (isLoadingDataSessions) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Spinner theme="dark" />
            <p className="text-sm text-[var(--color-muted)]">
              Loading data sessions...
            </p>
          </div>
        </div>
      );
    }

    if (dataSessions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-[var(--color-primary)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <FaDatabase className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-1.5">
            No data sessions found
          </h3>
          <p className="text-xs text-[var(--color-on-surface)] opacity-60 max-w-sm mx-auto">
            No financial data has been received for this consent request yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {dataSessions.map((session, idx) => (
          <Card
            key={session.id || idx}
            variant="outlined"
            padding="lg"
            className="hover:shadow-md transition-all duration-200 hover:border-[var(--color-primary)] hover:border-opacity-30"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h5 className="font-semibold text-[var(--color-on-background)] text-sm mb-1">
                  {session.fipName || session.fipId}
                </h5>
                <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-2">
                  {session.dataType} •{" "}
                  {session.maskedAccountNumber || "No account number"}
                </p>
                {/* Available Data Types */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-[var(--color-on-surface)] opacity-60">
                    Available:
                  </span>
                  {session.jsonData && (
                    <Badge variant="primary" size="sm" className="gap-1">
                      <FaDownload className="w-2 h-2" />
                      JSON
                    </Badge>
                  )}
                  {session.pdfData && (
                    <Badge variant="danger" size="sm" className="gap-1">
                      <FaFilePdf className="w-2 h-2" />
                      PDF
                    </Badge>
                  )}
                  {session.csvData && (
                    <Badge variant="success" size="sm" className="gap-1">
                      <FaDownload className="w-2 h-2" />
                      CSV
                    </Badge>
                  )}
                  {session.xmlData && (
                    <Badge variant="secondary" size="sm" className="gap-1">
                      <FaDownload className="w-2 h-2" />
                      XML
                    </Badge>
                  )}
                  {!session.jsonData &&
                    !session.pdfData &&
                    !session.csvData &&
                    !session.xmlData && (
                      <Badge variant="outline" size="sm">
                        No data
                      </Badge>
                    )}
                </div>
              </div>
              <Badge
                variant={session.status === "RECEIVED" ? "success" : "warning"}
                size="sm"
              >
                {session.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <span className="text-[var(--color-on-surface)] opacity-60 block text-[10px] mb-0.5">
                  Received
                </span>
                <p className="font-medium text-[var(--color-on-background)] text-xs">
                  {session.receivedAt
                    ? formatDateWithTime(session.receivedAt)
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-[var(--color-on-surface)] opacity-60 block text-[10px] mb-0.5">
                  Data Type
                </span>
                <p className="font-medium text-[var(--color-on-background)] text-xs">
                  {session.dataType}
                </p>
              </div>
              <div>
                <span className="text-[var(--color-on-surface)] opacity-60 block text-[10px] mb-0.5">
                  Retry Count
                </span>
                <p className="font-medium text-[var(--color-on-background)] text-xs">
                  {session.retryCount}
                </p>
              </div>
              <div>
                <span className="text-[var(--color-on-surface)] opacity-60 block text-[10px] mb-0.5">
                  Actions
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {session.jsonData && (
                    <button
                      onClick={() => {
                        const blob = new Blob(
                          [JSON.stringify(session.jsonData, null, 2)],
                          {
                            type: "application/json",
                          }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `aa-data-${
                          session.fipId
                        }-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);

                        toast.success("JSON downloaded successfully");
                      }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:bg-opacity-10 rounded transition-all duration-200 font-medium"
                      title="Download JSON data"
                    >
                      <FaDownload className="w-2.5 h-2.5" />
                      JSON
                    </button>
                  )}
                  {session.pdfData && (
                    <button
                      onClick={() => {
                        try {
                          if (!session.pdfData) return;

                          // Parse the JSON string first (remove quotes and handle escaping)
                          let base64Data = session.pdfData;

                          // Check if the data is wrapped in quotes (JSON string format)
                          if (
                            base64Data.startsWith('"') &&
                            base64Data.endsWith('"')
                          ) {
                            // Parse as JSON to handle escaped quotes and get the actual base64 string
                            base64Data = JSON.parse(base64Data);
                          }

                          // Clean up any remaining quotes or whitespace
                          base64Data = base64Data.replace(/['"]/g, "").trim();

                          // Decode base64 PDF data
                          const binaryString = atob(base64Data);
                          const bytes = new Uint8Array(binaryString.length);
                          for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                          }

                          const blob = new Blob([bytes], {
                            type: "application/pdf",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-statement-${
                            session.fipId
                          }-${Date.now()}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);

                          toast.success("PDF downloaded successfully");
                        } catch (error) {
                          console.error("Error downloading PDF:", error);
                          console.error(
                            "PDF data format:",
                            session.pdfData?.substring(0, 100) + "..."
                          );
                          toast.error(
                            "Failed to download PDF - Invalid format or corrupted data"
                          );
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-on-error)] hover:text-[var(--color-on-error)] hover:bg-[var(--color-error)] bg-opacity-10 rounded transition-all duration-200"
                      title="Download PDF statement"
                    >
                      <FaFilePdf className="w-3 h-3" />
                      PDF
                    </button>
                  )}
                  {session.csvData && (
                    <button
                      onClick={() => {
                        if (!session.csvData) return;

                        const blob = new Blob([session.csvData], {
                          type: "text/csv",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `aa-data-${
                          session.fipId
                        }-${Date.now()}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);

                        toast.success("CSV downloaded successfully");
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-on-success)] hover:text-[var(--color-on-success)] hover:bg-[var(--color-success)] bg-opacity-10 rounded transition-all duration-200"
                      title="Download CSV data"
                    >
                      <FaDownload className="w-3 h-3" />
                      CSV
                    </button>
                  )}
                  {session.xmlData && (
                    <button
                      onClick={() => {
                        if (!session.xmlData) return;

                        const blob = new Blob([session.xmlData], {
                          type: "application/xml",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `aa-data-${
                          session.fipId
                        }-${Date.now()}.xml`;
                        a.click();
                        URL.revokeObjectURL(url);

                        toast.success("XML downloaded successfully");
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-all duration-200"
                      title="Download XML data"
                    >
                      <FaDownload className="w-3 h-3" />
                      XML
                    </button>
                  )}
                  {session.reportData && (
                    <button
                      onClick={() => {
                        try {
                          if (!session.reportData) return;

                          // Parse the JSON string first (remove quotes and handle escaping)
                          let base64Data = session.reportData;

                          // Check if the data is wrapped in quotes (JSON string format)
                          if (
                            base64Data.startsWith('"') &&
                            base64Data.endsWith('"')
                          ) {
                            // Parse as JSON to handle escaped quotes and get the actual base64 string
                            base64Data = JSON.parse(base64Data);
                          }

                          // Clean up any remaining quotes or whitespace
                          base64Data = base64Data.replace(/['"]/g, "").trim();

                          // Decode base64 to binary
                          const byteCharacters = atob(base64Data);
                          const byteNumbers = new Array(byteCharacters.length)
                            .fill(0)
                            .map((_, i) => byteCharacters.charCodeAt(i));
                          const byteArray = new Uint8Array(byteNumbers);

                          // Create Blob and download
                          const blob = new Blob([byteArray], {
                            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-report-${
                            session.fipId
                          }-${Date.now()}.xlsx`;
                          a.click();
                          URL.revokeObjectURL(url);

                          toast.success("Report downloaded successfully");
                        } catch (error) {
                          console.error("Error downloading report:", error);
                          console.error(
                            "Report data format:",
                            session.reportData?.substring(0, 100) + "..."
                          );
                          toast.error(
                            "Failed to download report - Invalid format or corrupted data"
                          );
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:text-[var(--color-warning)] hover:bg-orange-50 rounded transition-all duration-200"
                      title="Download Report data"
                    >
                      <FaDownload className="w-3 h-3" />
                      Report
                    </button>
                  )}
                  {!session.jsonData &&
                    !session.pdfData &&
                    !session.csvData &&
                    !session.xmlData &&
                    !session.reportData && (
                      <span className="text-xs text-[var(--color-on-surface)] opacity-50 italic">
                        No downloads available
                      </span>
                    )}
                  {/* View Raw Data button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FaInfoCircle className="w-3 h-3" />}
                    onClick={() => showRawDataModal(session)}
                    title="View detailed account information"
                  >
                    View Details
                  </Button>
                  {/* Download All button - show when multiple formats are available */}
                  {[
                    session.jsonData,
                    session.pdfData,
                    session.csvData,
                    session.xmlData,
                    session.reportData,
                  ].filter(Boolean).length > 1 && (
                    <button
                      onClick={() => {
                        let completed = 0;

                        // Download JSON
                        if (session.jsonData) {
                          const blob = new Blob(
                            [JSON.stringify(session.jsonData, null, 2)],
                            { type: "application/json" }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-data-${
                            session.fipId
                          }-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          completed++;
                        }

                        // Download PDF
                        if (session.pdfData) {
                          try {
                            // Parse the JSON string first (remove quotes and handle escaping)
                            let base64Data = session.pdfData;

                            // Check if the data is wrapped in quotes (JSON string format)
                            if (
                              base64Data.startsWith('"') &&
                              base64Data.endsWith('"')
                            ) {
                              // Parse as JSON to handle escaped quotes and get the actual base64 string
                              base64Data = JSON.parse(base64Data);
                            }

                            // Clean up any remaining quotes or whitespace
                            base64Data = base64Data.replace(/['"]/g, "").trim();

                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                              bytes[i] = binaryString.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], {
                              type: "application/pdf",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `aa-statement-${
                              session.fipId
                            }-${Date.now()}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                            completed++;
                          } catch (error) {
                            console.error(
                              "Error downloading PDF in bulk:",
                              error
                            );
                          }
                        }

                        // Download CSV
                        if (session.csvData) {
                          const blob = new Blob([session.csvData], {
                            type: "text/csv",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-data-${
                            session.fipId
                          }-${Date.now()}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          completed++;
                        }

                        // Download XML
                        if (session.xmlData) {
                          const blob = new Blob([session.xmlData], {
                            type: "application/xml",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-data-${
                            session.fipId
                          }-${Date.now()}.xml`;
                          a.click();
                          URL.revokeObjectURL(url);
                          completed++;
                        }

                        // Download xlxs
                        if (session.reportData) {
                          // Parse the JSON string first (remove quotes and handle escaping)
                          let base64Data = session.reportData;

                          // Check if the data is wrapped in quotes (JSON string format)
                          if (
                            base64Data.startsWith('"') &&
                            base64Data.endsWith('"')
                          ) {
                            // Parse as JSON to handle escaped quotes and get the actual base64 string
                            base64Data = JSON.parse(base64Data);
                          }

                          // Clean up any remaining quotes or whitespace
                          base64Data = base64Data.replace(/['"]/g, "").trim();

                          // Decode base64 to binary
                          const byteCharacters = atob(base64Data);
                          const byteNumbers = new Array(byteCharacters.length)
                            .fill(0)
                            .map((_, i) => byteCharacters.charCodeAt(i));
                          const byteArray = new Uint8Array(byteNumbers);

                          // Create Blob and download
                          const blob = new Blob([byteArray], {
                            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `aa-report-${
                            session.fipId
                          }-${Date.now()}.xlsx`;
                          a.click();
                          URL.revokeObjectURL(url);
                          completed++;
                        }

                        if (completed > 0)
                          toast.success(
                            `Downloaded ${completed} files successfully`
                          );
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-indigo-800 hover:bg-indigo-50 rounded transition-all duration-200 border border-indigo-200"
                      title="Download all available formats"
                    >
                      <FaDownload className="w-3 h-3" />
                      All (
                      {
                        [
                          session.jsonData,
                          session.pdfData,
                          session.csvData,
                          session.xmlData,
                          session.reportData,
                        ].filter(Boolean).length
                      }
                      )
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Details Summary */}
            {session.accountDetails && (
              <div className="mt-4 p-3 bg-[var(--color-surface)] rounded-lg">
                <h6 className="text-sm font-medium text-[var(--color-on-background)] mb-2">
                  Account Summary
                </h6>
                <div className="text-xs text-[var(--color-muted)] space-y-1">
                  {Array.isArray(session.accountDetails) &&
                    session.accountDetails.length > 0 && (
                      <p>Accounts: {session.accountDetails.length}</p>
                    )}
                  {session.transactionSummary &&
                    Array.isArray(session.transactionSummary) && (
                      <p>
                        Transaction Summary: {session.transactionSummary.length}{" "}
                        accounts
                      </p>
                    )}
                </div>
              </div>
            )}

            {session.jsonData &&
              session.dataType === "JSON, Report, Transaction" && (
                <div className="mt-4 space-y-3">
                  <CustomerReportOverview jsonData={session.jsonData} />
                </div>
              )}

            {session.jsonData && session.dataType === "PDF, JSON, JSON" && (
              <CustomerStatementOverview pdfData={session.jsonData} />
            )}
          </Card>
        ))}
        

        {/* Financial Comparison - Show if we have both report and statement data */}
        {(() => {
          const reportSession = dataSessions.find(
            (s) => s.dataType === "JSON, Report, Transaction" && s.jsonData
          );
          const statementSession = dataSessions.find(
            (s) => s.dataType === "PDF, JSON, JSON" && s.jsonData
          );

          if (reportSession && statementSession) {
            return (
              <CustomerFinancialComparison
                reportData={reportSession.jsonData}
                statementData={statementSession.jsonData}
              />
            );
          }
          return null;
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="elevated" padding="none">
        <CardHeader className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-muted)] border-opacity-30">
          <div>
            <CardTitle className="flex items-center gap-2 text-[var(--color-on-background)] text-base">
              <div className="w-7 h-7 rounded bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center">
                <FaDatabase className="w-3.5 h-3.5 text-[var(--color-on-primary)]" />
              </div>
              Account Aggregator
            </CardTitle>
            <CardDescription className="text-[var(--color-on-surface)] opacity-60 text-xs mt-0.5">
              Financial data consents and access management
            </CardDescription>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="px-4 py-0 bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-20">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("consents")}
              className={`py-2.5 px-1 border-b-2 font-medium text-xs transition-all duration-200 ${
                activeTab === "consents"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-on-surface)] opacity-60 hover:opacity-100"
              }`}
            >
              Consents ({consentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`py-2.5 px-1 border-b-2 font-medium text-xs transition-all duration-200 ${
                activeTab === "data"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-on-surface)] opacity-60 hover:opacity-100"
              }`}
            >
              Data {selectedConsent ? `(${dataSessions.length})` : ""}
            </button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {activeTab === "consents" && (
            <div>{renderConsentRequestsContent()}</div>
          )}

          {activeTab === "data" && <div>{renderDataSessionsContent()}</div>}
        </CardContent>
      </Card>

      {/* Data Modal */}
      {renderDataModal()}

      {/* Manual Consent Modal */}
      {showManualConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-muted)] border-opacity-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaEdit className="w-5 h-5 text-[var(--color-on-primary)]" />
                  <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Create Manual Consent
                  </h3>
                </div>
                <button
                  onClick={() => setShowManualConsentModal(false)}
                  disabled={manualConsentForm.isCreatingManual}
                  className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors duration-200"
                >
                  <FaTimes className="w-4 h-4 text-[var(--color-on-surface)] opacity-70" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--color-muted)] mb-4">
                    Create a consent request with custom Handle ID and Mobile
                    number.
                  </p>
                </div>
                <div>
                  <Input
                    label="Mobile Number"
                    placeholder="9999999999"
                    value={manualConsentForm.mobile}
                    onChange={(e) =>
                      setManualConsentForm((prev) => ({
                        ...prev,
                        mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    helperText="10-digit mobile number"
                    disabled={manualConsentForm.isCreatingManual}
                    maxLength={10}
                    fullWidth
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-muted)] border-opacity-30 bg-[var(--color-surface)]">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManualConsentModal(false);
                    setManualConsentForm({
                      handleId: "",
                      mobile: "",
                      isCreatingManual: false,
                    });
                  }}
                  disabled={manualConsentForm.isCreatingManual}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleManualConsentCreation}
                  disabled={
                    manualConsentForm.isCreatingManual ||
                    !manualConsentForm.mobile.trim()
                  }
                  leftIcon={
                    manualConsentForm.isCreatingManual ? (
                      <FaSync className="w-4 h-4 animate-spin" />
                    ) : (
                      <FaEdit className="w-4 h-4" />
                    )
                  }
                >
                  {manualConsentForm.isCreatingManual
                    ? "Creating..."
                    : "Create Consent"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
