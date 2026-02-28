import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { LoanRiskCategory } from "../../../constant/enum";
import { Spinner } from "../../../common/ui/spinner";
import { FiEdit } from "react-icons/fi";
import { getGeneral, updateGeneral } from "../../../shared/services/api/settings/general.setting.api";
import { LoadingSpinner } from "../../../common/common/loading-spinner";

interface GeneralSetting {
  id: string;
  brandId: string;
  name: string;
  logoUrl: string;
  domain: string;
  defaultLoanRiskCategory: LoanRiskCategory;
}

interface GeneralForm extends Partial<GeneralSetting> {
  logoFile?: File | null;
}

export function GeneralSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [setting, setSetting] = useState<GeneralSetting | null>(null);
  const [form, setForm] = useState<GeneralForm>({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setError("Brand ID is missing from URL.");
      setLoading(false);
      return;
    }
    fetchSetting(brandId);
  }, [brandId]);

  // Cleanup object URLs on component unmount or form changes
  useEffect(() => {
    return () => {
      if (form.logoFile && form.logoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(form.logoUrl);
      }
    };
  }, [form.logoFile, form.logoUrl]);

  const fetchSetting = async (id: string) => {
    setLoading(true);
    try {
      const response = await getGeneral(id);
      setSetting(response);
      setForm(response);
    } catch (err) {
      setError("Failed to fetch settings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "defaultLoanRiskCategory" ? value as LoanRiskCategory : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo size should be less than 5MB.');
        return;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setForm((prev) => ({ 
        ...prev, 
        logoFile: file,
        logoUrl: previewUrl
      }));
    } else {
      setForm((prev) => ({ 
        ...prev, 
        logoFile: null,
        logoUrl: setting?.logoUrl || ""
      }));
    }
    setError(null);
  };

  const handleCancel = () => {
    if (setting) {
      setForm(setting);
    }
    // Clean up any object URLs
    if (form.logoFile && form.logoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(form.logoUrl);
    }
    setEditMode(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!brandId) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateGeneral(
        brandId,
        form.name || "",
        form.logoFile ? "https://placeholder.com/logo-upload" : form.logoUrl || "",
        form.domain || "",
        form.defaultLoanRiskCategory || LoanRiskCategory.POOR,
        form.logoFile || undefined
      );
      setSetting(updated);
      
      // Clean up object URL if it was created
      if (form.logoFile && form.logoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(form.logoUrl);
      }
      
      setEditMode(false);
    } catch (err) {
      setError("Failed to save changes.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return   <LoadingSpinner/>

  if (error)
    return (
      <div className="max-w-2xl mx-auto text-[var(--color-on-error)] font-semibold text-center py-6">
        {error}
      </div>
    );

  if (!setting) return null;

  return (
    <div className="max-w-3xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--border)]">
      <div className="flex justify-between items-center pb-6 mb-8 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">General Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage your brand's general configuration</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiEdit className="w-5 h-5" />
            Edit Settings
          </button>
        )}
      </div>

      <div className="space-y-8">
        <FormGroup
          label="Brand Name"
          name="name"
          value={form.name || ""}
          editMode={editMode}
          onChange={handleChange}
        />

        <FormGroup
          label="Domain"
          name="domain"
          value={form.domain || ""}
          editMode={editMode}
          onChange={handleChange}
          prefix="https://"
          readOnly
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="logo-upload" className="text-sm font-medium text-[var(--foreground)]">Logo</label>
          {editMode ? (
            <div className="space-y-3">
              <input
                id="logo-upload"
                name="logo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--color-on-surface)] opacity-70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-primary)] bg-opacity-10 file:text-[var(--color-on-primary)] hover:file:bg-[var(--color-primary)] bg-opacity-15"
              />
              {form.logoUrl && (
                <div className="relative inline-block">
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="h-24 w-auto object-contain border border-[var(--border)] rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (form.logoFile && form.logoUrl?.startsWith('blob:')) {
                        URL.revokeObjectURL(form.logoUrl);
                      }
                      setForm(prev => ({ ...prev, logoFile: null, logoUrl: setting?.logoUrl || "" }));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-[var(--color-error)] bg-opacity-100 text-white rounded-full hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {setting.logoUrl ? (
                <img
                  src={setting.logoUrl}
                  alt="Brand logo"
                  className="h-24 w-auto object-contain border border-[var(--color-muted)] border-opacity-30 rounded-lg p-2"
                />
              ) : (
                <div className="text-[var(--color-on-surface)] opacity-50 italic">No logo uploaded</div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="risk-category" className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
            Default Loan Risk Category
          </label>
          {editMode ? (
            <select
              id="risk-category"
              name="defaultLoanRiskCategory"
              value={form.defaultLoanRiskCategory || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(LoanRiskCategory).map(([key, val]) => (
                <option key={key} value={key}>
                  {val}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
              {setting.defaultLoanRiskCategory}
            </div>
          )}
        </div>

        {editMode && (
          <div className="flex justify-end gap-3 pt-8 border-t border-[var(--color-muted)] border-opacity-30">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FormGroupProps {
  readonly label: string;
  readonly name: string;
  readonly value: string;
  readonly editMode: boolean;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly prefix?: string;
  readonly readOnly?: boolean;
}

function FormGroup({
  label,
  name,
  value,
  editMode,
  onChange,
  prefix,
  readOnly = false,
}: FormGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">{label}</label>
      {editMode ? (
        renderInput()
      ) : (
        <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
          {prefix ? `${prefix}${value}` : value}
        </div>
      )}
    </div>
  );

  function renderInput() {
    if (prefix) {
      return (
        <div className="flex rounded-lg shadow-sm">
          <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-[var(--color-muted)] border-opacity-50 bg-[var(--color-background)] text-[var(--color-on-surface)] opacity-70 text-sm">
            {prefix}
          </span>
          <input
            name={name}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            className="flex-1 block w-full px-4 py-2.5 rounded-r-lg border border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      );
    }
    
    return (
      <input
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className="w-full px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    );
  }
}
