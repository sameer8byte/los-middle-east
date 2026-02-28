import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../../redux/store";
import {
  verifyAadharKyc,
  getRecentDigiLockerUrls,
  uploadAadhaarDocument,
} from "../../../../services/api/kyc.api";
import Dialog from "../../../../common/dialog";
import {
  document_status_enum,
  document_type_enum,
} from "../../../../types/document";
import { getDocumentByUser } from "../../../../services/api/document.api";
import { updateDocuments, upsertDocument } from "../../../../redux/slices/documents";
import { BiCheck, BiErrorCircle, BiInfoCircle } from "react-icons/bi";
import { FaAddressCard } from "react-icons/fa";
import { AlternatePhoneNumber } from "../../../alternatePhoneNumber";

interface DigiLockerResponse {
  success: boolean;
  message: string;
  url?: string;
  id?: string;
  uniqueId?: string;
  expiresAt?: string;
  provider: "SIGNZY" | "DIGITAP";
  raw?: any;
}

interface RecentUrl {
  id: string;
  url: string | null;
  provider: string;
  createdAt: string;
  digiLockerId: string | null;
  expiresAt: string | null;
  isValid: boolean;
}

interface RecentUrlsResponse {
  success: boolean;
  urls: RecentUrl[];
  hasValidUrls: boolean;
  error?: string;
}

