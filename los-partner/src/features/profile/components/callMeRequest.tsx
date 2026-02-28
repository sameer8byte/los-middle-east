import { useParams } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
 
// Icons from react-icons
import {
  AiOutlineCheckCircle,
  AiOutlinePhone,
  AiOutlineCloseCircle,
  AiOutlineReload,
  AiOutlineExclamationCircle,
} from "react-icons/ai";
import { formatDateWithTime } from "../../../lib/utils";
import { getCallMeRequests, updateCallMeRequest } from "../../../shared/services/api/common.api";

interface CallMeRequestItem {
  id: string;
  userId: string;
  brandId: string;
  message: string;
  phoneNumber: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export function CallMeRequest() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const isCallMeRequests = getQuery("is_call_me_requests") === "true";

  const [callMeRequests, setCallMeRequests] = useState<CallMeRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    if (!brandId) return;
    setRefreshing(true);
    try {
      const data = await getCallMeRequests(brandId);
      setCallMeRequests(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching call me requests:", err);
      setError("Failed to load requests. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!brandId || !isCallMeRequests) return;
    setLoading(true);
    fetchRequests();
  }, [brandId, isCallMeRequests]);

  const handleToggleResolve = async (
    requestId: string,
    isResolved: boolean
  ) => {
    if (!brandId) return;

    try {
      const success = await updateCallMeRequest(
        brandId,
        requestId,
        !isResolved
      );
      if (success) {
        setCallMeRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                  ...req,
                  isResolved: !isResolved,
                  resolvedAt: !isResolved ? new Date().toISOString() : null,
                }
              : req
          )
        );
      }
    } catch (err) {
      console.error("Error updating call me request:", err);
      setError("Failed to update request. Please try again.");
    }
  };

  const handleRefresh = () => {
    fetchRequests();
  };

  return (
    <Dialog
      isOpen={isCallMeRequests}
      onClose={() => removeQuery("is_call_me_requests")}
      title="Callback Requests"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-[var(--color-on-surface)] opacity-70">Manage callback requests from users</p>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center text-sm text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] disabled:opacity-50"
          >
            <AiOutlineReload
              className={`mr-1 ${refreshing ? "animate-spin" : ""}`}
              size={16}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center p-3 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg">
            <AiOutlineExclamationCircle className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AiOutlineReload
              className="animate-spin text-[var(--color-on-primary)] mb-3"
              size={24}
            />
            <p className="text-[var(--color-on-surface)] opacity-70">Loading requests...</p>
          </div>
        ) : callMeRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--color-muted)] border-opacity-30 rounded-lg">
            <AiOutlinePhone className="text-[var(--color-on-surface)] opacity-50 mb-3" size={32} />
            <h3 className="font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
              No callback requests
            </h3>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70 text-center max-w-xs">
              All callback requests will appear here when users request contact
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {callMeRequests.map((request) => (
              <div
                key={request.id}
                className={`p-4 rounded-xl shadow-sm border-l-4 ${
                  request.isResolved
                    ? "border-green-500 bg-[var(--color-success)] bg-opacity-10"
                    : "border-blue-500 bg-white"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-2">
                    <div className="bg-[var(--color-primary)] bg-opacity-15 p-2 rounded-full mr-3">
                      <AiOutlinePhone size={16} className="text-[var(--color-on-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--color-on-background)]">
                        {request.phoneNumber} <span className="text-xs text-[var(--color-on-surface)] opacity-70">(#{request.userId.split("-")[0].toLocaleUpperCase()})</span>
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.isResolved
                            ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                            : "bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]"
                        }`}
                      >
                        {request.isResolved ? "Resolved" : "New Request"}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                    {formatDateWithTime(request.createdAt)}
                  </span>
                </div>

                <div className="ml-11 pl-1">
                  <p className="text-[var(--color-on-surface)] opacity-80 mb-3 whitespace-pre-line">
                    {request.message || "No message provided"}
                  </p>

                  {request.isResolved && request.resolvedAt && (
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70 flex items-center">
                      <AiOutlineCheckCircle
                        className="mr-1 text-green-500"
                        size={14}
                      />
                      Resolved: {new Date(request.resolvedAt).toLocaleString()}
                    </p>
                  )}

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() =>
                        handleToggleResolve(request.id, request.isResolved)
                      }
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        request.isResolved
                          ? "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)] hover:bg-[var(--color-secondary)] bg-opacity-20"
                          : "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] hover:bg-[var(--color-success)] bg-opacity-20"
                      }`}
                    >
                      {request.isResolved ? (
                        <>
                          <AiOutlineCloseCircle className="mr-1" size={14} />
                          Reopen Request
                        </>
                      ) : (
                        <>
                          <AiOutlineCheckCircle className="mr-1" size={14} />
                          Mark as Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
