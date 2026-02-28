import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Table } from "../../../../common/ui/table";
import { Badge } from "../../../../common/ui/badge";
import { acefoneDialerService } from "../../../../shared/services/api/acefone.dialer.service";

interface CallEvent {
  id: string;
  type: string;
  callStatus: string;
  callType?: string;
  duration?: number;
  fromNumber?: string;
  toNumber?: string;
  createdAt: string;
  clientCustomData?: string;
}

interface UserCall {
  id: string;
  userId: string;
  partnerUserId: string;
  brandId: string;
  createdAt: string;
  events: CallEvent[];
}

const getCallTypeLabel = (type: string): string => {
  if (type === "outbound") return "📞 Outbound";
  if (type === "inbound") return "📱 Inbound";
  return type;
};

const getCallStatusBadge = (status: string) => {
  const statusMap: Record<string, "success" | "danger" | "warning" | "primary"> = {
    connected: "success",
    missed: "danger",
    ended: "primary",
    pending: "warning",
  };

  return (
    <Badge variant={statusMap[status?.toLowerCase()] || "primary"}>
      {status || "Unknown"}
    </Badge>
  );
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export default function CustomerCallLogs() {
  const { customerId } = useParams<{ customerId: string }>();
  const [calls, setCalls] = useState<UserCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    total: 0,
  });

  useEffect(() => {
    fetchCallLogs();
  }, [customerId, pagination.limit, pagination.offset]);

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await acefoneDialerService.getCustomerUserCalls(
        customerId || "",
        {
          limit: pagination.limit,
          offset: pagination.offset,
        }
      );

      setCalls(response.calls || []);
      setPagination({
        limit: response.limit || pagination.limit,
        offset: response.offset || pagination.offset,
        total: response.total || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination({
        ...pagination,
        offset: Math.max(0, pagination.offset - pagination.limit),
      });
    }
  };

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination({
        ...pagination,
        offset: pagination.offset + pagination.limit,
      });
    }
  };

  const tableColumns = [
    {
      key: "callId",
      label: "Call ID",
      render: (_: any, row: UserCall) => (
        <span className="font-mono text-xs truncate">{row.id.substring(0, 8)}...</span>
      ),
    },
    {
      key: "fromNumber",
      label: "From Number",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        return <span className="text-sm">{event?.fromNumber || "-"}</span>;
      },
    },
    {
      key: "toNumber",
      label: "To Number",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        return <span className="text-sm">{event?.toNumber || "-"}</span>;
      },
    },
    {
      key: "duration",
      label: "Duration",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        return <span className="text-sm">{formatDuration(event?.duration)}</span>;
      },
    },
    {
      key: "callType",
      label: "Type",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        return event?.callType ? (
          <Badge variant="outline">{getCallTypeLabel(event.callType)}</Badge>
        ) : (
          "-"
        );
      },
    },
    {
      key: "callStatus",
      label: "Status",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        return event?.callStatus ? getCallStatusBadge(event.callStatus) : "-";
      },
    },
    {
      key: "details",
      label: "Details",
      render: (_: any, row: UserCall) => {
        const event = row.events?.[0];
        let customData: any = {};

        try {
          if (event?.clientCustomData) {
            customData = JSON.parse(event.clientCustomData);
          }
        } catch (e) {
          console.error("Error parsing custom data:", e);
        }

        return (
          <details className="cursor-pointer">
            <summary className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
              View Details
            </summary>
            <div className="mt-3 p-4 bg-gray-50 rounded text-xs space-y-3 max-w-2xl">
              {/* Recording URL - Most Important */}
              {customData.recording_url && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="font-semibold text-blue-900 mb-1">🎙️ Recording URL:</div>
                  <a 
                    href={customData.recording_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {customData.recording_url}
                  </a>
                </div>
              )}

              {/* Call Flow - Visual Timeline */}
              {customData.call_flow && Array.isArray(customData.call_flow) && (
                <div className="bg-gray-100 rounded p-2">
                  <div className="font-semibold mb-2">📋 Call Flow:</div>
                  <div className="space-y-1 ml-2">
                    {customData.call_flow.map((flow: any, idx: number) => (
                      <div key={`flow-${flow.type}-${flow.time || idx}`} className="text-xs text-gray-700">
                        <span className="font-semibold">{flow.type || flow.app_name || "Event"}:</span>{" "}
                        {flow.dialst && <span className="text-green-700">{flow.dialst}</span>}
                        {flow.name && <span className="ml-1">{flow.name}</span>}
                        {flow.time && <span className="text-gray-500 text-xs ml-1">({new Date(flow.time * 1000).toLocaleTimeString()})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2">
                {customData.uuid && (
                  <div className="bg-white p-2 rounded border">
                    <span className="font-semibold">UUID:</span>
                    <div className="text-xs text-gray-600 font-mono mt-1">{customData.uuid}</div>
                  </div>
                )}
                {customData.campaign_name && (
                  <div className="bg-white p-2 rounded border">
                    <span className="font-semibold">Campaign:</span>
                    <div className="text-xs text-gray-600 mt-1">{customData.campaign_name}</div>
                  </div>
                )}
                {customData.campaign_id && (
                  <div className="bg-white p-2 rounded border">
                    <span className="font-semibold">Campaign ID:</span>
                    <div className="text-xs text-gray-600 mt-1">{customData.campaign_id}</div>
                  </div>
                )}
                {customData.hangup_cause && (
                  <div className="bg-white p-2 rounded border">
                    <span className="font-semibold">Hangup Cause:</span>
                    <div className="text-xs text-gray-600 mt-1">{customData.hangup_cause}</div>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="space-y-2">
                {customData.start_stamp && (
                  <div>
                    <span className="font-semibold">⏱️ Start:</span> {customData.start_stamp}
                  </div>
                )}
                {customData.answer_stamp && (
                  <div>
                    <span className="font-semibold">📞 Answer:</span> {customData.answer_stamp}
                  </div>
                )}
                {customData.end_stamp && (
                  <div>
                    <span className="font-semibold">🏁 End:</span> {customData.end_stamp}
                  </div>
                )}
              </div>

              {/* Billing Info */}
              {customData.billing_circle && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <span className="font-semibold text-amber-900">📍 Billing Info:</span>
                  <div className="text-xs text-amber-800 mt-1">
                    <div>Operator: {customData.billing_circle.operator}</div>
                    <div>Circle: {customData.billing_circle.circle}</div>
                  </div>
                </div>
              )}

              {/* Agent Info */}
              {customData.call_flow?.some((f: any) => f.type === "Agent") && (
                <div className="bg-purple-50 border border-purple-200 rounded p-2">
                  <span className="font-semibold text-purple-900">👤 Agent:</span>
                  <div className="text-xs text-purple-800 mt-1">
                    {customData.call_flow
                      .filter((f: any) => f.type === "Agent" && f.name)
                      .map((agent: any) => (
                        <div key={`agent-${agent.id}-${agent.name}`}>
                          {agent.name} ({agent.num}) - {agent.email}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Raw JSON for debugging */}
              <details className="text-xs">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Show Raw JSON</summary>
                <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto max-h-64">
                  {JSON.stringify(customData, null, 2)}
                </pre>
              </details>
            </div>
          </details>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading call logs</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (calls.length === 0 && !loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-500">No call logs found for this customer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table
        columns={tableColumns}
        data={calls}
        loading={loading}
        emptyMessage="No call logs found"
      />

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          Showing {pagination.offset + 1} to{" "}
          {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
          {pagination.total} calls
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={pagination.offset === 0}
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

