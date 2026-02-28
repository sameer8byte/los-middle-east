import { useEffect, useState } from "react";
 
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import { getBrandPolicy, upsertBrandPolicy } from "../../../shared/services/api/settings/brandPolicy.setting.api";

interface BrandPolicy {
  id: string;
  brandId: string;
  termsConditionUrl: string;
  privacyPolicyUrl: string;
  faqUrl: string;
  brandloanDetailsPolicyUrl:string
  createdAt: Date;
  updatedAt: Date;
}

export function BrandPolicySetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [policy, setPolicy] = useState<BrandPolicy | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<BrandPolicy>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!brandId) {
      console.error("Brand ID is not provided");
      setFetching(false);
      return;
    }

    const fetchPolicy = async () => {
      setFetching(true);
      try {
        const response = await getBrandPolicy(brandId);
        setPolicy(response);
        setForm(response);
      } catch (error) {
        console.error("Failed to fetch brand policy:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchPolicy();
  }, [brandId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!brandId) {
      console.error("Brand ID is not provided");
      return;
    }
    setLoading(true);
    try {
      const response = await upsertBrandPolicy(brandId, {
        termsConditionUrl: form.termsConditionUrl || "",
        privacyPolicyUrl: form.privacyPolicyUrl || "",
        faqUrl: form.faqUrl || "",
        brandloanDetailsPolicyUrl: form.brandloanDetailsPolicyUrl|| "",
      });
      if (!response) {
        console.error("Failed to update brand policy");
        return;
      }
      // Directly set the updated policy to response if it contains full updated data
      setPolicy(response);
      setForm(response);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update brand policy:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (policy) {
      setForm(policy);
    }
    setEditMode(false);
  };

  if (fetching) {
    return <div className="p-8 text-[var(--color-on-surface)] opacity-70">Loading policy settings...</div>;
  }

  if (!policy) {
    return <div className="p-8 text-[var(--color-on-error)]">No brand policy found.</div>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
      <div className="flex justify-between items-center pb-6 mb-8 border-b border-[var(--color-muted)] border-opacity-30">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-background)]">
            Brand Policy Settings
          </h1>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
            Manage your brand's policy URLs
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Edit Policies
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* Terms & Conditions */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
            Terms & Conditions URL
          </label>
          {editMode ? (
            <input
              name="termsConditionUrl"
              value={form.termsConditionUrl || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/terms"
            />
          ) : (
            <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
              {policy.termsConditionUrl || (
                <span className="text-[var(--color-on-surface)] opacity-50 italic">
                  No terms & conditions URL set
                </span>
              )}
            </div>
          )}
        </div>

        {/* Privacy Policy */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">
            Privacy Policy URL
          </label>
          {editMode ? (
            <input
              name="privacyPolicyUrl"
              value={form.privacyPolicyUrl || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/privacy"
            />
          ) : (
            <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
              {policy.privacyPolicyUrl || (
                <span className="text-[var(--color-on-surface)] opacity-50 italic">
                  No privacy policy URL set
                </span>
              )}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">FAQ URL</label>
          {editMode ? (
            <input
              name="faqUrl"
              value={form.faqUrl || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/faq"
            />
          ) : (
            <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
              {policy.faqUrl || (
                <span className="text-[var(--color-on-surface)] opacity-50 italic">No FAQ URL set</span>
              )}
            </div>
          )}
        </div>
        {/* brandloanDetailsPolicyUrl*/}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Loan Details URl </label>
          {editMode ? (
            <input
              name="brandloanDetailsPolicyUrl"
              value={form.brandloanDetailsPolicyUrl || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/faq"
            />
          ) : (
            <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
              {policy.faqUrl || (
                <span className="text-[var(--color-on-surface)] opacity-50 italic">No Loan Details URL set</span>
              )}
            </div>
          )}
        </div>

        {editMode && (
          <div className="flex justify-end gap-3 pt-8 border-t border-[var(--color-muted)] border-opacity-30">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)] focus:ring-2 focus:ring-gray-500 focus:border-[var(--color-muted)] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              {loading ? (
                <div
                  className="flex items-center justify-center space-x-2"
                  aria-label="Saving changes"
                >
                  <Spinner />
                  <span className="ml-2">Saving...</span>
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
