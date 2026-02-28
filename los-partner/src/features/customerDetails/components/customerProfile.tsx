import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatDateWithTime } from "../../../lib/utils";
import {
  MdVerified,
  MdEmail,
  MdCalendarToday,
  MdContentCopy,
} from "react-icons/md";
import { PageIdToPageNameMap } from "../../../constant/redirect";
import { FaCheckCircle, FaUser } from "react-icons/fa";
import Avatar from "../../../common/ui/avatar";
import { Customer } from "../../../shared/types/customers";
import {
  getCustomerById,
  skipOnboardingStep,
  fetchPhoneAgeApi,
} from "../../../shared/services/api/customer.api";
import Dialog from "../../../common/dialog";
import { useToast } from "../../../context/toastContext";
import { Button } from "../../../common/ui/button";
import { UserStatusReasonsDialog } from "./UserStatusReasonsDialog";
import { AlternatePhoneNumbers } from "./alternatePhoneNumbers";
import { LoanEvaluationDialog } from "./LoanEvaluationDialog";
import { getUserStatusDisplay } from "../../../constant/enum";

export function CustomerProfile() {
  const { brandId, customerId } = useParams();
  const [customer, setCustomer] = useState<null | Customer>(null);
  const [loading, setLoading] = useState(true);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [skipStepNumber, setSkipStepNumber] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [isSkipping, setIsSkipping] = useState(false);
  const { showSuccess, showError } = useToast();
  const [copied, setCopied] = useState(false);
  const [phoneAge, setPhoneAge] = useState<number | null>(null); // New state for phone age
  const [showAge, setShowAge] = useState(false);
  const [isPhoneAgeLoading, setIsPhoneAgeLoading] = useState(false);
  const [isUserStatusReasonsDialogOpen, setIsUserStatusReasonsDialogOpen] =
    useState(false);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        if (customerId && brandId) {
          const response = await getCustomerById(customerId, brandId);
          setCustomer(response);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerData();
  }, [brandId, customerId]);

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

  const handleCopyId = async () => {
    if (customer?.id) {
      try {
        await navigator.clipboard.writeText(customer.id.toUpperCase());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // reset after 2s
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };
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

  const sortedJourneys = customer?.onboardingJourneys
    ? [...customer.onboardingJourneys].sort(
        (a, b) => a.stepNumber - b.stepNumber,
      )
    : [];

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const confirmSkipStep = async () => {
    if (!skipStepNumber || !customerId || !brandId) return;

    setIsSkipping(true);
    try {
      await skipOnboardingStep(customerId, brandId, skipStepNumber, skipReason);

      // Refresh customer data after skipping
      const updatedCustomer = await getCustomerById(customerId, brandId);
      setCustomer(updatedCustomer);

      // Close dialog and reset state
      setIsSkipDialogOpen(false);
      setSkipStepNumber(null);
      setSkipReason("");

      // Show success notification
      showSuccess(
        "Step Skipped Successfully",
        `Onboarding step ${skipStepNumber} has been skipped and the customer's progress has been updated.`,
      );
    } catch (error) {
      console.error("Error skipping onboarding step:", error);
      // Show error notification
      showError(
        "Failed to Skip Step",
        "There was an error skipping the onboarding step. Please try again.",
      );
    } finally {
      setIsSkipping(false);
    }
  };

  const cancelSkipStep = () => {
    setIsSkipDialogOpen(false);
    setSkipStepNumber(null);
    setSkipReason("");
  };

  const handleOpenUserStatusReasons = () => {
    setIsUserStatusReasonsDialogOpen(true);
  };

  const handleUserStatusReasonsSuccess = async () => {
    // Refresh customer data after successful save
    const freshCustomer = await getCustomerById(customerId!, brandId!);
    setCustomer(freshCustomer);
  };

  return (
    <div className="max-w-full overflow-hidden bg-[var(--color-background)] min-h-screen">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-4 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar />
              {!loading && customer?.isPhoneVerified && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--color-success)] rounded-full flex items-center justify-center">
                  <MdVerified className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-on-surface)] truncate">
                  {loading ? (
                    <div className="h-4 bg-[var(--color-muted)] rounded w-36 animate-pulse" />
                  ) : (
                    customer?.userDetails?.firstName || "N/A"
                  )}
                </h2>
              </div>

              {/* Formatted User ID */}
              <p className="text-xs text-[var(--color-on-surface)] opacity-70 truncate">
                {loading ? (
                  <div className="h-3 bg-[var(--color-muted)] rounded w-28 animate-pulse" />
                ) : (
                  customer?.formattedUserId
                )}
              </p>

              {/* Internal ID & Copy */}
              <div className="flex items-center space-x-2 text-xs text-[var(--color-on-surface)] opacity-70 truncate mt-1">
                {loading ? (
                  <div className="h-3 bg-[var(--color-muted)] rounded w-28 animate-pulse" />
                ) : (
                  <>
                    <span className="truncate">
                      ID: #{customer?.id.split("-")[0].toUpperCase()}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-[var(--color-muted)] rounded transition"
                      title="Copy ID"
                    >
                      <MdContentCopy className="w-3.5 h-3.5 text-[var(--color-on-surface)] opacity-70 hover:opacity-100" />
                    </button>
                    {copied && (
                      <span className="text-[var(--color-success)]">
                        Copied!
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Status & Verified Badge */}
              {!loading && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
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
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] bg-[var(--color-primary-light)] text-[var(--color-on-primary)] rounded-full">
                      <FaCheckCircle className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          {/* Email */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MdEmail className="w-4 h-4 text-[var(--color-on-surface)]" />
                <span className="text-sm font-medium text-[var(--color-on-surface)]">
                  Email
                </span>
              </div>
              {loading ? (
                <div className="h-6 w-20 bg-[var(--color-muted)] rounded animate-pulse" />
              ) : (
                <div className="flex space-x-2">
                  {customer?.isEmailVerified && (
                    <span className="inline-flex items-center space-x-1 text-xs px-3 py-1 rounded-full bg-[var(--color-success)] text-white font-medium">
                      <MdVerified className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  )}
                  {customer?.googleId && (
                    <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)] font-medium">
                      Google
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--color-on-surface)] break-all">
              {loading ? (
                <div className="h-4 bg-[var(--color-muted)] rounded w-48 animate-pulse" />
              ) : (
                customer?.email || "No email provided"
              )}
            </p>
          </div>

          {/* Join Date */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-4 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <MdCalendarToday className="w-4 h-4 text-[var(--color-on-surface)]" />
              <span className="text-sm font-medium text-[var(--color-on-surface)]">
                Member Since
              </span>
            </div>
            <p className="text-sm text-[var(--color-on-surface)]">
              {loading ? (
                <div className="h-4 bg-[var(--color-muted)] rounded w-40 animate-pulse" />
              ) : (
                formatDateWithTime(customer?.createdAt!)
              )}
            </p>
          </div>
        </div>

        {/* Phone Numbers (Primary + Alternate) */}
        <div className="mt-6">
          <AlternatePhoneNumbers
            primaryPhone={customer?.phoneNumber}
            isPrimaryPhoneVerified={customer?.isPhoneVerified}
            onFetchPhoneAge={fetchPhoneAge}
            phoneAge={phoneAge}
            showAge={showAge}
            isPhoneAgeLoading={isPhoneAgeLoading}
          />
        </div>
        <Button onClick={handleOpenUserStatusReasons} variant="secondary">
          <div className="flex items-center gap-1">
            {customer?.status_id && (
              <span className="capitalize">
                {getUserStatusDisplay(customer.status_id)}
              </span>
            )}

            <span className="text-xs font-normal text-gray-500">
              (Click to View/Edit)
            </span>
          </div>
        </Button>
      </div>{" "}
      {/* Onboarding Journey */}
      {loading && (
        <div className="mt-6 bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-6 space-y-4 animate-pulse shadow-sm">
          <div className="h-5 bg-[var(--color-muted)] rounded w-1/3" />
          <div className="h-16 bg-[var(--color-muted)] rounded-[var(--radius-brand)]" />
          <div className="h-16 bg-[var(--color-muted)] rounded-[var(--radius-brand)]" />
          <div className="h-16 bg-[var(--color-muted)] rounded-[var(--radius-brand)]" />
        </div>
      )}
      {!loading && sortedJourneys.length > 0 && (
        <div className="mt-6 bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-4 shadow-sm">
          {/* Compact Header with Stats */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-on-surface)]">
              Onboarding Progress
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[var(--color-on-success)]">
                  {customer?.onboardingStep || 0}
                </span>
                <span className="text-[var(--color-on-surface)] opacity-60">
                  /
                </span>
                <span className="text-[var(--color-on-surface)] opacity-60">
                  12
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-on-primary)] bg-[var(--color-muted)] px-2 py-1 rounded">
                {Math.round(((customer?.onboardingStep || 0) / 12) * 100)}%
              </span>
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="w-full bg-[var(--color-muted)] rounded-full h-2 mb-3">
            <div
              className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-active)] h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((customer?.onboardingStep || 0) / 12) * 100}%`,
              }}
            />
          </div>

          {/* Compact Journey List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedJourneys.map((journey, index) => {
              const previous = index > 0 ? sortedJourneys[index - 1] : null;
              const diffMs = previous
                ? new Date(journey.createdAt).getTime() -
                  new Date(previous.createdAt).getTime()
                : 0;

              return (
                <div
                  key={journey.id}
                  className="flex items-center justify-between border border-[var(--color-muted)] rounded-lg p-2 hover:bg-[var(--color-muted)] hover:bg-opacity-30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-primary-contrast)] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {journey.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-on-surface)] truncate">
                        {PageIdToPageNameMap[journey.stepNumber]}
                      </p>
                      <p className="text-[10px] text-[var(--color-on-surface)] opacity-50">
                        {formatDateWithTime(journey.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {diffMs > 0 && (
                      <span className="text-[10px] text-[var(--color-on-surface)] opacity-50 bg-[var(--color-muted)] px-1.5 py-0.5 rounded">
                        +{formatDuration(diffMs)}
                      </span>
                    )}
                    <FaCheckCircle className="w-3.5 h-3.5 text-[var(--color-on-success)]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Next Steps */}
          {(customer?.onboardingStep || 0) < 12 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
              <h4 className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-2">
                Next: {PageIdToPageNameMap[(customer?.onboardingStep || 0) + 1]}
              </h4>
            </div>
          )}
        </div>
      )}
      {/* User Status Brand Reasons Dialog */}
      <UserStatusReasonsDialog
        isOpen={isUserStatusReasonsDialogOpen}
        onClose={() => setIsUserStatusReasonsDialogOpen(false)}
        brandId={brandId!}
        customerId={customerId!}
        customer={customer}
        onSuccess={handleUserStatusReasonsSuccess}
      />
      {/* Loan Evaluation Dialog */}
      <LoanEvaluationDialog
        isOpen={isEvaluationDialogOpen}
        onClose={() => setIsEvaluationDialogOpen(false)}
      />
      {/* Skip Step Confirmation Dialog */}
      <Dialog
        isOpen={isSkipDialogOpen}
        onClose={cancelSkipStep}
        title="Skip Onboarding Step"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-[var(--color-on-surface)]">
            <p className="mb-2">
              You are about to skip step <strong>{skipStepNumber}</strong>:
            </p>
            <p className="font-medium text-[var(--color-on-primary)] mb-4">
              {skipStepNumber ? PageIdToPageNameMap[skipStepNumber] : ""}
            </p>
            <p className="text-[var(--color-on-surface)] opacity-70">
              This will increment the customer's onboarding progress by one step
              and create an entry in their onboarding journey.
            </p>
          </div>

          <div>
            <label
              htmlFor="skipReason"
              className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
            >
              Reason for skipping (optional)
            </label>
            <textarea
              id="skipReason"
              rows={3}
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-[var(--radius-brand)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              placeholder="Enter reason for skipping this step..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={cancelSkipStep}
              disabled={isSkipping}
              className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] bg-[var(--color-muted)] hover:bg-[var(--color-muted)] hover:opacity-80 rounded-[var(--radius-brand)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmSkipStep}
              disabled={isSkipping}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:opacity-80 rounded-[var(--radius-brand)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSkipping ? "Skipping..." : "Skip Step"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
