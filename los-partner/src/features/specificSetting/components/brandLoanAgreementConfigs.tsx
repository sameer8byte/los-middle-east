import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiPencil, HiCheck, HiXMark } from "react-icons/hi2";
import { Button } from "../../../common/ui/button";
import { Spinner } from "../../../common/ui/spinner";
import {
  getBrandLoanAgreementConfig,
  updateBrandLoanAgreementConfig,
} from "../../../shared/services/api/settings/general.setting.api";

interface BrandLoanAgreementConfig {
  id?: string;
  brandId?: string;
  lenderName: string;
  lenderAddress: string;
  nameOfDigitalLendingApplication: string;
  nameOfLendingServiceProvider: string;
  nameOfLoanServiceProviderRecoveryAgent: string;
  sectionManagerName: string;
  sectionManagerAddress: string;
  sectionManagerEmail: string;
  grievanceOfficerName: string;
  grievanceOfficerAddress: string;
  grievanceOfficerEmail: string;
  grievanceOfficerPhone: string;
  sectionManagerPhone: string;
  nodalOfficerName?: string;
  nodalOfficerAddress?: string;
  nodalOfficerEmail?: string;
  nodalOfficerPhone?: string;
}

export function BrandLoanAgreementConfigs() {
  const { brandId } = useParams<{ brandId: string }>();
  const [config, setConfig] = useState<BrandLoanAgreementConfig | null>(null);
  const [form, setForm] = useState<BrandLoanAgreementConfig>({
    lenderName: "",
    lenderAddress: "",
    nameOfDigitalLendingApplication: "",
    nameOfLendingServiceProvider: "",
    nameOfLoanServiceProviderRecoveryAgent: "",
    sectionManagerName: "",
    sectionManagerAddress: "",
    sectionManagerEmail: "",
    grievanceOfficerName: "",
    grievanceOfficerAddress: "",
    grievanceOfficerEmail: "",
    grievanceOfficerPhone: "",
    sectionManagerPhone: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchConfig = async () => {
      try {
        setFetching(true);
        const data = await getBrandLoanAgreementConfig(brandId);
        setConfig(data);
        setForm(data || {
          lenderName: "",
          lenderAddress: "",
          nameOfDigitalLendingApplication: "",
          nameOfLendingServiceProvider: "",
          nameOfLoanServiceProviderRecoveryAgent: "",
          sectionManagerName: "",
          sectionManagerAddress: "",
          sectionManagerEmail: "",
          grievanceOfficerName: "",
          grievanceOfficerAddress: "",
          grievanceOfficerEmail: "",
          grievanceOfficerPhone: "",
          sectionManagerPhone: "",
        });
        // If no config exists, enable edit mode by default
        if (!data) {
          setEditMode(true);
        }
      } catch (err) {
        console.error("Failed to fetch loan agreement config", err);
        setErrorMessage("Failed to load loan agreement configuration");
        setEditMode(true); // Enable edit mode if fetch fails
      } finally {
        setFetching(false);
      }
    };

    fetchConfig();
  }, [brandId]);

  const handleInputChange = (field: keyof BrandLoanAgreementConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  };

  const handleSave = async () => {
    if (!brandId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!form.lenderName?.trim()) {
      setErrorMessage("Lender name is required");
      return;
    }

    if (form.sectionManagerEmail && !validateEmail(form.sectionManagerEmail)) {
      setErrorMessage("Invalid section manager email format");
      return;
    }

    if (form.grievanceOfficerEmail && !validateEmail(form.grievanceOfficerEmail)) {
      setErrorMessage("Invalid grievance officer email format");
      return;
    }

    if (form.sectionManagerPhone && !validatePhone(form.sectionManagerPhone)) {
      setErrorMessage("Invalid section manager phone format");
      return;
    }

    if (form.grievanceOfficerPhone && !validatePhone(form.grievanceOfficerPhone)) {
      setErrorMessage("Invalid grievance officer phone format");
      return;
    }

    setLoading(true);

    try {
      const updated = await updateBrandLoanAgreementConfig(brandId, form);
      setConfig(updated);
      setForm(updated);
      setEditMode(false);
      setSuccessMessage("Loan agreement configuration saved successfully!");
    } catch (err: any) {
      console.error("Save failed", err);
      setErrorMessage(
        err?.response?.data?.message || "Failed to save configuration. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (config) {
      setForm(config);
      setEditMode(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-[var(--color-on-surface)] opacity-70">
        <Spinner /> Loading loan agreement configuration...
      </div>
    );
  }

  if (!brandId) {
    return (
      <div className="p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg">
        Brand ID is required
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
          Brand Loan Agreement Configuration
        </h2>
        {!editMode && (
          <Button
            onClick={() => setEditMode(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <HiPencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-lg p-6 space-y-6">
        {/* Lender Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-surface)] border-b pb-2">
            Lender Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Lender Name <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                type="text"
                value={form.lenderName}
                onChange={(e) => handleInputChange("lenderName", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter lender name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Lender Address
              </label>
              <textarea
                value={form.lenderAddress}
                onChange={(e) => handleInputChange("lenderAddress", e.target.value)}
                disabled={!editMode}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter lender address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Digital Lending Application Name
              </label>
              <input
                type="text"
                value={form.nameOfDigitalLendingApplication}
                onChange={(e) => handleInputChange("nameOfDigitalLendingApplication", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter application name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Lending Service Provider Name
              </label>
              <input
                type="text"
                value={form.nameOfLendingServiceProvider}
                onChange={(e) => handleInputChange("nameOfLendingServiceProvider", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter service provider name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Loan Service Provider/Recovery Agent
              </label>
              <input
                type="text"
                value={form.nameOfLoanServiceProviderRecoveryAgent}
                onChange={(e) => handleInputChange("nameOfLoanServiceProviderRecoveryAgent", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter recovery agent name"
              />
            </div>
          </div>
        </div>

        {/* Section Manager Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-surface)] border-b pb-2">
            Section Manager Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Section Manager Name
              </label>
              <input
                type="text"
                value={form.sectionManagerName}
                onChange={(e) => handleInputChange("sectionManagerName", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter section manager name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Section Manager Phone
              </label>
              <input
                type="tel"
                value={form.sectionManagerPhone}
                onChange={(e) => handleInputChange("sectionManagerPhone", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Section Manager Email
              </label>
              <input
                type="email"
                value={form.sectionManagerEmail}
                onChange={(e) => handleInputChange("sectionManagerEmail", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter email address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Section Manager Address
              </label>
              <textarea
                value={form.sectionManagerAddress}
                onChange={(e) => handleInputChange("sectionManagerAddress", e.target.value)}
                disabled={!editMode}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter complete address"
              />
            </div>
          </div>
        </div>

        {/* Grievance Officer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-surface)] border-b pb-2">
            Grievance Officer Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Grievance Officer Name
              </label>
              <input
                type="text"
                value={form.grievanceOfficerName}
                onChange={(e) => handleInputChange("grievanceOfficerName", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter grievance officer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Grievance Officer Phone
              </label>
              <input
                type="tel"
                value={form.grievanceOfficerPhone}
                onChange={(e) => handleInputChange("grievanceOfficerPhone", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Grievance Officer Email
              </label>
              <input
                type="email"
                value={form.grievanceOfficerEmail}
                onChange={(e) => handleInputChange("grievanceOfficerEmail", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter email address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Grievance Officer Address
              </label>
              <textarea
                value={form.grievanceOfficerAddress}
                onChange={(e) => handleInputChange("grievanceOfficerAddress", e.target.value)}
                disabled={!editMode}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter complete address"
              />
            </div>
          </div>
        </div>

        {/* Nodal Officer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-surface)] border-b pb-2">
            Nodal Officer Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Nodal Officer Name
              </label>
              <input
                type="text"
                value={form.nodalOfficerName}
                onChange={(e) => handleInputChange("nodalOfficerName", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter nodal officer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Nodal Officer Phone
              </label>
              <input
                type="tel"
                value={form.nodalOfficerPhone}
                onChange={(e) => handleInputChange("nodalOfficerPhone", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Nodal Officer Email
              </label>
              <input
                type="email"
                value={form.nodalOfficerEmail}
                onChange={(e) => handleInputChange("nodalOfficerEmail", e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter email address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
                Nodal Officer Address
              </label>
              <textarea
                value={form.nodalOfficerAddress}
                onChange={(e) => handleInputChange("nodalOfficerAddress", e.target.value)}
                disabled={!editMode}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--color-on-surface)] border-opacity-20 rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] disabled:opacity-50"
                placeholder="Enter complete address"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {editMode && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <HiXMark className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner theme="light" />
                  Saving...
                </>
              ) : (
                <>
                  <HiCheck className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
