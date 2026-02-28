import { useState, useEffect } from "react";
import { 
  HiPlus, 
  HiPencil, 
  HiTrash, 
  HiEye,
  HiEyeSlash,
  HiArrowPath
} from "react-icons/hi2";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";
import { useToast } from "../../../context/toastContext";
import { ReminderType } from "../../../constant/enum";
import { EmailType } from "../../../constant/emailTypes";
import {
  EmailReminderConfig,
  getEmailReminderConfigs,
  createEmailReminderConfig,
  updateEmailReminderConfig,
  deleteEmailReminderConfig,
  toggleEmailReminderConfig,
  resetEmailReminderConfigsToDefaults
} from "../../../shared/services/api/loan.api";

// Helper to get display name for reminder types
export const getReminderTypeDisplayName = (type: ReminderType): string => {
  switch (type) {
    case ReminderType.SEVEN_DAY:
      return "7-Day Reminder";
    case ReminderType.THREE_DAY:
      return "3-Day Reminder";
    case ReminderType.ONE_DAY:
      return "1-Day Reminder";
    case ReminderType.SAME_DAY:
      return "Same Day Reminder";
    case ReminderType.OVERDUE:
      return "Overdue Reminder";
    case ReminderType.CUSTOM:
      return "Custom Reminder";
    default:
      return type;
  }
};

interface EmailReminderConfigManagerProps {
  brandId: string;
}

// Helper to suggest reminder type based on days before due date
const getSuggestedReminderType = (daysBeforeDue: number): ReminderType => {
  if (daysBeforeDue === 7) return ReminderType.SEVEN_DAY;
  if (daysBeforeDue === 3) return ReminderType.THREE_DAY;
  if (daysBeforeDue === 1) return ReminderType.ONE_DAY;
  if (daysBeforeDue === 0) return ReminderType.SAME_DAY;
  if (daysBeforeDue < 0) return ReminderType.OVERDUE;
  return ReminderType.CUSTOM;
};

// Helper to map ReminderType to EmailType
const getEmailTypeFromReminderType = (reminderType: ReminderType): EmailType => {
  switch (reminderType) {
    case ReminderType.SEVEN_DAY:
      return EmailType.SEVEN_DAY_REMINDER;
    case ReminderType.THREE_DAY:
      return EmailType.THREE_DAY_REMINDER;
    case ReminderType.ONE_DAY:
      return EmailType.ONE_DAY_REMINDER;
    case ReminderType.SAME_DAY:
      return EmailType.SAME_DAY_REMINDER;
    case ReminderType.OVERDUE:
      return EmailType.OVERDUE_REMINDER;
    case ReminderType.CUSTOM:
      return EmailType.CUSTOM_REMINDER;
    default:
      return EmailType.CUSTOM_REMINDER;
  }
};

// Helper to get default templates based on reminder type
const getDefaultTemplates = (reminderType: ReminderType) => {
  const templates = {
    [ReminderType.SEVEN_DAY]: {
      subject: "Payment Reminder - 7 days remaining for {{customerName}}",
      body: `Hi {{customerName}},

This is a friendly reminder that your loan payment of ₹{{amountDue}} is due in 7 days on {{dueDate}}.

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please ensure timely payment to avoid any late fees.

Thank you!`
    },
    [ReminderType.THREE_DAY]: {
      subject: "Payment Reminder - 3 days remaining for {{customerName}}",
      body: `Hi {{customerName}},

Your loan payment of ₹{{amountDue}} is due in 3 days on {{dueDate}}.

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please make the payment soon to avoid late charges.

Thank you!`
    },
    [ReminderType.ONE_DAY]: {
      subject: "Urgent: Payment due tomorrow for {{customerName}}",
      body: `Hi {{customerName}},

This is an urgent reminder that your loan payment of ₹{{amountDue}} is due tomorrow ({{dueDate}}).

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please make the payment immediately to avoid late fees.

Thank you!`
    },
    [ReminderType.SAME_DAY]: {
      subject: "URGENT: Payment Due TODAY for {{customerName}}",
      body: `Hi {{customerName}},

This is an urgent reminder that your loan payment of ₹{{amountDue}} is due TODAY ({{dueDate}}).

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please make the payment immediately to avoid late payment penalties.

Thank you!`
    },
    [ReminderType.OVERDUE]: {
      subject: "Overdue Payment Notice for {{customerName}}",
      body: `Hi {{customerName}},

Your loan payment of ₹{{amountDue}} was due on {{dueDate}} and is now overdue.

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please make the payment immediately to avoid additional charges and maintain your credit record.

Thank you!`
    },
    [ReminderType.CUSTOM]: {
      subject: "Payment Reminder for {{customerName}}",
      body: `Hi {{customerName}},

This is a reminder regarding your loan payment.

Loan ID: {{loanId}}
Due Amount: ₹{{amountDue}}
Due Date: {{dueDate}}

Please make the payment as scheduled.

Thank you!`
    }
  };
  
  return templates[reminderType] || templates[ReminderType.CUSTOM];
};

