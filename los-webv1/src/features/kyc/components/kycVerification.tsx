import { useState, useEffect, ReactNode } from "react";
import { BiCheck, BiErrorCircle } from "react-icons/bi";
import { RiLoader2Fill } from "react-icons/ri";
import { FaIdCard } from "react-icons/fa";
import {
  document_status_enum,
  document_type_enum,
  manualPanUpload,
  panKyc,
} from "../../../services/api/kyc.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { getDocumentByUser } from "../../../services/api/document.api";
import { Document } from "../../../types/document";
import {
  updateDocuments,
  upsertDocument,
} from "../../../redux/slices/documents";
import { maskPAN } from "../../../utils/utils";
import Dialog from "../../../common/dialog";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import { getPersonalDetails } from "../../../services/api/user-details.api";

export default function KYCVerification() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const documents = useAppSelector((state) => state.documents.documents);
  const getDocument = (type: document_type_enum) =>
    documents?.find(
      (doc) => doc.type === type && doc.status === document_status_enum.APPROVED
    );

  const pan = getDocument(document_type_enum.PAN);
  const panApproved = !!pan;
  const [panNumber, setPanNumber] = useState("");
  const [panLoading, setPanLoading] = useState(false);
  const [manualVerification, setManualVerification] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState({
    aadhaar: "",
    otp: "",
    pan: "",
    general: "",
  });

  const [otpResendTimer, setOtpResendTimer] = useState(0);

  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await getDocumentByUser(user.id);
        dispatch(updateDocuments(response));

        const panDoc = response.find(
          (doc: Document) => doc.type === document_type_enum.PAN
        );

        if (panDoc && panDoc.documentNumber) {
          setPanNumber(panDoc.documentNumber);
        }
      } catch (err) {
        console.error("Failed to fetch documents", err);
      }
    };
    fetchDocuments();
  }, [dispatch, user.id]);

  const validatePAN = (value: string = panNumber) => {
    // Check if PAN format is valid: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/;
    const isValidFormat = panRegex.test(value);

    let errorMessage = "";
    if (value.length === 0) {
      errorMessage = "";
    } else if (value.length < 10) {
      errorMessage = "PAN must be 10 characters long";
    } else if (!isValidFormat) {
      errorMessage = "Invalid PAN format (5 letters + 4 digits + 1 letter)";
    }

    setError((e) => ({ ...e, pan: errorMessage }));
    return isValidFormat;
  };

  const handlePanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const originalLength = inputValue.length;

    // Filter out non-alphanumeric characters and convert to uppercase
    const filteredValue = inputValue
      .replace(/[^a-zA-Z0-9]/g, "") // Remove special characters
      .toUpperCase()
      .slice(0, 10); // Limit to 10 characters

    // Additional validation for PAN format structure
    let validatedValue = "";
    let hasFormatError = false;
    let formatErrorMessage = "";

    for (let i = 0; i < filteredValue.length; i++) {
      const char = filteredValue[i];
      if (i < 5) {
        // First 5 characters should be letters
        if (/[A-Z]/.test(char)) {
          validatedValue += char;
        } else if (/\d/.test(char)) {
          hasFormatError = true;
          formatErrorMessage = `Position ${
            i + 1
          } requires a letter, not a number`;
          break;
        }
      } else if (i < 9) {
        // Next 4 characters should be digits
        if (/\d/.test(char)) {
          validatedValue += char;
        } else if (/[A-Z]/.test(char)) {
          hasFormatError = true;
          formatErrorMessage = `Position ${
            i + 1
          } requires a number, not a letter`;
          break;
        }
      } else if (i === 9) {
        // Last character should be a letter
        if (/[A-Z]/.test(char)) {
          validatedValue += char;
        } else if (/\d/.test(char)) {
          hasFormatError = true;
          formatErrorMessage = `Position ${
            i + 1
          } requires a letter, not a number`;
          break;
        }
      }
    }

    // Check if special characters were removed
    const hasSpecialChars = originalLength > filteredValue.length;

    setPanNumber(validatedValue);

    // Set appropriate error messages
    if (hasFormatError) {
      setError((e) => ({ ...e, pan: formatErrorMessage }));
    } else if (hasSpecialChars && validatedValue.length > 0) {
      setError((e) => ({
        ...e,
        pan: "Only letters and numbers are allowed. Special characters are not permitted.",
      }));
    } else if (validatedValue.length > 0) {
      validatePAN(validatedValue);
    } else {
      setError((e) => ({ ...e, pan: "" }));
    }
  };

  const submitPanKYC = async () => {
    // Clear previous errors
    setError((e) => ({ ...e, general: "", pan: "" }));

    // Check for blocking conditions with proper error messages
    if (panApproved) {
      setError((e) => ({
        ...e,
        general: "PAN is already verified and approved",
      }));
      return;
    }

    if (panNumber.length === 0) {
      setError((e) => ({ ...e, pan: "Please enter your PAN number" }));
      return;
    }

    if (panNumber.length < 10) {
      setError((e) => ({ ...e, pan: "PAN must be 10 characters long" }));
      return;
    }

    if (!validatePAN()) {
      setError((e) => ({
        ...e,
        pan: "Please enter a valid PAN format (5 letters + 4 digits + 1 letter)",
      }));
      return;
    }

    setPanLoading(true);

    try {
      const response = await panKyc(user.id, {
        type: document_type_enum.PAN,
        documentNumber: panNumber,
        frontDocumentUrl: "",
        backDocumentUrl: "",
      });
      setManualVerification(response.manualVerification);
      dispatch(upsertDocument(response.document));
      // Clear errors on success
      setError((e) => ({ ...e, general: "", pan: "" }));
    } catch (err) {
      setError((e) => ({
        ...e,
        general:
          (err as Error).message ||
          "PAN verification failed. Please try again.",
      }));
    } finally {
      setPanLoading(false);
    }
  };

  const renderError = (message: ReactNode) =>
    message && (
      <div className="text-red-500 text-sm mt-1 flex items-center animate-fade-in">
        <BiErrorCircle className="mr-1" />
        {message}
      </div>
    );

  const VerifiedBadge = ({
    documentNumber,
    icon,
  }: {
    documentNumber: string;
    icon: ReactNode;
  }) => (
    <div className="p-4 bg-green-50 border border-green-200 rounded-brand flex items-center">
      <div className="bg-green-100 rounded-full p-2 mr-3">{icon}</div>
      <div>
        <span className="text-sm text-gray-500">Verified</span>
        <div className="text-green-700 font-medium">{documentNumber}</div>
      </div>
      <BiCheck className="text-green-600 ml-auto text-2xl" />
    </div>
  );

  useEffect(() => {
    if (panApproved) {
      const fetchUserDetails = async () => {
        try {
          const response = await getPersonalDetails(user.userDetailsId);
          if (
            response?.firstName &&
            response.lastName &&
            response?.dateOfBirth
          ) {
            dispatch(updateUserDetails(response));
          } else {
            setManualVerification(true);
          }
        } catch (error) {
          console.error("Failed to fetch user details:", error);
        }
      };

      fetchUserDetails();
    }
  }, [dispatch, panApproved]);

  const handleManualVerification = async () => {
    if (!firstName || !lastName || !dateOfBirth) {
      alert("First name, last name, and date of birth are required.");
      return;
    }

    setLoading(true); // Start loading
    try {
      const response = await manualPanUpload(user.id, {
        firstName,
        middleName,
        lastName,
        dateOfBirth,
      });

      if (response.status) {
        setManualVerification(false);
      } else {
        alert("Manual PAN upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Manual PAN upload failed", error);
      alert("Manual PAN upload failed. Please try again.");
    } finally {
      setLoading(false); // Stop loading in all cases
    }
  };

  return (
    <div className="">
      {/* General Error Banner */}
      {error.general && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-brand text-error flex items-start animate-shake">
          <BiErrorCircle className="mr-2 text-lg flex-shrink-0 mt-0.5" />
          <span>{error.general}</span>
        </div>
      )}

      {/* PAN Section */}
      <div className="h-min-h-screen bg-white md:h-full rounded-brand shadow-md p-6 transition-all duration-300 border border-gray-100">
        <div className="flex items-center ">
          <h2 className="text-2xl  font-semibold   text-[var(--color-primary)] ">
            PAN Verification
          </h2>
        </div>

        {panApproved ? (
          <div className="animate-fade-in-up">
            <VerifiedBadge
              documentNumber={
                maskPAN(panNumber) || maskPAN(pan?.documentNumber) || ""
              }
              icon={<FaIdCard className="text-success" />}
            />
          </div>
        ) : (
          <div className="space-y-5  py-2 md:py-0 animate-fade-in">
            {/* PAN Input */}
            <div>
              <label className="block text-xs font-small text-on-surface mb-4">
                Provide your PAN details to verify registered name and active
                status
              </label>

              <div className="flex items-center mb-2">
                <div className="p-2  rounded-brand mr-1">
                  <FaIdCard className="text-primary text-xl" />
                </div>
                <label className="block text-sm font-medium text-on-surface ">
                  PAN Card
                </label>
              </div>

              <input
                type="text"
                placeholder="ABCDE1234F"
                className={`w-full p-3 border-2 rounded-brand transition-all duration-200 uppercase tracking-widest
                placeholder-gray-400 bg-white text-on-surface
                ${
                  error.pan
                    ? "border-error bg-error/10 text-error"
                    : "border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-focus"
                }`}
                value={panNumber}
                onChange={handlePanInputChange}
              />
              {renderError(error.pan)}
              <p className="text-xs text-gray-500 mt-1">
                Format: 5 letters, 4 digits, 1 letter
              </p>
            </div>

            {/* Submit Button */}
            <button
              className={`w-full py-3.5 rounded-brand font-medium flex items-center justify-center transition-all duration-300
              ${
                !panApproved && panNumber.length === 10
                  ? "bg-primary text-on-primary hover:bg-primary-hover shadow"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              onClick={submitPanKYC}
              disabled={panApproved || panNumber.length !== 10 || panLoading}
            >
              {panLoading && (
                <RiLoader2Fill className="animate-spin h-5 w-5 mr-2" />
              )}
              Verify PAN
            </button>
          </div>
        )}
      </div>
      <Dialog
        isOpen={manualVerification}
        onClose={() => {
          setManualVerification(false);
        }}
        title="Manual Verification
"
      >
        <div>
          {[
            {
              label: "First Name",
              required: true,
              value: firstName,
              setValue: setFirstName,
              placeholder: "Enter First Name",
            },
            {
              label: "Middle Name",
              required: false,
              value: middleName,
              setValue: setMiddleName,
              placeholder: "Enter Middle Name",
            },
            {
              label: "Last Name",
              required: true,
              value: lastName,
              setValue: setLastName,
              placeholder: "Enter Last Name",
            },
          ].map(({ label, required, value, setValue, placeholder }, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <button
            disabled={loading}
            className={`w-full flex justify-center items-center gap-2 py-2 mt-2 text-white rounded-md transition duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary hover:bg-primary-dark"
            }`}
            onClick={handleManualVerification}
          >
            {loading && <RiLoader2Fill className="animate-spin h-5 w-5" />}
            Submit for Manual Verification
          </button>
        </div>
      </Dialog>
    </div>
  );
}
