import { useState, useEffect, useRef, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { FiLoader } from "react-icons/fi";
import { ModeOfSalary } from "../../../types/employment";
import {
  patchUpdateEmployment,
  updateUserProfile,
} from "../../../services/api/employment.api";
import { updateEmployment } from "../../../redux/slices/employment";
import { OccupationTypeEnum } from "../../../constant/enum";
const formVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const inputTransition = {
  duration: 0.2,
  ease: "easeInOut",
};

function CurrentStatus(): JSX.Element {
  const dispatch = useAppDispatch();
  const employmentData = useAppSelector((state) => state.employment);
  const userData = useAppSelector((state) => state.user);
  const brand = useAppSelector((state) => state.index);
  const [activeTab, setActiveTab] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState({
    salary: false,
    modeOfSalary: false,
  });
  const [localSalary, setLocalSalary] = useState<string>("");
  const [salaryExceedsBase, setSalaryExceedsBase] = useState<string>("");
  const [updateError, setUpdateError] = useState<string>("");
  const [showSuccessIndicator, setShowSuccessIndicator] = useState(false);
  const [isSalaryChanged, setIsSalaryChanged] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (employmentData?.salary) {
      setLocalSalary(employmentData.salary.toLocaleString("en-IN"));
      const threshold = brand.brandConfig.salaryThresholdAmount || 0;
      const exceedsThreshold = employmentData.salary >= threshold;
      setSalaryExceedsBase(exceedsThreshold ? "yes" : "no");
    }
    if (
      employmentData?.salaryExceedsBase !== undefined &&
      employmentData?.salaryExceedsBase !== null
    ) {
      setSalaryExceedsBase(employmentData.salaryExceedsBase ? "yes" : "no");
    }
  }, [
    employmentData?.salary,
    employmentData?.salaryExceedsBase,
    brand.brandConfig.salaryThresholdAmount,
  ]);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = parseInt(rawValue, 10) || 0;
    const formattedValue = numericValue.toLocaleString("en-IN");

    // Clear any previous errors and success indicators
    setUpdateError("");
    setShowSuccessIndicator(false);

    // Update UI
    setLocalSalary(formattedValue);

    const threshold = brand.brandConfig.salaryThresholdAmount || 0;
    const exceedsThreshold = numericValue >= threshold;
    setSalaryExceedsBase(exceedsThreshold ? "yes" : "no");

    const hasChanged = employmentData?.salary !== numericValue;
    setIsSalaryChanged(hasChanged && numericValue > 0);
  };

  const handleSalarySave = async () => {
    const rawValue = localSalary.replace(/,/g, "");
    const numericValue = parseInt(rawValue, 10) || 0;

    if (numericValue === 0) return;

    setLoadingFields((prev) => ({ ...prev, salary: true }));
    setUpdateError("");

    try {
      const threshold = brand.brandConfig.salaryThresholdAmount || 0;
      const exceedsThreshold = numericValue >= threshold;

      const response = await patchUpdateEmployment(userData.user.employmentId, {
        salary: numericValue,
        salaryExceedsBase: exceedsThreshold,
      });

      dispatch(updateEmployment(response));

      setShowSuccessIndicator(true);
      setIsSalaryChanged(false);
      setTimeout(() => setShowSuccessIndicator(false), 2000);
    } catch (error: any) {
      console.error("Error updating salary:", error);

      // Set user-friendly error message
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update salary. Please try again.";
      setUpdateError(errorMessage);

      // Revert to stored value on error
      if (employmentData?.salary) {
        setLocalSalary(employmentData.salary.toLocaleString("en-IN"));
        const threshold = brand.brandConfig.salaryThresholdAmount || 0;
        const storedExceedsThreshold = employmentData.salary >= threshold;
        setSalaryExceedsBase(storedExceedsThreshold ? "yes" : "no");
      }
    } finally {
      setLoadingFields((prev) => ({ ...prev, salary: false }));
    }
  };

  const handleStatusChange = async (occupationTypeId: number | "") => {
    if (!occupationTypeId) return;
    setActiveTab(occupationTypeId);
    try {
      setIsSubmitting(true);

      // Update user profile with new occupation type
      await updateUserProfile(userData.user.id, {
        occupationTypeId: occupationTypeId,
      });
    } catch (error) {
      console.error("Error updating occupation type:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleModeOfSalaryChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setLoadingFields((prev) => ({ ...prev, modeOfSalary: true }));
    try {
      const response = await patchUpdateEmployment(userData.user.employmentId, {
        modeOfSalary: e.target.value as ModeOfSalary,
        id: undefined,
        userId: undefined,
      });
      dispatch(updateEmployment(response));
    } catch (error) {
      console.error("Error updating payment method:", error);
    } finally {
      setLoadingFields((prev) => ({ ...prev, modeOfSalary: false }));
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  if (!userData.user.employmentId)
    return <div className="text-center text-gray-500">Loading...</div>;
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Step 1: Employment Status Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold text-sm">
            1
          </div>
          <h3 className="text-xl font-bold text-on-surface">
            Employment Status
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Select your current employment type
        </p>
        <div className="grid grid-cols-2 gap-4 relative">
          <button
            onClick={() => handleStatusChange(OccupationTypeEnum.SALARIED)}
            disabled={isSubmitting}
            className={`group relative px-6 py-4 rounded-xl border-2 font-semibold transition-all duration-200 text-left
              ${
                activeTab === OccupationTypeEnum.SALARIED
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-md"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${
                  activeTab === OccupationTypeEnum.SALARIED
                    ? "border-primary bg-primary"
                    : "border-gray-300 group-hover:border-primary/50"
                }`}
              >
                {activeTab === OccupationTypeEnum.SALARIED && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span
                className={
                  activeTab === OccupationTypeEnum.SALARIED
                    ? "text-primary"
                    : "text-on-surface"
                }
              >
                Salaried
              </span>
            </div>
          </button>
          <button
            onClick={() =>
              handleStatusChange(OccupationTypeEnum.SELF_EMPLOYED_BUSINESS)
            }
            disabled={isSubmitting}
            className={`group relative px-6 py-4 rounded-xl border-2 font-semibold transition-all duration-200 text-left
              ${
                activeTab === OccupationTypeEnum.SELF_EMPLOYED_BUSINESS
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-md"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${
                  activeTab === OccupationTypeEnum.SELF_EMPLOYED_BUSINESS
                    ? "border-primary bg-primary"
                    : "border-gray-300 group-hover:border-primary/50"
                }`}
              >
                {activeTab === OccupationTypeEnum.SELF_EMPLOYED_BUSINESS && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span
                className={
                  activeTab === OccupationTypeEnum.SELF_EMPLOYED_BUSINESS
                    ? "text-primary"
                    : "text-on-surface"
                }
              >
                Not Salaried
              </span>
            </div>
          </button>
          {isSubmitting && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-primary">
              <FiLoader className="animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeTab === OccupationTypeEnum.SALARIED && (
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={inputTransition}
            className="space-y-8"
          >
            {/* Step 2: Salary Input */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={inputTransition}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold text-sm">
                  2
                </div>
                <h3 className="text-lg font-semibold text-on-surface">
                  Enter your monthly salary amount
                </h3>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="salary-input"
                    className="text-sm font-medium text-gray-700"
                  >
                    Monthly Salary
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </div>
                    <input
                      id="salary-input"
                      type="text"
                      inputMode="numeric"
                      value={localSalary}
                      onChange={handleSalaryChange}
                      placeholder="Enter amount"
                      disabled={loadingFields.salary}
                      className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 bg-white 
                      text-on-surface focus:ring-2 focus:ring-primary/20
                      outline-none transition-all disabled:bg-gray-50 disabled:opacity-60 placeholder-gray-400
                      ${(() => {
                        if (updateError)
                          return "border-red-300 focus:border-red-500";
                        if (showSuccessIndicator) return "border-green-500";
                        return "border-gray-300 focus:border-primary";
                      })()}`}
                    />
                  </div>
                </div>

                {/* Success/Error Messages */}
                {updateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{updateError}</span>
                  </motion.div>
                )}

                {showSuccessIndicator && !updateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Salary saved successfully!</span>
                  </motion.div>
                )}

                {/* Salary Threshold Info */}
                {localSalary && salaryExceedsBase && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                      salaryExceedsBase === "yes"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {salaryExceedsBase === "yes" ? (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    )}
                    <span>
                      {salaryExceedsBase === "yes"
                        ? `Salary exceeds ₹${brand.brandConfig.salaryThresholdAmount?.toLocaleString(
                            "en-IN",
                          )}`
                        : `Salary is below ₹${brand.brandConfig.salaryThresholdAmount?.toLocaleString(
                            "en-IN",
                          )}`}
                    </span>
                  </motion.div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSalarySave}
                  disabled={
                    !isSalaryChanged || loadingFields.salary || !localSalary
                  }
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                    ${
                      isSalaryChanged && localSalary && !loadingFields.salary
                        ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  {loadingFields.salary ? (
                    <>
                      <FiLoader className="animate-spin w-5 h-5" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Salary</span>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Step 3: Payment Method Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-all ${
                    localSalary
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  3
                </div>
                <h3
                  className={`text-xl font-bold transition-all ${
                    localSalary ? "text-on-surface" : "text-gray-400"
                  }`}
                >
                  Salary Receipt Payment Method
                </h3>
              </div>
              <p
                className={`text-sm mb-4 transition-all ${
                  localSalary ? "text-gray-500" : "text-gray-400"
                }`}
              >
                How do you receive your salary?
              </p>
              {!localSalary ? (
                <div className="relative p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-500">
                    Please enter your salary amount first
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(ModeOfSalary).map((mode) => (
                      <button
                        key={mode}
                        onClick={async () => {
                          const e = {
                            target: { value: mode },
                          } as React.ChangeEvent<HTMLSelectElement>;
                          await handleModeOfSalaryChange(e);
                        }}
                        disabled={loadingFields.modeOfSalary}
                        className={`group px-4 py-4 rounded-xl border-2 font-semibold transition-all duration-200 text-left
                          ${
                            employmentData?.modeOfSalary === mode
                              ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                              : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-md"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                            ${
                              employmentData?.modeOfSalary === mode
                                ? "border-primary bg-primary"
                                : "border-gray-300 group-hover:border-primary/50"
                            }`}
                          >
                            {employmentData?.modeOfSalary === mode && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              employmentData?.modeOfSalary === mode
                                ? "text-primary"
                                : "text-on-surface"
                            }`}
                          >
                            {mode
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {loadingFields.modeOfSalary && (
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-primary">
                      <FiLoader className="animate-spin" />
                      <span>Updating...</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CurrentStatus;
