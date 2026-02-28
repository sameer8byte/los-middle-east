import { useState, useEffect, ReactNode, useRef } from "react";
import { BiCheck, BiErrorCircle, BiInfoCircle } from "react-icons/bi";
import { FaAddressCard } from "react-icons/fa";
import {
  aadhaarKyc,
  document_status_enum,
  document_type_enum,
  uploadAadhaarDocument,
} from "../../../../services/api/kyc.api";
import { useAppDispatch, useAppSelector } from "../../../../redux/store";
import { getDocumentByUser } from "../../../../services/api/document.api";
import { Document } from "../../../../types/document";
import {
  updateDocuments,
  upsertDocument,
} from "../../../../redux/slices/documents";
import { maskAadhaar } from "../../../../utils/utils";
import { RiLoader2Fill } from "react-icons/ri";
import { BsArrowUpRightSquareFill } from "react-icons/bs";
import { AlternatePhoneNumber } from "../../../alternatePhoneNumber";

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
  const brandConfig = useAppSelector((state) => state.index.brandConfig);
  const isAadhaarNumberRequired = brandConfig.isAadhaarNumberRequired;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const userDetails = useAppSelector((state) => state.userDetails);
  const documents = useAppSelector((state) => state.documents.documents);
  const brand = useAppSelector((state) => state.index);
  const linkedAadhaarNumberByPanPlus =
    userDetails?.linkedAadhaarNumberByPanPlus;
  const part2InputRef = useRef<HTMLInputElement>(null);
  const part3InputRef = useRef<HTMLInputElement>(null);

  const getDocument = (type: document_type_enum) =>
    documents?.find(
      (doc) => doc.type === type && doc.status === document_status_enum.APPROVED
    );

  const aadhaar = getDocument(document_type_enum.AADHAAR);

  const aadhaarApproved = !!aadhaar;

  // Separate state for each 4-digit group
  const [aadhaarPart1, setAadhaarPart1] = useState("");
  const [aadhaarPart2, setAadhaarPart2] = useState("");
  const [aadhaarPart3, setAadhaarPart3] = useState("");

  // Combined aadhaar number for compatibility
  const aadhaarNumber = aadhaarPart1 + aadhaarPart2 + aadhaarPart3;

  const [consent, setConsent] = useState(true);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [isSecendoryVerification, setIsSecendoryVerification] = useState(false);
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
    general: "",
    front: "",
    back: "", // Add back upload error
  });

  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [formattedAadhaar, setFormattedAadhaar] = useState("");

  // Initialize parts from existing aadhaar document or PAN Plus data
  useEffect(() => {
    if (aadhaar?.documentNumber) {
      const fullNumber = aadhaar.documentNumber;
      // Make sure the document number doesn't contain X characters (from previous PAN Plus data)
      if (!fullNumber.includes('X') && /^\d{12}$/.test(fullNumber)) {
        setAadhaarPart1(fullNumber.slice(0, 4));
        setAadhaarPart2(fullNumber.slice(4, 8));
        setAadhaarPart3(fullNumber.slice(8, 12));
      }
    } else if (
      linkedAadhaarNumberByPanPlus &&
      typeof linkedAadhaarNumberByPanPlus === "string"
    ) {
      // Extract last 4 digits from linkedAadhaarNumberByPanPlus if it's a string and has 12 digits
      const aadhaarNumber = linkedAadhaarNumberByPanPlus.replace(/\D/g, "");
      if (aadhaarNumber.length >= 4) {
        const last4Digits = aadhaarNumber.slice(-4);
        setAadhaarPart3(last4Digits);
        // If we have the full 12-digit number, populate all parts
        if (aadhaarNumber.length === 12) {
          setAadhaarPart1(aadhaarNumber.slice(0, 4));
          setAadhaarPart2(aadhaarNumber.slice(4, 8));
          setAadhaarPart3(aadhaarNumber.slice(8, 12));
        }
      }
    }
  }, [aadhaar?.documentNumber, linkedAadhaarNumberByPanPlus]);

  // Format Aadhaar number with spaces every 4 digits
  const formatAadhaarNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Limit to 12 digits
    const limitedDigits = digits.slice(0, 12);
    // Add spaces every 4 digits
    return limitedDigits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  // Handle input change for each part
  const handlePartChange = (
    value: string,
    partNumber: 1 | 2 | 3,
    nextInputRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);

    switch (partNumber) {
      case 1:
        setAadhaarPart1(digitsOnly);
        break;
      case 2:
        setAadhaarPart2(digitsOnly);
        break;
      case 3:
        setAadhaarPart3(digitsOnly);
        break;
    }

    // Auto-focus next input when current is full
    if (digitsOnly.length === 4 && nextInputRef?.current) {
      nextInputRef.current.focus();
    }
  };

  useEffect(() => {
    setFormattedAadhaar(formatAadhaarNumber(aadhaarNumber));
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
        if (aadhaarDoc?.documentNumber) {
          const fullNumber = aadhaarDoc.documentNumber;
          // Make sure the document number doesn't contain X characters (from previous PAN Plus data)
          if (!fullNumber.includes('X') && /^\d{12}$/.test(fullNumber)) {
            setAadhaarPart1(fullNumber.slice(0, 4));
            setAadhaarPart2(fullNumber.slice(4, 8));
            setAadhaarPart3(fullNumber.slice(8, 12));
          }
        } else if (linkedAadhaarNumberByPanPlus) {
          // If no Aadhaar document but we have PAN Plus data, pre-fill from that
          const aadhaarNumber = linkedAadhaarNumberByPanPlus.replace(/\D/g, "");
          if (aadhaarNumber.length >= 4) {
            const last4Digits = aadhaarNumber.slice(-4);
            setAadhaarPart3(last4Digits);

            // If we have the full 12-digit number, populate all parts
            if (aadhaarNumber.length === 12) {
              setAadhaarPart1(aadhaarNumber.slice(0, 4));
              setAadhaarPart2(aadhaarNumber.slice(4, 8));
              setAadhaarPart3(aadhaarNumber.slice(8, 12));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch documents", err);
      }
    };
    fetchDocuments();
  }, [dispatch, user.id, linkedAadhaarNumberByPanPlus]);

  const validateAadhaar = () => {
    // If Aadhaar number is not required and we have valid PAN Plus data, consider it valid
    if (!isAadhaarNumberRequired && linkedAadhaarNumberByPanPlus) {
      const panPlusAadhaar = linkedAadhaarNumberByPanPlus.replace(/\D/g, "");
      // Allow validation if we have at least 4 digits (last 4 digits)
      if (panPlusAadhaar.length >= 4) {
        return true;
      }
    }

    // Otherwise, validate manually entered Aadhaar number
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

    // Determine which Aadhaar number to use
    let aadhaarToVerify = aadhaarNumber;

    // If Aadhaar input is not required and we have PAN Plus data, use that
    if (!isAadhaarNumberRequired && linkedAadhaarNumberByPanPlus) {
      const panPlusAadhaar = linkedAadhaarNumberByPanPlus.replace(/\D/g, "");
      if (panPlusAadhaar.length === 12) {
        // Use full 12-digit number
        aadhaarToVerify = panPlusAadhaar;
      } else if (panPlusAadhaar.length >= 4) {
        // Use last 4 digits and pad with X's to make 12 digits
        const last4Digits = panPlusAadhaar.slice(-4);
        aadhaarToVerify = "XXXXXXXX" + last4Digits;
      }
    }

    try {
      const response = await aadhaarKyc(user.id, {
        type: document_type_enum.AADHAAR,
        documentNumber: aadhaarToVerify,
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
      if (response.digitapData.code === "200" || response.digitapData.success) {
        //  redirect to digitap URL target _blank
        window.open(
          response?.digitapData?.model?.url || response?.digitapData?.url,
          "_blank"
        );
      }
      setOtpResendTimer(30);
    } catch (err) {
      setIsSecendoryVerification(true);
      setError((e) => ({
        ...e,
        general: (err as Error).message || "OTP send failed",
      }));
    } finally {
      setAadhaarLoading(false);
      setTimeout(() => {
        setError({
          aadhaar: "",
          general: "",
          front: "",
          back: "",
        });
      }, 3000);
    }
  };
  const renderError = (message: ReactNode) =>
    message && (
      <div className="text-error text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
        <BiErrorCircle className="text-sm flex-shrink-0" />
        <span>{message}</span>
      </div>
    );

  const VerifiedBadge = ({
    documentNumber,
    icon,
  }: {
    documentNumber: string;
    icon: ReactNode;
  }) => (
    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg flex items-center gap-3 shadow-sm">
      <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-success font-medium block">
          Verified Successfully
        </span>
        <div className="text-sm text-gray-800 font-semibold truncate">
          {documentNumber}
        </div>
      </div>
      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <BiCheck className="text-white text-xl" />
      </div>
    </div>
  );

  //a Update the upload handler to accept side parameter
  const handelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await uploadAadhaarDocument({
        userId: user.id,
        file: file,
        documentType: document_type_enum.AADHAAR,
        documentNumber: aadhaarNumber,
        side,
      });
      dispatch(upsertDocument(response));
      setError((prev) => ({ ...prev, [side]: "" }));
    } catch (err) {
      setError((prev) => ({
        ...prev,
        [side]: (err as Error).message || "File upload failed",
      }));
    }
  };
  return (
    <div>
      {error.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-error flex items-start animate-shake shadow-sm">
          <BiErrorCircle className="mr-2 text-lg flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error.general}</span>
        </div>
      )}

      {isSecendoryVerification ||
      (aadhaarApproved && brand.brandConfig.isAadharImageRequired) ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary-light/10 rounded-lg flex items-center justify-center">
              <FaAddressCard className="text-primary text-sm" />
            </div>
            <h2 className="text-base font-bold text-gray-800">
              Upload Aadhaar Document
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Front Side <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/*"
                  capture="environment"
                  onChange={(e) => handelUpload(e, "front")}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md  focus:ring-primary focus:border-transparent transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-primary hover:file:bg-blue-100 cursor-pointer"
                />
                {aadhaar?.frontDocumentUrl && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BiCheck className="text-success text-lg" />
                  </div>
                )}
              </div>
              {renderError(error.front)}
              {aadhaar?.frontDocumentUrl && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  <BiCheck className="text-sm" />
                  Uploaded successfully
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Back Side <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/*"
                  capture="environment"
                  onChange={(e) => handelUpload(e, "back")}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md  focus:ring-primary focus:border-transparent transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-primary hover:file:bg-blue-100 cursor-pointer"
                />
                {aadhaar?.backDocumentUrl && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BiCheck className="text-success text-lg" />
                  </div>
                )}
              </div>
              {renderError(error.back)}
              {aadhaar?.backDocumentUrl && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  <BiCheck className="text-sm" />
                  Uploaded successfully
                </p>
              )}
            </div>
          </div>

          {(aadhaar?.frontDocumentUrl || aadhaar?.backDocumentUrl) && (
            <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <BiInfoCircle className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-primary">
                  {!aadhaar?.backDocumentUrl
                    ? "Please upload the back side of your Aadhaar card to complete verification"
                    : !aadhaar?.frontDocumentUrl
                    ? "Please upload the front side of your Aadhaar card to complete verification"
                    : "Both sides uploaded! We'll verify them shortly and update your status."}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center shadow-sm">
              <FaAddressCard className="text-white text-sm" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Aadhaar Verification
              </h2>
              <p className="text-xs text-gray-500">
                Verify your identity securely
              </p>
            </div>
          </div>

          {aadhaarApproved ? (
            <div className="animate-fade-in-up">
              <VerifiedBadge
                documentNumber={
                  maskAadhaar(formattedAadhaar) ||
                  maskAadhaar(aadhaarNumber) ||
                  ""
                }
                icon={<FaAddressCard className="text-success" />}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="animate-fade-in">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Aadhaar Number <span className="text-error">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="1234"
                    className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-gray-400 font-mono tracking-wider text-center ${
                      error.aadhaar
                        ? "border-error bg-red-50"
                        : "border-gray-300"
                    }`}
                    value={aadhaarPart1}
                    disabled={aadhaarLoading}
                    onChange={(e) =>
                      handlePartChange(e.target.value, 1, part2InputRef)
                    }
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                  />
                  <span className="text-gray-400 font-mono">-</span>
                  <input
                    ref={part2InputRef}
                    type="text"
                    placeholder="5678"
                    className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-gray-400 font-mono tracking-wider text-center ${
                      error.aadhaar
                        ? "border-error bg-red-50"
                        : "border-gray-300"
                    }`}
                    value={aadhaarPart2}
                    disabled={aadhaarLoading}
                    onChange={(e) =>
                      handlePartChange(e.target.value, 2, part3InputRef)
                    }
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                  />
                  <span className="text-gray-400 font-mono">-</span>
                  <input
                    ref={part3InputRef}
                    type="text"
                    placeholder="9012"
                    className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-gray-400 font-mono tracking-wider text-center ${
                      error.aadhaar
                        ? "border-error bg-red-50"
                        : "border-gray-300"
                    }`}
                    value={aadhaarPart3}
                    disabled={aadhaarLoading}
                    onChange={(e) => handlePartChange(e.target.value, 3)}
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-400">
                      {aadhaarNumber.length}/12
                    </span>
                    {aadhaarNumber.length === 12 && (
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <BiCheck className="text-success text-sm" />
                      </div>
                    )}
                  </div>
                </div>
                {renderError(error.aadhaar)}
                {aadhaarNumber.length > 0 && aadhaarNumber.length < 12 && (
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <BiInfoCircle className="text-sm" />
                    Enter {12 - aadhaarNumber.length} more digits
                  </div>
                )}
              </div>

              {aadhaarkycDetails.digitapData.code !== "200" &&
              aadhaarkycDetails.scoreMeData.referenceId === "" ? (
                <div className="space-y-3 animate-fade-in">
                  {!isAadhaarNumberRequired &&
                    linkedAadhaarNumberByPanPlus &&
                    linkedAadhaarNumberByPanPlus.replace(/\D/g, "").length >=
                      4 &&
                    aadhaarNumber.length < 12 && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-start gap-2">
                        <BiInfoCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-green-700">
                          Your Aadhaar verification can proceed using the
                          Aadhaar number from your PAN verification data. No
                          manual entry required.
                        </p>
                      </div>
                    )}

                  <div className="bg-primary-light/10 border border-primary-light p-3 rounded-lg flex items-start gap-2">
                    <BiInfoCircle className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-primary">
                      We’ll redirect you to DigiLocker to complete your Aadhaar
                      verification. Make sure you have your Aadhaar card or
                      number ready.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex items-start gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
                    onClick={() => setConsent(!consent)}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                    transition-all duration-200 border-2 ${
                      consent
                        ? "bg-primary border-none"
                        : "border-gray-300 group-hover:border-primary-light"
                    }`}
                    >
                      {consent && <BiCheck className="text-white text-sm" />}
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors leading-relaxed">
                      I consent to Aadhaar verification via DigiLocker and agree
                      to share my information for KYC purposes.
                    </span>
                  </button>

                  <button
                    className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2
                  transition-all duration-300 relative overflow-hidden ${
                    (aadhaarNumber.length === 12 ||
                      (!isAadhaarNumberRequired &&
                        linkedAadhaarNumberByPanPlus &&
                        linkedAadhaarNumberByPanPlus.replace(/\D/g, "")
                          .length >= 4)) &&
                    consent
                      ? "bg-primary text-on-primary shadow-sm hover:shadow-md hover:bg-primary-dark"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                    onClick={sendAadharOTP}
                    disabled={
                      aadhaarLoading ||
                      !consent ||
                      (aadhaarNumber.length !== 12 &&
                        (isAadhaarNumberRequired ||
                          !linkedAadhaarNumberByPanPlus ||
                          linkedAadhaarNumberByPanPlus.replace(/\D/g, "")
                            .length < 4))
                    }
                  >
                    {aadhaarLoading ? (
                      <>
                        <RiLoader2Fill className="animate-spin h-4 w-4" />
                        <span>Processing...</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                      </>
                    ) : (
                      <span>
                        {!isAadhaarNumberRequired &&
                        linkedAadhaarNumberByPanPlus &&
                        linkedAadhaarNumberByPanPlus.replace(/\D/g, "")
                          .length >= 4 &&
                        aadhaarNumber.length < 12
                          ? "Get Verification Link"
                          : "Get Verification Link"}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                aadhaarkycDetails.digitapData.model.url && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BiCheck className="text-success text-lg" />
                        <span className="text-xs font-medium text-green-700">
                          Link Generated
                        </span>
                      </div>
                      <a
                        href={aadhaarkycDetails.digitapData.model.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-primary  transition-colors"
                      >
                        Open Verification
                        <BsArrowUpRightSquareFill className="text-sm" />
                      </a>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {(aadhaarApproved || isSecendoryVerification) &&
            brand.brandConfig.isAlternateNumber && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-3">
                  <AlternatePhoneNumber label="FAMILY_MEMBER" />
                  <AlternatePhoneNumber label="NON_FAMILY_MEMBER" />
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