export function EmailReminderConfigManager({ brandId }: Readonly<EmailReminderConfigManagerProps>) {
  const [configs, setConfigs] = useState<EmailReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<EmailReminderConfig | null>(null);
  const [formData, setFormData] = useState({
    reminderType: ReminderType.CUSTOM,
    daysBeforeDue: 7,
    isEnabled: true,
    frequency: "once" as "once" | "daily",
    loanStatuses: ["ACTIVE", "POST_ACTIVE"],
    subjectTemplate: "",
    bodyTemplate: "",
    emailType: EmailType.CUSTOM_REMINDER
  });

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, [brandId]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await getEmailReminderConfigs(brandId);
      setConfigs(response?.configs || []);
    } catch (error: any) {
      console.error("Failed to load email reminder configurations:", error);
      
      // Provide specific error messages based on status code
      if (error.response?.status === 404) {
        showError("Email reminder configuration feature is not available for this brand. Please contact support.");
      } else if (error.response?.status === 403) {
        showError("You don't have permission to access email reminder configurations.");
      } else if (error.response?.status >= 500) {
        showError("Server error occurred while loading configurations. Please try again later.");
      } else {
        showError("Failed to load email reminder configurations. Please check your connection and try again.");
      }
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createEmailReminderConfig(brandId, formData);
      showSuccess("Email reminder configuration created successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchConfigs();
    } catch (error: any) {
      console.error("Failed to create email reminder configuration:", error);
      showError("Failed to create email reminder configuration");
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;
    
    try {
      await updateEmailReminderConfig(brandId, selectedConfig.id, formData);
      showSuccess("Email reminder configuration updated successfully");
      setShowEditDialog(false);
      setSelectedConfig(null);
      resetForm();
      fetchConfigs();
    } catch (error: any) {
      console.error("Failed to update email reminder configuration:", error);
      showError("Failed to update email reminder configuration");
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;
    
    try {
      await deleteEmailReminderConfig(brandId, configId);
      showSuccess("Email reminder configuration deleted successfully");
      fetchConfigs();
    } catch (error) {
      console.error("Failed to delete email reminder configuration:", error);
      showError("Failed to delete email reminder configuration");
    }
  };

  const handleToggle = async (configId: string) => {
    try {
      await toggleEmailReminderConfig(brandId, configId);
      showSuccess("Email reminder configuration toggled successfully");
      fetchConfigs();
    } catch (error) {
      console.error("Failed to toggle email reminder configuration:", error);
      showError("Failed to toggle email reminder configuration");
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Are you sure you want to reset all configurations to defaults? This will delete all existing configurations.")) return;
    
    try {
      await resetEmailReminderConfigsToDefaults(brandId);
      showSuccess("Email reminder configurations reset to defaults successfully");
      fetchConfigs();
    } catch (error) {
      console.error("Failed to reset email reminder configurations:", error);
      showError("Failed to reset email reminder configurations");
    }
  };

  const resetForm = () => {
    setFormData({
      reminderType: ReminderType.CUSTOM,
      daysBeforeDue: 7,
      isEnabled: true,
      frequency: "once",
      loanStatuses: ["ACTIVE", "POST_ACTIVE"],
      subjectTemplate: "",
      bodyTemplate: "",
      emailType: EmailType.CUSTOM_REMINDER
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (config: EmailReminderConfig) => {
    setSelectedConfig(config);
    setFormData({
      reminderType: config.reminderType,
      daysBeforeDue: config.daysBeforeDue,
      isEnabled: config.isEnabled,
      frequency: config.frequency,
      loanStatuses: config.loanStatuses,
      subjectTemplate: config.subjectTemplate,
      bodyTemplate: config.bodyTemplate,
      emailType: config.emailType
    });
    setShowEditDialog(true);
  };

  const getReminderTypeLabel = (type: ReminderType) => {
    return getReminderTypeDisplayName(type);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading configurations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
            Email Reminder Configurations
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleResetToDefaults}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <HiArrowPath className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={openCreateDialog}
            size="sm"
            className="flex items-center gap-2"
          >
            <HiPlus className="w-4 h-4" />
            Add Configuration
          </Button>
        </div>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className="bg-white p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-[var(--color-on-background)]">
                    {getReminderTypeLabel(config.reminderType)}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      config.isEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="text-sm text-[var(--color-on-surface)] opacity-70 space-y-1">
                  <p>
                    <strong>Timing:</strong> {
                      (() => {
                        if (config.daysBeforeDue > 0) {
                          return `${config.daysBeforeDue} days before due date`;
                        } else if (config.daysBeforeDue === 0) {
                          return "On due date";
                        } else {
                          return "After due date (overdue)";
                        }
                      })()
                    } • {config.frequency === "once" ? "Send once" : "Send daily"}
                  </p>
                  <p><strong>Subject:</strong> {config.subjectTemplate}</p>
                  <p><strong>Loan Statuses:</strong> {config.loanStatuses.join(", ")}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleToggle(config.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {config.isEnabled ? (
                    <>
                      <HiEyeSlash className="w-4 h-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <HiEye className="w-4 h-4" />
                      Enable
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => openEditDialog(config)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <HiPencil className="w-4 h-4" />
                  Edit
                </Button>
                
                <Button
                  onClick={() => handleDelete(config.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                >
                  <HiTrash className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
            <p>No email reminder configurations found.</p>
            <Button onClick={openCreateDialog} className="mt-4">
              Create Your First Configuration
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create Email Reminder Configuration"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="create-reminder-type" className="block text-sm font-medium mb-1">Reminder Type</label>
            <select
              id="create-reminder-type"
              value={formData.reminderType}
              onChange={(e) => {
                const reminderType = e.target.value as ReminderType;
                const emailType = getEmailTypeFromReminderType(reminderType);
                setFormData({ ...formData, reminderType, emailType });
              }}
              className="w-full p-2 border rounded-lg"
            >
              {Object.values(ReminderType).map((type) => (
                <option key={type} value={type}>
                  {getReminderTypeDisplayName(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="create-days-before" className="block text-sm font-medium mb-1">Days Before Due Date</label>
            <input
              id="create-days-before"
              type="number"
              value={formData.daysBeforeDue}
              onChange={(e) => {
                const daysValue = parseInt(e.target.value) || 0;
                const suggestedType = getSuggestedReminderType(daysValue);
                const suggestedEmailType = getEmailTypeFromReminderType(suggestedType);
                const defaultTemplates = getDefaultTemplates(suggestedType);
                
                setFormData({ 
                  ...formData, 
                  daysBeforeDue: daysValue,
                  reminderType: suggestedType,
                  emailType: suggestedEmailType,
                  subjectTemplate: formData.subjectTemplate || defaultTemplates.subject,
                  bodyTemplate: formData.bodyTemplate || defaultTemplates.body
                });
              }}
              className="w-full p-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Positive for before due date, 0 for on due date, negative for after due date
            </p>
          </div>

          <div>
            <label htmlFor="create-frequency" className="block text-sm font-medium mb-1">Frequency</label>
            <select
              id="create-frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as "once" | "daily" })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="once">Send Once</option>
              <option value="daily">Send Daily</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="create-subject" className="block text-sm font-medium">Subject Template</label>
              <button
                type="button"
                onClick={() => {
                  const templates = getDefaultTemplates(formData.reminderType);
                  setFormData({ 
                    ...formData, 
                    subjectTemplate: templates.subject,
                    bodyTemplate: templates.body
                  });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Use default template
              </button>
            </div>
            <input
              id="create-subject"
              type="text"
              value={formData.subjectTemplate}
              onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
              placeholder="Use {{loanId}}, {{customerName}}, etc."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="create-body" className="block text-sm font-medium mb-1">Body Template</label>
            <textarea
              id="create-body"
              value={formData.bodyTemplate}
              onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
              placeholder="Use {{loanId}}, {{customerName}}, {{dueDate}}, {{amountDue}}, etc."
              className="w-full p-2 border rounded-lg h-24"
            />
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-2">Available template variables:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <div>• {`{{customerName}}`}</div>
                <div>• {`{{loanId}}`}</div>
                <div>• {`{{amountDue}}`}</div>
                <div>• {`{{dueDate}}`}</div>
                <div>• {`{{phoneNumber}}`}</div>
                <div>• {`{{email}}`}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} className="flex-1">
              Create Configuration
            </Button>
            <Button onClick={() => setShowCreateDialog(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Edit Email Reminder Configuration"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-days-before" className="block text-sm font-medium mb-1">Days Before Due Date</label>
            <input
              id="edit-days-before"
              type="number"
              value={formData.daysBeforeDue}
              onChange={(e) => setFormData({ ...formData, daysBeforeDue: parseInt(e.target.value) })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="edit-frequency" className="block text-sm font-medium mb-1">Frequency</label>
            <select
              id="edit-frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as "once" | "daily" })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="once">Send Once</option>
              <option value="daily">Send Daily</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-subject" className="block text-sm font-medium mb-1">Subject Template</label>
            <input
              id="edit-subject"
              type="text"
              value={formData.subjectTemplate}
              onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="edit-body" className="block text-sm font-medium mb-1">Body Template</label>
            <textarea
              id="edit-body"
              value={formData.bodyTemplate}
              onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
              className="w-full p-2 border rounded-lg h-24"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleUpdate} className="flex-1">
              Update Configuration
            </Button>
            <Button onClick={() => setShowEditDialog(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default EmailReminderConfigManager;
