import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiMusic, FiSearch } from "react-icons/fi";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { Spinner } from "../../../common/ui/spinner";
import { getRecording } from "../../../shared/services/api/collection.api";
import { getCustomerRepaymentTimeline } from "../../../shared/services/api/customer.api";
import { RepaymentTimeline } from "../../../shared/types/customers";

export function CustomerRepaymentTimeline() {
  const { customerId, brandId } = useParams();
  const [repaymentTimeline, setRepaymentTimeline] = useState<
    RepaymentTimeline[]
  >([]);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [filteredTimeline, setFilteredTimeline] = useState<RepaymentTimeline[]>(
    []
  );
  const [recordingError, setRecordingError] = useState<string | null>(null);
  // State for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!customerId || !brandId) {
      setError("Customer ID or Brand ID is missing");
      setLoading(false);
      return;
    }

    const fetchRepaymentTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCustomerRepaymentTimeline(
          customerId,
          brandId
        );
        setRepaymentTimeline(response);
        setFilteredTimeline(response);
      } catch (error) {
        console.error("Error fetching repayment timeline:", error);
        setError("Failed to fetch repayment timeline. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRepaymentTimeline();
  }, [brandId, customerId]);
  const handelRecording = async (userCallRecordingsId: string) => {
    if (!brandId) {
      console.error("Brand ID is required for recording.");
      return;
    }
    if (!userCallRecordingsId) {
      console.error("User call recordings ID is required for recording.");
      return;
    }
    try {
      setRecordingError(null);

      setRecordingLoading(true);

      const response = await getRecording(brandId, userCallRecordingsId);
      if (!response || !response.filePrivateUrl) {
        setRecordingError("No recording found.");
      }
      // Fetch the signed URL for the recording
      setRepaymentTimeline((prev) =>
        prev.map((item) => {
          if (
            item.userCall?.recordings.some((r) => r.id === userCallRecordingsId)
          ) {
            return {
              ...item,
              userCall: {
                ...item.userCall,
                recordings: item.userCall.recordings.map((recording) =>
                  recording.id === userCallRecordingsId
                    ? { ...recording, filePrivateUrl: response.filePrivateUrl }
                    : recording
                ),
              },
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error("Error posting recording:", error);
      setRecordingError(
        (error as Error).message || "Failed to post recording."
      );
    } finally {
      setRecordingLoading(false);
    }
  };
  // Filter timeline based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTimeline(repaymentTimeline);
    } else {
      const filtered = repaymentTimeline.filter((item) =>
        item.loan?.formattedLoanId
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredTimeline(filtered);
    }
  }, [searchTerm, repaymentTimeline]);
  const { fetchSignedUrl } = useAwsSignedUrl();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-3/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_:any, i) => (
              <div key={i} className="border p-4 rounded-lg">
                <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-on-error)]">
          Repayment Timeline
        </h2>
        <div className="bg-[var(--color-error)] bg-opacity-10 border  border-[var(--color-error)] border-opacity-30 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-[var(--color-on-error)]">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[750px] overflow-y-auto">
      {/* Search Filter */}
      {repaymentTimeline.length > 0 && (
        <div className="sticky top-0 bg-white z-20 pb-4 mb-4 border-b shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Loan ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FiSearch className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 absolute left-3 top-3" />
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-[var(--color-on-surface)] opacity-70">
              Showing {filteredTimeline.length} of {repaymentTimeline.length}{" "}
              entries
              {` for "${searchTerm}"`}
            </div>
          )}
        </div>
      )}

      {filteredTimeline.length > 0 ? (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[var(--color-muted)] bg-opacity-50"></div>

          {filteredTimeline.map((item) => {
            const { date, time } = formatDate(item.createdAt);
            const hasRecordings = item.userCall?.recordings?.length > 0;

            return (
              <div
                key={item.id}
                className="relative flex items-start pb-10 last:pb-0"
              >
                {/* Timeline Dot */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white border-4 border-blue-600 rounded-full shadow-md">
                  <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full"></div>
                </div>

                {/* Content Card */}
                <div className="flex-1 ml-6">
                  <div className="bg-white rounded-xl p-5 shadow hover:shadow-lg transition-shadow border border-[var(--color-muted)] border-opacity-30">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-2">
                          {item.message}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {item.userCall?.events?.length > 0 && (
                            <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)] rounded-full text-xs font-medium">
                              {item.userCall.events[
                                item.userCall.events.length - 1
                              ]?.callStatus || "Unknown"}
                            </span>
                          )}
                          {hasRecordings && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              📹 {item.userCall?.recordings?.length} Recording
                              {item.userCall?.recordings?.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {item.fileUrl && (
                            <span className="px-2 py-1 bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)] rounded-full text-xs font-medium">
                              📎 Attachment
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-[var(--color-on-surface)] opacity-70 mt-2 sm:mt-0">
                        <div className="font-medium">{date}</div>
                        <div>{time}</div>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[var(--color-primary)] bg-opacity-15 rounded-full flex items-center justify-center text-[var(--color-on-primary)] font-semibold">
                          {item.user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-on-background)]">
                            Customer
                          </p>
                          <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                            {item.user.email}
                          </p>
                          {item.user.phoneNumber && (
                            <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                              {item.user.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center text-[var(--color-on-success)] font-semibold">
                          {item.partnerUser.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-on-background)]">
                            Partner
                          </p>
                          <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                            {item.partnerUser.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Call Details */}
                    {item.userCall?.events?.length > 0 && (
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                          Call Details
                        </h4>
                        <div className="space-y-1">
                          {item.userCall.events.map((event) => (
                            <div
                              key={event.id}
                              className="text-sm text-[var(--color-on-surface)] opacity-70 flex justify-between"
                            >
                              <span>
                                {event.type} - {event.callCreatedReason}
                              </span>
                              {event.duration && (
                                <span>
                                  {Math.floor(event.duration / 60)}:
                                  {(event.duration % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loan ID */}
                    {item.loan?.formattedLoanId && (
                      <div className="mt-3 text-sm text-[var(--color-on-surface)] opacity-70">
                        <span className="font-medium text-[var(--color-on-surface)] opacity-80">
                          Loan ID:
                        </span>{" "}
                        {item.loan.formattedLoanId}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-[var(--color-primary)] text-white text-sm rounded hover:bg-[var(--color-primary-hover)] transition-colors"
                        >
                          View File
                        </a>
                      )}
                      {/* Recordings */}
                      {item.userCall?.recordings?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-[var(--color-on-background)] uppercase tracking-wider mb-2">
                            Recordings
                          </h3>
                          <div className="space-y-2">
                            {item.userCall.recordings.map((recording) => (
                              <div key={recording.id}>
                                {recording.filePrivateUrl ? (
                                  <button
                                    onClick={() =>
                                      fetchSignedUrl(recording.filePrivateUrl)
                                    }
                                    className="flex items-center text-xs text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] transition"
                                  >
                                    <FiMusic className="w-4 h-4 mr-1.5" />
                                    Recording
                                  </button>
                                ) : (
                                  <div>
                                    <button
                                      type="button"
                                      className={`flex items-center text-xs font-medium text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] transition ${
                                        recordingLoading
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        handelRecording(recording.id)
                                      }
                                      disabled={recordingLoading}
                                    >
                                      {recordingLoading ? (
                                        <Spinner theme="dark" />
                                      ) : (
                                        <>
                                          <FiMusic className="w-4 h-4 mr-1.5" />
                                          Download Recording
                                        </>
                                      )}
                                    </button>
                                    {recordingError && (
                                      <div className="text-[var(--color-on-error)] text-xs mt-1">
                                        {recordingError}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : repaymentTimeline.length > 0 ? (
        <div className="text-center py-10">
          <FiSearch className="h-12 w-12 mx-auto text-[var(--color-on-surface)] opacity-50 mb-3" />
          <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
            No matches found
          </h3>
          <p className="text-[var(--color-on-surface)] opacity-70">
            No repayment timeline entries match "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors text-sm"
          >
            Clear search
          </button>
        </div>
      ) : null}
    </div>
  );
}
