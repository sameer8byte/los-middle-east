import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RelationshipEnum } from "../../../constant/enum";
import {
  getAlternatePhoneNumbers,
  deleteAlternatePhoneNumber,
} from "../../../shared/services/api/customer.api";
import { AddAlternatePhoneModal } from "./AddAlternatePhoneModal";
import { VerifyPhoneModal } from "./VerifyPhoneModal";
import { AcefoneClickToDialButton } from "../../acefone";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";

export interface AlternatePhoneNumber {
  id: string;
  userId: string;
  phone: string;
  label: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  name: string;
  relationship: RelationshipEnum;
}

interface AlternatePhoneNumbersProps {
  readonly primaryPhone?: string;
  readonly isPrimaryPhoneVerified?: boolean;
  readonly onFetchPhoneAge?: (phoneNumber?: string) => void;
  readonly phoneAge?: number | null;
  readonly showAge?: boolean;
  readonly isPhoneAgeLoading?: boolean;
}

export function AlternatePhoneNumbers({
  primaryPhone,
  isPrimaryPhoneVerified,
  onFetchPhoneAge,
  phoneAge,
  showAge,
  isPhoneAgeLoading,
}: AlternatePhoneNumbersProps) {
  const { brandId, customerId } = useParams();
  const [alternatePhoneNumbers, setAlternatePhoneNumbers] = useState<
    AlternatePhoneNumber[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    phoneId: string;
    phoneNumber: string;
  }>({
    isOpen: false,
    phoneId: "",
    phoneNumber: "",
  });
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    phone: AlternatePhoneNumber | null;
  }>({
    isOpen: false,
    phone: null,
  });

  useEffect(() => {
    if (!brandId || !customerId) {
      console.error("Brand ID or Customer ID is missing");
      setError("Brand ID or Customer ID is missing");
      setLoading(false);
      return;
    }

    const fetchAlternatePhoneNumbers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAlternatePhoneNumbers(customerId, brandId);
        setAlternatePhoneNumbers(response || []);
      } catch (error) {
        console.error("Error fetching alternate phone numbers:", error);
        setError("Failed to fetch alternate phone numbers");
      } finally {
        setLoading(false);
      }
    };

    fetchAlternatePhoneNumbers();
  }, [brandId, customerId]);

  const handleRefreshList = async () => {
    if (!brandId || !customerId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getAlternatePhoneNumbers(customerId, brandId);
      setAlternatePhoneNumbers(response || []);
    } catch (error) {
      console.error("Error refreshing alternate phone numbers:", error);
      setError("Failed to refresh alternate phone numbers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    if (!brandId || !customerId) return;

    if (!confirm("Are you sure you want to delete this phone number?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteAlternatePhoneNumber(customerId, brandId, phoneId);
      await handleRefreshList();
    } catch (error) {
      console.error("Error deleting phone number:", error);
      setError("Failed to delete phone number");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-lg font-semibold">
            Loading Alternate Phone Numbers...
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-[var(--color-muted)] bg-opacity-30 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Alternate Phone Numbers</h2>
        <div className="bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-[var(--color-on-error)] font-medium">Error</p>
          </div>
          <p className="text-[var(--color-on-error)] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const totalNumbers = (primaryPhone ? 1 : 0) + alternatePhoneNumbers.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--color-on-background)]">
              Phone Numbers
            </h3>
            <p className="text-xs text-[var(--color-on-surface)] opacity-70 truncate">
              {totalNumbers} {totalNumbers === 1 ? "Number" : "Numbers"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsAddModalOpen(true)}
          className="text-xs px-3 py-1.5 ml-2 flex-shrink-0 hover:bg-[var(--color-primary)] hover:bg-opacity-10 transition-colors"
          title="Add new phone number"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Primary Phone Number */}
        {primaryPhone && (
          <div className="min-w-0 md:min-w-72 bg-[var(--color-surface)] border-2 border-[var(--color-primary)] border-opacity-30 rounded-[var(--radius-brand)] p-4 hover:shadow-md transition-shadow duration-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--color-primary)] bg-opacity-15">
                    <svg
                      className="w-4 h-4 text-[var(--color-on-primary)]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">
                      {primaryPhone}
                    </p>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-60 truncate">
                      Primary •{" "}
                      {isPrimaryPhoneVerified ? "✓ Verified" : "⚠ Unverified"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)] rounded-full flex-shrink-0 whitespace-nowrap">
                  Main
                </span>
                {customerId&& (
                  <AcefoneClickToDialButton userId={customerId} />
                )}
              </div>

              {/* Phone Age Section */}
              {onFetchPhoneAge && (
                <div className="pt-3 border-t border-[var(--color-muted)] border-opacity-30">
                  {!showAge && (
                    <Button
                      onClick={() => onFetchPhoneAge(primaryPhone)}
                      loading={isPhoneAgeLoading}
                      disabled={isPhoneAgeLoading}
                      variant="outline"
                      className="text-xs px-3 py-1.5 w-full hover:bg-[var(--color-primary)] hover:bg-opacity-10 transition-colors"
                    >
                      {isPhoneAgeLoading ? "Checking..." : "Check Phone Age"}
                    </Button>
                  )}
                  {showAge && phoneAge !== null && phoneAge !== undefined && (
                    <div className="text-xs text-[var(--color-on-surface)] bg-[var(--color-primary)] bg-opacity-5 px-3 py-2 rounded border border-[var(--color-primary)] border-opacity-20">
                      <span className="opacity-70">Phone Age: </span>
                      <span className="font-semibold text-[var(--color-primary)]">{phoneAge} days</span>
                    </div>
                  )}
                  {showAge && (phoneAge === null || phoneAge === undefined) && (
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70 text-center py-2 px-3 bg-[var(--color-warning)] bg-opacity-5 rounded border border-[var(--color-warning)] border-opacity-20">
                      Phone age data not available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {alternatePhoneNumbers.length === 0 ? (
          <div className="flex-1 min-w-0 md:min-w-72 text-center px-6 py-8 bg-white rounded-[var(--radius-brand)] border border-dashed border-[var(--color-muted)] border-opacity-30 hover:border-opacity-50 transition-colors">
            <svg
              className="w-8 h-8 text-[var(--color-on-surface)] opacity-40 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-[var(--color-on-background)] mb-1">
              No alternate phone numbers
            </h3>
            <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-3">
              Add emergency contacts for faster verification
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="surface"
              className="text-xs px-4 py-2 hover:shadow-md transition-shadow"
            >
              + Add Phone Number
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 auto-rows-max">
              {alternatePhoneNumbers.map((phone) => (
                <button
                  key={phone.id}
                  onClick={() => setDetailsModal({ isOpen: true, phone })}
                  className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-[var(--radius-brand)] p-3 hover:shadow-lg hover:border-[var(--color-primary)] hover:border-opacity-50 transition-all duration-200 flex flex-col cursor-pointer text-left group"
                >
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            phone.isVerified
                              ? "bg-[var(--color-success)] bg-opacity-10"
                              : "bg-[var(--color-warning)] bg-opacity-10"
                          }`}
                        >
                          <svg
                            className={`w-3 h-3 transition-colors ${
                              phone.isVerified
                                ? "text-[var(--color-on-success)]"
                                : "text-[var(--color-on-warning)]"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            {phone.isVerified ? (
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            ) : (
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            )}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">
                            {phone.phone}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-60 truncate">
                            {phone.name || "Contact"}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-50 truncate">
                            {phone.relationship}
                          </p>
                          {phone.label && (
                            <p className="text-xs text-[var(--color-on-surface)] opacity-50 line-clamp-1 mt-1 leading-tight">
                              {phone.label}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {customerId && (
                          <AcefoneClickToDialButton userId={customerId} 
                          alternatePhoneNumberId={phone.id}
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhone(phone.id);
                          }}
                          className="p-1.5 text-[var(--color-on-error)] hover:bg-[var(--color-error)] hover:bg-opacity-10 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Delete phone number"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {!phone.isVerified && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVerifyModal({
                          isOpen: true,
                          phoneId: phone.id,
                          phoneNumber: phone.phone,
                        });
                      }}
                      className="w-full px-2 py-1.5 mt-2 bg-[var(--color-secondary)] hover:bg-opacity-90 text-white rounded text-xs font-medium transition-all duration-200 hover:shadow-md"
                    >
                      Verify
                    </button>
                  )}
                  {phone.isVerified && (
                    <div className="w-full px-2 py-1.5 mt-2 bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] rounded text-xs font-medium text-center border border-[var(--color-success)] border-opacity-20">
                      Verified
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Alternate Phone Modal */}
      {brandId && customerId && (
        <AddAlternatePhoneModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          customerId={customerId}
          brandId={brandId}
          onSuccess={handleRefreshList}
        />
      )}

      {/* Verify Phone Modal */}
      {brandId && customerId && verifyModal.isOpen && (
        <VerifyPhoneModal
          isOpen={verifyModal.isOpen}
          onClose={() =>
            setVerifyModal({ isOpen: false, phoneId: "", phoneNumber: "" })
          }
          customerId={customerId}
          brandId={brandId}
          alternatePhoneId={verifyModal.phoneId}
          phoneNumber={verifyModal.phoneNumber}
          onSuccess={handleRefreshList}
        />
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.phone && (
        <Dialog
          title={`Phone Details - ${detailsModal.phone.phone}`}
          isOpen={detailsModal.isOpen}
          onClose={() => setDetailsModal({ isOpen: false, phone: null })}
        >
          <div className="space-y-4">
            {/* Phone Number */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                Phone Number
              </div>
              <p className="text-sm font-semibold text-[var(--color-on-surface)] break-all">
                {detailsModal.phone.phone}
              </p>
            </div>

            {/* Name */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                Contact Name
              </div>
              <p className="text-sm font-medium text-[var(--color-on-surface)]">
                {detailsModal.phone.name || "Not specified"}
              </p>
            </div>

            {/* Relationship */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                Relationship
              </div>
              <p className="text-sm font-medium text-[var(--color-on-surface)] capitalize">
                {detailsModal.phone.relationship || "Not specified"}
              </p>
            </div>

            {/* Label */}
            {detailsModal.phone.label && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                  Details
                </div>
                <p className="text-sm text-[var(--color-on-surface)] p-3 bg-[var(--color-background)] rounded border border-[var(--color-muted)] border-opacity-20">
                  {detailsModal.phone.label}
                </p>
              </div>
            )}

            {/* Verification Status */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-2">
                Verification Status
              </div>
              <div className={`flex items-center gap-2 p-3 rounded border ${
                detailsModal.phone.isVerified
                  ? "bg-[var(--color-success)] bg-opacity-5 border-[var(--color-success)] border-opacity-20"
                  : "bg-[var(--color-warning)] bg-opacity-5 border-[var(--color-warning)] border-opacity-20"
              }`}>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    detailsModal.phone.isVerified
                      ? "bg-[var(--color-success)]"
                      : "bg-[var(--color-warning)]"
                  }`}
                />
                <p className={`text-sm font-semibold ${
                  detailsModal.phone.isVerified
                    ? "text-[var(--color-on-success)]"
                    : "text-[var(--color-on-warning)]"
                }`}>
                  {detailsModal.phone.isVerified ? "✓ Verified" : "⚠ Unverified"}
                </p>
              </div>
            </div>

            {/* Verified At */}
            {detailsModal.phone.isVerified && detailsModal.phone.verifiedAt && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                  Verified Date
                </div>
                <p className="text-sm text-[var(--color-on-surface)]">
                  {new Date(detailsModal.phone.verifiedAt).toLocaleDateString(
                    "en-IN",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            )}

            {/* User ID */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                User ID
              </div>
              <p className="text-xs font-mono text-[var(--color-on-surface)] break-all opacity-70 p-2 bg-[var(--color-background)] rounded">
                {detailsModal.phone.userId}
              </p>
            </div>

            {/* Phone ID */}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider mb-1">
                Phone ID
              </div>
              <p className="text-xs font-mono text-[var(--color-on-surface)] break-all opacity-70 p-2 bg-[var(--color-background)] rounded">
                {detailsModal.phone.id}
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 flex gap-2 p-4 border-t border-[var(--color-muted)] border-opacity-30 bg-white mt-4">
            {!detailsModal.phone.isVerified && (
              <Button
                onClick={() => {
                  setDetailsModal({ isOpen: false, phone: null });
                  setVerifyModal({
                    isOpen: true,
                    phoneId: detailsModal.phone!.id,
                    phoneNumber: detailsModal.phone!.phone,
                  });
                }}
                className="flex-1 text-xs px-3 py-2 hover:shadow-md transition-shadow"
              >
                Verify Now
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to delete this phone number?")) {
                  handleDeletePhone(detailsModal.phone!.id);
                  setDetailsModal({ isOpen: false, phone: null });
                }
              }}
              className="flex-1 text-xs px-3 py-2"
            >
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => setDetailsModal({ isOpen: false, phone: null })}
              className="flex-1 text-xs px-3 py-2"
            >
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
