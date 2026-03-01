import { useEffect, useMemo, useRef, useState } from "react";

import { useParams } from "react-router-dom";
import { extractPdfMetadata } from "../../../lib/pdfMetadataExtractor"; // adjust path
import {
  getPdfBlobSize,
  downloadPdfBlob,
  openPdfBlobInNewTab,
} from "../../../utils/pdfBlobUtils";
import {
  TbFileDownload,
  TbFileText,
  TbCalendar,
  TbCoin,
  TbEdit,
  TbFileInfo,
  TbUpload,
  TbPhotoBitcoin,
  TbLoader2,
  TbShieldCheck,
  TbAlertTriangle,
} from "react-icons/tb";
import { HiOutlineVideoCamera } from "react-icons/hi2";
import { UpsertOtherDocuments } from "./upsertOtherDocuments";
import { ProfileMediaUpload } from "./profileMediaUpload";
import { DuaPan } from "./duaPan";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import dayjs from "dayjs";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Dialog from "../../../common/dialog";
import { formatDocumentType } from "../../../lib/utils";
import {
  DocumentTypeEnum,
  PartnerUserPermissionType,
} from "../../../constant/enum";
import { usePermission } from "../../../context/permissionContext";
import { toast } from "react-toastify";
import { LuSquareArrowOutUpRight } from "react-icons/lu";
import { getAwsSignedUrl } from "../../../shared/services/api/common.api";
import {
  getCustomerDocuments,
  updateDocumentNumber,
  getCustomerSignedDocuments,
  getCustomerNoDueCertificates,
} from "../../../shared/services/api/customer.api";
import api from "../../../shared/services/axios";
import {
  BankStatement,
  Payslip,
  OtherDocument,
  ProviderData,
  Document,
} from "../../../shared/types/customers";
import { Button } from "../../../common/ui/button";
import { GenerateAadhaarLink } from "./generateAddharLink";
import { FiLink, FiShield } from "react-icons/fi";
import { ensureS3Url } from "../../../constant/s3Config";

export type DocumentsData = {
  accountStatements: BankStatement[];
  payslips: Payslip[];
  documents: Document[];
  otherDocuments: OtherDocument[];
  userProfile: {
    profilePicUrl: string;
    profileVideoUrl: string;
  };
};

// Types for separate document sections
export type SignedDocument = {
  signedFilePrivateKey: string;
  loanFormattedId?: string;
  pdfBlob?:
    | Buffer
    | { type: "Buffer"; data: number[] }
    | { [key: string]: number }
    | null;
  agreementId?: string;
  provider?: string;
};

export type NoDueCertificate = {
  id: string;
  loanId: string;
  certificateFileUrl: string | null;
  issuedDate: string;
  issuedBy: string | null;
  remarks: string | null;
  certificateType: string | null;
  formattedNoDueId: string | null;
  loanFormattedId?: string;
};

// Skeleton Components
const ProfileMediaSkeleton = () => (
  <section className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Profile Photo Skeleton */}
      <div className="border rounded-lg p-3 bg-[var(--background)] animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-[var(--muted)] bg-opacity-30 rounded"></div>
          <div className="h-4 bg-[var(--muted)] bg-opacity-30 rounded w-24"></div>
        </div>
        <div className="w-full h-32 bg-[var(--muted)] bg-opacity-30 rounded-md mb-2"></div>
        <div className="h-3 bg-[var(--muted)] bg-opacity-30 rounded w-20"></div>
      </div>

      {/* Profile Video Skeleton */}
      <div className="border rounded-lg p-3 bg-[var(--background)] animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-[var(--muted)] bg-opacity-30 rounded"></div>
          <div className="h-4 bg-[var(--muted)] bg-opacity-30 rounded w-24"></div>
        </div>
        <div className="w-full h-40 bg-[var(--muted)] bg-opacity-30 rounded-md mb-2"></div>
        <div className="h-3 bg-[var(--muted)] bg-opacity-30 rounded w-16 mb-3"></div>
        <div className="h-3 bg-[var(--muted)] bg-opacity-30 rounded w-24"></div>
      </div>
    </div>
  </section>
);

const DocumentCardSkeleton = () => (
  <div className="border rounded-lg p-3 bg-[var(--background)] animate-pulse">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-[var(--muted)] bg-opacity-30 rounded"></div>
        <div>
          <div className="h-4 bg-[var(--muted)] bg-opacity-30 rounded w-32 mb-1"></div>
          <div className="h-3 bg-[var(--muted)] bg-opacity-30 rounded w-24"></div>
        </div>
      </div>
      <div className="w-16 h-6 bg-[var(--muted)] bg-opacity-30 rounded-full"></div>
    </div>

    <div className="flex flex-col gap-1.5">
      <div className="h-8 bg-[var(--muted)] bg-opacity-30 rounded"></div>
      <div className="h-8 bg-[var(--muted)] bg-opacity-30 rounded"></div>
    </div>
  </div>
);

const DocumentsSectionSkeleton = ({ title }: { readonly title: string }) => (
  <section className="space-y-3">
    <div className="h-5 bg-[var(--muted)] bg-opacity-30 rounded w-40"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <DocumentCardSkeleton key={`skeleton-${title}-${i}`} />
      ))}
    </div>
  </section>
);

const AccountStatementsSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }, (_, i) => (
      <DocumentCardSkeleton key={i} />
    ))}
  </div>
);

// PAN Masking Component
const MaskedPanNumber = ({ panNumber }: { readonly panNumber: string }) => {
  const [isVisible, setIsVisible] = useState(false);

  const maskPan = (pan: string) => {
    if (pan.length <= 4) return "•••••";
    const firstTwo = pan.substring(0, 2);
    const lastThree = pan.substring(pan.length - 3);
    const maskedMiddle = "•".repeat(pan.length - 5);
    return `${firstTwo}${maskedMiddle}${lastThree}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {isVisible ? panNumber : maskPan(panNumber)}
      </span>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 hover:bg-[var(--muted)] hover:bg-opacity-20 rounded transition-colors"
        title={isVisible ? "Hide PAN" : "Show PAN"}
      >
        {isVisible ? (
          <FaEyeSlash className="w-3 h-3 text-[var(--on-surface)] opacity-70" />
        ) : (
          <FaEye className="w-3 h-3 text-[var(--on-surface)] opacity-70" />
        )}
      </button>
    </div>
  );
};

// Aadhaar Masking Component - Updated format: xxxxxxxx5851
const MaskedAadhaarNumber = ({
  aadhaarNumber,
}: {
  readonly aadhaarNumber: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const maskAadhaar = (aadhaar: string) => {
    if (aadhaar.length <= 4) return "xxxxxxxxxxxx";
    const lastFour = aadhaar.substring(aadhaar.length - 4);
    return `xxxxxxxx${lastFour}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {isVisible ? aadhaarNumber : maskAadhaar(aadhaarNumber)}
      </span>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 hover:bg-[var(--muted)] hover:bg-opacity-20 rounded transition-colors"
        title={isVisible ? "Hide CPR Card" : "Show CPR Card"}
      >
        {isVisible ? (
          <FaEyeSlash className="w-3 h-3 text-[var(--on-surface)] opacity-70" />
        ) : (
          <FaEye className="w-3 h-3 text-[var(--on-surface)] opacity-70" />
        )}
      </button>
    </div>
  );
};

// No Due Certificate Card Component
interface NoDueCertificateCardProps {
  readonly certificate: NoDueCertificate;
}

