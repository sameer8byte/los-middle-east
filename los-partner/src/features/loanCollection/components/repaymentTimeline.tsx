import { useEffect, useState } from "react";
import { useQueryParams } from "../../../hooks/useQueryParams";
 
 import { useParams } from "react-router-dom";
import Sidebar from "../../../common/sidebar";
import { Spinner } from "../../../common/ui/spinner";

import { FiMusic, FiFileText } from "react-icons/fi"; // <-- React Icons import
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { getRepaymentTimeline, getRecording } from "../../../shared/services/api/collection.api";
import { RepaymentTimeline } from "../../../shared/types/customers";

export function RepaymentTimelines() {
  const { brandId } = useParams();
  const { getQuery, removeQuery, setQuery } = useQueryParams();
  const repaymentTimelineLoanId = getQuery("repaymentTimelineLoanId");
  const { fetchSignedUrl } = useAwsSignedUrl();
  const [recordingLoading, setRecordingLoading] = useState(false);

  const [repaymentTimeline, setRepaymentTimeline] = useState<
    RepaymentTimeline[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    const fetchRepaymentTimeline = async () => {
      if (!repaymentTimelineLoanId) return;
      if (!brandId) {
        setError("Brand ID is required.");
        return;
      }

      try {
        const response = await getRepaymentTimeline(
          repaymentTimelineLoanId,
          brandId
        );
        setRepaymentTimeline(response);
      } catch (err) {
        console.error("Error fetching repayment timeline:", err);
        setError(
          (err as Error).message || "Failed to load repayment timeline."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRepaymentTimeline();
  }, [repaymentTimelineLoanId, brandId]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`.padStart(2, "0");
  };

  const getInitials = (email: string) => email.slice(0, 2).toUpperCase();

  if (!repaymentTimelineLoanId) return null;

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

      const response = await getRecording(
        brandId,
        userCallRecordingsId
      );
     if (!response || !response.filePrivateUrl) {
      setRecordingError("No recording found.");
      }
    } catch (error) {
      console.error("Error posting recording:", error);
      setRecordingError((error as Error).message ||
        "Failed to post recording.");
    } finally {
      setRecordingLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Sidebar
        title="Repayment Timeline"
        isOpen={!!repaymentTimelineLoanId}
        width="w-full md:w-1/2"
        onClose={() => removeQuery("repaymentTimelineLoanId")}
      >
        <div className="px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner theme="dark" />
            </div>
          ) : error ? (
            <div className="text-[var(--color-on-error)] font-semibold text-center p-4 bg-[var(--color-error)] bg-opacity-10 rounded-lg">
              {error}
            </div>
          ) : (
            <div>
            {repaymentTimeline.length === 0 ? (
              <div className="text-[var(--color-on-surface)] opacity-70 text-center py-10">
                No repayment timeline entries found for this loan.
              </div>
            ) : (
              <>
                <ul className="space-y-6">
                  {repaymentTimeline.map((item) => (
                    <li key={item.id} className="relative">
                      <div className="ml-10 p-5 bg-white rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Header: User Info + Timestamp */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--color-primary)] bg-opacity-15 rounded-full flex items-center justify-center text-sm font-semibold text-[var(--color-on-primary)]">
                              {getInitials(item.user.email)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-on-background)]">
                                {item.user.email}
                              </p>
                              <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-0.5">
                                via {item.partnerUser.email}
                              </p>
                            </div>
                          </div>
                          {item.createdAt && (
                            <time className="text-xs text-[var(--color-on-surface)] opacity-70">
                              {new Date(item.createdAt).toLocaleString()}
                            </time>
                          )}
                        </div>
          
                        {/* Message */}
                        {item.message && (
                          <p className="mt-4 text-sm text-[var(--color-on-surface)] opacity-80 leading-relaxed border-l-2 border border-[var(--color-primary)] border-opacity-30 pl-3">
                            {item.message}
                          </p>
                        )}
          
                        {/* File Link */}
                        {item.fileUrl && (
                          <div className="mt-4">
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-surface)] text-[var(--color-on-background)] hover:bg-[var(--color-muted)] bg-opacity-30 transition"
                            >
                              <FiFileText className="w-4 h-4 mr-1.5" />
                              View Document
                            </a>
                          </div>
                        )}
          
                        {/* Call Details */}
                        {item.userCall && (
                          <div className="mt-6 pt-5 border-t border-[var(--color-muted)] border-opacity-20 space-y-5">
                            <div>
                              <h3 className="text-xs font-semibold text-[var(--color-on-background)] uppercase tracking-wider mb-2">
                                Call Details
                              </h3>
                              <div className="space-y-3">
                                {item.userCall.events.map((event) => (
                                  <div key={event.id} className="text-sm text-[var(--color-on-surface)] opacity-80">
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium">{event.type}</span>
                                      {event.duration && (
                                        <span className="text-xs bg-[var(--color-surface)] px-2 py-0.5 rounded-full">
                                          {formatDuration(event.duration)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                                      {event.callStatus}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
          
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
                                            onClick={() => handelRecording(recording.id)}
                                            disabled={recordingLoading}
                                          >
                                            {recordingLoading ? (
                                              <Spinner theme="light" />
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
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
          
                {/* Footer Actions */}
                <div className="mt-10 pt-6 border-t border-[var(--color-muted)] border-opacity-30 flex justify-end gap-4">
                  <button
                    onClick={() => removeQuery("repaymentTimelineLoanId")}
                    className="px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm font-medium text-[var(--color-on-surface)] opacity-80 bg-white hover:bg-[var(--color-surface)] transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() =>
                      setQuery("createRepaymentTimelineLoanId", repaymentTimelineLoanId)
                    }
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition"
                  >
                    Create New Entry
                  </button>
                </div>
              </>
            )}
          </div>
          
          )}
        </div>
      </Sidebar>
    </div>
  );
}
