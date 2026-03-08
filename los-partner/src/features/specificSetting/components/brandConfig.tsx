import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
 
import { Spinner } from "../../../common/ui/spinner";
import { getBrandConfig, updateBrandConfig } from "../../../shared/services/api/settings/general.setting.api";

interface BrandConfig {
  salaryThresholdAmount: number;
  rejectionDuration: number;
  bankStatementHistoryMonths: number;
  minLoanAmountRequired: number;
  esignFinalCopyRecipients: string;
  esignNotificationEmailList: string;
  esignDocketTitle: string;
  esignExpiryDayCount: number;
  sectionManagerName: string;
  sectionManagerPhoneNumber: string;
  sectionManagerAddress: string;
  noDueCopyRecipients: string;
  isAA: boolean;
  isAlternateNumber: boolean;
  loanAgreementVersion: string;
  isCCReminderEmail: boolean;
  ccReminderEmail: string;
  loanAgreementHeader: string;
  loanAgreementFooter: string;
  isTestReminderEmail: boolean;
  isUserReminderEmail: boolean;
  forceEmployment: boolean;
  isAadharImageRequired: boolean;
  isAadhaarNumberRequired: boolean;
  loanNoDueCertificateFooter: string;
  loanNoDueCertificateHeader: string;
  sectionManagerEmail: string;
  autoAllocationType: string;
  evaluationVersion: string;
  signUpVersion: string;
  loan_ops_version: string;
  loan_collection_version: string;
  fmsBlockStatus: boolean;
  autoGenerateNOC: boolean;
  enable_central_dedup: boolean;
  sunday_off: boolean;
  field_visit: boolean;
  min_age: number;
  max_age: number;
}

