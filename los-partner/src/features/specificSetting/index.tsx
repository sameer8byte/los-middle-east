import { useNavigate, useParams } from "react-router-dom";
import { LoanRules } from "./components/loan/loanRules";
import { AppearanceSetting } from "./components/appearance";
import { GeneralSetting } from "./components/general";
import { BrandPolicySetting } from "./components/brandPolicy";
import { IoChevronBack } from "react-icons/io5";
import { BankDetailsSettings } from "./components/bankDetails";
import { BrandDetails } from "./components/brandDetails";
import { BrandConfigSetting } from "./components/brandConfig";
import { LoanConfig } from "./components/loanConfig";
import { BlocklistForm } from "./components/blocklistForm";
import BrandNonRepaymentDates from "./components/brandNonRepaymentDates";
import { BrandCards } from "./components/brandCards";
import { EmailRemindersSetting } from "./components/emailReminders";
import { CsvLeadsPage } from "./components/csvLeads/csvLeadsPage";
import { BrandSubDomainsSetting } from "./components/brandSubDomains";
import { BrandRejectionReasons } from "./components/brandRejectionReasons";
import { BrandProviderSetting } from "./components/brandProvider";
import { ExternalLogsSetting } from "./components/externalLogs";
import { PennyDropLogsSetting } from "./components/pennyDropLogs";
import { PanDetailsLogsSetting } from "./components/panDetailsLogs";
import { UanToEmploymentLogsSetting } from "./components/uanToEmploymentLogs";
import { PhoneToUanLogsSetting } from "./components/phoneToUanLogs";
import { BrandLoanAgreementConfigs } from "./components/brandLoanAgreementConfigs";
import { MobileVerificationLogsSetting } from "./components/mobileVerificationLog";
import PartnerUnavailabilityDates from "../partnerUsers/components/partnerUnavailabilityDates";
import { brandEvaluationItems } from "./components/brandEvaluationItems";
import BrandBlogs from "./components/brandBlogs";
import { DigiLocker20LogsSetting } from "./components/digiLocker2.0Logs";
import { PartnerUserAuditLogsSetting } from "./components/partnerUserAuditLogs";
import ActivityTrackingDashboard from "./components/activityTracking";
import { BrandPathsSetting } from "./components/brandPaths";
import { PartnerPermissions } from "./components/partnerPermissions";
import { BrandAcefoneConfigSetting } from "./components/brandAcefoneConfig";
import { ApiKeysSetting } from "./components/apiKeys";
 
// Component map for scalable rendering
const SETTING_COMPONENTS: Record<string, React.ComponentType> = {
  "loan-rules": LoanRules,
  general: GeneralSetting,
  appearance: AppearanceSetting,
  "brand-policy": BrandPolicySetting, 
  "bank-details": BankDetailsSettings,
  "brand-details": BrandDetails,
  "brand-config": BrandConfigSetting,
  "loan-config": LoanConfig,
  blocklist: BlocklistForm,
  "non-repayment-dates": BrandNonRepaymentDates,
  "partner-unavailability-dates": PartnerUnavailabilityDates,
  "brand-cards": BrandCards, // Lazy load BrandCards component
  "email-reminders": EmailRemindersSetting, // Email reminders settings component
  "csv-leads": CsvLeadsPage, // CSV lead forms upload and management
  "brand-sub-domains": BrandSubDomainsSetting, // New sub-domain settings component
  "rejection-reasons": BrandRejectionReasons,
  "brand-providers": BrandProviderSetting, // Brand provider configuration
  "external-logs": ExternalLogsSetting, // External API service request logs
  "penny-drop-logs": PennyDropLogsSetting, // Penny drop verification logs
  "pan-details-logs": PanDetailsLogsSetting, // PAN details verification logs
  "uan-to-employment-logs": UanToEmploymentLogsSetting, // UAN to employment verification logs
  "phone-to-uan-logs": PhoneToUanLogsSetting, // Phone to UAN verification logs
  "brand-loan-agreement-configs": BrandLoanAgreementConfigs, // Brand loan agreement configuration
  "mobile-verification-logs": MobileVerificationLogsSetting,
  "brand-evaluation-items": brandEvaluationItems,
  "brand-blogs": BrandBlogs,
  "digilocker-2.0-logs": DigiLocker20LogsSetting, // DigiLocker 2.0 Aadhaar verification logs
  "partner-user-audit-logs": PartnerUserAuditLogsSetting, // Partner user audit logs
  "activity-tracking": ActivityTrackingDashboard, // Partner user activity tracking dashboard
  "brand-paths": BrandPathsSetting, // Brand custom paths management
  "partner-permissions": PartnerPermissions, // Partner permissions management
  "brand-acefone-config": BrandAcefoneConfigSetting, // Brand Acefone configuration
  "api-keys": ApiKeysSetting, // API Keys management
};

export function SpecificSettingComponent() {
  const navigate = useNavigate();
  const { settingId } = useParams<{
    settingId: keyof typeof SETTING_COMPONENTS;
  }>();

  // Get the component from the map or undefined if not found
  const SettingComponent = settingId
    ? SETTING_COMPONENTS[settingId]
    : undefined;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Back button with navigation hook */}
      <div className="w-[200px]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-[var(--color-on-surface)] opacity-70 hover:text-[var(--color-on-background)] transition px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Go back"
        >
          <IoChevronBack className="w-5 h-5" />
          <span className="font-medium text-sm">Go Back</span>
        </button>
      </div>

      {/* Main content area */}
      <main className="w-full min-h-[400px]">
        {SettingComponent ? (
          <SettingComponent />
        ) : (
          <p className="text-[var(--color-on-surface)] opacity-70 text-center">
            {settingId
              ? `Setting "${settingId}" not found`
              : "Please select a setting to edit."}
          </p>
        )}
      </main>
    </div>
  );
}
