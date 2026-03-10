import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ModeOfSalary } from "../../../constant/enum";
import {
  HiOutlineOfficeBuilding,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlineIdentification,
  HiOutlineCreditCard,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineClock,
  HiOutlinePhone,
  // HiOutlineCreditCard as PanIcon,
  // HiOutlineHashtag as UanIcon,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi";
import {
  getCustomerEmployment,
  upsertCustomerEmployment,
  //fetchEmploymentHistoryApi,
  fetchEmploymentHistoryWithAlternatePhoneApi,
  // fetchEmploymentHistoryByPanApi,
  // fetchEmploymentHistoryByUanApi,
  getUserSalaries,
  addUserSalary,
  updateUserSalary,
  deleteUserSalary,
  fetchEmploymentHistoryComprehensiveApi
} from "../../../shared/services/api/customer.api";
import { Employment } from "../../../shared/types/customers";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";
import { useAppSelector } from "../../../shared/redux/store";

interface ValidationErrors {
  [key: string]: string;
}

interface SalaryRecord {
  id: string;
  salary_amount: number;
  salary_date: string;
  salary_month?: number;
  salary_year?: number;
  notes?: string;
  created_at?: string;
}

interface ApiError {
  message: string;
  statusCode?: number;
  details?: string;
}

const BhdCoinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F6D68A" />
        <stop offset="70%" stopColor="#E9C46A" />
        <stop offset="100%" stopColor="#D4A73F" />
      </radialGradient>
      <radialGradient id="innerGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F1CD7A" />
        <stop offset="100%" stopColor="#E1B657" />
      </radialGradient>
    </defs>
    <circle cx="256" cy="256" r="240" fill="url(#goldGradient)" stroke="#C88A2B" strokeWidth="8" />
    <circle cx="256" cy="256" r="185" fill="url(#innerGradient)" stroke="#D07A1F" strokeWidth="6" />
    <text
      x="50%"
      y="54%"
      textAnchor="middle"
      fontSize="120"
      fontFamily="Arial, sans-serif"
      fill="#F5F5F5"
      dominantBaseline="middle">
      د.ب
    </text>
  </svg>
);