export function BrandConfigSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [config, setConfig] = useState<BrandConfig | null>(null);
  const [form, setForm] = useState<Partial<BrandConfig>>({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    loanAgreementHeader?: File;
    loanAgreementFooter?: File;
    loanNoDueCertificateHeader?: File;
    loanNoDueCertificateFooter?: File;
  }>({});

  useEffect(() => {
    if (!brandId) return;

    const fetchData = async () => {
      setFetching(true);
      setErrorMessage(null);
      try {
        const configRes = await getBrandConfig(brandId);
        setConfig(configRes);
        setForm(configRes);
      } catch (err) {
        console.error("Failed to fetch brand config", err);
        setErrorMessage(
          "Unable to load brand settings. Please try refreshing the page."
        );
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [brandId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? Number(value) : value;
    setForm((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleFileChange = (fieldName: string, file: File | undefined) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadedFiles((prev) => ({ ...prev, [fieldName]: file }));
  };

  const handleSave = async () => {
    if (!brandId || !form) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Basic validation example: expiry day count minimum 1
      if ((form.esignExpiryDayCount ?? 0) < 1) {
        setErrorMessage("E-sign Expiry must be at least 1 day.");
        setLoading(false);
        return;
      }

      // Validate minimum loan amount
      if ((form.minLoanAmountRequired ?? 0) < 0) {
        setErrorMessage("Minimum Loan Amount cannot be negative.");
        setLoading(false);
        return;
      }
      const payload: BrandConfig = {
        salaryThresholdAmount: Number(form.salaryThresholdAmount ?? 0),
        rejectionDuration: Number(form.rejectionDuration ?? 0),
        bankStatementHistoryMonths: Number(
          form.bankStatementHistoryMonths ?? 0
        ),
        minLoanAmountRequired: Number(form.minLoanAmountRequired ?? 0),
        esignFinalCopyRecipients: form.esignFinalCopyRecipients ?? "",
        esignNotificationEmailList: form.esignNotificationEmailList ?? "",
        esignDocketTitle: form.esignDocketTitle ?? "",
        esignExpiryDayCount: Number(form.esignExpiryDayCount ?? 0),
        sectionManagerName: form.sectionManagerName ?? "",
        sectionManagerPhoneNumber: form.sectionManagerPhoneNumber ?? "",
        sectionManagerAddress: form.sectionManagerAddress ?? "",
        noDueCopyRecipients: form.noDueCopyRecipients ?? "",
        isAA: Boolean(form.isAA ?? true),
        isAlternateNumber: Boolean(form.isAlternateNumber ?? true),
        loanAgreementVersion: form.loanAgreementVersion ?? "1",
        isCCReminderEmail: Boolean(form.isCCReminderEmail ?? false),
        ccReminderEmail: form.ccReminderEmail ?? "",
        loanAgreementHeader: form.loanAgreementHeader ?? "",
        loanAgreementFooter: form.loanAgreementFooter ?? "",
        isTestReminderEmail: Boolean(form.isTestReminderEmail ?? true),
        isUserReminderEmail: Boolean(form.isUserReminderEmail ?? false),
        forceEmployment: Boolean(form.forceEmployment ?? false),
        isAadharImageRequired: Boolean(form.isAadharImageRequired ?? false),
        isAadhaarNumberRequired: Boolean(form.isAadhaarNumberRequired ?? false),
        loanNoDueCertificateFooter: form.loanNoDueCertificateFooter ?? "",
        loanNoDueCertificateHeader: form.loanNoDueCertificateHeader ?? "",
        sectionManagerEmail: form.sectionManagerEmail ?? "",
        autoAllocationType: form.autoAllocationType ?? "LOGIN",
        evaluationVersion: form.evaluationVersion ?? "V1",
        signUpVersion: form.signUpVersion ?? "V1",
        loan_ops_version: form.loan_ops_version ?? "V1",
        loan_collection_version: form.loan_collection_version ?? "V1",
        fmsBlockStatus: Boolean(form.fmsBlockStatus ?? false),
        autoGenerateNOC: Boolean(form.autoGenerateNOC ?? false),
        enable_central_dedup: Boolean(form.enable_central_dedup ?? false),
        sunday_off: Boolean(form.sunday_off ?? false),
        field_visit: Boolean(form.field_visit ?? false),
        min_age: Number(form.min_age ?? 18),
        max_age: Number(form.max_age ?? 65),
      };
      const updated = await updateBrandConfig(
        brandId,
        payload,
        uploadedFiles.loanAgreementHeader,
        uploadedFiles.loanAgreementFooter,
        uploadedFiles.loanNoDueCertificateHeader,
        uploadedFiles.loanNoDueCertificateFooter
      );
      setConfig(updated);
      setForm(updated);
      setUploadedFiles({});
      setEditMode(false);
      setSuccessMessage("Settings saved successfully!");
    } catch (err) {
      console.error("Save failed", err);
      setErrorMessage(
        (err as Error).message ||
          "Failed to save settings. Please check your inputs and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (config) setForm(config);
    setEditMode(false);
  };

  if (fetching)
    return <div className="p-8 text-[var(--color-on-surface)] opacity-70">Loading brand settings...</div>;
  if (!config)
    return (
      <div className="p-8 text-[var(--color-on-error)]">
        {errorMessage || "Failed to load brand settings."}
      </div>
    );

  const fields: {
    label: string;
    name: keyof BrandConfig;
    type: string;
    description?: string;
    options?: { value: string; label: string }[];
  }[] = [
    {
      label: "Salary Threshold (INR)",
      name: "salaryThresholdAmount",
      type: "number",
      description: "Minimum net monthly salary required to qualify.",
    },
    {
      label: "Rejection Duration (Days)",
      name: "rejectionDuration",
      type: "number",
      description: "Number of days before a rejected application can reapply.",
    },
    {
      label: "Bank Statement History (Months)",
      name: "bankStatementHistoryMonths",
      type: "number",
      description: "Number of recent months of bank statements to consider.",
    },
    {
      label: "Minimum Loan Amount Required (INR)",
      name: "minLoanAmountRequired",
      type: "number",
      description: "Minimum loan amount required. Loans below this amount will be automatically rejected.",
    },
    {
      label: "E-sign Final Copy Recipients",
      name: "esignFinalCopyRecipients",
      type: "text",
      description:
        "Comma-separated email list to receive final signed e-sign documents. (e.g., team@company.com, manager@company.com)",
    },
    {
      label: "E-sign Notification Emails",
      name: "esignNotificationEmailList",
      type: "text",
      description:
        "Comma-separated email list for e-sign status updates. (e.g., alerts@company.com)",
    },
    {
      label: "E-sign Docket Title",
      name: "esignDocketTitle",
      type: "text",
      description:
        "The title shown on the e-sign docket (e.g., Loan Agreement, Employment Contract).",
    },
    {
      label: "E-sign Expiry (Days)",
      name: "esignExpiryDayCount",
      type: "number",
      description:
        "Days after which the e-sign link/document expires. Minimum value: 1 day.",
    },
    {
      label: "Section Manager Name",
      name: "sectionManagerName",
      type: "text",
      description: "Full name of the section manager responsible for loan approvals.",
    },
    {
      label: "Section Manager Phone Number",
      name: "sectionManagerPhoneNumber",
      type: "text",
      description: "Contact phone number of the section manager.",
    },
    {
      label: "Section Manager Email",
      name: "sectionManagerEmail",
      type: "text",
      description: "Email address of the section manager.",
    },
    {
      label: "Section Manager Address",
      name: "sectionManagerAddress",
      type: "text",
      description: "Physical address of the section manager.",
    },
    {
      label: "No Due Copy Recipients",
      name: "noDueCopyRecipients",
      type: "text",
      description:
        "Comma-separated email list to receive no due copies. (e.g. tech@8byte.ai,ab@8byte.ai)",
    },
    {
      label: "Enable Account Aggregator (AA)",
      name: "isAA",
      type: "checkbox",
      description: "Enable Account Aggregator integration for bank statement retrieval.",
    },
    {
      label: "Allow Alternate Number",
      name: "isAlternateNumber",
      type: "checkbox",
      description: "Allow users to provide an alternate contact number.",
    },
    {
      label: "Loan Agreement Version",
      name: "loanAgreementVersion",
      type: "select",
      description: "Select the loan agreement version to use.",
      options: [
        { value: "1", label: "Version 1" },
        { value: "2", label: "Version 2" },
      ],
    },
    {
      label: "CC Reminder Email Enabled",
      name: "isCCReminderEmail",
      type: "checkbox",
      description: "Enable CC email notifications for loan reminders.",
    },
    {
      label: "CC Reminder Email Addresses",
      name: "ccReminderEmail",
      type: "text",
      description: "Comma-separated email addresses to CC on reminder emails.",
    },
    {
      label: "Loan Agreement Header",
      name: "loanAgreementHeader",
      type: "file-image",
      description: "Upload header image for loan agreement documents.",
    },
    {
      label: "Loan Agreement Footer",
      name: "loanAgreementFooter",
      type: "file-image",
      description: "Upload footer image for loan agreement documents.",
    },
    {
      label: "Test Reminder Email",
      name: "isTestReminderEmail",
      type: "checkbox",
      description: "Send reminder emails in test mode for debugging.",
    },
    {
      label: "User Reminder Email Enabled",
      name: "isUserReminderEmail",
      type: "checkbox",
      description: "Enable automatic reminder emails to users.",
    },
    {
      label: "Force Employment Verification",
      name: "forceEmployment",
      type: "checkbox",
      description: "Require mandatory employment information verification for all loan applications.",
    },
    {
      label: "CPR Card Image Required",
      name: "isAadharImageRequired",
      type: "checkbox",
      description: "Require users to upload CPR Card images (front and back) for verification.",
    },
    {
      label: "CPR Card Number Required",
      name: "isAadhaarNumberRequired",
      type: "checkbox",
      description: "Require users to provide CPR Card number during registration or verification.",
    },
    {
      label: "No Due Certificate Header",
      name: "loanNoDueCertificateHeader",
      type: "file-image",
      description: "Upload header image for No Due Certificate.",
    },
    {
      label: "No Due Certificate Footer",
      name: "loanNoDueCertificateFooter",
      type: "file-image",
      description: "Upload footer image for No Due Certificate.",
    },
    {
      label: "Auto Allocation Type",
      name: "autoAllocationType",
      type: "select",
      description: "Method for automatically allocating loans to credit executives.",
      options: [
        { value: "LOGIN", label: "Login Based" },
        { value: "ATTENDANCE", label: "Attendance Based" },
      ],
    },
    {
      label: "Evaluation Version",
      name: "evaluationVersion",
      type: "select",
      description: "Select the evaluation version to use for loan assessment.",
      options: [
        { value: "V1", label: "Version 1" },
        { value: "V2", label: "Version 2" },
      ],
    },
    {
      label: "Signup Version",
      name: "signUpVersion",
      type: "select",
      description: "Select the signup form version for users to use during registration.",
      options: [
        { value: "V1", label: "Version 1" },
        { value: "V2", label: "Version 2" },
      ],
    },
    {
      label: "Loan Ops Version",
      name: "loan_ops_version",
      type: "select",
      description: "Select the LoanOps form version for users to use during registration.",
      options: [
        { value: "V1", label: "Version 1" },
        { value: "V2", label: "Version 2" },
      ],
    },
    {
      label: "Loan Collection Version",
      name: "loan_collection_version",
      type: "select",
      description: "Select the Loan Collection version for collection management.",
      options: [
        { value: "V1", label: "Version 1" },
        { value: "V2", label: "Version 2" },
      ],
    },
    {
      label: "FMS Block Status",
      name: "fmsBlockStatus",
      type: "checkbox",
      description: "Block loans for FMS (Financial Management System) integration.",
    },
    {
      label: "Auto Generate NOC",
      name: "autoGenerateNOC",
      type: "checkbox",
      description: "select whether sending NOC will be automatic of manual ",
    },
    {
  
      label: "Enable Central Dedup",
      name: "enable_central_dedup",
      type: "checkbox",
      description: "Enable central deduplication to check for duplicate loan applications across the system.",
    },
    {
  
      label: "Sunday Off",
      name: "sunday_off",
      type: "checkbox",
      description: "Enable or disable Sunday off for Due date.",
    },
    {
  
      label: "Field Visit",
      name: "field_visit",
      type: "checkbox",
      description: "Enable or disable field visits for loan verification.",
    },
    {
      label: "Minimum Age",
      name: "min_age",
      type: "number",
      description: "Minimum age required for loan applicants.",
    },
    {
      label: "Maximum Age",
      name: "max_age",
      type: "number",
      description: "Maximum age allowed for loan applicants.",
    },
  ];

  // Group fields by category
  const fieldGroups = {
    "Financial": ["salaryThresholdAmount", "minLoanAmountRequired", "bankStatementHistoryMonths", "rejectionDuration", "min_age", "max_age"],
    "E-Sign": ["esignDocketTitle", "esignExpiryDayCount", "esignFinalCopyRecipients", "esignNotificationEmailList"],
    "Section Manager": ["sectionManagerName", "sectionManagerEmail", "sectionManagerPhoneNumber", "sectionManagerAddress"],
    "Documents": ["loanAgreementVersion", "loanAgreementHeader", "loanAgreementFooter", "loanNoDueCertificateHeader", "loanNoDueCertificateFooter", "noDueCopyRecipients"],
    "Features": ["isAA", "isAlternateNumber", "forceEmployment", "isAadharImageRequired", "isAadhaarNumberRequired", "isCCReminderEmail", "isTestReminderEmail", "isUserReminderEmail", "fmsBlockStatus", "enable_central_dedup","autoGenerateNOC", "sunday_off", "field_visit"],
    "Advanced": ["ccReminderEmail", "autoAllocationType", "evaluationVersion", "signUpVersion","loan_ops_version","loan_collection_version"],
  };

  const getFieldsByGroup = (group: string) => {
    const groupFields = fieldGroups[group as keyof typeof fieldGroups] || [];
    return fields.filter((field) => groupFields.includes(field.name));
  };

  return (
    <div className="max-w-6xl mx-auto p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Brand Configuration</h1>
          <p className="text-xs text-gray-500">Manage brand settings</p>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? <><Spinner /><span>Saving</span></> : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {(errorMessage || successMessage) && (
        <div className={`p-2.5 rounded text-xs ${errorMessage ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {Object.keys(fieldGroups).map((groupName) => {
          const groupFields = getFieldsByGroup(groupName);
          if (groupFields.length === 0) return null;

          return (
            <div key={groupName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Group Header */}
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">{groupName}</h2>
              </div>

              {/* Group Fields */}
              <div className="p-3 space-y-3">
                {groupFields.map(({ label, name, type, description, options }) => (
                  <div key={name} className={type === "file-image" ? "col-span-full" : ""}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    {editMode ? (
                      <>
                        {type === "checkbox" ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name={name}
                              checked={Boolean(form[name] ?? false)}
                              onChange={(e) => {
                                setErrorMessage(null);
                                setSuccessMessage(null);
                                setForm((prev) => ({ ...prev, [name]: e.target.checked }));
                              }}
                              className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-1 focus:ring-[var(--color-primary)]"
                              disabled={loading}
                            />
                            <span className="text-xs text-gray-600">{form[name] ? "On" : "Off"}</span>
                          </label>
                        ) : type === "select" ? (
                          <select
                            name={name}
                            value={String(form[name] ?? "")}
                            onChange={(e) => {
                              setErrorMessage(null);
                              setSuccessMessage(null);
                              setForm((prev) => ({ ...prev, [name]: e.target.value }));
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                            disabled={loading}
                          >
                            {options?.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : type === "file-image" ? (
                          <div className="space-y-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                setErrorMessage(null);
                                setSuccessMessage(null);
                                handleFileChange(String(name), e.target.files?.[0]);
                              }}
                              className="w-full text-xs border border-gray-300 rounded file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-hover)] file:cursor-pointer"
                              disabled={loading}
                            />
                            {uploadedFiles[String(name) as keyof typeof uploadedFiles] && (
                              <p className="text-xs text-green-600">✓ {uploadedFiles[String(name) as keyof typeof uploadedFiles]?.name}</p>
                            )}
                            {!uploadedFiles[String(name) as keyof typeof uploadedFiles] && config?.[name] && typeof config[name] === 'string' && config[name].startsWith('http') && (
                              <img src={String(config[name])} alt={label} className="h-12 object-contain rounded border border-gray-200" />
                            )}
                          </div>
                        ) : (
                          <input
                            name={name}
                            type={type}
                            value={typeof form[name] === 'boolean' ? '' : (form[name] ?? "")}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                            disabled={loading}
                          />
                        )}
                        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                      </>
                    ) : (
                      <div className="px-2 py-1.5 text-xs bg-gray-50 rounded border border-gray-200">
                        {type === "checkbox" ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config[name] ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                            {config[name] ? "✓ On" : "✗ Off"}
                          </span>
                        ) : type === "file-image" ? (
                          typeof config[name] === 'string' && config[name].startsWith('http') ? (
                            <img src={String(config[name])} alt={label} className="h-10 object-contain rounded" />
                          ) : (
                            <span className="text-gray-400">No image</span>
                          )
                        ) : type === "select" && options ? (
                          options.find((opt) => opt.value === String(config[name]))?.label || String(config[name])
                        ) : (
                          String(config[name])
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
