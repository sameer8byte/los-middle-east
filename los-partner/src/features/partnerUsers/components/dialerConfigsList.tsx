import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { BiCheckCircle, BiErrorCircle } from "react-icons/bi";
import {
  PartnerUserDialerConfigService,
  DialerConfig,
} from "../../../shared/services/api/partner-user-dialer-config.api";
import { getBrandUsers } from "../../../shared/services/api/partner-user.api";
import { useParams } from "react-router-dom";
import {
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { Pagination } from "../../../shared/types/pagination";
import { Button } from "../../../common/ui/button";
import { formatDateWithTime } from "../../../lib/utils";
import { DialerConfigModal } from "./dialerConfigModal";

interface DialerConfigWithUser extends DialerConfig {
  user?: {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
  };
}

export function DialerConfigsList() {
  const { brandId } = useParams<{ brandId: string }>();
  const [configs, setConfigs] = useState<DialerConfigWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    dateFilter: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [selectedConfigModal, setSelectedConfigModal] = useState<{
    isOpen: boolean;
    partnerUserId: string | null;
  }>({
    isOpen: false,
    partnerUserId: null,
  });

  // Load dialer configs
  useEffect(() => {
    if (brandId) {
      loadConfigs();
    }
  }, [brandId, pagination.page, pagination.limit]);

  const loadConfigs = async () => {
    if (!brandId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all dialer configs
      const skip = (pagination.page - 1) * pagination.limit;
      const allConfigs =
        await PartnerUserDialerConfigService.getAllDialerConfigs(
          brandId,
          skip,
          pagination.limit
        );

      // Fetch all users to enrich config data
      const usersResponse = await getBrandUsers(brandId, {
        page: 1,
        limit: 1000,
        dateFilter: "",
      });
      const users = usersResponse.data || [];

      // Enrich configs with user details
      const enrichedConfigs = allConfigs.map((config) => {
        const user = users.find((u: any) => u.id === config.partner_user_id);
        return {
          ...config,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
              }
            : undefined,
        };
      });

      setConfigs(enrichedConfigs);
    } catch (err: any) {
      console.error("Error loading dialer configs:", err);
      setError(err.message || "Failed to load dialer configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (config: DialerConfigWithUser) => {
    if (!globalThis.confirm("Are you sure you want to delete this configuration?")) {
      return;
    }

    setDeletingId(config.partner_user_id);

    try {
      await PartnerUserDialerConfigService.deleteDialerConfig(
        config.partner_user_id
      );
      toast.success("Dialer configuration deleted successfully");
      loadConfigs();
    } catch (err: any) {
      console.error("Error deleting config:", err);
      toast.error(err.message || "Failed to delete configuration");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (config: DialerConfigWithUser) => {
    try {
      if (config.is_disabled) {
        await PartnerUserDialerConfigService.disableDialer(
          config.partner_user_id
        );
        toast.success("Dialer disabled successfully");
      } else {
        await PartnerUserDialerConfigService.enableDialer(
          config.partner_user_id
        );
        toast.success("Dialer enabled successfully");
      }
      loadConfigs();
    } catch (err: any) {
      console.error("Error toggling status:", err);
      toast.error(err.message || "Failed to update status");
    }
  };

  const filteredConfigs = configs.filter(
    (config) =>
      config.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.agent_user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedConfigs = filteredConfigs.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dialer Configurations</h2>
        <Button
          onClick={() => loadConfigs()}
          disabled={isLoading}
          variant="secondary"
          size="sm"
        >
          <FiRefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by user name, email, or agent ID..."
      />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin">
            <FiRefreshCw size={24} className="text-blue-600" />
          </div>
        </div>
      )}

      {!isLoading && filteredConfigs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No dialer configurations found</p>
          <Button onClick={loadConfigs} variant="primary">
            <FiRefreshCw size={16} className="mr-2" />
            Reload
          </Button>
        </div>
      )}

      {!isLoading && filteredConfigs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Agent ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Agent Number
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Agent Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedConfigs.map((config) => (
                  <tr
                    key={config.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {config.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {config.user?.email || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">
                        {config.user?.phone_number ? (
                          <>
                            📞 {config.user.phone_number}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">
                            No phone number
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-mono text-xs">
                        {config.agent_user_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">
                        {config.agent_user_number}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs">
                        {config.agent_user_email || (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(config)}
                        disabled={deletingId === config.partner_user_id}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        {config.is_disabled ? (
                          <>
                            <BiErrorCircle className="text-red-600" size={18} />
                            <span className="text-xs font-medium text-red-700">
                              Disabled
                            </span>
                          </>
                        ) : (
                          <>
                            <BiCheckCircle className="text-green-600" size={18} />
                            <span className="text-xs font-medium text-green-700">
                              Enabled
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">
                        {formatDateWithTime(config.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSelectedConfigModal({
                              isOpen: true,
                              partnerUserId: config.partner_user_id,
                            })
                          }
                          disabled={deletingId === config.partner_user_id}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit configuration"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          disabled={deletingId === config.partner_user_id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                          title="Delete configuration"
                        >
                          {deletingId === config.partner_user_id ? (
                            <span className="animate-spin">↻</span>
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={pagination.page}
            totalPages={Math.ceil(filteredConfigs.length / pagination.limit)}
            totalCount={filteredConfigs.length}
            pageSize={pagination.limit}
            onPageChange={(page: number) =>
              setPagination({ ...pagination, page })
            }
            onPageSizeChange={(limit: number) =>
              setPagination({ ...pagination, page: 1, limit })
            }
          />
        </>
      )}

      {/* Modal for editing config */}
      {selectedConfigModal.isOpen && selectedConfigModal.partnerUserId && brandId && (
        <DialerConfigModal
          isOpen={selectedConfigModal.isOpen}
          onClose={() =>
            setSelectedConfigModal({ isOpen: false, partnerUserId: null })
          }
          partnerUserId={selectedConfigModal.partnerUserId}
          brandId={brandId}
          onSuccess={() => {
            loadConfigs();
            setSelectedConfigModal({ isOpen: false, partnerUserId: null });
          }}
        />
      )}
    </div>
  );
}
