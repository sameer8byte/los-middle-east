import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import dayjs from "dayjs";
import { patchUpdateEmployment } from "../../../services/api/employment.api";
import { Employment, ModeOfSalary } from "../../../types/employment";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiCalendar,
  FiDollarSign,
  // FiMapPin,
  FiBriefcase,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { updateEmployment } from "../../../redux/slices/employment";

const EmploymentInfo = () => {
  const dispatch = useAppDispatch();
  const employmentData = useAppSelector((state) => state.employment);
  const [formData, setFormData] = useState<Employment>({
    id: "",
    userId: "",
    companyName: "",
    designation: "",
    joiningDate: null,
    salary: null,
    salaryExceedsBase: false,
    officialEmail: "",
    companyAddress: null,
    pinCode: null,
    uanNumber: null,
    expectedDateOfSalary: 7,
    modeOfSalary: ModeOfSalary.BANK_TRANSFER,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setTouchedFields((prev) => new Set(prev.add(name)));
    setFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? (value ? Number(value) : null) : value,
    }));
  };

  // Auto-save effect
  useEffect(() => {
    if (!employmentData?.id || touchedFields.size === 0) return;

    const saveData = async () => {
      setIsSaving(true);
      try {
        if (!employmentData) {
          throw new Error("No employment data available");
        }
        if (!employmentData.id) {
          throw new Error("No employment ID available");
        }
        const response = await patchUpdateEmployment(employmentData.id, {
          ...formData,
          joiningDate: formData.joiningDate
            ? new Date(formData.joiningDate)
            : null,
          expectedDateOfSalary: formData.expectedDateOfSalary || 7,
          id: undefined,
          userId: undefined,
        });

        dispatch(updateEmployment(response));
        setSaveStatus({
          type: "success",
          message: "Changes saved successfully",
        });
        setTouchedFields(new Set());
      } catch (error) {
        setSaveStatus({
          type: "error",
          message: (error as Error).message || "Failed to save changes",
        });
      } finally {
        setIsSaving(false);
      }
    };

    const debounceTimer = setTimeout(saveData, 1000);
    return () => clearTimeout(debounceTimer);
  }, [dispatch, formData, touchedFields.size, employmentData]);

  // Initial data fetch
  useEffect(() => {
    if (employmentData) {
      setFormData({
        id: employmentData.id || "",
        userId: employmentData.userId || "",
        companyName: employmentData.companyName || "",
        designation: employmentData.designation || "",
        joiningDate: new Date(employmentData.joiningDate || ""),
        officialEmail: employmentData.officialEmail || "",
        salary: employmentData.salary || null,
        companyAddress: employmentData.companyAddress || null,
        salaryExceedsBase: employmentData.salaryExceedsBase || false,
        pinCode: employmentData.pinCode || null,
        uanNumber: employmentData.uanNumber || null,
        expectedDateOfSalary: employmentData.expectedDateOfSalary || null,
        modeOfSalary: employmentData.modeOfSalary || ModeOfSalary.BANK_TRANSFER,
      });
    }
  }, [employmentData]);

  // Clear status messages after 3 seconds
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <AnimatePresence>
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-brand flex items-center space-x-3 shadow-sm ${
              saveStatus.type === "success"
                ? "bg-success-light text-success border border-success"
                : "bg-error-light text-error border border-error"
            }`}
          >
            {saveStatus.type === "success" ? (
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{saveStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Employment Information Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={inputVariants}
          className="bg-white shadow-lg rounded-brand p-6 border border-gray-100 mt-4 relative"
        >
          <div className="flex items-center gap-3 mb-6 pb-2 border-b border-edge">
            <div className="p-2 rounded-brand bg-primary-light/10 text-primary">
              <FiInfo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-heading">
                Employment Information
              </h3>
              <p className="text-sm text-label hidden md:block">
                Basic details about your current employment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                label: "Company Name",
                name: "companyName",
                type: "text",
                icon: <FiBriefcase className="text-label-muted" />,
              },

              {
                label: "Official Email",
                name: "officialEmail",
                type: "email",
                icon: <FiInfo className="text-label-muted" />,
              },

              // {
              //   label: "Designation",
              //   name: "designation",
              //   type: "text",
              //   icon: <FiInfo className="text-label-muted" />,
              // },
            ].map((field) => (
              <motion.div key={field.name} variants={inputVariants}>
                <label className="block text-sm font-medium text-label mb-2">
                  {field.label}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {field.icon}
                  </div>
                  <input
                    type={field.type}
                    name={field.name}
                    value={
                      formData[field.name as keyof Employment] instanceof Date
                        ? dayjs(
                            formData[field.name as keyof Employment] as Date
                          ).format("YYYY-MM-DD")
                        : formData[
                            field.name as keyof Employment
                          ]?.toString() ?? ""
                    }
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition hover:border-primary-hover"
                    placeholder={
                      field.type === "date"
                        ? "Select date"
                        : `Enter ${field.label.toLowerCase()}`
                    }
                  />
                </div>
              </motion.div>
            ))}
            <motion.section
              initial="hidden"
              animate="visible"
              variants={inputVariants}
              className=" rounded-brand  relative"
            >
              <div className="grid grid-cols-1 md:grid-cols- gap-3">
                <motion.div variants={inputVariants}>
                  <label className="block text-sm font-medium text-label mb-2">
                    Expected Salary Date
                  </label>
                  <p className="text-xs text-label-muted mb-2 hidden md:block whitespace-nowrap">
                    Select a date between 1st and 31st of every month
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiCalendar className="text-label-muted" />
                    </div>
                    <select
                      name="expectedDateOfSalary"
                      value={formData.expectedDateOfSalary || 1}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition hover:border-primary-hover appearance-none"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </motion.div>
              </div>
            </motion.section>
            {!employmentData.salaryExceedsBase && (
              <motion.section
                initial="hidden"
                animate="visible"
                variants={inputVariants}
                className="bg-white shadow-lg rounded-brand p-6 border border-gray-100 mt-2 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div variants={inputVariants}>
                    <label className="block text-sm font-medium text-label mb-2">
                      Salary (BHD)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiDollarSign className="text-label-muted" />
                      </div>
                      <input
                        type="number"
                        name="salary"
                        value={formData.salary || ""}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition hover:border-primary-hover"
                        placeholder="Enter salary"
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.section>
            )}
          </div>
        </motion.section>
        {/* // Joining Date Section and dont allow to select feture date */}
        {/* <motion.section
          initial="hidden"
          animate="visible"
          variants={inputVariants}
          className="bg-white shadow-lg rounded-brand p-6 border border-gray-100 mt-4 relative"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-edge">
            <div className="p-2 rounded-brand bg-info-light text-info">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-heading">
                Joining Date
              </h3>
              <p className="text-sm text-label">
                When you started your current job
              </p>
            </div>
          </div>
          <motion.div variants={inputVariants}>
            <label className="block text-sm font-medium text-label mb-2">
              Joining Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-label-muted" />
              </div>
              <input
                type="date"
                name="joiningDate"
                value={
                  formData.joiningDate
                    ? dayjs(formData.joiningDate).format("YYYY-MM-DD")
                    : ""
                }
                min={dayjs().subtract(100, "year").format("YYYY-MM-DD")}
                max={dayjs().format("YYYY-MM-DD")}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition hover:border-primary-hover"
                placeholder="Select joining date"
              />
            </div>
          </motion.div>
        </motion.section> */}
        {/* Salary Information Section */}

        {/* Company Address Section */}
        {/* <motion.section
          initial="hidden"
          animate="visible"
          variants={inputVariants}
          className="bg-white shadow-lg rounded-brand p-6 border border-gray-100 mt-4 relative"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-edge">
            <div className="p-2 rounded-brand bg-secondary-light text-secondary">
              <FiMapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-heading">
                Company Address
              </h3>
              <p className="text-sm text-label">
                Location details of your workplace
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                label: "Street Address",
                name: "companyAddress",
                type: "text",
                span: true,
                icon: <FiMapPin className="text-label-muted" />,
              },
              {
                label: "Pin Code",
                name: "pinCode",
                type: "text",
                icon: <FiMapPin className="text-label-muted" />,
              },
            ].map((field) => (
              <motion.div
                key={field.name}
                variants={inputVariants}
                className={field.span ? "md:col-span-2" : ""}
              >
                <label className="block text-sm font-medium text-label mb-2">
                  {field.label}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {field.icon}
                  </div>
                  <input
                    type={field.type}
                    name={field.name}
                    maxLength={field.name === "pinCode" ? 6 : undefined}
                    value={
                      formData[
                        field.name as keyof typeof formData
                      ]?.toString() ?? ""
                    }
                    onChange={
                      
                      handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition hover:border-primary-hover"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section> */}
        {/* Salary Details Section */}
      </div>

      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-surface px-4 py-3 rounded-brand shadow-md flex items-center space-x-2 text-sm text-label border border-edge"
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Saving changes...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmploymentInfo;
