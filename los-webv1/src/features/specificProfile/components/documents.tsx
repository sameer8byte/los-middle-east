import { useState, useEffect, ReactNode } from "react";
import { BiCheck, BiErrorCircle, BiInfoCircle } from "react-icons/bi";
import { FaAddressCard } from "react-icons/fa";
import {
  aadhaarKyc,
  document_status_enum,
  document_type_enum,
} from "../../../services/api/kyc.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { getDocumentByUser } from "../../../services/api/document.api";
import { Document } from "../../../types/document";
import { updateDocuments } from "../../../redux/slices/documents";
import { maskAadhaar } from "../../../utils/utils";
import { RiLoader2Fill } from "react-icons/ri";
export interface DigitapUnifiedUrlResponse {
  code: string;
  model: {
    url: string;
    uniqueId: string;
    unifiedTransactionId: string;
    shortUrl: string;
  };
  error: any | null;
}
export default function KYCVerification() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const documents = useAppSelector((state) => state.documents.documents);
  const getDocument = (type: document_type_enum) =>
    documents?.find(
      (doc) => doc.type === type && doc.status === document_status_enum.APPROVED
    );

  const aadhaar = getDocument(document_type_enum.AADHAAR);
  const aadhaarApproved = !!aadhaar;

  const [aadhaarNumber, setAadhaarNumber] = useState(
    aadhaar?.documentNumber || ""
  );
  const [consent, setConsent] = useState(true);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarkycDetails, setAadharKycDetails] = useState<{
    digitapData: DigitapUnifiedUrlResponse;
    scoreMeData: {
      referenceId: string;
      responseMessage: string;
      responseCode: string;
    };
  }>({
    digitapData: {
      code: "",
      model: {
        url: "",
        uniqueId: "",
        unifiedTransactionId: "",
        shortUrl: "",
      },

      error: null,
    },
    scoreMeData: {
      referenceId: "",
      responseMessage: "",
      responseCode: "",
    },
  });
  // Update the error state type
  const [error, setError] = useState({
    aadhaar: "",
    otp: "",
    general: "",
    front: "",
    back: "", // Add back upload error
  });

  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [formattedAadhaar, setFormattedAadhaar] = useState("");

  useEffect(() => {
    setFormattedAadhaar(aadhaarNumber.replace(/(\d{4})(?=\d)/g, "$1 "));
  }, [aadhaarNumber]);

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
        const aadhaarDoc = response.find(
          (doc: Document) => doc.type === document_type_enum.AADHAAR
        );
        if (aadhaarDoc && aadhaarDoc.documentNumber) {
          setAadhaarNumber(aadhaarDoc.documentNumber);
        }
      } catch (err) {
        console.error("Failed to fetch documents", err);
      }
    };
    fetchDocuments();
  }, [dispatch, user.id]);

  const validateAadhaar = () => {
    const valid = aadhaarNumber.length === 12;
    setError((e) => ({
      ...e,
      aadhaar: valid ? "" : "Aadhaar must be 12 digits",
    }));
    return valid;
  };

  const sendAadharOTP = async () => {
    if (!validateAadhaar() || !consent) return;
    setAadhaarLoading(true);
    setError((e) => ({ ...e, general: "", aadhaar: "" }));

    try {
      const response = await aadhaarKyc(user.id, {
        type: document_type_enum.AADHAAR,
        documentNumber: aadhaarNumber,
        frontDocumentUrl: "",
        backDocumentUrl: "",
      });
      setAadharKycDetails({
        digitapData: response.digitapData || {
          code: "",
          model: {
            url: "",
            uniqueId: "",
            unifiedTransactionId: "",
            shortUrl: "",
          },
          error: null,
        },

        scoreMeData: {
          referenceId: "",
          responseMessage: "",
          responseCode: "",
        },
      });
      if (response.digitapData.code === "200") {
        //  redirect to digitap URL target _blank
        window.open(response.digitapData.model.url, "_blank");
      }
      setOtpResendTimer(30);
    } catch (err) {
      setError((e) => ({
        ...e,
        general: (err as Error).message || "OTP send failed",
      }));
    } finally {
      setAadhaarLoading(false);
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

  return (
    <div>
      {error.general && (
        <div className="mb-6 p-4 bg-error-light border border-error rounded-brand text-error flex items-start animate-shake">
          <BiErrorCircle className="mr-2 text-lg flex-shrink-0 mt-0.5" />
          <span>{error.general}</span>
        </div>
      )}

      <div>
        <div className="flex items-center mb-4">
          <div className="p-2 hidden md:flex bg-primary-light rounded-full mr-3">
            <FaAddressCard className="text-primary text-xl" />
          </div>
          <h2 className="text-2xl text-[var(--color-primary)] font-semibold text-heading">
            Aadhaar Verification
          </h2>
        </div>

        {aadhaarApproved ? (
          <div className="animate-fade-in-up">
            <VerifiedBadge
              documentNumber={
                maskAadhaar(formattedAadhaar) ||
                maskAadhaar(aadhaar?.documentNumber) ||
                ""
              }
              icon={<FaAddressCard className="text-success" />}
            />
          </div>
        ) : (
          <div className="space-y-4 space-x-4">
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-label mb-2">
                Aadhaar Number
              </label>
              <input
                type="text"
                placeholder="XXXX XXXX XXXX"
                className={`w-full p-3 border-2 rounded-md focus:ring-2 focus:ring-primary-focus transition-all duration-200 placeholder-label-muted ${
                  error.aadhaar ? "border-error bg-error-light" : "border-edge"
                }`}
                value={formattedAadhaar}
                disabled={aadhaarLoading}
                onChange={(e) =>
                  setAadhaarNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 12)
                  )
                }
              />
              {renderError(error.aadhaar)}
            </div>

            {aadhaarkycDetails.digitapData.code !== "200" &&
              aadhaarkycDetails.scoreMeData.referenceId === "" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-surface-light text-label p-4 rounded-md flex items-start border border-primary-light">
                    <BiInfoCircle className="text-primary mr-2 flex-shrink-0 mt-1" />
                    <p className="text-sm text-primary">
                      you will be redirected to Digitap for Aadhaar
                      verification. Please ensure you have your Aadhaar card
                      ready.
                    </p>
                  </div>

                  <div
                    className="flex items-center cursor-pointer group"
                    onClick={() => setConsent(!consent)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center 
                        transition-all duration-200 border-2 ${
                          consent
                            ? "bg-primary border-primary"
                            : "border-edge group-hover:border-primary-hover"
                        }`}
                    >
                      {consent && (
                        <BiCheck className="text-on-primary text-sm" />
                      )}
                    </div>
                    <span className="text-sm text-label group-hover:text-heading transition-colors">
                      I consent to Aadhaar verification via Digitap
                    </span>
                  </div>

                  <button
                    className={`w-full py-3.5 rounded-md font-medium flex items-center justify-center 
                      transition-all duration-300 ${
                        aadhaarNumber.length === 12 && consent
                          ? "bg-primary hover:bg-primary-hover text-on-primary shadow-sm"
                          : "bg-primary-light text-label-on-primary cursor-not-allowed"
                      }`}
                    onClick={sendAadharOTP}
                    disabled={
                      aadhaarLoading || aadhaarNumber.length !== 12 || !consent
                    }
                  >
                    {aadhaarLoading ? (
                      <RiLoader2Fill className="animate-spin h-5 w-5 mr-2" />
                    ) : (
                      <span className="mr-2">📱</span>
                    )}
                    Get Verification Link
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