function NoDueCertificateCard({ certificate }: NoDueCertificateCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = async () => {
    if (!certificate.certificateFileUrl) {
      toast.error("No certificate file available for download");
      return;
    }
    try {
      const url = certificate.certificateFileUrl;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Failed to download certificate");
    }
  };

  const handleView = async () => {
    if (!certificate.certificateFileUrl) {
      toast.error("No certificate file available to view");
      return;
    }

    try {
      const url = certificate.certificateFileUrl;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing certificate:", error);
      toast.error("Failed to view certificate");
    }
  };

  return (
    <div className="border rounded-lg p-3 var(--background) hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-100">
            <TbShieldCheck className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--on-background)]">
              No Due Certificate
              {certificate.certificateType && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {certificate.certificateType}
                </span>
              )}
            </h3>
            <p className="text-xs text-[var(--on-surface)] opacity-70">
              {certificate.formattedNoDueId ||
                `Certificate #${certificate.id.slice(0, 8)}`}
            </p>
            {certificate.loanFormattedId && (
              <p className="text-xs text-[var(--on-surface)] opacity-70 mt-1">
                Loan: {certificate.loanFormattedId}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {certificate.certificateFileUrl ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Available
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              No File
            </span>
          )}
          <Button
            onClick={() => setShowDetails(true)}
            variant="outline"
            size="sm"
            className="mt-1"
          >
            <TbFileInfo className="w-3 h-3" />
            Details
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {certificate.issuedBy && (
          <div className="flex items-center text-xs text-[var(--on-surface)]">
            <span className="opacity-70">Issued By:</span>
            <span className="ml-2 font-medium">{certificate.issuedBy}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-[var(--on-surface)]">
          <span className="opacity-70">Issued Date:</span>
          <span className="ml-2 font-medium">
            {dayjs(certificate.issuedDate).format("DD MMM YYYY")}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {certificate.certificateFileUrl ? (
          <>
            <Button
              onClick={handleView}
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<FaEye className="w-3 h-3" />}
            >
              View
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<TbFileDownload className="w-3 h-3" />}
            >
              Download
            </Button>
          </>
        ) : (
          <div className="w-full text-center py-2 text-sm text-[var(--on-surface)] opacity-70">
            Certificate file not available
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {showDetails && (
        <Dialog
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="📄 No Due Certificate Details"
          size="lg"
        >
          <div className="space-y-4">
            {/* Header Info */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TbShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    No Due Certificate
                  </h3>
                  <p className="text-sm text-gray-600">
                    Official document confirming all dues are cleared
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Certificate ID
                    </dt>
                    <dd className="text-sm font-mono font-semibold text-gray-800">
                      {certificate.formattedNoDueId || certificate.id}
                    </dd>
                  </div>

                  {certificate.loanFormattedId && (
                    <div className="bg-white p-3 rounded-lg border">
                      <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Associated Loan
                      </dt>
                      <dd className="text-sm font-semibold text-gray-800">
                        {certificate.loanFormattedId}
                      </dd>
                    </div>
                  )}

                  {certificate.certificateType && (
                    <div className="bg-white p-3 rounded-lg border">
                      <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Certificate Type
                      </dt>
                      <dd className="text-sm font-semibold text-gray-800 capitalize">
                        {certificate.certificateType
                          .toLowerCase()
                          .replace("_", " ")}
                      </dd>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Issued By
                    </dt>
                    <dd className="text-sm font-semibold text-gray-800">
                      {certificate.issuedBy || "Not specified"}
                    </dd>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Issued Date
                    </dt>
                    <dd className="text-sm font-semibold text-gray-800">
                      {dayjs(certificate.issuedDate).format(
                        "DD MMM YYYY, hh:mm A"
                      )}
                    </dd>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <dt className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Certificate Status
                    </dt>
                    <dd className="flex items-center gap-2">
                      {certificate.certificateFileUrl ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-sm font-semibold text-green-700">
                            File Available
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          <span className="text-sm font-semibold text-gray-600">
                            No File Uploaded
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              {certificate.remarks && (
                <div className="bg-white p-4 rounded-lg border">
                  <dt className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Remarks
                  </dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 rounded">
                    {certificate.remarks}
                  </dd>
                </div>
              )}

              {/* File URL Section */}
              {certificate.certificateFileUrl && (
                <div className="bg-white p-4 rounded-lg border">
                  <dt className="text-xs font-medium text-gray-500 uppercase mb-2">
                    File Location
                  </dt>
                  <dd className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-2 rounded-lg flex-1 truncate">
                      {certificate.certificateFileUrl}
                    </span>
                    <Button
                      onClick={handleView}
                      variant="outline"
                      size="sm"
                      leftIcon={<FaEye className="w-4 h-4" />}
                    >
                      View
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="primary"
                      size="sm"
                      leftIcon={<TbFileDownload className="w-4 h-4" />}
                    >
                      Download
                    </Button>
                  </dd>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowDetails(false)}
                variant="outline"
                fullWidth
              >
                Close
              </Button>
              {certificate.certificateFileUrl && (
                <Button
                  onClick={handleDownload}
                  variant="primary"
                  fullWidth
                  leftIcon={<TbFileDownload className="w-4 h-4" />}
                >
                  Download Certificate
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

interface SignedDocumentCardProps {
  readonly doc: SignedDocument;
}

function SignedDocumentCard({ doc }: SignedDocumentCardProps) {
  const [showPdfBlob, setShowPdfBlob] = useState(false);

  const handleViewPdfBlob = () => {
    if (doc.pdfBlob) {
      openPdfBlobInNewTab(doc.pdfBlob);
    }
  };

  const handleDownloadPdfBlob = () => {
    if (doc.pdfBlob) {
      const filename = `signed-agreement-${
        doc.loanFormattedId || doc.agreementId || "document"
      }.pdf`;
      downloadPdfBlob(doc.pdfBlob, filename);
    }
  };

  return (
    <div className="group relative border rounded-xl p-4 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-col">
        <div className="flex items-start gap-3">
          <div className="rounded-lg">
            <TbFileText className="w-5 h-5 text-[var(--on-primary)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <h3 className="text-sm font-semibold text-[var(--on-background)] whitespace-nowrap">
                Signed Agreement
              </h3>
              {doc.loanFormattedId && (
                <span className="items-center px-1 py-1 rounded-full text-xs font-medium text-secondary border border-[var(--surface)]">
                  {doc.loanFormattedId}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-[var(--on-surface)] opacity-80 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--on-primary)] animate-pulse"></div>
                {doc.provider
                  ? `Signed via ${doc.provider}`
                  : "Digitally Signed"}
              </p>

              <div className="flex items-center p-1">
                <div className="px-2 bg-[var(--success)] bg-opacity-10 text-[var(--on-success)] bg-opacity-10 rounded-full text-xs font-medium border border-[var(--surface)] flex items-center gap-1.5">
                  <div className="bg-[var(--success)] rounded-full"></div>
                  Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Blob Status */}
      {doc.pdfBlob && (
        <div className="mb-4 p-3 border border-[var(--muted)] border-opacity-40 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 text-[var(--on-primary)]">
              <TbFileInfo className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-[var(--on-primary)]">
              PDF Blob Available
            </span>
          </div>
          <p className="text-xs flex items-center gap-2 ml-7">
            <span>
              Size: {(getPdfBlobSize(doc.pdfBlob) / 1024).toFixed(1)} KB
            </span>
            <span className="w-1 h-1 rounded-full"></span>
            <span>Ready for viewing</span>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {doc.pdfBlob && (
          <Button
            onClick={handleViewPdfBlob}
            variant="outline"
            fullWidth
            leftIcon={<FaEye className="w-4 h-4" />}
            rightIcon={
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <LuSquareArrowOutUpRight className="w-4 h-4" />
              </div>
            }
          >
            View PDF Blob
          </Button>
        )}

        <Button
          onClick={() => setShowPdfBlob(true)}
          variant="outline"
          size="md"
          fullWidth
          leftIcon={<TbFileInfo className="w-4 h-4" />}
        >
          View Details
        </Button>
      </div>

      {/* Details Dialog */}
      {showPdfBlob && (
        <Dialog
          isOpen={showPdfBlob}
          onClose={() => setShowPdfBlob(false)}
          title="📄 Signed Document Details"
        >
          <div>
            <div>
              <dl className="grid grid-cols-1 gap-6">
                {doc.loanFormattedId && (
                  <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--muted)] shadow-sm">
                    <dt className="text-xs font-semibold text-[var(--on-surface)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                      Loan ID
                    </dt>
                    <dd className="text-lg font-mono font-bold text-[var(--on-background)] bg-[var(--surface)] px-3 py-2 rounded-lg">
                      {doc.loanFormattedId}
                    </dd>
                  </div>
                )}

                {doc.agreementId && (
                  <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--muted)] shadow-sm">
                    <dt className="text-xs font-semibold text-[var(--on-surface)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--secondary)]" />
                      Agreement ID
                    </dt>
                    <dd className="text-lg font-mono font-bold text-[var(--on-background)] bg-[var(--surface)] px-3 py-2 rounded-lg">
                      {doc.agreementId}
                    </dd>
                  </div>
                )}

                {doc.provider && (
                  <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--muted)] shadow-sm">
                    <dt className="text-xs font-semibold text-[var(--on-surface)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                      E-Sign Provider
                    </dt>
                    <dd className="text-lg font-bold text-[var(--on-background)]">
                      {doc.provider}
                    </dd>
                  </div>
                )}
                {doc.signedFilePrivateKey && (
                  <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--muted)] shadow-sm">
                    <dt className="text-xs font-semibold text-[var(--on-surface)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                      S3 Storage Key
                    </dt>
                    <dd className="text-sm text-[var(--on-background)] font-mono bg-[var(--surface)] p-3 rounded-lg border border-[var(--muted)] break-words leading-relaxed">
                      {doc.signedFilePrivateKey}
                    </dd>
                  </div>
                )}

                <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--muted)] shadow-sm">
                  <dt className="text-xs font-semibold text-[var(--on-surface)] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    PDF Blob Status
                  </dt>
                  <dd>
                    {doc.pdfBlob ? (
                      <div className="flex items-center gap-3 p-3 bg-[var(--success)] bg-opacity-10 rounded-lg border border-[var(--success)]">
                        <div className="p-2 bg-[var(--success)] rounded-full">
                          <TbFileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--on-success)]">
                            Available
                          </div>
                          <div className="text-sm text-[var(--on-success)]">
                            {(getPdfBlobSize(doc.pdfBlob) / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg border border-[var(--muted)]">
                        <div className="p-2 bg-[var(--muted)] rounded-full">
                          <TbFileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-semibold text-[var(--on-surface)]">
                          Not Available
                        </div>
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {doc.pdfBlob && (
              <div className="flex gap-3 pt-4 border-t border-[var(--muted)]">
                <Button
                  onClick={handleViewPdfBlob}
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<FaEye className="w-4 h-4" />}
                >
                  View PDF
                </Button>
                <Button
                  onClick={handleDownloadPdfBlob}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  leftIcon={<TbFileDownload className="w-4 h-4" />}
                >
                  Download
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

export function CustomerDocuments() {
  const { setQuery, getQuery, removeQuery } = useQueryParams();
  const uploadProfileMedia = getQuery("upload-profile-media") === "true";
  const uploadDocuments = getQuery("upload-documents") === "true";
  const editDocumentId = getQuery("edit-document");
  const showAadhaarDialog = getQuery("aadhaar-kyc") === "true";
  const permission = usePermission();
  const { brandId, customerId } = useParams();
  const { fetchSignedUrl } = useAwsSignedUrl();
  
  const [documentsData, setDocumentsData] = useState<DocumentsData>({
    accountStatements: [],
    payslips: [],
    documents: [],
    otherDocuments: [],
    userProfile: { profilePicUrl: "", profileVideoUrl: "" },
  });

  // Separate states for lazy-loaded documents
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [noDueCertificates, setNoDueCertificates] = useState<NoDueCertificate[]>([]);
  
  // Loading states for lazy-loaded sections
  const [loadingSignedDocuments, setLoadingSignedDocuments] = useState(false);
  const [loadingNoDueCertificates, setLoadingNoDueCertificates] = useState(false);
  
  // State to track which sections are loaded
  const [loadedSections, setLoadedSections] = useState({
    signed: false,
    noDue: false,
  });

  // Filter state for Other Documents
  const [otherDocumentsFilter, setOtherDocumentsFilter] = useState<string>("ALL");

  // Get unique document types from otherDocuments for dynamic filter options
  const otherDocumentTypes = useMemo(() => {
    const types = documentsData.otherDocuments.map((doc) => doc.type);
    return [...new Set(types)];
  }, [documentsData.otherDocuments]);

  // Filter other documents based on selected type
  const filteredOtherDocuments = useMemo(() => {
    if (otherDocumentsFilter === "ALL") {
      return documentsData.otherDocuments;
    }
    return documentsData.otherDocuments.filter(
      (doc) => doc.type === otherDocumentsFilter
    );
  }, [documentsData.otherDocuments, otherDocumentsFilter]);

  const canEdit =
    permission?.permission?.partnerPermissionType &&
    [PartnerUserPermissionType.WRITE, PartnerUserPermissionType.ALL].includes(
      permission.permission.partnerPermissionType
    );
  const [loading, setLoading] = useState(true);

  // Check if Aadhaar document is approved
  const aadhaarDocument = documentsData.documents.find(
    (doc) => doc.type === DocumentTypeEnum.AADHAAR
  );
  const isAadhaarApproved =
    aadhaarDocument?.status === "APPROVED" ||
    aadhaarDocument?.status === "VERIFIED";
  const isAadhaarMissingNumber =
    isAadhaarApproved &&
    (!aadhaarDocument?.documentNumber ||
      aadhaarDocument?.documentNumber.trim() === "");

  // Check if PAN document is pending
  const panDocument = documentsData.documents.find(
    (doc) => doc.type === DocumentTypeEnum.PAN
  );
  const panNumber = panDocument?.documentNumber;

  const showUpdateAadhaarDialog = getQuery("update-aadhaar") === "true";
  const showPanVerificationDialog = getQuery("pan-verification") === "true";
  const [aadhaarLastFour, setAadhaarLastFour] = useState("");
  const [isUpdatingAadhaar, setIsUpdatingAadhaar] = useState(false);

  // PAN verification states
  const [pan, setPan] = useState<string>(panNumber || "");
  const [isVerifyingPan, setIsVerifyingPan] = useState(false);
  const [panVerificationResult, setPanVerificationResult] = useState<any>(null);
  const [panError, setPanError] = useState("");

  // Find the document being edited
  const editingDocument = editDocumentId
    ? documentsData.otherDocuments.find((doc) => doc.id === editDocumentId)
    : null;

  const refetchDocuments = async () => {
    try {
      if (!customerId || !brandId) return;
      const data = await getCustomerDocuments(customerId, brandId);
      
      // Ensure S3 URLs are properly formatted
      const processedData = {
        ...data,
        userProfile: {
          profilePicUrl: ensureS3Url(data.userProfile?.profilePicUrl, brandId),
          profileVideoUrl: ensureS3Url(data.userProfile?.profileVideoUrl, brandId),
        },
      };
      
      setDocumentsData(processedData);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  // Function to load signed documents
  const loadSignedDocuments = async () => {
    if (!customerId || !brandId || loadedSections.signed) return;
    
    setLoadingSignedDocuments(true);
    try {
      const data = await getCustomerSignedDocuments(customerId, brandId);
      setSignedDocuments(data.signedDocuments || []);
      setLoadedSections(prev => ({ ...prev, signed: true }));
      toast.success("Signed documents loaded");
    } catch (error) {
      console.error("Error fetching signed documents:", error);
      toast.error("Failed to load signed documents");
    } finally {
      setLoadingSignedDocuments(false);
    }
  };

  // Function to load no due certificates
  const loadNoDueCertificates = async () => {
    if (!customerId || !brandId || loadedSections.noDue) return;
    
    setLoadingNoDueCertificates(true);
    try {
      const data = await getCustomerNoDueCertificates(customerId, brandId);
      setNoDueCertificates(data.noDueCertificates || []);
      setLoadedSections(prev => ({ ...prev, noDue: true }));
      toast.success("No due certificates loaded");
    } catch (error) {
      console.error("Error fetching no due certificates:", error);
      toast.error("Failed to load no due certificates");
    } finally {
      setLoadingNoDueCertificates(false);
    }
  };

  const handleUpdateAadhaarNumber = async () => {
    try {
      if (aadhaarLastFour?.length !== 4) {
        toast.error("Please enter exactly 4 digits");
        return;
      }

      if (!/^\d{4}$/.test(aadhaarLastFour)) {
        toast.error("Please enter valid 4 digits only");
        return;
      }

      setIsUpdatingAadhaar(true);
      toast.info("Updating CPR Card number...", { autoClose: 2000 });

      const maskedAadhaar = `XXXXXXXX${aadhaarLastFour}`;

      await updateDocumentNumber(
        customerId || "",
        brandId || "",
        DocumentTypeEnum.AADHAAR,
        maskedAadhaar
      );

      toast.success("CPR Card number updated successfully!");
      removeQuery("update-aadhaar");
      setAadhaarLastFour("");
      await refetchDocuments();
    } catch (error) {
      console.error("Error updating CPR Card number:", error);
      toast.error("Failed to update CPR Card number. Please try again.");
    } finally {
      setIsUpdatingAadhaar(false);
    }
  };

  // PAN verification with fallback
  const handleVerifyPan = async () => {
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;

    if (!panRegex.test(pan)) {
      setPanError("Invalid PAN format. Expected format: ABCDE1234F");
      return;
    }

    if (!customerId || !brandId) {
      setPanError("Missing required parameters");
      return;
    }

    setIsVerifyingPan(true);
    setPanError("");
    toast.info("Verifying PAN with fallback...", { autoClose: 2000 });

    try {
      const response = await api.post(
        `/partner/brand/${brandId}/pan-details-plus/with-fallback`,
        {
          pan: pan.toUpperCase(),
          userId: customerId,
          shouldUpsert: true,
        }
      );

      setPanVerificationResult(response.data);
      toast.success("PAN verification completed!");

      // Refetch documents to update the status
      await refetchDocuments();

      // Auto-close dialog on success
      setTimeout(() => {
        removeQuery("pan-verification");
        setPanError("");
        setPanVerificationResult(null);
      }, 2000);
    } catch (error: any) {
      console.error("PAN verification error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to verify PAN. Please try again.";
      setPanError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifyingPan(false);
    }
  };

  // Convert image URL to base64 - handles CORS issues with S3 URLs
  const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      // First try direct fetch
      let response: Response;
      try {
        response = await fetch(imageUrl, {
          mode: "cors",
          credentials: "omit",
        });
      } catch (corsError) {
        console.warn(
          "Direct fetch failed, trying with proxy/different approach:",
          corsError
        );

        // Fallback: Try using a canvas approach for public URLs
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              if (!ctx) {
                reject(new Error("Unable to get canvas context"));
                return;
              }

              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              // Convert to base64 and remove data URL prefix
              const base64String = canvas.toDataURL("image/jpeg", 0.8);
              const base64Data = base64String.split(",")[1];
              resolve(base64Data);
            } catch (canvasError) {
              reject(new Error(`Canvas conversion failed: ${canvasError}`));
            }
          };

          img.onerror = () => {
            reject(new Error("Image failed to load - CORS or network issue"));
          };

          // Add timestamp to bypass cache if needed
          const urlWithTimestamp =
            imageUrl + (imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
          img.src = urlWithTimestamp;
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix
          const base64Data = base64String.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw new Error(
        `Failed to convert image to base64: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Face verification function
  const handleFaceVerification = async () => {
    try {
      // Get Aadhaar document image
      const aadhaarDocument = documentsData.documents.find(
        (doc) => doc.type === DocumentTypeEnum.AADHAAR
      );

      if (!aadhaarDocument?.providerData?.documentLinks?.imageBase64) {
        throw new Error("CPR Card photo not available for verification");
      }

      if (!documentsData.userProfile.profilePicUrl) {
        throw new Error("Profile photo not available for verification");
      }

      // Convert profile picture to base64
      const profilePicBase64 = await convertImageToBase64(
        documentsData.userProfile.profilePicUrl
      );

      // Call face verification API
      const response = await fetch(
        "https://los-ml-backend.8byte.ai/api/face-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: aadhaarDocument.providerData.documentLinks.imageBase64,
            profilePicUrlimageBase64: profilePicBase64,
          }),
        }
      );

      if (!response.ok) {
        // User-friendly error messages based on status code
        if (response.status === 404) {
          throw new Error("Face verification service is currently unavailable. Please try again later.");
        } else if (response.status === 500) {
          throw new Error("Server error occurred. Please try again in a few moments.");
        } else if (response.status === 503) {
          throw new Error("Service temporarily unavailable. Please try again later.");
        } else {
          throw new Error("Unable to verify faces at this time. Please try again.");
        }
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Face verification error:", error);
      // Re-throw with user-friendly message if it's a generic error
      if (error.message && !error.message.includes("HTTP error")) {
        throw error;
      }
      throw new Error("Face verification failed. Please try again later.");
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (!customerId || !brandId) return;

        const data = await getCustomerDocuments(customerId, brandId);
        
        // Ensure S3 URLs are properly formatted
        const processedData = {
          ...data,
          userProfile: {
            profilePicUrl: ensureS3Url(data.userProfile?.profilePicUrl, brandId),
            profileVideoUrl: ensureS3Url(data.userProfile?.profileVideoUrl, brandId),
          },
        };
        
        setDocumentsData(processedData);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [customerId, brandId]);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!documentsData?.userProfile.profileVideoUrl) {
      setDuration(null);
      return;
    }
    if (video) {
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [documentsData?.userProfile.profileVideoUrl]);

  if (loading)
    return (
      <div className="max-w-6xl w-full space-y-4">
        {/* Action buttons skeleton */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="h-9 w-32 bg-[var(--muted)] bg-opacity-30 rounded animate-pulse"></div>
          <div className="h-9 w-40 bg-[var(--muted)] bg-opacity-30 rounded animate-pulse"></div>
          <div className="h-9 w-32 bg-[var(--muted)] bg-opacity-30 rounded animate-pulse"></div>
        </div>

        {/* Profile Media Skeleton */}
        <ProfileMediaSkeleton />

        {/* Documents Sections Skeletons */}
        <DocumentsSectionSkeleton title="General Documents" />
        <DocumentsSectionSkeleton title="Other Documents" />
        <DocumentsSectionSkeleton title="Payslips" />

        {/* Account Statements Skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-[var(--muted)] bg-opacity-30 rounded w-32"></div>
          <AccountStatementsSkeleton />
        </div>
      </div>
    );

  const handleGetPdfMetadata = async (key: string) => {
    try {
      // Get signed URL
      const { url } = await getAwsSignedUrl(key);

      // Extract metadata
      const metadata = await extractPdfMetadata(url);
      if (metadata && metadata !== "PASSWORD_PROTECTED") {
        toast.info(
          <div className="text-left space-y-1">
            <div>
              <strong>Title:</strong> {metadata.title || "N/A"}
            </div>
            <div>
              <strong>Author:</strong> {metadata.author || "N/A"}
            </div>
            <div>
              <strong>Application:</strong> {metadata.creator || "N/A"}
            </div>
            <div>
              <strong>Producer:</strong> {metadata.producer || "N/A"}
            </div>
            <div>
              <strong>Created:</strong> {metadata.creationDate || "N/A"}
            </div>
            <div>
              <strong>Modified:</strong> {metadata.modificationDate || "N/A"}
            </div>
            <div>
              <strong>Pages:</strong> {metadata.pageCount}
            </div>
            <div>
              <strong>PDF Version:</strong> {metadata.pdfVersion || "N/A"}
            </div>
          </div>,
          {
            position: "top-right",
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            closeButton: true,
          }
        );
      } else {
        toast.error(
          "Failed to retrieve PDF metadata (maybe password-protected)",
          {
            position: "top-right",
            autoClose: 7000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          }
        );
      }
    } catch (error) {
      console.error("Error fetching PDF metadata:", error);
      toast.error("Error fetching PDF metadata", {
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  return (
    <div>
      {/* Aadhaar KYC Dialog */}
      {showAadhaarDialog && (
        <Dialog
          isOpen={showAadhaarDialog}
          onClose={() => removeQuery("aadhaar-kyc")}
          title="🔐 CPR Card KYC Verification"
          size="xl"
        >
          <GenerateAadhaarLink
            userId={customerId || ""}
            brandId={brandId || ""}
          />
        </Dialog>
      )}

      {/* Update Aadhaar Number Dialog */}
      {showUpdateAadhaarDialog && (
        <Dialog
          isOpen={showUpdateAadhaarDialog}
          onClose={() => {
            if (!isUpdatingAadhaar) {
              removeQuery("update-aadhaar");
              setAadhaarLastFour("");
            }
          }}
          title="📝 Update CPR Card Number"
          size="md"
        >
          <div className="space-y-4">
            <div className="text-sm text-[var(--on-surface)] opacity-75">
              Enter the last 4 digits of your CPR Card number. The first 8 digits
              will be masked for security.
            </div>

            <div className="space-y-2">
              <label
                htmlFor="aadhaar-last-four"
                className="block text-sm font-medium text-[var(--on-background)]"
              >
                Aadhaar Number
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono text-[var(--on-surface)] opacity-60 px-3 py-2 bg-[var(--surface)] rounded-lg border">
                  XXXXXXXX
                </span>
                <input
                  id="aadhaar-last-four"
                  type="text"
                  value={aadhaarLastFour}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setAadhaarLastFour(value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  disabled={isUpdatingAadhaar}
                  className={`w-20 text-lg font-mono text-center px-3 py-2 border border-[var(--muted)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all ${
                    isUpdatingAadhaar
                      ? "bg-gray-100 cursor-not-allowed opacity-50"
                      : "bg-white hover:border-[var(--primary)]"
                  }`}
                />
              </div>
              <div className="text-xs text-[var(--on-surface)] opacity-60">
                Only the last 4 digits are required
              </div>

              {/* Progress Indicator */}
              {isUpdatingAadhaar && (
                <div className="flex items-center gap-2 text-sm text-[var(--primary)] bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                  <span>Updating CPR Card number...</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-[var(--muted)]">
              <Button
                onClick={() => {
                  if (!isUpdatingAadhaar) {
                    removeQuery("update-aadhaar");
                    setAadhaarLastFour("");
                  }
                }}
                variant="outline"
                fullWidth
                disabled={isUpdatingAadhaar}
                className={
                  isUpdatingAadhaar ? "opacity-50 cursor-not-allowed" : ""
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAadhaarNumber}
                variant="primary"
                fullWidth
                disabled={aadhaarLastFour.length !== 4 || isUpdatingAadhaar}
                className="relative transition-all duration-200"
              >
                {isUpdatingAadhaar ? (
                  <>
                    <TbLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Number"
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* PAN Verification Dialog */}
      {showPanVerificationDialog && (
        <Dialog
          isOpen={showPanVerificationDialog}
          onClose={() => {
            if (!isVerifyingPan) {
              removeQuery("pan-verification");
              setPanError("");
              setPanVerificationResult(null);
            }
          }}
          title="🔐 PAN Verification with Fallback"
          size="lg"
        >
          <div className="space-y-4">
            <div className="text-sm text-[var(--on-surface)] opacity-75">
              Verify the PAN document using multiple providers with automatic
              fallback for better accuracy.
            </div>

            <div className="space-y-2">
              <label
                htmlFor="pan-number"
                className="block text-sm font-medium text-[var(--on-background)]"
              >
                PAN Number
              </label>
              <input
                id="pan-number"
                type="text"
                value={pan}
                onChange={(e) => {
                  setPan(e.target.value.toUpperCase());
                  setPanError("");
                }}
                placeholder="ABCDE1234F"
                maxLength={10}
                disabled={isVerifyingPan}
                className={(() => {
                  const baseClasses =
                    "w-full text-lg font-mono text-center px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all";
                  if (panError)
                    return `${baseClasses} border-red-500 bg-red-50`;
                  if (isVerifyingPan)
                    return `${baseClasses} bg-gray-100 cursor-not-allowed opacity-50 border-[var(--muted)]`;
                  return `${baseClasses} bg-white hover:border-[var(--primary)] border-[var(--muted)]`;
                })()}
              />

              {/* Error Message */}
              {panError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  <TbAlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{panError}</span>
                </div>
              )}

              {/* Progress Indicator */}
              {isVerifyingPan && (
                <div className="flex items-center gap-2 text-sm text-[var(--primary)] bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PAN with fallback providers...</span>
                </div>
              )}
            </div>

            {/* Verification Results */}
            {panVerificationResult && (
              <div
                className={`p-4 rounded-lg border ${
                  panVerificationResult.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {panVerificationResult.success ? (
                      <TbShieldCheck className="text-green-600 w-5 h-5" />
                    ) : (
                      <TbAlertTriangle className="text-red-600 w-5 h-5" />
                    )}
                    <span
                      className={`font-semibold ${
                        panVerificationResult.success
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {panVerificationResult.success
                        ? "Verification Successful"
                        : "Verification Failed"}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                    {panVerificationResult.provider}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    panVerificationResult.success
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {panVerificationResult.message}
                </p>

                {/* Personal Details */}
                {panVerificationResult.success && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Personal Details:
                    </h4>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-600">Name:</dt>
                        <dd className="text-gray-800">
                          {panVerificationResult.name || "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">DOB:</dt>
                        <dd className="text-gray-800">
                          {panVerificationResult.dob || "N/A"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="font-medium text-gray-600">
                          Father's Name:
                        </dt>
                        <dd className="text-gray-800">
                          {panVerificationResult.fathersName || "N/A"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-[var(--muted)]">
              <Button
                onClick={() => {
                  if (!isVerifyingPan) {
                    removeQuery("pan-verification");
                    setPanError("");
                    setPanVerificationResult(null);
                  }
                }}
                variant="outline"
                fullWidth
                disabled={isVerifyingPan}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPan}
                variant="primary"
                fullWidth
                disabled={!pan || pan.length !== 10 || isVerifyingPan}
                className="relative transition-all duration-200"
              >
                {isVerifyingPan ? (
                  <>
                    <TbLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify PAN"
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}



      {(uploadDocuments || editDocumentId) && (
        <UpsertOtherDocuments
          editingDocument={editingDocument}
          onSuccess={refetchDocuments}
        />
      )}

      {uploadProfileMedia && (
        <ProfileMediaUpload
          isOpen={uploadProfileMedia}
          onClose={() => removeQuery("upload-profile-media")}
          onSuccess={refetchDocuments}
          currentProfilePic={documentsData.userProfile.profilePicUrl}
          currentProfileVideo={documentsData.userProfile.profileVideoUrl}
        />
      )}

      <div className="max-w-6xl w-full space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Aadhaar Approved Status */}
          {isAadhaarApproved && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-800 rounded-lg border border-green-200">
              <FiShield className="w-4 h-4" />
              <span className="text-sm font-medium">CPR Card Verified ✓</span>
            </div>
          )}

          {/* Update Aadhaar Number Button - Show when approved but missing number */}
          {isAadhaarMissingNumber && (
            <>
              {canEdit ? (
                <Button
                  onClick={() => setQuery("update-aadhaar", "true")}
                  variant="secondary"
                  className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 transition-all duration-200"
                  disabled={isUpdatingAadhaar}
                >
                  {isUpdatingAadhaar ? (
                    <>
                      <TbLoader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <TbEdit className="w-4 h-4" />
                      Update Aadhaar Number
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 rounded-lg border border-gray-200 cursor-not-allowed">
                  <TbEdit className="w-4 h-4 opacity-50" />
                  <span className="text-sm">Update CPR Card Number</span>
                  <span className="text-xs opacity-70">(No Permission)</span>
                </div>
              )}
            </>
          )}

          {/* Upload Documents Button */}
          {canEdit && (
            <Button
              onClick={() => setQuery("upload-documents", "true")}
              variant="outline"
            >
              Upload Documents
            </Button>
          )}

          {/* Update Media Button */}
          {canEdit && (
            <Button
              onClick={() => setQuery("upload-profile-media", "true")}
              variant="outline"
            >
              <TbEdit className="w-4 h-4" />
              Update Media
            </Button>
          )}
        </div>

        {/* Status Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Missing Aadhaar Status */}
          {!isAadhaarApproved && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 mt-0.5">
                  <TbAlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">
                    Aadhaar Verification Required
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    Complete CPR Card verification to proceed with the loan
                    application.
                  </p>
                  <Button
                    onClick={() => setQuery("aadhaar-kyc", "true")}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <FiLink className="w-3 h-3 mr-1" />
                    Complete Verification
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Missing PAN Status */}
          {!panDocument && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-orange-600 mt-0.5">
                  <TbAlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-orange-900 mb-1">
                    PAN Document Required
                  </h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Upload and verify your PAN document to complete the
                    verification process.
                  </p>
                  {canEdit ? (
                    <Button
                      onClick={() => {
                        setPan("");
                        setQuery("pan-verification", "true");
                      }}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <TbShieldCheck className="w-3 h-3 mr-1" />
                      Verify PAN
                    </Button>
                  ) : (
                    <div className="text-xs text-orange-600 opacity-75">
                      You don't have permission to verify documents
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PAN Verification Section */}
        <DuaPan />

        {(documentsData.userProfile.profilePicUrl ||
          documentsData.userProfile.profileVideoUrl) && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Profile Photo */}
              {documentsData.userProfile.profilePicUrl && (
                <div className="border rounded-lg p-3 var(--background)">
                  <div className="flex items-center gap-2 mb-2">
                    <TbPhotoBitcoin className="text-[var(--on-primary)] text-lg" />
                    <h3 className="text-sm font-medium text-[var(--on-background)]">
                      Profile Photo
                    </h3>
                    <a
                      href={documentsData.userProfile.profilePicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[var(--primary)] text-xs hover:underline flex items-center gap-1"
                    >
                      <LuSquareArrowOutUpRight className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  </div>

                  <img
                    src={documentsData.userProfile.profilePicUrl}
                    alt="Profile"
                    className="rounded-md h-32 w-full object-cover"
                  />

                  <a
                    href={documentsData.userProfile.profilePicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[var(--primary)] hover:underline"
                  >
                    Preview Fullscreen →
                  </a>
                </div>
              )}

              {/* Profile Video */}
              {documentsData.userProfile.profileVideoUrl && (
                <div className="border rounded-lg p-3 var(--background)">
                  <div className="flex items-center gap-2 mb-2">
                    <HiOutlineVideoCamera className="text-[var(--on-primary)] text-lg" />
                    <h3 className="text-sm font-medium text-[var(--on-background)]">
                      Profile Video
                    </h3>
                    <a
                      href={documentsData.userProfile.profileVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[var(--primary)] text-xs hover:underline flex items-center gap-1"
                    >
                      <LuSquareArrowOutUpRight className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  </div>

                  <video
                    ref={videoRef}
                    controls
                    className="rounded-md h-40 w-full object-cover"
                    preload="metadata"
                  >
                    <source
                      src={documentsData.userProfile.profileVideoUrl}
                      type="video/mp4"
                    />
                    <track
                      kind="captions"
                      src=""
                      label="No captions available"
                    />
                  </video>

                  {duration && (
                    <p className="text-xs text-[var(--on-surface)] opacity-70 mt-1">
                      Duration: {duration.toFixed(2)} sec
                    </p>
                  )}

                  <a
                    href={documentsData.userProfile.profileVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-[var(--primary)] hover:underline"
                  >
                    Preview Fullscreen →
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Empty Profile Media Section */}
        {!documentsData.userProfile.profilePicUrl &&
          !documentsData.userProfile.profileVideoUrl &&
          permission?.permission?.partnerPermissionType &&
          [
            PartnerUserPermissionType.WRITE,
            PartnerUserPermissionType.ALL,
          ].includes(permission?.permission.partnerPermissionType) && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--on-background)]">
                  Profile Media
                </h2>
              </div>

              <div className="border-2 border-dashed border-[var(--muted)] border-opacity-50 rounded-lg p-4 text-center">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="flex space-x-4">
                      <TbPhotoBitcoin className="h-12 w-12 text-[var(--on-surface)] opacity-50" />
                      <HiOutlineVideoCamera className="h-12 w-12 text-[var(--on-surface)] opacity-50" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--on-background)]">
                      No profile media uploaded
                    </h3>
                    <p className="text-[var(--on-surface)] opacity-70">
                      Upload profile picture and video to complete customer
                      profile
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("upload-profile-media", "true");
                    }}
                  >
                    <TbUpload className="w-5 h-5" />
                    Upload Profile Media
                  </Button>
                </div>
              </div>
            </section>
          )}

        <DocumentsSection
          title="General Documents"
          items={documentsData.documents}
          itemRenderer={(doc) => (
            <DocumentCard
              type={doc.type}
              status={doc.status}
              title={formatDocumentType(doc.type)}
              subtitle={doc.documentNumber}
              createdAt={(doc as any)?.createdAt}
              frontDocumentUrl={doc.frontDocumentUrl}
              backDocumentUrl={doc.backDocumentUrl}
              onDownload={(key) => fetchSignedUrl(key)}
              providerData={doc.providerData}
              profilePicUrl={documentsData.userProfile.profilePicUrl}
              // PAN verification props
              isPanDocument={doc.type === DocumentTypeEnum.PAN}
              isPanPending={doc.status === "PENDING"}
              canEdit={canEdit}
              isVerifyingPan={isVerifyingPan}
              onVerifyPan={() => {
                setPan(doc.documentNumber || "");
                setQuery("pan-verification", "true");
              }}
              // Face verification props
              isAadhaarDocument={doc.type === DocumentTypeEnum.AADHAAR}
              onFaceVerify={handleFaceVerification}
            />
          )}
        />

        {/* On-demand sections with buttons */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[var(--on-background)]">
            Additional Documents
          </h2>
          
          {/* Load buttons in a single row */}
          <div className="flex gap-3">
            {/* Load Signed Documents Button */}
            <Button
              onClick={loadSignedDocuments}
              variant="outline"
              disabled={loadingSignedDocuments || loadedSections.signed}
              className="flex-1"
              leftIcon={
                loadingSignedDocuments ? (
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                ) : loadedSections.signed ? (
                  <TbShieldCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <TbFileText className="w-4 h-4" />
                )
              }
            >
              {loadingSignedDocuments
                ? "Loading..."
                : loadedSections.signed
                ? "Signed Documents Loaded"
                : "Signed Documents"}
            </Button>

            {/* Load No Due Certificates Button */}
            <Button
              onClick={loadNoDueCertificates}
              variant="outline"
              disabled={loadingNoDueCertificates || loadedSections.noDue}
              className="flex-1"
              leftIcon={
                loadingNoDueCertificates ? (
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                ) : loadedSections.noDue ? (
                  <TbShieldCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <TbShieldCheck className="w-4 h-4" />
                )
              }
            >
              {loadingNoDueCertificates
                ? "Loading..."
                : loadedSections.noDue
                ? "No Due Certificates Loaded"
                : "No Due Certificates"}
            </Button>
          </div>

          {/* Signed Documents Section - Only show when loaded */}
          {loadedSections.signed && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[var(--on-background)] mb-2">
                Signed Documents
              </h3>
              {signedDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {signedDocuments.map((doc) => (
                    <SignedDocumentCard
                      key={`signed-${doc.signedFilePrivateKey || doc.agreementId}`}
                      doc={doc}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-[var(--muted)] border-opacity-50 rounded-lg p-4 text-center">
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <TbFileText className="h-12 w-12 text-[var(--on-surface)] opacity-50" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-[var(--on-background)]">
                        No Signed Documents
                      </h3>
                      <p className="text-[var(--on-surface)] opacity-70">
                        No signed documents found for this customer
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Due Certificates Section - Only show when loaded */}
          {loadedSections.noDue && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[var(--on-background)] mb-2">
                No Due Certificates
              </h3>
              {noDueCertificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {noDueCertificates.map((certificate) => (
                    <NoDueCertificateCard
                      key={`no-due-${certificate.id}`}
                      certificate={certificate}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-[var(--muted)] border-opacity-50 rounded-lg p-4 text-center">
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <TbShieldCheck className="h-12 w-12 text-[var(--on-surface)] opacity-50" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-[var(--on-background)]">
                        No Due Certificates Available
                      </h3>
                      <p className="text-[var(--on-surface)] opacity-70">
                        No due certificates have been issued for this customer's loans
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Other Documents Section with Filter */}
        {documentsData.otherDocuments.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--on-background)]">
                Other Documents
              </h2>
              {otherDocumentTypes.length > 1 && (
                <select
                  value={otherDocumentsFilter}
                  onChange={(e) => setOtherDocumentsFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[var(--muted)] rounded-lg bg-[var(--background)] text-[var(--on-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                >
                  <option value="ALL">All Types ({documentsData.otherDocuments.length})</option>
                  {otherDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatDocumentType(type)} ({documentsData.otherDocuments.filter(d => d.type === type).length})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOtherDocuments.map((doc) => (
                <div key={`doc-section-other-${doc.id}`}>
                  <DocumentCard
                    type={doc.type}
                    status={doc.status}
                    title={formatDocumentType(doc.type)}
                    subtitle={doc.documentNumber}
                    createdAt={(doc as any)?.createdAt}
                    frontDocumentUrl={doc.frontDocumentUrl}
                    backDocumentUrl={doc.backDocumentUrl}
                    onDownload={(key) => fetchSignedUrl(key)}
                    providerData={doc.providerData}
                    profilePicUrl={documentsData.userProfile.profilePicUrl}
                    onEdit={
                      permission?.permission?.partnerPermissionType &&
                      [
                        PartnerUserPermissionType.WRITE,
                        PartnerUserPermissionType.ALL,
                      ].includes(permission?.permission.partnerPermissionType)
                        ? () => setQuery("edit-document", doc.id)
                        : () => {
                            toast.error("ohh! you dont have permnission to edit");
                          }
                    }
                    documentId={doc.id}
                    verificationNotes={doc.verificationNotes}
                    frontPassword={doc.frontPassword}
                    backPassword={doc.backPassword}
                    hideStatus={true}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <DocumentsSection
          title="Payslips"
          items={documentsData.payslips}
          itemRenderer={(payslip) => (
            <DocumentCard
              type="payslip"
              status="VERIFIED"
              title={`${dayjs()
                .month(Number(payslip.month) - 1)
                .format("MMMM")} ${payslip.year}`}
              subtitle="Monthly Salary"
              url={payslip.filePrivateKey}
              onDownload={fetchSignedUrl}
              onCheckVersion={handleGetPdfMetadata}
            />
          )}
        />

        {documentsData.accountStatements.map((statement) => (
          <DocumentCard
            key={statement.id}
            type="bank_statement"
            status="VERIFIED"
            title={`statement #${statement.id.split("-")[0].toUpperCase()}`}
            subtitle={
              statement.filePassword ? (
                <span className="flex items-center gap-1">
                  <FaEye className="text-[var(--on-surface)] opacity-70" />
                  Password protected {statement.filePassword}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[var(--on-surface)] opacity-70">
                  <FaEyeSlash />
                  No password
                </span>
              )
            }
            url={statement.filePrivateKey}
            onDownload={fetchSignedUrl}
            onCheckVersion={handleGetPdfMetadata}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentsSection<T>({
  title,
  items,
  itemRenderer,
}: {
  readonly title: string;
  readonly items: readonly T[];
  readonly itemRenderer: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-[var(--on-background)]">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div key={`doc-section-${title}-${index}`}>{itemRenderer(item)}</div>
        ))}
      </div>
    </section>
  );
}

interface DocumentCardProps {
  readonly type: string;
  readonly status: string;
  readonly title: string;
  readonly subtitle: string | React.ReactNode;
  readonly frontDocumentUrl?: string | null;
  readonly backDocumentUrl?: string | null;
  readonly onDownload: (key: string) => void;
  readonly url?: string;
  readonly providerData?: ProviderData | null;
  readonly onEdit?: () => void;
  readonly documentId?: string;
  readonly verificationNotes?: string | null;
  readonly frontPassword?: string | null;
  readonly backPassword?: string | null;
  readonly onCheckVersion?: (key: string) => void;
  readonly profilePicUrl?: string;
  // PAN verification props
  readonly isPanDocument?: boolean;
  readonly isPanPending?: boolean;
  readonly canEdit?: boolean;
  readonly isVerifyingPan?: boolean;
  readonly onVerifyPan?: () => void;
  readonly hideStatus?: boolean;
  readonly createdAt?: string | Date;
  // Face verification props
  readonly isAadhaarDocument?: boolean;
  readonly onFaceVerify?: () => Promise<any>;
}

function DocumentCard({
  type,
  status,
  title,
  subtitle,
  frontDocumentUrl,
  backDocumentUrl,
  onDownload,
  url,
  providerData,
  onEdit,
  verificationNotes,
  frontPassword,
  backPassword,
  onCheckVersion,
  profilePicUrl,
  // PAN verification props
  isPanDocument = false,
  isPanPending = false,
  canEdit: canEditProp = false,
  isVerifyingPan = false,
  onVerifyPan,
  hideStatus = false,
  createdAt,
  // Face verification props
  isAadhaarDocument = false,
  onFaceVerify,
}: DocumentCardProps) {
  const [showProviderData, setShowProviderData] = useState(false);
  const [localFaceVerificationResult, setLocalFaceVerificationResult] = useState<any>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerificationError, setFaceVerificationError] = useState<string | null>(null);
  const hasCalledFaceVerificationRef = useRef(false);

  // Auto-verify face when opening provider data for Aadhaar
  const handleOpenProviderData = async () => {
    setShowProviderData(true);
    
    // Only call API once - check ref flag
    if (isAadhaarDocument && profilePicUrl && onFaceVerify && !hasCalledFaceVerificationRef.current) {
      hasCalledFaceVerificationRef.current = true;
      setIsVerifyingFace(true);
      setFaceVerificationError(null);
      try {
        const result = await onFaceVerify();
        setLocalFaceVerificationResult(result);
      } catch (error) {
        console.error('Face verification failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Face verification failed. Please try again.';
        setFaceVerificationError(errorMessage);
        // Reset flag on error so user can retry
        hasCalledFaceVerificationRef.current = false;
      } finally {
        setIsVerifyingFace(false);
      }
    }
  };

  // Check if this is a PAN or Aadhaar document and render masked number
  const renderSubtitle = () => {
    if (type === DocumentTypeEnum.PAN && typeof subtitle === "string") {
      return <MaskedPanNumber panNumber={subtitle} />;
    }
    if (type === DocumentTypeEnum.AADHAAR && typeof subtitle === "string") {
      return <MaskedAadhaarNumber aadhaarNumber={subtitle} />;
    }
    return subtitle;
  };

  const formatProviderValue = (key: string, value: any) => {
    if (
      ["aadhaar", "pan"].includes(key.toLowerCase()) &&
      typeof value === "object" &&
      value?.number
    ) {
      // For Aadhaar, mask the number in provider data too - format: xxxxxxxx5851
      if (key.toLowerCase() === "aadhaar") {
        const aadhaar = value.number;
        if (aadhaar.length > 4) {
          const lastFour = aadhaar.substring(aadhaar.length - 4);
          return `xxxxxxxx${lastFour}`;
        }
      }
      // For PAN, use existing masking
      if (key.toLowerCase() === "pan") {
        const pan = value.number;
        if (pan.length > 4) {
          const firstTwo = pan.substring(0, 2);
          const lastThree = pan.substring(pan.length - 3);
          const maskedMiddle = "•".repeat(pan.length - 5);
          return `${firstTwo}${maskedMiddle}${lastThree}`;
        }
      }
      return value.number;
    }
    return typeof value === "object" ? JSON.stringify(value) : value;
  };

  const iconMap = {
    payslip: <TbCalendar className="text-success" />,
    bank_statement: <TbCoin className="text-warning" />,
    default: <TbFileText className="text-[var(--on-primary)]" />,
  };

  return (
    <div className="border rounded-lg p-3 var(--background) hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {iconMap[type as keyof typeof iconMap] || iconMap.default}
          <div>
            <h3 className="text-sm font-medium text-[var(--on-background)]">
              {title}
            </h3>
            <p className="text-xs text-[var(--on-surface)] opacity-70">
              {renderSubtitle()}
            </p>
            {createdAt && (
              <p className="text-[10px] text-[var(--on-surface)] font-semibold mt-0.5">
                Uploaded at : {dayjs(createdAt).format("DD MMM YYYY, hh:mm A")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center flex-col gap-2">
          {!hideStatus && <StatusBadge status={status} />}{" "}
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
              title="Edit document"
            >
              <TbEdit className="w-3 h-3 " />
            </Button>
          )}
        </div>
      </div>

      {/* Verification Notes Section */}
      {verificationNotes && (
        <VerificationNotesDisplay notes={verificationNotes} />
      )}

      {/* Password Information Section */}
      {(frontPassword || backPassword) && (
        <div className="mb-2 p-2 bg-[var(--surface)] bg-opacity-10 border border-opacity-30 rounded-lg">
          <h4 className="text-xs font-medium mb-1">Document Passwords:</h4>
          <div className="space-y-0.5">
            {[
              { label: "Front", value: frontPassword },
              { label: "Back", value: backPassword },
            ]
              .filter(({ value }) => value)
              .map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <FaEye className="text-[var(--on-primary)] w-3 h-3" />
                  <span className="text-xs text-[var(--primary)]">
                    {label}: {value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {frontDocumentUrl && (
          <Button
            variant="outline"
            onClick={() => onDownload(frontDocumentUrl)}
          >
            <TbFileDownload className="w-4 h-4" />
            Download Front
          </Button>
        )}
        {backDocumentUrl && (
          <Button variant="outline" onClick={() => onDownload(backDocumentUrl)}>
            <TbFileDownload className="w-4 h-4" />
            Download Back
          </Button>
        )}
        {!frontDocumentUrl && !backDocumentUrl && !url && (
          <p className="text-sm text-[var(--on-surface)] opacity-70">
            No documents available
          </p>
        )}
        {url && (
          <Button onClick={() => onDownload(url)} variant="outline">
            <TbFileDownload className="w-4 h-4" />
            Download Document
          </Button>
        )}
        {url?.endsWith(".pdf") && onCheckVersion && (
          <Button onClick={() => onCheckVersion(url)} variant="outline">
            <TbFileInfo className="w-4 h-4" />
            Check Properties
          </Button>
        )}
        {providerData && (
          <Button variant="outline" onClick={handleOpenProviderData}>
            <TbFileText className="w-4 h-4" />
            View Provider Data
          </Button>
        )}

        {/* PAN Verification Button - Show when PAN document is pending */}
        {isPanDocument && isPanPending && (
          <>
            {canEditProp ? (
              <Button
                onClick={onVerifyPan}
                variant="secondary"
                disabled={isVerifyingPan}
              >
                {isVerifyingPan ? (
                  <>
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <TbShieldCheck className="w-4 h-4" />
                    Verify PAN with Fallback
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 rounded-lg border border-gray-200 cursor-not-allowed text-sm">
                <TbShieldCheck className="w-4 h-4 opacity-50" />
                <span>Verify PAN</span>
                <span className="text-xs opacity-70">(No Permission)</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Provider Data Modal */}
      {showProviderData && (
        <Dialog
          isOpen={showProviderData}
          onClose={() => setShowProviderData(false)}
          title="Documents Details"
        >
          <div className="space-y-4">
            {/* Photo Comparison Section */}
            {providerData?.documentLinks?.imageBase64 && (
              <div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Aadhaar Photo */}
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg -m-0.5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative bg-[var(--background)] rounded-lg overflow-hidden border border-[var(--muted)] border-opacity-20 shadow-sm">
                        {/* Label Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--primary)] text-white shadow-sm">
                            <TbFileText className="w-3 h-3" />
                            CPR Card
                          </span>
                        </div>

                        {/* View Full Link */}
                        <a
                          href={`data:image/jpeg;base64,${providerData.documentLinks.imageBase64}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110"
                          title="Open fullscreen"
                        >
                          <LuSquareArrowOutUpRight className="w-3.5 h-3.5" />
                        </a>

                        {/* Image */}
                        <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100">
                          <img
                            src={`data:image/jpeg;base64,${providerData.documentLinks.imageBase64}`}
                            alt="From CPR Card"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profile Photo */}
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg -m-0.5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative bg-[var(--background)] rounded-lg overflow-hidden border border-[var(--muted)] border-opacity-20 shadow-sm">
                        {/* Label Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--success)] text-white shadow-sm">
                            <TbPhotoBitcoin className="w-3 h-3" />
                            Profile
                          </span>
                        </div>

                        {/* View Full Link */}
                        {profilePicUrl && (
                          <a
                            href={profilePicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110"
                            title="Open fullscreen"
                          >
                            <LuSquareArrowOutUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Image */}
                        <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100">
                          {profilePicUrl ? (
                            <img
                              src={profilePicUrl}
                              alt="User profile"
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                              <div className="w-16 h-16 rounded-full bg-[var(--muted)] bg-opacity-20 flex items-center justify-center mb-2">
                                <TbPhotoBitcoin className="w-8 h-8 text-[var(--on-surface)] opacity-30" />
                              </div>
                              <p className="text-xs text-[var(--on-surface)] opacity-50 font-medium">
                                No profile photo
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="mt-3 flex items-start gap-2 p-3 bg-[var(--warning)] bg-opacity-10 border border-[var(--warning)] rounded-lg">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--warning)] bg-opacity-20 flex items-center justify-center mt-0.5">
                      <span className="text-[var(--on-warning)] text-xs">
                        💡
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--on-warning)] leading-relaxed">
                        <strong className="font-semibold">
                          Identity Verification:
                        </strong>{" "}
                        Compare facial features, expressions, and overall
                        appearance to confirm they match.
                      </p>
                    </div>
                  </div>

                  {/* Face Verification Results */}
                  {isAadhaarDocument && (
                    <div className="mt-3">
                      {isVerifyingFace ? (
                        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <TbLoader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">Verifying faces...</span>
                        </div>
                      ) : faceVerificationError ? (
                        <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                          <div className="flex items-center gap-3">
                            <TbAlertTriangle className="text-red-600 w-5 h-5 flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-red-700">Verification Failed</h3>
                              <p className="text-sm text-red-600 mt-1">{faceVerificationError}</p>
                            </div>
                          </div>
                        </div>
                      ) : localFaceVerificationResult ? (
                        <div
                          className={`p-4 rounded-lg border ${
                            localFaceVerificationResult.isMatch ||
                            localFaceVerificationResult.match
                              ? "bg-green-50 border-green-200"
                              : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {localFaceVerificationResult.isMatch ||
                            localFaceVerificationResult.match ? (
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <TbShieldCheck className="text-green-600 w-6 h-6" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <TbAlertTriangle className="text-red-600 w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <h3
                                className={`font-semibold text-lg ${
                                  localFaceVerificationResult.isMatch ||
                                  localFaceVerificationResult.match
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                {localFaceVerificationResult.isMatch ||
                                localFaceVerificationResult.match
                                  ? "Faces Match ✓"
                                  : "Faces Do Not Match ✗"}
                              </h3>
                              <p
                                className={`text-sm ${
                                  localFaceVerificationResult.isMatch ||
                                  localFaceVerificationResult.match
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {localFaceVerificationResult.message ||
                                  (localFaceVerificationResult.isMatch ||
                                  localFaceVerificationResult.match
                                    ? "The CPR Card photo and profile photo appear to be of the same person"
                                    : "The photos do not appear to be of the same person")}
                              </p>
                            </div>
                          </div>

                          {/* Confidence Score */}
                          {localFaceVerificationResult.confidence && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Confidence Score
                                </span>
                                <span className="text-sm font-bold text-gray-800">
                                  {(localFaceVerificationResult.confidence * 100).toFixed(2)}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    localFaceVerificationResult.confidence > 0.7
                                      ? "bg-green-500"
                                      : localFaceVerificationResult.confidence > 0.4
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${
                                      localFaceVerificationResult.confidence * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* For PAN: Show structured tables */}
            {type === DocumentTypeEnum.PAN && providerData?.result && (
              <div className="space-y-4">
                {/* Personal Details Table */}
                <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border border-[var(--muted)] border-opacity-20 rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-[var(--primary)] bg-opacity-5 px-4 py-2.5 border-b border-[var(--muted)] border-opacity-10">
                    <h3 className="font-semibold text-sm text-[var(--on-background)] flex items-center gap-2">
                      <TbFileInfo className="w-4 h-4 text-[var(--on-primary)]" />
                      Personal Details
                    </h3>
                  </div>
                  <div className="p-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      {Object.entries(providerData.result)
                        .filter(([key]) => key !== "address")
                        .map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <dt className="text-xs font-medium text-[var(--on-surface)] opacity-60 uppercase tracking-wider mb-1">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </dt>
                            <dd className="text-sm text-[var(--on-background)] font-medium">
                              {key.toLowerCase() === "pan" &&
                              typeof value === "string" ? (
                                <MaskedPanNumber panNumber={value} />
                              ) : (
                                formatProviderValue(key, value) || "-"
                              )}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                </div>

                {/* Address Details Table */}
                {providerData.result.address && (
                  <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border border-[var(--muted)] border-opacity-20 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-[var(--primary)] bg-opacity-5 px-4 py-2.5 border-b border-[var(--muted)] border-opacity-10">
                      <h3 className="font-semibold text-sm text-[var(--on-background)] flex items-center gap-2">
                        <TbFileInfo className="w-4 h-4 text-[var(--on-primary)]" />
                        Address Details
                      </h3>
                    </div>
                    <div className="p-4">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        {Object.entries(providerData.result.address).map(
                          ([key, value]) => (
                            <div key={key} className="flex flex-col">
                              <dt className="text-xs font-medium text-[var(--on-surface)] opacity-60 uppercase tracking-wider mb-1">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </dt>
                              <dd className="text-sm text-[var(--on-background)] font-medium">
                                {typeof value === "object" && value !== null
                                  ? JSON.stringify(value)
                                  : typeof value === "undefined" ||
                                    value === null
                                  ? "-"
                                  : String(value)}
                              </dd>
                            </div>
                          )
                        )}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Personal Details */}
            {providerData?.personalDetails && (
              <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border border-[var(--muted)] border-opacity-20 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-[var(--primary)] bg-opacity-5 px-4 py-2.5 border-b border-[var(--muted)] border-opacity-10">
                  <h3 className="font-semibold text-sm text-[var(--on-primary)] flex items-center gap-2">
                    <TbFileInfo className="w-4 h-4 text-[var(--on-primary)]" />
                    Personal Details
                  </h3>
                </div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Object.entries(providerData.personalDetails).map(
                      ([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <dt className="text-xs font-medium text-[var(--on-surface)] opacity-60 uppercase tracking-wider mb-1">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </dt>
                          <dd className="text-sm text-[var(--on-background)] font-medium">
                            {formatProviderValue(key, value) || "-"}
                          </dd>
                        </div>
                      )
                    )}
                  </dl>
                </div>
              </div>
            )}

            {providerData?.addressDetails && (
              <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border border-[var(--muted)] border-opacity-20 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-[var(--primary)] bg-opacity-5 px-4 py-2.5 border-b border-[var(--muted)] border-opacity-10">
                  <h3 className="font-semibold text-sm text-[var(--on-primary)] flex items-center gap-2">
                    <TbFileInfo className="w-4 h-4 bg-primary text-[var(--on-primary)]" />
                    Address Details
                  </h3>
                </div>
                <div className="p-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {Object.entries(providerData.addressDetails).map(
                      ([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <dt className="text-xs font-medium text-[var(--on-surface)] opacity-60 uppercase tracking-wider mb-1">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </dt>
                          <dd className="text-sm text-[var(--on-background)] font-medium">
                            {value || "-"}
                          </dd>
                        </div>
                      )
                    )}
                  </dl>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function VerificationNotesDisplay({ notes }: { readonly notes: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  try {
    const parsedNotes = JSON.parse(notes);
    
    return (
      <div className="mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 bg-[var(--surface)] bg-opacity-50 border border-[var(--muted)] border-opacity-30 rounded-lg hover:bg-opacity-70 transition-all"
        >
          <h4 className="text-xs font-medium text-[var(--on-surface)]">
            Verification Notes
          </h4>
          <svg
            className={`w-4 h-4 text-[var(--on-surface)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="mt-1 p-2 bg-[var(--surface)] bg-opacity-30 border border-[var(--muted)] border-opacity-20 rounded-lg space-y-1">
            {Object.entries(parsedNotes).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] font-medium text-[var(--on-surface)] opacity-60 uppercase">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-xs text-[var(--on-background)] break-words">
                  {value === null ? 'null' : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 bg-[var(--surface)] bg-opacity-50 border border-[var(--muted)] border-opacity-30 rounded-lg hover:bg-opacity-70 transition-all"
        >
          <h4 className="text-xs font-medium text-[var(--on-surface)]">
            Verification Notes
          </h4>
          <svg
            className={`w-4 h-4 text-[var(--on-surface)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="mt-1 p-2 bg-[var(--surface)] bg-opacity-30 border border-[var(--muted)] border-opacity-20 rounded-lg">
            <p className="text-xs break-words">{notes}</p>
          </div>
        )}
      </div>
    );
  }
}

function StatusBadge({ status }: { readonly status: string }) {
  const statusStyles = {
    APPROVED: "bg-[var(--success)] bg-opacity-10 text-[var(--on-success)]",
    VERIFIED: "bg-[var(--success)] bg-opacity-10 text-[var(--on-success)]",
    PENDING: "bg-[var(--warning)] bg-opacity-10 text-[var(--on-warning)]",
    REJECTED: "bg-[var(--error)] bg-opacity-10 text-[var(--on-error)]",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        statusStyles[status as keyof typeof statusStyles] ||
        "bg-[var(--surface)] text-[var(--on-surface)]"
      }`}
    >
      {status}
    </span>
  );
}