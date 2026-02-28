import { useState } from "react";
import Dialog from "../common/dialog";
import { useQueryParams } from "../hooks/useQueryParams";
import { useAppSelector } from "../redux/store";
import { createCallMeRequest } from "../services/api/web.api";

export function NeedHelpDialog() {
  const { getQuery, setQuery } = useQueryParams();
  const user = useAppSelector((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    message: "",
    phoneNumber: user?.user.phoneNumber || "",
  });
  const [errors, setErrors] = useState({ phoneNumber: "" });
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const validate = () => {
    const newErrors = { phoneNumber: "" };
    let isValid = true;

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors.phoneNumber && name === "phoneNumber") {
      setErrors((prev) => ({ ...prev, phoneNumber: "" }));
    }
  };

  const handleCallSupport = async () => {
    if (!validate()) return;
    if (!user?.user.id) {
      setFeedback({
        type: "error",
        message: "You must be logged in to submit a request.",
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await createCallMeRequest({
        ...formData,
        userId: user.user.id,
        isResolved: false,
      });

      if (response) {
        setFeedback({
          type: "success",
          message:
            "Request submitted successfully! Our team will contact you shortly.",
        });
        setFormData({ message: "", phoneNumber: user?.user.phoneNumber || "" });

        setTimeout(() => {
          setFeedback(null);
          setQuery("needHelp", "false");
        }, 3000);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          (error as Error)?.message ||
          "Error sending request. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans">
      <Dialog
        title="Contact Support"
        isOpen={getQuery("needHelp") === "true"}
        onClose={() => setQuery("needHelp", "false")}
      >
        <div className="space-y-5 p-1">
          {feedback && (
            <div
              className={`rounded-lg px-4 py-3 text-sm transition-all duration-300 ${
                feedback.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {!feedback?.type || feedback?.type === "error" ? (
            <>
              <p className="text-sm text-muted">
                Please provide your phone number and a brief message. Our
                support team will call you back as soon as possible.
              </p>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-on-surface mb-1"
                >
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors.phoneNumber ? "border-red-500" : "border-muted"
                  } focus:ring-2 focus:ring-primary focus:border-transparent`}
                  disabled={loading}
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-on-surface mb-1"
                >
                  How can we help? (Optional)
                </label>
                <textarea
                  name="message"
                  placeholder="Describe your issue or question..."
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleCallSupport}
                className={`w-full flex justify-center items-center px-4 py-3 rounded-lg font-medium transition-all ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary-dark active:bg-secondary"
                } text-white shadow-md hover:shadow-lg`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending request...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