export function CustomerEmployment() {
  const { brandId, customerId } = useParams();
  const brandConfig = useAppSelector((state) => state.brand.brandConfig);
  // enable_multiple_salary
  const enableMultipleSalary = brandConfig.enable_multiple_salary;

  const [employment, setEmployment] = useState<Employment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Employment>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [employmentHistory, setEmploymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<ApiError | null>(null);

  // Popup states (only for alternate phone now)
  const [showAlternatePhonePopup, setShowAlternatePhonePopup] = useState(false);

  // Alternate phone states
  const [alternatePhoneNumber, setAlternatePhoneNumber] = useState("");
  const [alternatePhoneError, setAlternatePhoneError] = useState("");
  const [loadingAlternatePhone, setLoadingAlternatePhone] = useState(false);

  // PAN and UAN loading states
  // const [loadingPAN, setLoadingPAN] = useState(false);
  // const [loadingUAN, setLoadingUAN] = useState(false);

  // Salary History states
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [salaryError, setSalaryError] = useState<ApiError | null>(null);
  const [salarySuccessMessage, setSalarySuccessMessage] = useState("");
  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salaryFormData, setSalaryFormData] = useState({
    salary_amount: "",
    salary_date: "",
    notes: "",
  });
  const [salaryFormErrors, setSalaryFormErrors] = useState<ValidationErrors>(
    {}
  );
  const [isSalarySaving, setIsSalarySaving] = useState(false);
  const [isDeletingSalary, setIsDeletingSalary] = useState<string | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEmploymentData = async () => {
      try {
        setApiError(null);
        if (customerId && brandId) {
          const response = await getCustomerEmployment(customerId, brandId);
          setEmployment(response);
        }
      } catch (error: any) {
        console.error("Error fetching employment data:", error);
        setApiError({
          message:
            error?.response?.data?.message || "Failed to fetch employment data",
          statusCode: error?.response?.status,
          details: error?.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmploymentData();
  }, [brandId, customerId]);

  // Fetch salary history on mount
  useEffect(() => {
    if (employment) {
      fetchSalaries();
    }
  }, [customerId, brandId, employment]);

  // Auto-dismiss salary success message after 3 seconds
  useEffect(() => {
    if (salarySuccessMessage) {
      const timer = setTimeout(() => setSalarySuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [salarySuccessMessage]);

  // Click outside handler for popups (only alternate phone now)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        if (showAlternatePhonePopup) {
          setShowAlternatePhonePopup(false);
          setAlternatePhoneNumber("");
          setAlternatePhoneError("");
        }
      }
    };

    if (showAlternatePhonePopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAlternatePhonePopup]);

  // Validation functions
  const validatePhoneNumber = (number: string): boolean => {
    const cleaned = number.replace(/[^\d]/g, "");
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) return true;
    if (
      cleaned.length === 12 &&
      cleaned.startsWith("91") &&
      /^[6-9]\d{9}$/.test(cleaned.slice(2))
    )
      return true;
    if (
      cleaned.length === 11 &&
      cleaned.startsWith("0") &&
      /^[6-9]\d{9}$/.test(cleaned.slice(1))
    )
      return true;
    return false;
  };

  // Alternate Phone Handler
  const handleAlternatePhoneSubmit = async () => {
    setAlternatePhoneError("");

    if (!alternatePhoneNumber.trim()) {
      setAlternatePhoneError("Phone number is required");
      return;
    }

    if (!validatePhoneNumber(alternatePhoneNumber)) {
      setAlternatePhoneError(
        "Please enter a valid 10-digit Indian mobile number"
      );
      return;
    }

    if (!customerId || !brandId) return;

    setLoadingAlternatePhone(true);
    setHistoryError(null);

    try {
      const response = await fetchEmploymentHistoryWithAlternatePhoneApi(
        customerId,
        brandId,
        alternatePhoneNumber
      );

      const normalized = normalizeEmploymentData(response).filter((it) =>
        Boolean(
          it && (it.establishment_name || it.name || it.member_id || it.uan)
        )
      );

      if (normalized && normalized.length > 0) {
        setEmploymentHistory(normalized);
        setHistoryError(null);
        setSuccessMessage(
          "Employment history fetched successfully using alternate phone number!"
        );

        // Update UAN in employment data if available
        if (normalized[0]?.uan && employment) {
          const updatedEmployment = {
            ...employment,
            uanNumber: normalized[0].uan,
          };
          setEmployment(updatedEmployment);
        }

        setShowAlternatePhonePopup(false);
        setAlternatePhoneNumber("");
      } else {
        setEmploymentHistory([]);
        setHistoryError({
          message:
            response.message ||
            "No employment data found for the provided phone number",
        });
        setShowAlternatePhonePopup(false);
        setAlternatePhoneNumber("");
      }
    } catch (error: any) {
      console.error(
        "Error fetching employment history with alternate phone:",
        error
      );
      setAlternatePhoneError(
        error?.response?.data?.message ||
        "Failed to fetch employment history with the provided phone number"
      );
    } finally {
      setLoadingAlternatePhone(false);
    }
  };

  // PAN Handler - simplified
  // const handlePANFetch = async () => {
  //   if (!customerId || !brandId) return;

  //   setLoadingPAN(true);
  //   setHistoryError(null);

  //   try {
  //     const response = await fetchEmploymentHistoryByPanApi(
  //       brandId,
  //       customerId
  //     );

  //     const normalized = normalizeEmploymentData(response).filter((it) =>
  //       Boolean(
  //         it && (it.establishment_name || it.name || it.member_id || it.uan)
  //       )
  //     );

  //     if (normalized && normalized.length > 0) {
  //       setEmploymentHistory(normalized);
  //       setHistoryError(null);
  //       setSuccessMessage(
  //         "Employment history fetched successfully using user's PAN!"
  //       );

  //       // Update UAN in employment data if available
  //       if (normalized[0]?.uan && employment) {
  //         const updatedEmployment = {
  //           ...employment,
  //           uanNumber: normalized[0].uan,
  //         };
  //         setEmployment(updatedEmployment);
  //       }
  //     } else {
  //       setEmploymentHistory([]);
  //       setHistoryError({
  //         message:
  //           response.message || "No employment data found for the user's PAN",
  //       });
  //     }
  //   } catch (error: any) {
  //     console.error("Error fetching employment history by PAN:", error);
  //     setHistoryError({
  //       message:
  //         error?.response?.data?.message ||
  //         "Failed to fetch employment history using user's PAN from database",
  //     });
  //   } finally {
  //     setLoadingPAN(false);
  //   }
  // };

  // UAN Handler - simplified
  // const handleUANFetch = async () => {
  //   if (!customerId || !brandId) return;

  //   setLoadingUAN(true);
  //   setHistoryError(null);

  //   try {
  //     const response = await fetchEmploymentHistoryByUanApi(
  //       brandId,
  //       customerId
  //     );

  //     const normalized = normalizeEmploymentData(response).filter((it) =>
  //       Boolean(
  //         it && (it.establishment_name || it.name || it.member_id || it.uan)
  //       )
  //     );

  //     if (normalized && normalized.length > 0) {
  //       setEmploymentHistory(normalized);
  //       setHistoryError(null);
  //       setSuccessMessage(
  //         "Employment history fetched successfully using user's UAN!"
  //       );

  //       // Update UAN in employment data if available
  //       if (normalized[0]?.uan && employment) {
  //         const updatedEmployment = {
  //           ...employment,
  //           uanNumber: normalized[0].uan || normalized[0].uanNumber,
  //         };
  //         setEmployment(updatedEmployment);
  //       }
  //     } else {
  //       setEmploymentHistory([]);
  //       setHistoryError({
  //         message:
  //           response.message || "No employment data found for the user's UAN",
  //       });
  //     }
  //   } catch (error: any) {
  //     console.error("Error fetching employment history by UAN:", error);
  //     setHistoryError({
  //       message:
  //         error?.response?.data?.message ||
  //         "Failed to fetch employment history using user's UAN from database",
  //     });
  //   } finally {
  //     setLoadingUAN(false);
  //   }
  // };

  // Fetch regular employment history
  const fetchEmploymentHistory = async () => {
    try {
      setLoadingHistory(true);
      setHistoryError(null);

      if (customerId && brandId) {
        // Use the new comprehensive endpoint
        const response = await fetchEmploymentHistoryComprehensiveApi(
          customerId,
          brandId
        );

        const normalized = normalizeEmploymentData(response).filter((it) =>
          Boolean(
            it && (it.establishment_name || it.name || it.member_id || it.uan)
          )
        );

        if (normalized && normalized.length > 0) {
          setEmploymentHistory(normalized);
          setHistoryError(null);
          setSuccessMessage("Employment history fetched successfully!");

          // Update UAN in employment data if available
          if (normalized[0]?.uan && employment) {
            const updatedEmployment = {
              ...employment,
              uanNumber: normalized[0].uan,
            };
            setEmployment(updatedEmployment);
          }
        } else {
          setEmploymentHistory([]);
          setHistoryError({
            message: response.message || "No employment data found",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching employment history:", error);
      setHistoryError({
        message:
          error?.response?.data?.message ||
          "Failed to fetch employment history for this user",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Normalize backend response to an array of history items the UI expects.
  function normalizeEmploymentData(resp: any): any[] {
    if (!resp) return [];
    const data = resp.data || resp;

    const normalizeString = (v: any) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (
        !s ||
        s.toUpperCase() === "N/A" ||
        s === "-" ||
        s.toUpperCase() === "NA"
      )
        return null;
      return s;
    };

    const formatDateToEnIN = (v: any) => {
      const s = normalizeString(v);
      if (!s) return null;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const parts = s.split("/").map((p) => p.padStart(2, "0"));
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-IN");
    };

    const mapItem = (it: any) => ({
      establishment_name:
        normalizeString(it.establishment_name) ||
        normalizeString(it.establishmentName) ||
        normalizeString(it.establishment) ||
        null,
      name:
        normalizeString(it.name) ||
        normalizeString(it.customerName) ||
        normalizeString(it.customer_name) ||
        null,
      member_id:
        normalizeString(it.member_id) ||
        normalizeString(it.memberId) ||
        normalizeString(it.member) ||
        null,
      date_of_joining:
        formatDateToEnIN(
          it.date_of_joining || it.joinDate || it.joiningDate || it.date
        ) || null,
      date_of_exit:
        formatDateToEnIN(it.date_of_exit || it.exitDate || it.exit_of) || null,
      guardian_name:
        normalizeString(it.guardian_name) ||
        normalizeString(it.guardianName) ||
        normalizeString(it.fatherName) ||
        null,
      uan: normalizeString(it.uan) || normalizeString(it.uanNumber) || null,
    });

    // Handle the new response format from backend (employmentHistory array)
    if (data.employmentHistory && Array.isArray(data.employmentHistory)) {
      return data.employmentHistory.map((it: any) => mapItem(it));
    }

    // Handle raw data if employmentHistory is not present
    if (Array.isArray(data)) {
      return data.map((it: any) => mapItem(it));
    }

    return [];
  }

  const validateForm = (data: Partial<Employment>): ValidationErrors => {
    const validationErrors: ValidationErrors = {};

    // Required field validations
    if (!data.companyName?.trim()) {
      validationErrors.companyName = "Company name is required";
    }

    if (!data.designation?.trim()) {
      validationErrors.designation = "Designation is required";
    }

    // Email validation
    if (data.officialEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.officialEmail)) {
        validationErrors.officialEmail = "Please enter a valid email address";
      }
    }

    // Joining date validation
    if (data.joiningDate) {
      const joinDate = new Date(data.joiningDate);
      const today = new Date();
      const hundredYearsAgo = new Date();
      hundredYearsAgo.setFullYear(today.getFullYear() - 100);

      if (joinDate > today) {
        validationErrors.joiningDate = "Joining date cannot be in the future";
      } else if (joinDate < hundredYearsAgo) {
        validationErrors.joiningDate = "Please enter a valid joining date";
      }
    }

    // Salary validation
    if (
      !data.salaryExceedsBase &&
      data.salary !== null &&
      data.salary !== undefined
    ) {
      if (data.salary <= 0) {
        validationErrors.salary = "Salary must be greater than 0";
      } else if (data.salary > 10000000) {
        validationErrors.salary = "Please enter a reasonable salary amount";
      }
    }

    // PIN code validation
    if (data.pinCode) {
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(data.pinCode)) {
        validationErrors.pinCode =
          "PIN code must be 6 digits and cannot start with 0";
      }
    }

    // UAN number validation
    if (data.uanNumber) {
      const uanRegex = /^[0-9]{12}$/;
      if (!uanRegex.test(data.uanNumber)) {
        validationErrors.uanNumber = "UAN number must be exactly 12 digits";
      }
    }

    return validationErrors;
  };

  const handelEmploymentUpdate = async (data: Partial<Employment>) => {
    try {
      setApiError(null);
      if (customerId && brandId) {
        const updatedEmployment = await upsertCustomerEmployment(
          customerId,
          brandId,
          data
        );
        setEmployment(updatedEmployment);
        return updatedEmployment;
      }
    } catch (error: any) {
      console.error("Error updating employment data:", error);
      const apiError: ApiError = {
        message:
          error?.response?.data?.message || "Failed to update employment data",
        statusCode: error?.response?.status,
        details: error?.message,
      };
      setApiError(apiError);
      throw apiError;
    }
  };

  const handleEditClick = () => {
    if (employment) {
      setEditFormData({
        companyName: employment.companyName || "",
        designation: employment.designation || "",
        officialEmail: employment.officialEmail || "",
        joiningDate: employment.joiningDate,
        salary: employment.salary,
        companyAddress: employment.companyAddress || "",
        pinCode: employment.pinCode || "",
        uanNumber: employment.uanNumber || "",
        expectedDateOfSalary: employment.expectedDateOfSalary,
        modeOfSalary: employment.modeOfSalary,
        salaryExceedsBase: employment.salaryExceedsBase || false,
      });
      setIsEditing(true);
      setErrors({});
      setApiError(null);
      setSuccessMessage("");
    }
  };

  const parseFlexibleDate = (s?: string | null): Date | null => {
    if (!s) return null;
    const str = String(s).trim();
    if (!str) return null;
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    // ISO or other parseable formats
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const calculateDuration = (
    start?: string | null,
    end?: string | null
  ): string => {
    const startDate = parseFlexibleDate(start);
    const endDate = parseFlexibleDate(end) || new Date();

    if (!startDate) return "N/A";

    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years < 0) return "N/A";

    const yearsPart = years > 0 ? `${years} yr` : "";
    const monthsPart = months > 0 ? `${months} mo` : "";
    const result = `${yearsPart} ${monthsPart}`.trim();
    return result || "0 mo";
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({});
    setErrors({});
    setApiError(null);
    setSuccessMessage("");
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      setApiError(null);
      setSuccessMessage("");

      // Validate form data
      const validationErrors = validateForm(editFormData);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      await handelEmploymentUpdate(editFormData);
      setIsEditing(false);
      setEditFormData({});
      setSuccessMessage("Employment information updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving employment data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? (value ? Number(value) : null) : value,
    }));
  };

  const handleAlternatePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setAlternatePhoneNumber(value);

    // Clear error when user starts typing
    if (alternatePhoneError) {
      setAlternatePhoneError("");
    }
  };

  // ========== SALARY HISTORY FUNCTIONS ==========
  const fetchSalaries = async () => {
    try {
      setSalaryError(null);
      if (customerId && brandId) {
        const response = await getUserSalaries(customerId, brandId);
        setSalaries(Array.isArray(response) ? response : response?.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching salaries:", err);
      setSalaryError({
        message:
          err?.response?.data?.message || "Failed to fetch salary history",
        statusCode: err?.response?.status,
      });
    }
  };

  const validateSalaryForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (
      !salaryFormData.salary_amount ||
      Number(salaryFormData.salary_amount) <= 0
    ) {
      errors.salary_amount = "Salary amount must be greater than 0";
    }

    if (!salaryFormData.salary_date) {
      errors.salary_date = "Date is required";
    }

    if (Number(salaryFormData.salary_amount) > 10000000) {
      errors.salary_amount = "Please enter a reasonable salary amount";
    }

    setSalaryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetSalaryForm = () => {
    setSalaryFormData({ salary_amount: "", salary_date: "", notes: "" });
    setSalaryFormErrors({});
    setIsAddingSalary(false);
    setEditingSalaryId(null);
  };

  const handleAddSalaryClick = () => {
    resetSalaryForm();
    setIsAddingSalary(true);
  };

  const handleEditSalaryClick = (salary: SalaryRecord) => {
    setSalaryFormData({
      salary_amount: salary.salary_amount.toString(),
      salary_date: salary.salary_date,
      notes: salary.notes || "",
    });
    setEditingSalaryId(salary.id);
    setIsAddingSalary(false);
  };

  const handleSalarySave = async () => {
    if (!validateSalaryForm()) return;
    if (!customerId || !brandId) return;

    setIsSalarySaving(true);
    setSalaryError(null);

    try {
      if (editingSalaryId) {
        await updateUserSalary(customerId, brandId, editingSalaryId, {
          salary_amount: Number(salaryFormData.salary_amount),
          salary_date: salaryFormData.salary_date,
          notes: salaryFormData.notes || undefined,
        });
        setSalarySuccessMessage("Salary record updated successfully!");
      } else {
        await addUserSalary(customerId, brandId, {
          salary_amount: Number(salaryFormData.salary_amount),
          salary_date: salaryFormData.salary_date,
          notes: salaryFormData.notes || undefined,
        });
        setSalarySuccessMessage("Salary record added successfully!");
      }

      resetSalaryForm();
      await fetchSalaries();
    } catch (err: any) {
      console.error("Error saving salary:", err);
      setSalaryError({
        message: err?.response?.data?.message || "Failed to save salary record",
        statusCode: err?.response?.status,
      });
    } finally {
      setIsSalarySaving(false);
    }
  };

  const handleDeleteSalary = async (salaryId: string) => {
    if (!customerId || !brandId) return;
    if (
      !globalThis.confirm("Are you sure you want to delete this salary record?")
    )
      return;

    setIsDeletingSalary(salaryId);
    setSalaryError(null);

    try {
      await deleteUserSalary(customerId, brandId, salaryId);
      setSalarySuccessMessage("Salary record deleted successfully!");
      await fetchSalaries();
    } catch (err: any) {
      console.error("Error deleting salary:", err);
      setSalaryError({
        message:
          err?.response?.data?.message || "Failed to delete salary record",
        statusCode: err?.response?.status,
      });
    } finally {
      setIsDeletingSalary(null);
    }
  };

  const handleSalaryInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSalaryFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error when user starts typing
    if (salaryFormErrors[name]) {
      setSalaryFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="var(--color-background) border border-[var(--color-muted)] border-opacity-30 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 bg-[var(--color-muted)] bg-opacity-30 rounded animate-pulse w-6"></div>
            <div className="h-5 bg-[var(--color-muted)] bg-opacity-30 rounded animate-pulse w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded animate-pulse w-20"></div>
                <div className="h-8 bg-[var(--color-surface)] rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (apiError && !employment) {
    return (
      <div className="var(--color-background) border border border-[var(--color-error)] border-opacity-30 rounded-lg shadow-sm">
        <div className="p-6 text-center">
          <HiOutlineExclamationCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
            Error Loading Data
          </h3>
          <p className="text-sm text-[var(--color-on-error)] mb-4">
            {apiError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-[var(--color-error)] bg-opacity-100 text-[var(--color-on-primary)] text-sm rounded hover:var(--color-error)"
          >
            <HiOutlineRefresh className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!employment) {
    return (
      <div className="var(--color-background) border border-[var(--color-muted)] border-opacity-30 rounded-lg shadow-sm text-center">
        <div className="p-8">
          <HiOutlineBriefcase className="w-12 h-12 text-[var(--color-on-surface)] opacity-50 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
            No Employment Data
          </h3>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70">
            Employment information not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="var(--color-background) border border-[var(--color-muted)] border-opacity-30 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-[var(--color-muted)] border-opacity-30 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <HiOutlineBriefcase className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
            Employment
          </h2>
        </div>
        {!isEditing ? (
          <div className="flex gap-2">
            <Button
              onClick={handleEditClick}
              loading={isSaving}
              disabled={isSaving}
            >
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-sm text-[var(--color-on-surface)] opacity-70 border border-[var(--color-muted)] border-opacity-50 rounded hover:bg-[var(--color-background)]"
              disabled={isSaving}
            >
              <HiOutlineX className="w-4 h-4 mr-1 inline" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="inline-flex items-center px-3 py-1.5 text-sm text-[var(--color-on-primary)] rounded hover:opacity-90"
              style={{ backgroundColor: "#EA5E18" }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-1 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <HiOutlineCheck className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-[var(--color-success)] bg-opacity-10 border-l-4 border-green-400 p-3">
          <div className="flex items-center">
            <HiOutlineCheckCircle className="h-5 w-5 text-success mr-2" />
            <p className="text-sm text-[var(--color-on-success)]">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {apiError && (
        <div className="bg-[var(--color-error)] bg-opacity-10 border-l-4 border-red-400 p-3">
          <div className="flex items-center">
            <HiOutlineXCircle className="h-5 w-5 text-error mr-2" />
            <p className="text-sm text-[var(--color-on-error)]">
              {apiError.message}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineOfficeBuilding className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Company Name <span className="text-error ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={editFormData.companyName || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.companyName
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="Enter company name"
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineBriefcase className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Designation <span className="text-error ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="designation"
                  value={editFormData.designation || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.designation
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="Enter job title"
                />
                {errors.designation && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineMail className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Official Email
                </label>
                <input
                  type="email"
                  name="officialEmail"
                  value={editFormData.officialEmail || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.officialEmail
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="work@company.com"
                />
                {errors.officialEmail && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.officialEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineCalendar className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={
                    editFormData.joiningDate
                      ? new Date(editFormData.joiningDate)
                        .toISOString()
                        .split("T")[0]
                      : ""
                  }
                  onChange={handleInputChange}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.joiningDate
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                />
                {errors.joiningDate && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.joiningDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineCalendar className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Expected Salary Date (Day)
                </label>
                <input
                  type="number"
                  name="expectedDateOfSalary"
                  value={editFormData.expectedDateOfSalary || ""}
                  onChange={handleInputChange}
                  min="1"
                  max="31"
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.expectedDateOfSalary
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="Day (1-31)"
                />
                {errors.expectedDateOfSalary && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.expectedDateOfSalary}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <BhdCoinIcon className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  Salary Exceeds Base
                </label>
                <select
                  name="salaryExceedsBase"
                  value={editFormData.salaryExceedsBase ? "Yes" : "No"}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      salaryExceedsBase: e.target.value === "Yes",
                    }))
                  }
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-warning"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            {!editFormData.salaryExceedsBase && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    <BhdCoinIcon className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                    Monthly Salary (BHD)
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={editFormData.salary || ""}
                    onChange={handleInputChange}
                    min="1"
                    max="10000000"
                    className={`w-full px-3 py-2 border rounded text-sm ${errors.salary
                      ? "border-red-300"
                      : "border-[var(--color-muted)] border-opacity-50"
                      } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                    placeholder="50000"
                  />
                  {errors.salary && (
                    <p className="mt-1 text-xs text-[var(--color-on-error)]">
                      {errors.salary}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                <HiOutlineCreditCard className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                Salary Mode
              </label>
              <select
                name="modeOfSalary"
                value={editFormData.modeOfSalary || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-warning"
              >
                <option value="">Select payment method</option>
                {Object.values(ModeOfSalary).map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replace("_", " ")}
                  </option>
                ))}
              </select>
              {errors.modeOfSalary && (
                <p className="mt-1 text-xs text-[var(--color-on-error)]">
                  {errors.modeOfSalary}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                <HiOutlineLocationMarker className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                Company Address
              </label>
              <input
                type="text"
                name="companyAddress"
                value={editFormData.companyAddress || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-warning"
                placeholder="Enter complete office address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineLocationMarker className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pinCode"
                  value={editFormData.pinCode || ""}
                  onChange={handleInputChange}
                  maxLength={6}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.pinCode
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="110001"
                />
                {errors.pinCode && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.pinCode}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  <HiOutlineIdentification className="w-4 h-4 mr-1 text-[var(--color-on-surface)] opacity-70" />
                  UAN Number
                </label>
                <input
                  type="text"
                  name="uanNumber"
                  value={editFormData.uanNumber || ""}
                  onChange={handleInputChange}
                  maxLength={12}
                  className={`w-full px-3 py-2 border rounded text-sm ${errors.uanNumber
                    ? "border-red-300"
                    : "border-[var(--color-muted)] border-opacity-50"
                    } focus:ring-1 focus:ring-orange-500 focus:border-warning`}
                  placeholder="Enter UAN number"
                />
                {errors.uanNumber && (
                  <p className="mt-1 text-xs text-[var(--color-on-error)]">
                    {errors.uanNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded p-3">
                <div className="flex">
                  <HiOutlineExclamationCircle className="h-5 w-5 text-error mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-[var(--color-on-error)]">
                      Please fix the following errors:
                    </h3>
                    <ul className="mt-1 text-sm text-[var(--color-on-error)] list-disc pl-4">
                      {Object.values(errors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DetailItem
              label="Company"
              value={employment.companyName}
              icon={
                <HiOutlineOfficeBuilding className="w-4 h-4 text-[var(--color-on-primary)]" />
              }
            />

            <DetailItem
              label="Designation"
              value={employment.designation}
              icon={<HiOutlineBriefcase className="w-4 h-4 text-purple-600" />}
            />

            <DetailItem
              label="Joining Date"
              value={
                employment.joiningDate
                  ? new Date(employment.joiningDate).toLocaleDateString("en-IN")
                  : null
              }
              icon={
                <HiOutlineCalendar className="w-4 h-4 text-[var(--color-on-success)]" />
              }
            />

            <DetailItem
              label="Official Email"
              value={
                employment.officialEmail ? (
                  <a href={`mailto:${employment.officialEmail}`}>
                    {employment.officialEmail}
                  </a>
                ) : null
              }
              icon={
                <HiOutlineMail className="w-4 h-4 text-[var(--color-on-error)]" />
              }
            />

            <DetailItem
              label="Monthly Salary"
              value={
                employment.salary && !employment.salaryExceedsBase ? (
                  <span className="font-mono font-medium">
                    BHD{employment.salary.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                    Exceeds base limit
                  </span>
                )
              }
              icon={
                <BhdCoinIcon className="w-4 h-4 text-[var(--color-on-success)]" />
              }
            />

            <DetailItem
              label="Payment Mode"
              value={
                employment.modeOfSalary ? (
                  <span className="text-sm">
                    {employment.modeOfSalary.replace("_", " ")}
                  </span>
                ) : null
              }
              icon={<HiOutlineCreditCard className="w-4 h-4 text-primary" />}
            />

            <DetailItem
              label="Address"
              value={employment.companyAddress}
              icon={
                <HiOutlineLocationMarker className="w-4 h-4 text-orange-600" />
              }
            />

            <DetailItem
              label="PIN Code"
              value={employment.pinCode}
              icon={
                <HiOutlineLocationMarker className="w-4 h-4 text-warning" />
              }
            />

            <DetailItem
              label="UAN Number"
              value={employment.uanNumber}
              icon={
                <HiOutlineIdentification className="w-4 h-4 text-teal-600" />
              }
            />
          </div>
        )}
      </div>

      {/* Salary History Section */}
      {enableMultipleSalary && (
        <div className="p-4 border-t border-[var(--color-muted)] border-opacity-30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BhdCoinIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                Salary History
              </h3>
            </div>
            {!isAddingSalary && !editingSalaryId && (
              <Button
                onClick={handleAddSalaryClick}
                className="inline-flex items-center gap-2"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Salary
              </Button>
            )}
          </div>

          {/* Salary Messages */}
          {salarySuccessMessage && (
            <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-3 flex items-center gap-2">
              <HiOutlineCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">{salarySuccessMessage}</p>
            </div>
          )}

          {salaryError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-3 flex items-center gap-2">
              <HiOutlineXCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{salaryError.message}</p>
            </div>
          )}

          {/* Salary Form or List */}
          {isAddingSalary || editingSalaryId ? (
            // Salary Form
            <div className="space-y-4 bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-20">
              <h3 className="font-medium text-[var(--color-on-background)]">
                {editingSalaryId
                  ? "Edit Salary Record"
                  : "Add New Salary Record"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    <BhdCoinIcon className="w-4 h-4 mr-1" />
                    Salary Amount <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    name="salary_amount"
                    value={salaryFormData.salary_amount}
                    onChange={handleSalaryInputChange}
                    min="1"
                    max="10000000"
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none ${salaryFormErrors.salary_amount
                      ? "border-red-400"
                      : "border-[var(--color-muted)] border-opacity-50"
                      }`}
                    placeholder="50000"
                    disabled={isSalarySaving}
                  />
                  {salaryFormErrors.salary_amount && (
                    <p className="mt-1 text-xs text-red-500">
                      {salaryFormErrors.salary_amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    <HiOutlineCalendar className="w-4 h-4 mr-1" />
                    Salary Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    name="salary_date"
                    value={salaryFormData.salary_date}
                    onChange={handleSalaryInputChange}
                    max={new Date().toISOString().split("T")[0]}
                    className={`w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none ${salaryFormErrors.salary_date
                      ? "border-red-400"
                      : "border-[var(--color-muted)] border-opacity-50"
                      }`}
                    disabled={isSalarySaving}
                  />
                  {salaryFormErrors.salary_date && (
                    <p className="mt-1 text-xs text-red-500">
                      {salaryFormErrors.salary_date}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="salary-notes-input"
                  className="text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1 block"
                >
                  Notes (Optional)
                </label>
                <textarea
                  id="salary-notes-input"
                  name="notes"
                  value={salaryFormData.notes}
                  onChange={handleSalaryInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none resize-none"
                  placeholder="Add any notes..."
                  disabled={isSalarySaving}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSalarySave}
                  disabled={isSalarySaving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSalarySaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  onClick={resetSalaryForm}
                  disabled={isSalarySaving}
                  className="flex-1 px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {salaries.length === 0 ? (
                <div className="text-center py-8">
                  <BhdCoinIcon className="w-12 h-12 text-[var(--color-on-surface)] opacity-30 mx-auto mb-2" />
                  <p className="text-sm text-[var(--color-on-surface)] opacity-60">
                    No salary records found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {salaries.map((salary) => (
                    <div
                      key={salary.id}
                      className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded border border-[var(--color-muted)] border-opacity-20 hover:border-opacity-40 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <BhdCoinIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-[var(--color-on-background)]">
                              {formatCurrency(salary.salary_amount)}
                            </p>
                            <p className="text-xs text-[var(--color-on-surface)] opacity-60">
                              {formatDate(salary.salary_date)}
                              {salary.notes && ` • ${salary.notes}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditSalaryClick(salary)}
                          disabled={isDeletingSalary === salary.id}
                          className="p-2 hover:bg-orange-100 text-orange-600 rounded transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSalary(salary.id)}
                          disabled={isDeletingSalary === salary.id}
                          className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                          title="Delete"
                        >
                          {isDeletingSalary === salary.id ? (
                            <div className="w-4 h-4 border-2 border-transparent border-t-red-600 rounded-full animate-spin"></div>
                          ) : (
                            <HiOutlineTrash className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Employment History Section */}
      <div className="p-4 border-t border-[var(--color-muted)] border-opacity-30">
        <div className="flex items-center gap-4">
          {employmentHistory && employmentHistory.length > 0 ? (
            <div className="text-sm text-[var(--color-on-surface)] opacity-80">
              Employment history available
            </div>
          ) : (
            <>
              <Button
                onClick={fetchEmploymentHistory}
                disabled={loadingHistory}
                loading={loadingHistory}
              >
                View Employment History
              </Button>

              <Button
                onClick={() => setShowAlternatePhonePopup(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <HiOutlinePhone className="w-4 h-4" />
                Use Alternate Phone
              </Button>
              {/* <Button
                onClick={handlePANFetch}
                variant="outline"
                className="flex items-center gap-2"
                disabled={loadingPAN || !customerId}
                loading={loadingPAN}
              >
                <PanIcon className="w-4 h-4" />
                Use PAN Number
              </Button>
              <Button
                onClick={handleUANFetch}
                variant="outline"
                className="flex items-center gap-2"
                disabled={loadingUAN || !customerId}
                loading={loadingUAN}
              >
                <UanIcon className="w-4 h-4" />
                Use UAN Number
              </Button> */}
            </>
          )}
        </div>

        {historyError && (
          <div className="bg-[var(--color-error)] bg-opacity-10 border-l-4 border-red-400 p-3 mt-3">
            <div className="flex items-center">
              <HiOutlineXCircle className="h-5 w-5 text-error mr-2" />
              <p className="text-sm text-[var(--color-on-error)]">
                {historyError.message}
              </p>
            </div>
          </div>
        )}

        {employmentHistory.length > 0 && (
          <div className="mt-6 space-y-6">
            {employmentHistory.map((history, index) => (
              <div
                key={index}
                className="var(--color-background) border border-[var(--color-muted)] border-opacity-30 rounded-lg shadow-sm"
              >
                <div className="border-b border-[var(--color-muted)] border-opacity-30 px-4 py-2 flex items-center gap-2">
                  <HiOutlineOfficeBuilding className="w-5 h-5 text-orange-600" />
                  <h3 className="text-md font-semibold text-[var(--color-on-background)]">
                    Previous Employment #{index + 1}
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailItem
                    label="Company"
                    value={history.establishment_name}
                    icon={
                      <HiOutlineOfficeBuilding className="w-4 h-4 text-orange-600" />
                    }
                  />
                  <DetailItem
                    label="Name"
                    value={history.name}
                    icon={
                      <HiOutlineIdentification className="w-4 h-4 text-purple-600" />
                    }
                  />
                  <DetailItem
                    label="Member ID"
                    value={history.member_id}
                    icon={
                      <HiOutlineIdentification className="w-4 h-4 text-teal-600" />
                    }
                  />
                  <DetailItem
                    label="Date of Joining"
                    value={history.date_of_joining}
                    icon={
                      <HiOutlineCalendar className="w-4 h-4 text-green-600" />
                    }
                  />
                  <DetailItem
                    label="Date of Exit"
                    value={history.date_of_exit}
                    icon={
                      <HiOutlineCalendar className="w-4 h-4 text-red-600" />
                    }
                  />
                  <DetailItem
                    label="Duration"
                    value={calculateDuration(
                      history.date_of_joining,
                      history.date_of_exit
                    )}
                    icon={<HiOutlineClock className="w-4 h-4 text-blue-600" />}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Alternate Phone Dialog (only this remains) */}
      <Dialog
        isOpen={showAlternatePhonePopup}
        onClose={() => {
          setShowAlternatePhonePopup(false);
          setAlternatePhoneNumber("");
          setAlternatePhoneError("");
        }}
        title="Verify UAN-linked Mobile"
      >
        <div ref={popupRef}>
          <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-4">
            Enter the mobile number registered with your UAN account.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80">
              Mobile Number
            </label>
            <input
              type="tel"
              value={alternatePhoneNumber}
              onChange={handleAlternatePhoneChange}
              placeholder="10-digit mobile number"
              className={`w-full px-3 py-2 border text-sm rounded-lg focus:ring-2 focus:ring-orange-500 transition-all outline-none ${alternatePhoneError
                ? "border-red-400"
                : "border-[var(--color-muted)] border-opacity-60"
                }`}
              disabled={loadingAlternatePhone}
              maxLength={12}
            />
            {alternatePhoneError && (
              <p className="text-xs text-red-500">{alternatePhoneError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={() => setShowAlternatePhonePopup(false)}
              disabled={loadingAlternatePhone}
              variant="surface"
              className="text-sm px-3 py-1.5 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAlternatePhoneSubmit}
              disabled={loadingAlternatePhone || !alternatePhoneNumber.trim()}
              variant="primary"
              className="text-sm px-3 py-1.5 rounded-lg flex items-center justify-center"
            >
              {loadingAlternatePhone ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                  Fetching
                </>
              ) : (
                <>
                  <HiOutlineCheck className="w-4 h-4 mr-1" />
                  Fetch
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-background)] rounded p-3 border border-[var(--color-muted)] border-opacity-30">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <dt className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide">
          {label}
        </dt>
      </div>
      <dd className="text-sm text-[var(--color-on-background)]">
        {value || (
          <span className="text-[var(--color-on-surface)] opacity-50 italic">
            Not provided
          </span>
        )}
      </dd>
    </div>
  );
}