export function InitiateDigilockerV2() {
  const dispatch = useAppDispatch();
  const users = useAppSelector((state) => state.user);
  const brand = useAppSelector((state) => state.index);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);
  const [error, setError] = useState<{ general?: string; front?: string; back?: string }>({});
  const [isSecendoryVerification, setIsSecendoryVerification] = useState(false);
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const documents = useAppSelector((state) => state.documents.documents);
  const getDocument = (type: document_type_enum) =>
    documents?.find(
      (doc) => doc.type === type && doc.status === document_status_enum.APPROVED
    );

  const aadhaar = getDocument(document_type_enum.AADHAAR);

  const aadhaarApproved = !!aadhaar;
  const loadRecentUrls = async () => {
    try {
      setIsLoadingUrls(true);
      const response: RecentUrlsResponse = await getRecentDigiLockerUrls(
        users.user.id,
        users.user.brandId
      );

      if (response.success) {
        setRecentUrls(response.urls);
      }
    } catch (err) {
      console.error("Error loading recent URLs:", err);
    } finally {
  
      setIsLoadingUrls(false);
    }
  };

  useEffect(() => {
    loadRecentUrls();
  }, [users.user.id, users.user.brandId]);

  const handleRedirectToUrl = (url: string) => {
    globalThis.location.href = url;
  };

  const handleGenerateNewUrl = async () => {
    // Show confirmation dialog if there's an existing valid session
    if (hasValidUrl) {
      setShowConfirmDialog(true);
      return;
    }

    // Proceed with generating new URL
    await generateNewUrl();
  };

  const generateNewUrl = async () => {
    try {
      setIsLoading(true);
      setError({});

      const response: DigiLockerResponse = await verifyAadharKyc(
        users.user.id,
        users.user.brandId
      );
      if (response.success && response.url) {
        globalThis.location.href = response.url;
      } else {
        setError({ general: response.message || "Failed to generate DigiLocker URL" });
      }
    } catch (err) {
      console.error("Error while generating Aadhaar KYC URL:", err);
      setIsSecendoryVerification(true);
      setError({ general: "An error occurred while generating KYC verification URL" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmNewSession = async () => {
    setShowConfirmDialog(false);
    await generateNewUrl();
  };

  const handleUseExistingSession = () => {
    setShowConfirmDialog(false);
    if (validUrls.length > 0 && validUrls[0].url) {
      handleRedirectToUrl(validUrls[0].url);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!users.user.id) return;
    const fetchDocuments = async () => {
      try {
        const response = await getDocumentByUser(users.user.id);
        dispatch(updateDocuments(response));
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };
    fetchDocuments();
  }, [dispatch, users.user.id]);

  if (isLoadingUrls) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
          fontSize: "16px",
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }


    //a Update the upload handler to accept side parameter
  const handelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await uploadAadhaarDocument({
        userId: users.user.id,
        file: file,
        documentType: document_type_enum.AADHAAR,
        documentNumber: aadhaar?.documentNumber || "",
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

  const renderError = (message: string | undefined) =>
    message && (
      <div style={{
        color: "#e53e3e",
        fontSize: "11px",
        marginTop: "6px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: "600",
        padding: "6px 10px",
        backgroundColor: "rgba(254, 178, 178, 0.3)",
        borderRadius: "8px",
        border: "1px solid rgba(252, 129, 129, 0.3)"
      }}>
        <BiErrorCircle style={{ fontSize: "12px", flexShrink: 0 }} />
        <span>{message}</span>
      </div>
    );
  if (aadhaarApproved) {
    return (
      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
          padding: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#fafafa",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          {/* Enhanced Security Badge */}
        <div className="inline-flex items-center bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-full px-4 py-2 text-xs text-emerald-700 font-semibold shadow-md shadow-emerald-200/50 tracking-wide">
          <span className="mr-2 text-sm">🛡️</span> 
          Government Secured Platform
        </div>
        </div>
        
        {/* Document upload section - Enhanced UI */}
        {(isSecendoryVerification || brand.brandConfig.isAadharImageRequired) ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm">
            {/* Header with icon and title */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                }}
              >
                <FaAddressCard style={{ color: "#fff", fontSize: "18px" }} />
              </div>
              <div>
                <h3 style={{ 
                  color: "#1a202c", 
                  fontSize: "18px", 
                  fontWeight: "700", 
                  margin: 0,
                  letterSpacing: "-0.25px"
                }}>
                  Upload Documents
                </h3>
                <p style={{
                  color: "#718096",
                  fontSize: "13px",
                  margin: 0,
                  fontWeight: "500"
                }}>
                  Upload both sides of your Aadhaar card
                </p>
              </div>
            </div>

            {/* Upload grid - Improved spacing */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "16px", 
              marginBottom: "20px" 
            }}>
              {/* Front upload */}
              <div style={{ position: "relative" }}>
                <label 
                  htmlFor="front-upload" 
                  style={{ 
                    display: "block", 
                    fontSize: "13px", 
                    fontWeight: "600", 
                    color: "#4a5568", 
                    marginBottom: "8px",
                    letterSpacing: "0.025em"
                  }}
                >
                  📄 Front Side
                </label>
                <div style={{
                  position: "relative",
                  border: aadhaar?.frontDocumentUrl ? "2px solid #48bb78" : "2px dashed #cbd5e0",
                  borderRadius: "12px",
                  backgroundColor: aadhaar?.frontDocumentUrl ? "#f0fff4" : "#fafafa",
                  transition: "all 0.2s ease",
                  overflow: "hidden"
                }}>
                  <input
                    id="front-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/*"
                    capture="environment"
                    onChange={(e) => handelUpload(e, "front")}
                    style={{
                      width: "100%",
                      padding: "16px 12px",
                      fontSize: "12px",
                      border: "none",
                      borderRadius: "12px",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      color: "#4a5568",
                      fontWeight: "500"
                    }}
                  />
                  {aadhaar?.frontDocumentUrl && (
                    <div
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#48bb78",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(72, 187, 120, 0.3)",
                      }}
                    >
                      <BiCheck style={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }} />
                    </div>
                  )}
                </div>
                {renderError(error.front)}
                {aadhaar?.frontDocumentUrl && (
                  <div style={{ 
                    fontSize: "11px", 
                    color: "#48bb78", 
                    marginTop: "6px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    fontWeight: "600"
                  }}>
                    <BiCheck style={{ fontSize: "12px" }} />
                    ✓ Uploaded successfully
                  </div>
                )}
              </div>

              {/* Back upload */}
              <div style={{ position: "relative" }}>
                <label 
                  htmlFor="back-upload" 
                  style={{ 
                    display: "block", 
                    fontSize: "13px", 
                    fontWeight: "600", 
                    color: "#4a5568", 
                    marginBottom: "8px",
                    letterSpacing: "0.025em"
                  }}
                >
                  📄 Back Side
                </label>
                <div style={{
                  position: "relative",
                  border: aadhaar?.backDocumentUrl ? "2px solid #48bb78" : "2px dashed #cbd5e0",
                  borderRadius: "12px",
                  backgroundColor: aadhaar?.backDocumentUrl ? "#f0fff4" : "#fafafa",
                  transition: "all 0.2s ease",
                  overflow: "hidden"
                }}>
                  <input
                    id="back-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/*"
                    capture="environment"
                    onChange={(e) => handelUpload(e, "back")}
                    style={{
                      width: "100%",
                      padding: "16px 12px",
                      fontSize: "12px",
                      border: "none",
                      borderRadius: "12px",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      color: "#4a5568",
                      fontWeight: "500"
                    }}
                  />
                  {aadhaar?.backDocumentUrl && (
                    <div
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#48bb78",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(72, 187, 120, 0.3)",
                      }}
                    >
                      <BiCheck style={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }} />
                    </div>
                  )}
                </div>
                {renderError(error.back)}
                {aadhaar?.backDocumentUrl && (
                  <div style={{ 
                    fontSize: "11px", 
                    color: "#48bb78", 
                    marginTop: "6px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    fontWeight: "600"
                  }}>
                    <BiCheck style={{ fontSize: "12px" }} />
                    ✓ Uploaded successfully
                  </div>
                )}
              </div>
            </div>

            {/* Status message - Enhanced */}
            {(aadhaar?.frontDocumentUrl || aadhaar?.backDocumentUrl) && (
              <div
                style={{
                  background: aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl 
                    ? "linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)"
                    : "linear-gradient(135deg, #fef5e7 0%, #fdf2e9 100%)",
                  border: aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl
                    ? "1px solid #9ae6b4"
                    : "1px solid #f6ad55",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl ? "#48bb78" : "#ed8936",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px"
                }}>
                  {aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl ? (
                    <BiCheck style={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }} />
                  ) : (
                    <BiInfoCircle style={{ color: "#fff", fontSize: "12px" }} />
                  )}
                </div>
                <div>
                  <div style={{ 
                    fontSize: "13px", 
                    color: aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl ? "#276749" : "#c05621",
                    lineHeight: "1.4",
                    fontWeight: "600",
                    marginBottom: "4px"
                  }}>
                    {aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl 
                      ? "🎉 Upload Complete!" 
                      : "⏳ Upload in Progress"}
                  </div>
                  <div style={{ 
                    fontSize: "12px", 
                    color: aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl ? "#2d5137" : "#8b4513",
                    lineHeight: "1.3",
                    opacity: 0.9
                  }}>
                    {aadhaar?.frontDocumentUrl && aadhaar?.backDocumentUrl
                      ? "Both documents uploaded successfully! Our team will verify them and update your status shortly."
                      : aadhaar?.frontDocumentUrl 
                        ? "Front side uploaded. Please upload the back side to complete verification."
                        : "Back side uploaded. Please upload the front side to complete verification."}
                  </div>
                </div>
              </div>
            )}

            {/* Alternate Phone Numbers - Simplified & Space Optimized */}
            {(aadhaarApproved || isSecendoryVerification) && brand.brandConfig.isAlternateNumber && (
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <div style={{
                  marginBottom: "12px",
                  textAlign: "center"
                }}>
                  <h4 style={{
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 2px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}>
                    <span style={{ fontSize: "12px" }}>📞</span>
                    Alternate Contacts
                  </h4>
                  <p style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    Add backup contact numbers
                  </p>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "8px" 
                }}>
                  <AlternatePhoneNumber label="FAMILY_MEMBER" />
                  <AlternatePhoneNumber label="NON_FAMILY_MEMBER" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "linear-gradient(135deg, #e6fffa 0%, #f0fff4 100%)",
              border: "1px solid #68d391",
              borderRadius: "16px",
              padding: "24px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(104, 211, 145, 0.15)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Success decoration */}
            <div style={{
              position: "absolute",
              top: "-10px",
              right: "-10px",
              width: "60px",
              height: "60px",
              background: "linear-gradient(135deg, #48bb78, #38a169)",
              borderRadius: "50%",
              opacity: 0.1,
            }} />
            
            <div style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #48bb78, #38a169)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 4px 12px rgba(72, 187, 120, 0.3)",
            }}>
              <div style={{ fontSize: "28px" }}>✅</div>
            </div>
            
            <h3
              style={{
                color: "#276749",
                fontSize: "20px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                letterSpacing: "-0.25px"
              }}
            >
              Aadhaar Verified
            </h3>
            <p
              style={{
                color: "#2d5137",
                fontSize: "14px",
                margin: "0",
                lineHeight: "1.4",
                fontWeight: "500",
                opacity: 0.9
              }}
            >
              Your Aadhaar document has been successfully verified and approved.
            </p>
                {/* Alternate Phone Numbers - Simplified & Space Optimized */}
            {(aadhaarApproved || isSecendoryVerification) && brand.brandConfig.isAlternateNumber && (
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <div style={{
                  marginBottom: "12px",
                  textAlign: "center"
                }}>
                  <h4 style={{
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 2px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}>
                    <span style={{ fontSize: "12px" }}>📞</span>
                    Alternate Contacts
                  </h4>
                  <p style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    margin: 0,
                    fontWeight: "500"
                  }}>
                    Add backup contact numbers
                  </p>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "8px" 
                }}>
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

  // Show existing valid URLs prominently
  const validUrls = recentUrls.filter((url) => url.isValid);
  const hasValidUrl = validUrls.length > 0;

  return (
    <div
     
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        {/* Enhanced Security Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "linear-gradient(135deg, #e6fffa 0%, #f0fff4 100%)",
            border: "1px solid #68d391",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "12px",
            color: "#276749",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(104, 211, 145, 0.2)",
            letterSpacing: "0.025em"
          }}
        >
          <span style={{ marginRight: "8px", fontSize: "14px" }}>🛡️</span>
          Government Secured Platform
        </div>
      </div>

      {/* Active Session - Enhanced */}
      {hasValidUrl && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #68d391",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "20px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(104, 211, 145, 0.15)",
            background: "linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)",
          }}
        >
          <h3
            style={{
              color: "#276749",
              fontSize: "18px",
              fontWeight: "700",
              margin: "0 0 6px 0",
              letterSpacing: "-0.25px"
            }}
          >
            Pending KYC Verification
          </h3>
          <p
            style={{
              color: "#2d5137",
              fontSize: "13px",
              margin: "0 0 16px 0",
              lineHeight: "1.4",
              opacity: 0.9
            }}
          >
          click on complete verification to continue your pending KYC process.
          </p>
          <button
            onClick={() => handleRedirectToUrl(validUrls[0].url!)}
            style={{
              background: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "12px 32px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(72, 187, 120, 0.3)",
              transition: "all 0.2s ease",
              marginBottom: "12px",
              width: "100%",
              maxWidth: "240px",
              letterSpacing: "0.025em"
            }}
          >
            Continue Verification
          </button>
          <div
            style={{
              fontSize: "11px",
              color: "#718096",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              padding: "6px 12px",
              borderRadius: "8px",
              display: "inline-block",
              fontWeight: "500",
              backdropFilter: "blur(10px)"
            }}
          >
            {formatDate(validUrls[0].createdAt)} • {validUrls[0].provider}
          </div>
        </div>
      )}

      {/* Generate New URL - Enhanced */}
      <div
        style={{
          backgroundColor: "#fff",
          border: hasValidUrl ? "1px solid #e2e8f0" : "1px solid #667eea",
          borderRadius: "16px",
          padding: "20px",
          textAlign: "center",
          boxShadow: hasValidUrl
            ? "0 4px 12px rgba(0,0,0,0.05)"
            : "0 4px 12px rgba(102, 126, 234, 0.15)",
          background: hasValidUrl 
            ? "#fafafa" 
            : "linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)",
        }}
      >
        <div style={{
          width: "48px",
          height: "48px",
          background: hasValidUrl 
            ? "linear-gradient(135deg, #a0aec0, #718096)"
            : "linear-gradient(135deg, #667eea, #764ba2)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px auto",
          boxShadow: hasValidUrl
            ? "0 4px 12px rgba(160, 174, 192, 0.3)"
            : "0 4px 12px rgba(102, 126, 234, 0.3)",
        }}>
          <div style={{ fontSize: "20px" }}>
            {hasValidUrl ? "🔄" : "🚀"}
          </div>
        </div>
        
        <h3
          style={{
            color: hasValidUrl ? "#4a5568" : "#4c51bf",
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 6px 0",
            letterSpacing: "-0.25px"
          }}
        >
          {hasValidUrl ? "Start Fresh Session" : "Begin Verification"}
        </h3>
        <p
          style={{
            color: hasValidUrl ? "#718096" : "#6b7280",
            fontSize: "13px",
            margin: "0 0 16px 0",
            lineHeight: "1.4",
          }}
        >
          {hasValidUrl
            ? "This will create a new link and invalidate the current session"
            : "Secure Aadhaar verification via DigiLocker"}
        </p>

        {/* Security Features - Enhanced */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "16px",
            textAlign: "left",
            fontSize: "11px",
            border: "1px solid rgba(0,0,0,0.05)",
            backdropFilter: "blur(10px)"
          }}
        >
          <div
            style={{ fontWeight: "700", color: "#4a5568", marginBottom: "6px", letterSpacing: "0.025em" }}
          >
            🔒 Secure Process
          </div>
          <div style={{ color: "#718096", lineHeight: "1.4", fontWeight: "500" }}>
            ✓ Government portal • ✓ End-to-end encrypted • ✓ Zero data storage
          </div>
        </div>

        {/* Warning for active session - Enhanced */}
        {hasValidUrl && (
          <div
            style={{
              background: "linear-gradient(135deg, #fef5e7 0%, #fefcf2 100%)",
              border: "1px solid #f6ad55",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#c05621",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(246, 173, 85, 0.15)",
            }}
          >
            <div style={{ 
              fontWeight: "700", 
              marginBottom: "4px", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              letterSpacing: "0.025em"
            }}>
              <span>⚠️</span>
              Important Notice
            </div>
            <div style={{ lineHeight: "1.4", fontWeight: "500", opacity: 0.9 }}>
              Creating a new session will invalidate your current active session.
            </div>
          </div>
        )}

        {/* Enhanced Generate Button */}
        {(() => {
          const getButtonStyles = () => {
            if (isLoading) {
              return {
                background: "linear-gradient(135deg, #e2e8f0, #cbd5e0)",
                color: "#a0aec0",
                cursor: "not-allowed",
                boxShadow: "none",
                opacity: 0.7
              };
            }
            
            if (hasValidUrl) {
              return {
                background: "linear-gradient(135deg, #718096, #4a5568)",
                color: "white",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(113, 128, 150, 0.3)",
              };
            }
            
            return {
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            };
          };

          return (
            <button
              onClick={handleGenerateNewUrl}
              disabled={isLoading}
              style={{
                ...getButtonStyles(),
                border: "none",
                borderRadius: "12px",
                padding: "14px 32px",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s ease",
                width: "100%",
                maxWidth: "240px",
                letterSpacing: "0.025em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                margin: "0 auto",
              }}
            >
              {isLoading ? (
                <>
                  <span style={{ 
                    width: "16px", 
                    height: "16px", 
                    border: "2px solid currentColor", 
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Generating...
                </>
              ) : (
                <>
                  <span style={{ fontSize: "16px" }}>
                    {hasValidUrl ? "🔄" : "🚀"}
                  </span>
                  Generate Link
                </>
              )}
            </button>
          );
        })()}

        {/* Trust Indicators - Enhanced */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "#718096",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              padding: "6px 10px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "1px solid rgba(0,0,0,0.05)",
              letterSpacing: "0.025em",
              backdropFilter: "blur(10px)"
            }}
          >
            🏛️ Govt. Verified
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#718096",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              padding: "6px 10px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "1px solid rgba(0,0,0,0.05)",
              letterSpacing: "0.025em",
              backdropFilter: "blur(10px)"
            }}
          >
            🔐 SSL Secured
          </span>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error.general && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #fc8181",
            borderRadius: "16px",
            padding: "20px",
            marginTop: "20px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(252, 129, 129, 0.15)",
            background: "linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "linear-gradient(135deg, #f56565, #e53e3e)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              boxShadow: "0 4px 12px rgba(245, 101, 101, 0.3)",
            }}
          >
            <div style={{ fontSize: "20px", color: "white" }}>⚠️</div>
          </div>
          <div
            style={{
              color: "#742a2a",
              fontSize: "16px",
              fontWeight: "700",
              marginBottom: "6px",
              letterSpacing: "-0.25px"
            }}
          >
            Verification Error
          </div>
          <div
            style={{
              color: "#822727",
              fontSize: "13px",
              lineHeight: "1.4",
              fontWeight: "500",
              opacity: 0.9
            }}
          >
            {error.general}
          </div>
        </div>
      )}

      {/* Compact Recent History */}
      {recentUrls.length > 0 && !hasValidUrl && (
        <details style={{ marginTop: "16px" }}>
          <summary
            style={{
              color: "#6c757d",
              fontSize: "12px",
              cursor: "pointer",
              padding: "8px 12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              fontWeight: "500",
            }}
          >
            📋 Previous Attempts ({recentUrls.length})
          </summary>
          <div style={{ marginTop: "8px" }}>
            {recentUrls.map((urlData) => (
              <div
                key={urlData.id}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "6px",
                  fontSize: "11px",
                  color: "#6c757d",
                }}
              >
                <div
                  style={{
                    fontWeight: "500",
                    marginBottom: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span style={{ marginRight: "6px" }}>🕒</span>
                  {urlData.provider} • {formatDate(urlData.createdAt)}
                </div>
                <span
                  style={{
                    color: "#dc3545",
                    fontSize: "10px",
                    backgroundColor: "#f8f9fa",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}
                >
                  Expired
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Enhanced Footer Trust Message */}
      <div
        style={{
          textAlign: "center",
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.05)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ 
          fontSize: "11px", 
          color: "#718096", 
          lineHeight: "1.4",
          fontWeight: "500",
          letterSpacing: "0.025em"
        }}>
          🛡️ Secure processing via DigiLocker - India's official digital document platform.
          <br />
          <span style={{ opacity: 0.8 }}>
            Your data is protected and not stored by us.
          </span>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Active Session Found"
        size="md"
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              backgroundColor: "#f0f9f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "12px",
              }}
            >
              🔄
            </div>
            <p
              style={{
                color: "#155724",
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              You have an active verification session
            </p>
            <p
              style={{
                color: "#6c757d",
                fontSize: "14px",
                margin: "0",
              }}
            >
              Started on {hasValidUrl ? formatDate(validUrls[0].createdAt) : ""}{" "}
              via {hasValidUrl ? validUrls[0].provider : ""}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                color: "#856404",
                fontSize: "14px",
                margin: "0 0 8px 0",
                fontWeight: "500",
              }}
            >
              ⚠️ Important:
            </p>
            <p
              style={{
                color: "#856404",
                fontSize: "13px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              Creating a new session will invalidate your current active
              session. You'll lose access to the current verification progress.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleUseExistingSession}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(40, 167, 69, 0.2)",
                transition: "all 0.2s ease",
                minWidth: "140px",
              }}
            >
              Use Existing Session
            </button>
            <button
              onClick={handleConfirmNewSession}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? "#ccc" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading
                  ? "none"
                  : "0 2px 4px rgba(108, 117, 125, 0.2)",
                transition: "all 0.2s ease",
                minWidth: "140px",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Creating..." : "Create New Session"}
            </button>
          </div>

          <p
            style={{
              color: "#6c757d",
              fontSize: "12px",
              margin: "16px 0 0 0",
              textAlign: "center",
            }}
          >
            💡 Tip: Use existing session to continue where you left off
          </p>
        </div>
      </Dialog>
    </div>
  );
}
