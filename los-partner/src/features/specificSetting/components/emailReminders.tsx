import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  HiEnvelope,
  HiEye,
  HiChartBarSquare,
  HiCog6Tooth,
} from "react-icons/hi2";
import { EmailReminderManager } from "./loan.email/emailReminderManager";
import { EmailReminderLogs } from "./loan.email/emailReminderLogs";
import {
  getEmailReminderStats,
  EmailReminderStats,
} from "../../../shared/services/api/loan.api";
import { LoadingSpinner } from "../../../common/common/loading-spinner";
import { useToast } from "../../../context/toastContext";
import EmailReminderConfigManager from "./emailReminderConfigManager";
import { Button } from "../../../common/ui/button";

export function EmailRemindersSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [stats, setStats] = useState<EmailReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    if (brandId) {
      fetchStats();
    }
  }, [brandId]);

  const fetchStats = async () => {
    if (!brandId) return;

    try {
      setLoading(true);
      const response = await getEmailReminderStats(brandId);
      setStats(response);
    } catch (error) {
      console.error("Failed to load email reminder statistics:", error);
      showError("Failed to load email reminder statistics");
    } finally {
      setLoading(false);
    }
  };

  if (!brandId) {
    return (
      <div className="p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg">
        Brand ID is required to manage email reminders
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--color-muted)] border-opacity-30 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg">
            <HiEnvelope className="w-6 h-6 text-[var(--color-on-primary)]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
            Email Reminders
          </h1>
        </div>
        <p className="text-[var(--color-on-surface)] opacity-70">
          Manage automated email reminders for loan payments and view sending
          history
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  Total Sent
                </p>
                <p className="text-2xl font-semibold text-[var(--color-on-background)]">
                  {stats.total}
                </p>
              </div>
              <HiEnvelope className="w-8 h-8 text-[var(--color-on-primary)] opacity-60" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  Success Rate
                </p>
                <p className="text-2xl font-semibold text-[var(--color-success)]">
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <HiChartBarSquare className="w-8 h-8 text-[var(--color-success)] opacity-60" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  Successful
                </p>
                <p className="text-2xl font-semibold text-[var(--color-primary)]">
                  {stats.successful}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                <span className="text-[var(--color-primary)] font-semibold text-sm">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  Failed
                </p>
                <p className="text-2xl font-semibold text-[var(--color-error)]">
                  {stats.failed}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--color-error)] bg-opacity-10 flex items-center justify-center">
                <span className="text-[var(--color-error)] font-semibold text-sm">✗</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Reminders Card */}
        <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg">
              <HiEnvelope className="w-5 h-5 text-[var(--color-on-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
              Send Email Reminders
            </h2>
          </div>
          <p className="text-[var(--color-on-surface)] opacity-70 mb-6">
            Manually trigger email reminders for all eligible loans or view
            automated reminder logs
          </p>

          <EmailReminderManager
            brandId={brandId}
            showBulkActions={true}
            size="md"
          />
        </div>

        {/* View Logs Card */}
        <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[var(--color-secondary)] bg-opacity-10 rounded-lg">
              <HiEye className="w-5 h-5 text-[var(--color-secondary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
              Email Reminder Logs
            </h2>
          </div>
          <p className="text-[var(--color-on-surface)] opacity-70 mb-6">
            View detailed logs of all email reminders sent, including delivery
            status and timestamps
          </p>

          <Button onClick={() => setShowLogs(true)} variant="surface">
            <HiEye className="w-4 h-4" />
            View Email Logs
          </Button>
        </div>
      </div>

      {/* Configuration Management Card */}
      <div className="bg-white p-6 rounded-lg border border-[var(--color-muted)] border-opacity-30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[var(--color-secondary)] bg-opacity-10 rounded-lg">
            <HiCog6Tooth className="w-5 h-5 text-[var(--color-secondary)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
            Email Reminder Configuration
          </h2>
        </div>
        <p className="text-[var(--color-on-surface)] opacity-70 mb-6">
          Configure when and how email reminders are sent. Create custom
          reminder schedules, edit templates, and manage timing settings.
        </p>

        <EmailReminderConfigManager brandId={brandId} />
      </div>

      {/* Additional Information */}
      <div className="bg-[var(--color-primary-light)] p-6 rounded-lg border border-[var(--color-primary)] border-opacity-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg">
            <HiEnvelope className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
              Email Reminder Information
            </h3>
            <p className="text-[var(--color-on-surface)] opacity-80">
              Reminders are automatically sent based on your configured
              schedules. You can view detailed logs and statistics above.
            </p>
          </div>
        </div>
      </div>

      {/* Email Logs Modal */}
      {showLogs && (
        <EmailReminderLogs
          brandId={brandId}
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
        />
      )}
    </div>
  );
}
