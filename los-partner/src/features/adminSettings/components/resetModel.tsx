import { useEffect, useState } from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { TbLoader2 } from "react-icons/tb";
import { FaSpinner } from "react-icons/fa";
import Dialog from "../../../common/dialog";
import { getBrands } from "../../../shared/services/api/admin.api";
import { postResetUser } from "../../../shared/services/api/common.api";
import { Brand } from "../../../shared/types/admin";
import { Button } from "../../../common/ui/button";

export function ResetModel() {
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReset = async () => {
    if (!brandId || !confirmed || !email) {
      setErrorMessage(
        "Please fill all required fields and confirm the action."
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await postResetUser({ brandId, email });
      if (response) {
        setSuccess(true);
        setErrorMessage("");
      }
    } catch (error) {
      setSuccess(false);
      const message =
        (error as Error)?.message || "Something went wrong. Please try again.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBrandId("");
    setEmail("");
    setConfirmed(false);
    setErrorMessage("");
  };

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await getBrands();
        setBrands(response);
      } catch (error) {
        console.error("Error fetching brands:", error);
        setErrorMessage("Failed to load brands. Please try again later.");
      } finally {
        setInitLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (initLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-[var(--color-on-primary)] text-4xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Modal Dialog */}
      <Dialog
        isOpen={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title="Reset User Settings"
      >
        <div className="space-y-4">
          {/* Status Messages */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg flex items-start gap-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {errorMessage}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg flex items-start gap-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Settings reset successfully!
            </div>
          )}

          {/* Form Fields in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand <span className="text-red-500">*</span>
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Warning Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-amber-800">Warning</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This action will permanently reset all user settings and
                  cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="confirm-reset"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
              checked={confirmed}
              onChange={() => setConfirmed(!confirmed)}
            />
            <label
              htmlFor="confirm-reset"
              className="text-sm text-gray-700 leading-relaxed"
            >
              I understand that this action is <strong>irreversible</strong> and
              will reset all settings to their default values.
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <Button
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              variant="surface"
              // className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReset}
              loading={loading}
              disabled={loading || !confirmed || !brandId || !email}
              // className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <TbLoader2 className="animate-spin w-4 h-4" />
                  Resetting...
                </>
              ) : (
                <>
                  <FiRefreshCcw className="w-4 h-4" />
                  Reset Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Settings Card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiRefreshCcw className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Reset User Settings
              </h2>
              <p className="mt-1 text-sm text-gray-600 max-w-md">
                Restore all user settings to their default values. This action
                cannot be undone.
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <>
                <TbLoader2 className="animate-spin w-4 h-4" />
                Processing...
              </>
            ) : (
              <>
                <FiRefreshCcw className="w-4 h-4" />
                Reset Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
