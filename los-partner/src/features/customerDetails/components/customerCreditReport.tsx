// CreditReport.tsx (Complete File with Bureau Loan Summary updates)
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiArrowDownTray, HiEye } from "react-icons/hi2";
import {
  getBreCirProV2Report,
  getEquifixBreReport,
} from "../../../shared/services/api/bre.api";
import { getCustomerSummary } from "../../../shared/services/api/customer.api";
import { ISummary, CirProv2SomeTable } from "../../../shared/types/customers";
import { Button } from "../../../common/ui/button";
import { ScoreMeBds } from "./scoreMeBDA";
import * as pdfjsLib from "pdfjs-dist";
import Dialog from "../../../common/dialog";
import { Spinner } from "../../../common/ui/spinner";
import { useAppSelector } from "../../../shared/redux/store";
import { selectProvidersByType } from "../../../shared/redux/slices/brand.slice";
import { BrandProviderName, BrandProviderType } from "../../../constant/enum";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { Conversion } from "../../../utils/conversion";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Skeleton Components
const InfoItemSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-20 mb-2"></div>
    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-32"></div>
  </div>
);

const SectionCardSkeleton = ({ title }: { title: string }) => (
  <div className="bg-[var(--color-background)] rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30">
    <div className="p-4">
      <div className="h-5 bg-[var(--color-muted)] bg-opacity-30 rounded w-40 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <InfoItemSkeleton key={`${title}-skeleton-${i}`} />
        ))}
      </div>
    </div>
  </div>
);

const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="animate-pulse space-y-3">
    <div className="h-10 bg-[var(--color-muted)] bg-opacity-30 rounded"></div>
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={`table-row-${i}`}
        className="h-12 bg-[var(--color-muted)] bg-opacity-20 rounded"
      ></div>
    ))}
  </div>
);
// Type for individual scoring elements
export interface ScoringElement {
  seq: string;
  code: string;
  type: string;
  Description: string;
}

// Main ERS Score interface
export interface ERSData {
  Name: string;
  Type: string;
  Value: string;
  Version: string;
  ScoringElements: ScoringElement[];
}

// Bureau Loan Summary Types - New Format
export interface BureauLoanCategoryData {
  secured: number;  // Value in BHD
  unsecured: number;  // Value in BHD
  closed: { tlCount: number; tlValue: number };
  live: { tlCount: number; tlValue: number };
  securedLive: { tlCount: number; tlValue: number };
  unsecuredLive: { tlCount: number; tlValue: number };
  payday: { tlCount: number; tlValue: number };
  score?: number;
  leverageVsPaydayLiability?: number;
  leverageVsMonthlyLiability?: number;
}

export interface BureauLoanSummaryData {
  debt: BureauLoanCategoryData;
  enquiry3Months: BureauLoanCategoryData;
  enquiry6Months: BureauLoanCategoryData;
  enquiryTotal: BureauLoanCategoryData;
  dpd3Months: BureauLoanCategoryData;
  dpd6Months: BureauLoanCategoryData;
  writeOff3Months: BureauLoanCategoryData;
  writeOff6Months: BureauLoanCategoryData;
  writeOff12Months: BureauLoanCategoryData;
  writeOff24Months: BureauLoanCategoryData;
}

// Helper function to transform raw CIR Pro V2 report data into BureauLoanSummaryData
const transformToBureauLoanSummary = (rawReportJson: any): BureauLoanSummaryData | null => {
  if (!rawReportJson?.["CIR-REPORT-FILE"]?.["REPORT-DATA"]) {
    return null;
  }

  const reportFile = rawReportJson["CIR-REPORT-FILE"]["REPORT-DATA"];
  const standardData = reportFile["STANDARD-DATA"];
  const tradelines = standardData?.TRADELINES || [];
  const inquiryHistory = standardData?.["INQUIRY-HISTORY"] || [];
  const score = standardData?.SCORE?.[0];
  const creditScore = Number.parseInt(score?.VALUE || "0", 10);

  // Helper to parse amount strings
  const parseAmount = (val: string | undefined): number => {
    if (!val) return 0;
    return Number.parseFloat(val.replace(/,/g, "")) || 0;
  };

  // Helper to format amount as BHD
  const toBHDValue = (amount: number): number => {
    return Number.parseFloat(amount.toFixed(3));
  };

  // Date helpers
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const twentyFourMonthsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
  };

  // Check if loan has any DPD in history
  const hasDPD = (loan: any): boolean => {
    const history = loan.HISTORY?.[0];
    const values = history?.VALUES || "";
    return values.includes("030") || values.includes("060") || values.includes("090") ||
      values.includes("180") || values.includes("900") || values.includes("XXX") ||
      values.includes("SUB") || values.includes("DBT") || values.includes("LSS");
  };

  // Check if loan is written off
  const isWriteOff = (loan: any): boolean => {
    const status = (loan["ACCOUNT-STATUS"] || "").toUpperCase();
    const history = loan.HISTORY?.[0];
    const values = history?.VALUES || "";
    return status.includes("WRITE") || status.includes("WOF") ||
      values.includes("WOF") || values.includes("900") || values.includes("SMA");
  };

  // Get the date reported or open date for a loan
  const getLoanDate = (loan: any): Date | null => {
    return parseDate(loan["DATE-REPORTED"]) || parseDate(loan["OPEN-DATE"]) || parseDate(loan["SANCTIONED-DATE"]);
  };

  // Check if loan is within a time period
  const isWithinPeriod = (loan: any, startDate: Date): boolean => {
    const loanDate = getLoanDate(loan);
    return loanDate ? loanDate >= startDate : true; // Include if no date (conservative approach)
  };

  // Calculate category data for a set of loans
  const calculateCategoryData = (
    loans: any[],
    includeScoreAndLeverage: boolean = false
  ): BureauLoanCategoryData => {
    // Separate by security status
    const secLoans = loans.filter((t: any) => t["SECURITY-STATUS"]?.toUpperCase() === "SECURED");
    const unsecLoans = loans.filter((t: any) => t["SECURITY-STATUS"]?.toUpperCase() !== "SECURED");

    // Secured/Unsecured values (current balance for all loans in category)
    const securedValue = toBHDValue(secLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));
    const unsecuredValue = toBHDValue(unsecLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));

    // Closed loans
    const closedLoans = loans.filter((t: any) => t["ACCOUNT-STATUS"] === "Closed");
    const closedTlCount = closedLoans.length;
    const closedTlValue = toBHDValue(closedLoans.reduce((sum: number, t: any) => sum + parseAmount(t["DISBURSED-AMT"]), 0));

    // Live (Active) loans
    const liveLoans = loans.filter((t: any) => t["ACCOUNT-STATUS"] === "Active");
    const liveTlCount = liveLoans.length;
    const liveTlValue = toBHDValue(liveLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));

    // Secured Live loans
    const securedLiveLoans = liveLoans.filter((t: any) => t["SECURITY-STATUS"]?.toUpperCase() === "SECURED");
    const securedLiveTlCount = securedLiveLoans.length;
    const securedLiveTlValue = toBHDValue(securedLiveLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));

    // Unsecured Live loans
    const unsecuredLiveLoans = liveLoans.filter((t: any) => t["SECURITY-STATUS"]?.toUpperCase() !== "SECURED");
    const unsecuredLiveTlCount = unsecuredLiveLoans.length;
    const unsecuredLiveTlValue = toBHDValue(unsecuredLiveLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));

    // Payday loans (Credit Cards always payday, OR unsecured loans with disbursed amount < 500)
    const paydayLoans = liveLoans.filter((t: any) => {
      const acctType = (t["ACCT-TYPE"] || "").toUpperCase();
      const isCreditCard = acctType.includes("CREDIT CARD") || acctType.includes("CARD") || acctType.includes("CC");
      if (isCreditCard) return true; // Credit cards are always payday
      const disbursedAmt = parseAmount(t["DISBURSED-AMT"]);
      return t["SECURITY-STATUS"]?.toUpperCase() !== "SECURED" && disbursedAmt < 500;
    });
    const paydayTlCount = paydayLoans.length;
    const paydayTlValue = toBHDValue(paydayLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0));

    const result: BureauLoanCategoryData = {
      secured: securedValue,
      unsecured: unsecuredValue,
      closed: { tlCount: closedTlCount, tlValue: closedTlValue },
      live: { tlCount: liveTlCount, tlValue: liveTlValue },
      securedLive: { tlCount: securedLiveTlCount, tlValue: securedLiveTlValue },
      unsecuredLive: { tlCount: unsecuredLiveTlCount, tlValue: unsecuredLiveTlValue },
      payday: { tlCount: paydayTlCount, tlValue: paydayTlValue },
    };

    if (includeScoreAndLeverage) {
      result.score = creditScore;

      const paydayLiability = paydayLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0);
      const totalLiveLiability = liveLoans.reduce((sum: number, t: any) => sum + parseAmount(t["CURRENT-BAL"]), 0);

      result.leverageVsPaydayLiability = paydayLiability > 0
        ? Number.parseFloat((totalLiveLiability / paydayLiability).toFixed(2))
        : 0;

      const monthlyLiability = liveLoans.reduce((sum: number, t: any) => {
        const monthlyPayment = parseAmount(t["MONTHLY-PAYMENT"]);
        if (monthlyPayment > 0) return sum + monthlyPayment;
        return sum + parseAmount(t["CURRENT-BAL"]) * 0.03; // Assume 3% of balance as EMI
      }, 0);

      result.leverageVsMonthlyLiability = monthlyLiability > 0
        ? Number.parseFloat((totalLiveLiability / monthlyLiability).toFixed(2))
        : 0;
    }

    return result;
  };

  // Count enquiries in period and get corresponding loan amounts
  const getEnquiryData = (startDate: Date): BureauLoanCategoryData => {
    const enquiriesInPeriod = inquiryHistory.filter((inq: any) => {
      const inquiryDate = parseDate(inq["INQUIRY-DT"]);
      return inquiryDate && inquiryDate >= startDate;
    });

    // Calculate amounts from enquiries (use enquiry amount if available)
    let securedAmount = 0;
    let unsecuredAmount = 0;

    enquiriesInPeriod.forEach((inq: any) => {
      const amount = parseAmount(inq["AMOUNT"]);
      const purpose = (inq["PURPOSE"] || "").toUpperCase();

      // Classify as secured or unsecured based on purpose
      if (purpose.includes("HOME") || purpose.includes("AUTO") || purpose.includes("PROPERTY") ||
        purpose.includes("VEHICLE") || purpose.includes("LAP") || purpose.includes("GOLD")) {
        securedAmount += amount;
      } else {
        unsecuredAmount += amount;
      }
    });

    return {
      secured: toBHDValue(securedAmount),
      unsecured: toBHDValue(unsecuredAmount),
      closed: { tlCount: 0, tlValue: 0 },
      live: { tlCount: enquiriesInPeriod.length, tlValue: toBHDValue(securedAmount + unsecuredAmount) },
      securedLive: {
        tlCount: enquiriesInPeriod.filter((inq: any) => {
          const purpose = (inq["PURPOSE"] || "").toUpperCase();
          return purpose.includes("HOME") || purpose.includes("AUTO") || purpose.includes("PROPERTY");
        }).length, tlValue: toBHDValue(securedAmount)
      },
      unsecuredLive: {
        tlCount: enquiriesInPeriod.filter((inq: any) => {
          const purpose = (inq["PURPOSE"] || "").toUpperCase();
          return !purpose.includes("HOME") && !purpose.includes("AUTO") && !purpose.includes("PROPERTY");
        }).length, tlValue: toBHDValue(unsecuredAmount)
      },
      payday: { tlCount: 0, tlValue: 0 },
    };
  };

  // Get DPD loans within a time period
  const getDPDLoansInPeriod = (startDate: Date): any[] => {
    return tradelines.filter((loan: any) => {
      if (!hasDPD(loan)) return false;
      return isWithinPeriod(loan, startDate);
    });
  };

  // Get write-off loans within a time period
  const getWriteOffLoansInPeriod = (startDate: Date): any[] => {
    return tradelines.filter((loan: any) => {
      if (!isWriteOff(loan)) return false;
      return isWithinPeriod(loan, startDate);
    });
  };

  // Calculate all data
  const allLoans = tradelines;

  return {
    debt: calculateCategoryData(allLoans, true),
    enquiry3Months: getEnquiryData(threeMonthsAgo),
    enquiry6Months: getEnquiryData(sixMonthsAgo),
    enquiryTotal: getEnquiryData(twentyFourMonthsAgo), // Use 24 months for total
    dpd3Months: calculateCategoryData(getDPDLoansInPeriod(threeMonthsAgo)),
    dpd6Months: calculateCategoryData(getDPDLoansInPeriod(sixMonthsAgo)),
    writeOff3Months: calculateCategoryData(getWriteOffLoansInPeriod(threeMonthsAgo)),
    writeOff6Months: calculateCategoryData(getWriteOffLoansInPeriod(sixMonthsAgo)),
    writeOff12Months: calculateCategoryData(getWriteOffLoansInPeriod(twelveMonthsAgo)),
    writeOff24Months: calculateCategoryData(getWriteOffLoansInPeriod(twentyFourMonthsAgo)),
  };
};

export function CreditReport() {
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.BRE),
  );
  const { fetchSignedUrl } = useAwsSignedUrl();

  const { brandId, customerId } = useParams();
  const [summary, setSummary] = useState<ISummary | null>(null);

  const [cirProV2Report, setCirProV2Report] =
    useState<CirProv2SomeTable | null>(null);
  const [cirProV2Loading, setCirProV2Loading] = useState(false);

  // Equifix
  const [breLoading, setBreLoading] = useState(false);
  const [breReport, setBreReport] = useState<{
    // score: number;
    braReportJson: JSON | null;
    documentUrl: string;
    EncodedPdf?: string;
    password: string;
  } | null>(null);

  // PDF Viewer Modal State
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handelBre = async () => {
    try {
      setBreLoading(true);
      if (!customerId) {
        console.error("Customer ID is not available");
        return;
      }
      const response = await getEquifixBreReport(customerId);
      setBreReport(response);
    } catch (error) {
      console.error("Error fetching Bre report:", error);
      alert("Error fetching Bre report");
    } finally {
      setBreLoading(false);
    }
  };

  const handleDownloadEncodedPdf = () => {
    if (!breReport?.EncodedPdf) {
      alert("EncodedPdf not available");
      return;
    }

    try {
      // Decode base64 string
      const binaryString = atob(breReport.EncodedPdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `equifax-bre-report-${customerId}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading EncodedPdf:", error);
      alert("Error downloading PDF. Please try again.");
    }
  };

  const handleViewEncodedPdf = async () => {
    if (!breReport?.EncodedPdf) {
      alert("PDF not available");
      return;
    }

    try {
      setLoadingPdf(true);
      setShowPdfViewer(true);
      setPdfPages([]);
      // Decode base64 string
      const binaryString = atob(breReport.EncodedPdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        password: breReport.password || "",
      });

      // Handle password requests
      loadingTask.onPassword = (callback: (password: string) => void) => {
        if (breReport.password) {
          callback(breReport.password);
        }
      };

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const pages: string[] = [];

      // Render each page to canvas and convert to image
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvas: canvas,
          viewport: viewport,
        }).promise;

        const imageData = canvas.toDataURL();
        pages.push(imageData);
      }
      setPdfPages(pages);
    } catch (error) {
      console.error("Error viewing PDF:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(
        `Error viewing PDF: ${errorMessage}\n\nPlease check the console for more details.`,
      );
      setShowPdfViewer(false);
    } finally {
      setLoadingPdf(false);
    }
  };

  useEffect(() => {
    if (!customerId || !brandId) return;

    const fetchSummaryData = async () => {
      try {
        const response = await getCustomerSummary(customerId, brandId);
        setSummary(response);
      } catch (error) {
        console.error("Error fetching summary data:", error);
      }
    };

    fetchSummaryData();
  }, [brandId, customerId]);
  const handelCirProV2 = async () => {
    try {
      setCirProV2Loading(true);
      if (!customerId) {
        console.error("Customer ID is not available");
        return;
      }
      const response = await getBreCirProV2Report(brandId!, customerId);
      setCirProV2Report(response);
    } catch (error) {
      alert((error as Error).message || " Error fetching CIR Pro V2 report");
    } finally {
      setCirProV2Loading(false);
    }
  };

  if (!summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <SectionCardSkeleton title="Customer Profile" />
        <SectionCardSkeleton title="Employment Details" />
        <SectionCardSkeleton title="Bank Account" />
        <div className="bg-[var(--color-background)] rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30 p-4">
          <div className="h-5 bg-[var(--color-muted)] bg-opacity-30 rounded w-40 mb-4"></div>
          <TableSkeleton rows={3} />
        </div>
      </div>
    );
  }

  const cirProProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.CIRPRO,
  );
  const equifaxProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.EQUIFAX,
  );
  const scoremeProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.SCOREME,
  );

  return (
    <div className="space-y-6">
      {cirProProvider && (
        <SectionCard title="CREDIT INFORMATION REPORT">
          <div>
            {!cirProV2Report && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--color-on-surface)] opacity-80 leading-snug max-w-md">
                  The{" "}
                  <span className="font-semibold">
                    CREDIT INFORMATION REPORT
                  </span>{" "}
                  provides a detailed summary of an individual's credit history.
                </p>

                <Button
                  onClick={handelCirProV2}
                  disabled={cirProV2Loading}
                  variant="secondary"
                  size="sm"
                  className="transition-all duration-200"
                >
                  {cirProV2Loading ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin text-current"
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Loading...
                    </div>
                  ) : (
                    "Show Report"
                  )}
                </Button>
              </div>
            )}
            {cirProV2Report && (
              <div className="mt-4 space-y-4">

                {cirProV2Report.reportDocumentUrl && (
                  <DocumentUrlHandler
                    documentUrl={cirProV2Report.reportDocumentUrl}
                    fetchSignedUrl={fetchSignedUrl}
                  />
                )}
                {cirProV2Report.rawReportJson && (
                  <CirProV2ReportDisplay
                    reportData={cirProV2Report.rawReportJson}
                  />
                )}
                {
                  cirProV2Report.rawReportJson && (
                    <BureauLoanSummary data={transformToBureauLoanSummary(cirProV2Report.rawReportJson)} />
                  )
                }
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Equifax BRE Report Section */}
      {equifaxProvider && (
        <SectionCard title="Equifax BRE Report">
          <div>
            {!breReport && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--color-on-surface)] opacity-80 leading-snug max-w-md">
                  An Equifax report provides a detailed summary of an
                  individual's credit history.
                </p>

                <Button
                  onClick={handelBre}
                  disabled={breLoading}
                  variant="secondary"
                  size="sm"
                  className="transition-all duration-200"
                >
                  {breLoading ? "Loading..." : "Show Report"}
                </Button>
              </div>
            )}
            {breReport && (
              <div className="p-4 bg-[var(--color-background)] rounded-lg shadow-md text-[var(--color-on-surface)] opacity-80">
                <div className="space-y-3 text-sm">
                  {breReport.braReportJson && (
                    <EquifaxReportDisplay
                      reportData={breReport.braReportJson}
                    />
                  )}
                  {breReport.documentUrl && (
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Document URL:</span>
                      <a
                        href={breReport.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                  {breReport.EncodedPdf && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium">Encoded PDF:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleViewEncodedPdf}
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <HiEye className="w-3 h-3" />
                          View PDF
                        </Button>
                        <Button
                          onClick={handleDownloadEncodedPdf}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <HiArrowDownTray className="w-3 h-3" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {scoremeProvider && <ScoreMeBds />}

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        pages={pdfPages}
        loading={loadingPdf}
      />
    </div>
  );
}

// Reusable Components
const SectionCard = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) => (
  <div className="bg-[var(--color-background)] rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30">
    <div className="p-4">
      <h2 className="text-base font-semibold text-[var(--color-on-background)] mb-3">
        {title}
      </h2>
      {children}
    </div>
  </div>
);

// Helper functions for Equifax data extraction
const extractPANId = (panData: any): string => {
  if (!panData) return "N/A";
  if (typeof panData === "string") return panData;
  if (Array.isArray(panData) && panData.length > 0) {
    const first = panData[0];
    return typeof first === "string" ? first : first?.IdNumber || "N/A";
  }
  if (typeof panData === "object" && panData.IdNumber) return panData.IdNumber;
  return "N/A";
};

const extractPhoneNumber = (phoneData: any): string => {
  if (!phoneData) return "N/A";
  if (Array.isArray(phoneData) && phoneData.length > 0) {
    const first = phoneData[0];
    return typeof first === "string" ? first : first?.Number || "N/A";
  }
  if (typeof phoneData === "object" && phoneData.Number)
    return phoneData.Number;
  return "N/A";
};

const extractEmail = (emailData: any): string => {
  if (!emailData) return "N/A";
  if (Array.isArray(emailData) && emailData.length > 0) {
    const first = emailData[0];
    return typeof first === "string" ? first : first?.EmailAddress || "N/A";
  }
  if (typeof emailData === "object" && emailData.EmailAddress)
    return emailData.EmailAddress;
  return "N/A";
};

// Equifax Report Display Component
const EquifaxReportDisplay = ({ reportData }: { readonly reportData: any }) => {
  if (!reportData) return null;

  // Navigate through the Equifax CCR structure
  const cirReportData =
    reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData;

  if (!cirReportData) {
    return (
      <div className="text-xs text-[var(--color-on-surface)] opacity-70">
        No credit report data available
      </div>
    );
  }

  // Extract key sections
  const header = cirReportData.Header;
  const idAndContactInfo = cirReportData.IDAndContactInfo;
  const scoreDetails = cirReportData.ScoreDetails?.[0];
  const accounts = cirReportData.RetailAccountDetails || [];
  const enquiries = cirReportData.Enquiries || [];
  const employmentInfo = cirReportData.EmploymentDetails || [];
  const accountsSummary = cirReportData.RetailAccountsSummary;
  const recentActivities = cirReportData.RecentActivities;
  const otherKeyInd = cirReportData.OtherKeyInd;
  const enquirySummary = cirReportData.EnquirySummary;

  // Analytics calculations
  const openAccounts = accounts.filter((a: any) => a.Open === "Yes");
  const closedAccounts = accounts.filter((a: any) => a.Open === "No");
  const writeOffAccounts = accounts.filter(
    (a: any) =>
      a.AccountStatus?.includes("Write Off") ||
      a.AccountStatus?.includes("WOF"),
  );
  const settledAccounts = accounts.filter((a: any) =>
    a.AccountStatus?.includes("Settled"),
  );
  const overdueAccounts = accounts.filter(
    (a: any) =>
      a.AccountStatus &&
      (a.AccountStatus.includes("past due") ||
        a.AccountStatus.includes("DPD") ||
        a.AccountStatus.includes("30+") ||
        a.AccountStatus.includes("60+") ||
        a.AccountStatus.includes("90+")),
  );

  return (
    <div className="space-y-4">
      {/* Credit Score Section - Enhanced */}
      {scoreDetails && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 text-[var(--color-on-surface)] flex items-center gap-2">
            <span className="text-lg">📊</span> Credit Score Details
          </h4>

          {/* Score Display */}
          <div className="bg-[var(--color-background)] p-4 rounded-lg shadow-sm mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-[var(--color-on-surface)] opacity-70 text-xs mb-1">
                  {scoreDetails.Name || scoreDetails.Type} Score
                </div>
                <div className="text-4xl font-bold text-[var(--color-primary)]">
                  {scoreDetails.Value}
                </div>
                {scoreDetails.Version && (
                  <div className="text-[var(--color-on-surface)] opacity-50 text-xs mt-1">
                    Version {scoreDetails.Version}
                  </div>
                )}
              </div>

              {/* Score Gauge Visual */}
              <div className="flex-1 max-w-md">
                <div className="h-8 bg-gradient-to-r from-[var(--color-error)] via-[var(--color-warning)] to-[var(--color-success)] rounded-full relative overflow-hidden">
                  <div
                    className="absolute top-0 h-full w-1 bg-[var(--color-background)] border-2 border-[var(--color-on-surface)] shadow-lg"
                    style={{
                      left: `${Math.min(
                        100,
                        Math.max(0, (parseInt(scoreDetails.Value) / 900) * 100),
                      )}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--color-on-surface)] opacity-60 mt-1">
                  <span>300</span>
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Excellent</span>
                  <span>900</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Elements / Factors */}
          {scoreDetails.ScoringElements &&
            scoreDetails.ScoringElements.length > 0 && (
              <div className="bg-[var(--color-background)] p-4 rounded-lg">
                <h5 className="font-semibold text-xs mb-3 text-[var(--color-on-surface)]">
                  Key Scoring Factors
                </h5>
                <div className="space-y-2">
                  {scoreDetails.ScoringElements.map(
                    (element: any, idx: number) => (
                      <div
                        key={`scoring-${element.code}-${idx}`}
                        className="flex items-start gap-3 p-2 bg-[var(--color-surface)] rounded"
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs text-[var(--color-on-surface)]">
                            {element.Description || "Factor"}
                          </div>
                          <div className="flex gap-2 mt-1 text-xs text-[var(--color-on-surface)] opacity-60">
                            {element.code && <span>Code: {element.code}</span>}
                            {element.type && (
                              <span>• Type: {element.type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Personal Information */}
      {(header || idAndContactInfo) && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {header?.ReportDate && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  Report Date:
                </span>
                <div>{new Date(header.ReportDate).toLocaleDateString()}</div>
              </div>
            )}
            {header?.DateOfBirth && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  Date of Birth:
                </span>
                <div>{new Date(header.DateOfBirth).toLocaleDateString()}</div>
              </div>
            )}
            {header?.Gender && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  Gender:
                </span>
                <div>{header.Gender}</div>
              </div>
            )}
            {idAndContactInfo?.IdentityInfo?.PANId && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  PAN:
                </span>
                <div>{extractPANId(idAndContactInfo.IdentityInfo.PANId)}</div>
              </div>
            )}
            {idAndContactInfo?.PhoneInfo && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  Phone:
                </span>
                <div>{extractPhoneNumber(idAndContactInfo.PhoneInfo)}</div>
              </div>
            )}
            {idAndContactInfo?.EmailAddressInfo && (
              <div>
                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                  Email:
                </span>
                <div className="truncate">
                  {extractEmail(idAndContactInfo.EmailAddressInfo)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employment Information */}
      {employmentInfo?.length > 0 && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">Employment Details</h4>
          <div className="space-y-2 text-xs">
            {employmentInfo.map((emp: any, idx: number) => (
              <div
                key={`emp-${emp.OccupationCode}-${emp.DateReported}-${idx}`}
                className="p-2 bg-[var(--color-background)] rounded"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {emp.OccupationCode && (
                    <div>
                      <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                        Occupation:
                      </span>
                      <div>{emp.OccupationCode}</div>
                    </div>
                  )}
                  {emp.Income && (
                    <div>
                      <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                        Income:
                      </span>
                      <div>{Conversion.formatCurrency(emp.Income)}</div>
                    </div>
                  )}
                  {emp.DateReported && (
                    <div>
                      <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                        Reported:
                      </span>
                      <div>
                        {new Date(emp.DateReported).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Accounts Summary */}
      {accounts?.length > 0 && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">
            Credit Accounts ({accounts.length})
          </h4>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-background)] sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">
                    Account Type
                  </th>
                  <th className="px-2 py-2 text-left font-medium">
                    Institution
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    Sanctioned Amount
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    Current Balance
                  </th>
                  <th className="px-2 py-2 text-center font-medium">Status</th>
                  <th className="px-2 py-2 text-center font-medium">
                    Payment Status
                  </th>
                  <th className="px-2 py-2 text-center font-medium">DPD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                {accounts.map((account: any, idx: number) => {
                  const isDpd = account.PaymentHistoryProfile?.DPD > 0;
                  const isActive =
                    account.AccountStatus === "Active" ||
                    account.AccountStatus === "11";

                  return (
                    <tr
                      key={`account-${account.AccountNumber || account.AccountType
                        }-${account.Institution}-${idx}`}
                      className="hover:bg-[var(--color-background)]"
                    >
                      <td className="px-2 py-2">
                        {account.AccountType || "N/A"}
                      </td>
                      <td className="px-2 py-2">
                        {account.Institution || "N/A"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Conversion.formatCurrency(account.HighCredit || 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Conversion.formatCurrency(account.CurrentBalance || 0)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${isActive
                            ? "bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)]"
                            : "bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)] opacity-70"
                            }`}
                        >
                          {account.AccountStatus || "Unknown"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {account.PaymentHistoryProfile?.PaymentStatus || "N/A"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`font-medium ${isDpd
                            ? "text-[var(--color-error)]"
                            : "text-[var(--color-success)]"
                            }`}
                        >
                          {account.PaymentHistoryProfile?.DPD || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Enquiries - Enhanced */}
      {enquiries?.length > 0 && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span>🔎</span> Recent Credit Enquiries ({enquiries.length})
          </h4>

          {/* Enquiry Purpose Mapping */}
          <div className="mb-3 p-2 bg-[var(--color-surface)] rounded text-xs">
            <div className="font-semibold mb-1 text-[var(--color-on-surface)]">
              Purpose Codes:
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[var(--color-on-surface)] opacity-80">
              <div>00 - Account Review</div>
              <div>05 - Tawarruq</div>
              <div>10 - Credit Card</div>
              <div>06 - Musharakah Mutanaqisah </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-background)] sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">
                    Date & Time
                  </th>
                  <th className="px-2 py-2 text-left font-medium">
                    Institution
                  </th>
                  <th className="px-2 py-2 text-left font-medium">Purpose</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2 text-center font-medium">
                    Days Ago
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                {enquiries.map((enq: any, idx: number) => {
                  const purposeMap: Record<string, string> = {
                    "00": "Account Review",
                    "05": "Personal Finance",
                    "06": "Housing Finance",
                    "10": "Credit Card",
                    "07": "Auto Loan",
                    "08": "SME Finance",
                  };

                  const daysAgo = enq.Date
                    ? Math.floor(
                      (new Date().getTime() - new Date(enq.Date).getTime()) /
                      (1000 * 60 * 60 * 24),
                    )
                    : null;

                  const isRecent = daysAgo !== null && daysAgo <= 30;

                  return (
                    <tr
                      key={`enquiry-${enq.Date}-${enq.Institution}-${enq.seq || idx
                        }`}
                      className={`hover:bg-[var(--color-background)] ${isRecent
                        ? "bg-[var(--color-warning)] bg-opacity-10"
                        : ""
                        }`}
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {enq.Date
                            ? new Date(enq.Date).toLocaleDateString()
                            : "N/A"}
                        </div>
                        {enq.Time && (
                          <div className="text-[var(--color-on-surface)] opacity-60">
                            {enq.Time}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium">
                          {enq.Institution || "N/A"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div>
                          <span className="font-medium">
                            {purposeMap[enq.RequestPurpose] ||
                              enq.RequestPurpose ||
                              enq.EnquiryPurpose ||
                              "N/A"}
                          </span>
                        </div>
                        {enq.RequestPurpose && (
                          <div className="text-[var(--color-on-surface)] opacity-60">
                            Code: {enq.RequestPurpose}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {(() => {
                          if (enq.Amount && parseFloat(enq.Amount) > 0) {
                            return Conversion.formatCurrency(enq.Amount);
                          }
                          if (
                            enq.EnquiryAmount &&
                            parseFloat(enq.EnquiryAmount) > 0
                          ) {
                            return Conversion.formatCurrency(enq.EnquiryAmount);
                          }
                          return "-";
                        })()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {daysAgo !== null && (
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium ${isRecent
                              ? "bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)]"
                              : "text-[var(--color-on-surface)] opacity-60"
                              }`}
                          >
                            {daysAgo === 0 ? "Today" : `${daysAgo}d`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
        <h4 className="font-semibold text-sm mb-3 text-[var(--color-on-surface)]">
          Account Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[var(--color-background)] p-3 rounded-lg">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Total Accounts
            </div>
            <div className="text-xl font-bold text-[var(--color-primary)]">
              {accounts.length}
            </div>
          </div>
          <div className="bg-[var(--color-background)] p-3 rounded-lg">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Active Accounts
            </div>
            <div className="text-xl font-bold text-[var(--color-success)]">
              {
                accounts.filter(
                  (a: any) =>
                    a.AccountStatus === "Active" || a.AccountStatus === "11",
                ).length
              }
            </div>
          </div>
          <div className="bg-[var(--color-background)] p-3 rounded-lg">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Total Exposure
            </div>
            <div className="text-xl font-bold text-[var(--color-primary)]">
              {Conversion.formatCurrency(accounts
                .reduce(
                  (sum: number, a: any) =>
                    sum + parseFloat((a.Balance || a.CurrentBalance || 0).toString().replace(/,/g, "")),
                  0,
                ))}
            </div>
          </div>
          <div className="bg-[var(--color-background)] p-3 rounded-lg">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Accounts with DPD
            </div>
            <div className="text-xl font-bold text-[var(--color-error)]">
              {
                accounts.filter(
                  (a: any) => (a.PaymentHistoryProfile?.DPD || 0) > 0,
                ).length
              }
            </div>
          </div>
        </div>
      </div>

      {/* Retail Accounts Summary - From Equifax */}
      {accountsSummary && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">
            Credit Profile Analytics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {accountsSummary.NoOfAccounts && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Total Accounts
                </div>
                <div className="text-lg font-bold">
                  {accountsSummary.NoOfAccounts}
                </div>
              </div>
            )}
            {accountsSummary.NoOfActiveAccounts && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Active Accounts
                </div>
                <div className="text-lg font-bold text-[var(--color-success)]">
                  {accountsSummary.NoOfActiveAccounts}
                </div>
              </div>
            )}
            {accountsSummary.NoOfWriteOffs &&
              parseInt(accountsSummary.NoOfWriteOffs) > 0 && (
                <div className="p-2 bg-[var(--color-error)] bg-opacity-10 rounded border border-[var(--color-error)] border-opacity-30">
                  <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                    Write-offs
                  </div>
                  <div className="text-lg font-bold text-[var(--color-on-error)]">
                    {accountsSummary.NoOfWriteOffs}
                  </div>
                </div>
              )}
            {accountsSummary.TotalBalanceAmount && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Total Balance
                </div>
                <div className="text-lg font-bold">
                  {Conversion.formatCurrency(accountsSummary.TotalBalanceAmount)}
                </div>
              </div>
            )}
            {accountsSummary.TotalSanctionAmount && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Total Sanctioned
                </div>
                <div className="text-lg font-bold">
                  {Conversion.formatCurrency(accountsSummary.TotalSanctionAmount)}
                </div>
              </div>
            )}
            {accountsSummary.TotalCreditLimit && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Credit Limit
                </div>
                <div className="text-lg font-bold">
                  {Conversion.formatCurrency(accountsSummary.TotalCreditLimit)}
                </div>
              </div>
            )}
            {accountsSummary.SingleHighestBalance && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Highest Balance
                </div>
                <div className="text-lg font-bold">
                  {Conversion.formatCurrency(accountsSummary.SingleHighestBalance)}
                </div>
              </div>
            )}
            {accountsSummary.AverageOpenBalance && (
              <div className="p-2 bg-[var(--color-background)] rounded">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Avg Balance
                </div>
                <div className="text-lg font-bold">
                  {Conversion.formatCurrency(accountsSummary.AverageOpenBalance)}
                </div>
              </div>
            )}
            {accountsSummary.OldestAccount && (
              <div className="p-2 bg-[var(--color-background)] rounded col-span-2">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Oldest Account
                </div>
                <div className="font-semibold">
                  {accountsSummary.OldestAccount}
                </div>
              </div>
            )}
            {accountsSummary.RecentAccount && (
              <div className="p-2 bg-[var(--color-background)] rounded col-span-2">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Recent Account
                </div>
                <div className="font-semibold">
                  {accountsSummary.RecentAccount}
                </div>
              </div>
            )}
            {accountsSummary.MostSevereStatusWithIn24Months && (
              <div className="p-2 bg-[var(--color-warning)] bg-opacity-10 rounded border border-[var(--color-warning)] border-opacity-30 col-span-full">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Most Severe Status (24 months)
                </div>
                <div className="font-bold text-[var(--color-on-warning)]">
                  {accountsSummary.MostSevereStatusWithIn24Months}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Indicators */}
      {(writeOffAccounts.length > 0 ||
        settledAccounts.length > 0 ||
        overdueAccounts.length > 0) && (
          <div className="bg-[var(--color-error)] bg-opacity-10 p-4 rounded-lg border-2 border-[var(--color-error)] border-opacity-30">
            <h4 className="font-semibold text-sm mb-3 text-[var(--color-on-error)] flex items-center gap-2">
              <span className="text-lg">⚠️</span> Risk Indicators
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {writeOffAccounts.length > 0 && (
                <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-error)] border-opacity-30">
                  <div className="text-[var(--color-error)] font-bold mb-2">
                    Write-offs: {writeOffAccounts.length}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {writeOffAccounts.map((acc: any, idx: number) => (
                      <div
                        key={`writeoff-${acc.seq || idx}`}
                        className="text-[var(--color-on-surface)] opacity-80"
                      >
                        • {acc.AccountType} - {Conversion.formatCurrency(acc.SanctionAmount || 0)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {settledAccounts.length > 0 && (
                <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-warning)] border-opacity-30">
                  <div className="text-[var(--color-warning)] font-bold mb-2">
                    Settled Accounts: {settledAccounts.length}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {settledAccounts.map((acc: any, idx: number) => (
                      <div
                        key={`settled-${acc.seq || idx}`}
                        className="text-[var(--color-on-surface)] opacity-80"
                      >
                        • {acc.AccountType} at {acc.Institution}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {overdueAccounts.length > 0 && (
                <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-error)] border-opacity-30">
                  <div className="text-[var(--color-error)] font-bold mb-2">
                    Overdue Accounts: {overdueAccounts.length}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {overdueAccounts.map((acc: any, idx: number) => (
                      <div
                        key={`overdue-${acc.seq || idx}`}
                        className="text-[var(--color-on-surface)] opacity-80"
                      >
                        • {acc.AccountType} - {acc.AccountStatus}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Account Type Distribution */}
      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
        <h4 className="font-semibold text-sm mb-3">Account Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2 bg-[var(--color-success)] bg-opacity-10 rounded">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Open Accounts
            </div>
            <div className="text-lg font-bold text-[var(--color-success)]">
              {openAccounts.length}
            </div>
          </div>
          <div className="p-2 bg-[var(--color-muted)] bg-opacity-20 rounded">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Closed Accounts
            </div>
            <div className="text-lg font-bold text-[var(--color-on-surface)] opacity-70">
              {closedAccounts.length}
            </div>
          </div>
          <div className="p-2 bg-[var(--color-background)] rounded">
            <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
              Account Types
            </div>
            <div className="text-lg font-bold">
              {new Set(accounts.map((a: any) => a.AccountType)).size}
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry Summary - Enhanced */}
      {enquirySummary && (
        <div className="bg-[var(--color-warning)] bg-opacity-10 p-4 rounded-lg border border-[var(--color-warning)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 text-[var(--color-on-warning)] flex items-center gap-2">
            <span className="text-lg">🔍</span> Credit Enquiry Summary
          </h4>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mb-4">
            {enquirySummary.Total && (
              <div className="p-3 bg-[var(--color-background)] rounded-lg shadow-sm">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Total Enquiries
                </div>
                <div className="text-2xl font-bold text-[var(--color-warning)]">
                  {enquirySummary.Total}
                </div>
              </div>
            )}
            {enquirySummary.Past30Days !== undefined && (
              <div
                className={`p-3 rounded-lg shadow-sm ${parseInt(enquirySummary.Past30Days) > 3
                  ? "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30"
                  : "bg-[var(--color-background)]"
                  }`}
              >
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Last 30 Days
                </div>
                <div
                  className={`text-2xl font-bold ${parseInt(enquirySummary.Past30Days) > 3
                    ? "text-[var(--color-error)]"
                    : "text-[var(--color-success)]"
                    }`}
                >
                  {enquirySummary.Past30Days}
                </div>
              </div>
            )}
            {enquirySummary.Past12Months && (
              <div className="p-3 bg-[var(--color-background)] rounded-lg shadow-sm">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Last 12 Months
                </div>
                <div className="text-2xl font-bold text-[var(--color-warning)]">
                  {enquirySummary.Past12Months}
                </div>
              </div>
            )}
            {enquirySummary.Past24Months && (
              <div className="p-3 bg-[var(--color-background)] rounded-lg shadow-sm">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Last 24 Months
                </div>
                <div className="text-2xl font-bold text-[var(--color-warning)]">
                  {enquirySummary.Past24Months}
                </div>
              </div>
            )}
            {enquirySummary.Recent && (
              <div className="p-3 bg-[var(--color-background)] rounded-lg shadow-sm">
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  Most Recent
                </div>
                <div className="text-xs font-bold text-[var(--color-warning)]">
                  {new Date(enquirySummary.Recent).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Additional Details */}
          {enquirySummary.Purpose && (
            <div className="bg-[var(--color-background)] p-3 rounded-lg text-xs">
              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                Enquiry Purpose:{" "}
              </span>
              <span className="font-semibold">{enquirySummary.Purpose}</span>
            </div>
          )}

          {/* Enquiry Interpretation */}
          <div className="mt-3 p-3 bg-[var(--color-surface)] rounded-lg text-xs">
            <div className="font-semibold text-[var(--color-on-surface)] mb-1">
              💡 What This Means:
            </div>
            <ul className="space-y-1 text-[var(--color-on-surface)] opacity-80 list-disc list-inside">
              {parseInt(enquirySummary.Past30Days || "0") > 3 && (
                <li className="text-[var(--color-error)] font-medium">
                  ⚠️ High recent enquiries ({enquirySummary.Past30Days} in last
                  30 days) may indicate credit hungry behavior
                </li>
              )}
              {parseInt(enquirySummary.Past30Days || "0") <= 2 && (
                <li className="text-[var(--color-success)]">
                  ✓ Low recent enquiries indicate responsible credit seeking
                  behavior
                </li>
              )}
              <li>
                Multiple enquiries in a short period may negatively impact
                credit score
              </li>
              <li>
                Total of {enquirySummary.Total} credit checks have been made on
                this profile
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      {recentActivities && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">
            Recent Credit Activities
          </h4>
          <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
            {Object.entries(recentActivities).map(
              ([key, value]: [string, any]) => (
                <div
                  key={key}
                  className="p-2 bg-[var(--color-background)] rounded flex justify-between"
                >
                  <span className="font-medium">
                    {key.replace(/([A-Z])/g, " $1").trim()}:
                  </span>
                  <span className="font-bold">{value}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Other Key Indicators */}
      {otherKeyInd && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">Additional Indicators</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {Object.entries(otherKeyInd).map(([key, value]: [string, any]) => (
              <div
                key={key}
                className="p-2 bg-[var(--color-background)] rounded"
              >
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="font-semibold">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const CirProV2ReportDisplay = ({
  reportData,
}: {
  readonly reportData: any;
}) => {
  const [securedLoansTab, setSecuredLoansTab] = useState<
    "Active" | "Closed" | "Delinquent" | "Settled" | "Write-Off"
  >("Active");
  const [unsecuredNonPaydayTab, setUnsecuredNonPaydayTab] = useState<
    "Active" | "Closed" | "Delinquent" | "Settled" | "Write-Off"
  >("Active");
  const [unsecuredPaydayTab, setUnsecuredPaydayTab] = useState<
    "Active" | "Closed" | "Delinquent" | "Settled" | "Write-Off"
  >("Active");

  const calculateEMI = (
    account: any,
  ): { emi: number; isAssumedEMI: boolean; description: string } => {
    try {
      const disbursedAmount = parseFloat(
        account["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
      );

      const currentBalance = parseFloat(
        account["CURRENT-BAL"]?.replace(/,/g, "") || "0",
      );

      const monthlyPayment = account["MONTHLY-PAYMENT"]
        ? parseFloat(account["MONTHLY-PAYMENT"]?.replace(/,/g, "") || "0")
        : null;

      const acctType = (account["ACCT-TYPE"] || "").toUpperCase();

      /** ------------------------------
     * RULE 1: USE ACTUAL EMI
     --------------------------------*/
      if (monthlyPayment && monthlyPayment > disbursedAmount * 0.25) {
        return {
          emi: monthlyPayment,
          isAssumedEMI: false,
          description: "Mentioned EMI (EMI > 25% of loan amount)",
        };
      }

      if (monthlyPayment && monthlyPayment > 0) {
        return {
          emi: monthlyPayment,
          isAssumedEMI: false,
          description: "Mentioned EMI",
        };
      }

      /** ------------------------------
     * ASSUMED EMI RULES (INDIA)
     --------------------------------*/
      let assumedRate = 0;
      let loanTypeLabel = "";

      // 🏠 HOME / PROPERTY / LAP
      if (
        acctType.includes("HOME") ||
        acctType.includes("HOUSING") ||
        acctType.includes("PROPERTY") ||
        acctType.includes("LAP") ||
        acctType.includes("MORTGAGE")
      ) {
        loanTypeLabel = "Home / Property Loan";
        assumedRate = 0.008;

        // 🚗 VEHICLE
      } else if (
        acctType.includes("AUTO") ||
        acctType.includes("CAR") ||
        acctType.includes("TWO WHEELER") ||
        acctType.includes("TRACTOR") ||
        acctType.includes("COMMERCIAL VEHICLE")
      ) {
        loanTypeLabel = "Auto Finance";
        assumedRate = 0.015;

        // 🪙 GOLD
      } else if (acctType.includes("GOLD")) {
        loanTypeLabel = "Gold-backed";
        assumedRate = 0.02;

        // 🎓 EDUCATION
      } else if (acctType.includes("EDUCATION")) {
        loanTypeLabel = "Student Finance";
        assumedRate = 0.01;

        // 🏢 BUSINESS SECURED
      } else if (
        acctType.includes("BUSINESS") &&
        acctType.includes("SECURED")
      ) {
        loanTypeLabel = "SME Finance - Secured";
        assumedRate = 0.025;

        // 🏢 BUSINESS UNSECURED
      } else if (acctType.includes("BUSINESS")) {
        loanTypeLabel = "SME Finance - Unsecured";
        assumedRate = 0.04;

        // 👨‍💼 PROFESSIONAL
      } else if (
        acctType.includes("PROFESSIONAL") ||
        acctType.includes("DOCTOR") ||
        acctType.includes("CA")
      ) {
        loanTypeLabel = "Professional Loan";
        assumedRate = 0.035;

        // 🧾 PERSONAL 
      } else if (acctType.includes("PERSONAL")) {
        loanTypeLabel = "Personal Finance";
        assumedRate = 0.04;

        // 🛒 CONSUMER DURABLE
      } else if (
        acctType.includes("CONSUMER") ||
        acctType.includes("DURABLE")
      ) {
        loanTypeLabel = "Consumer Durable Loan";
        assumedRate = 0.05;

        // 💳 CREDIT CARD / OD / CC / BNPL
      } else if (
        acctType.includes("CREDIT CARD") ||
        acctType.includes("CARD") ||
        acctType.includes("OD") ||
        acctType.includes("OVERDRAFT") ||
        acctType.includes("CASH CREDIT") ||
        acctType.includes("BNPL")
      ) {
        const emi = currentBalance * 0.05;

        return {
          emi,
          isAssumedEMI: true,
          description: "Assumed EMI (5% of outstanding balance)",
        };

        // 🧑‍🌾 KISAN CREDIT CARD
      } else if (acctType.includes("KISAN")) {
        loanTypeLabel = "Kisan Credit Card";
        assumedRate = 0.02;

        // 🤝 MICROFINANCE
      } else if (
        acctType.includes("MFI") ||
        acctType.includes("MICRO") ||
        acctType.includes("SHG") ||
        acctType.includes("JLG")
      ) {
        loanTypeLabel = "Microfinance Loan";
        assumedRate = 0.06;

        // 🔚 DEFAULT FALLBACK (VERY IMPORTANT)
      } else {
        loanTypeLabel = "Unknown Loan Type";
        assumedRate = 0.03; // ✅ default 3%
      }

      const assumedEMI = disbursedAmount * assumedRate;

      return {
        emi: assumedEMI,
        isAssumedEMI: true,
        description: `Assumed EMI (${loanTypeLabel}, ${assumedRate * 100}% monthly)`,
      };
    } catch (error) {
      return {
        emi: 0,
        isAssumedEMI: true,
        description: "Error calculating EMI",
      };
    }
  };

  if (!reportData?.["CIR-REPORT-FILE"]?.["REPORT-DATA"]) {
    return (
      <div className="text-xs text-[var(--color-on-surface)] opacity-70">
        No CIR Pro V2 report data available
      </div>
    );
  }

  const reportFile = reportData["CIR-REPORT-FILE"]["REPORT-DATA"];
  const standardData = reportFile["STANDARD-DATA"];
  const accountsSummary = reportFile["ACCOUNTS-SUMMARY"];
  const headerSegment = reportData["HEADER-SEGMENT"];

  // Extract key sections
  const score = standardData?.SCORE?.[0];
  const tradelines = standardData?.TRADELINES || [];
  const inquiryHistory = standardData?.["INQUIRY-HISTORY"] || [];
  const demogs = standardData?.DEMOGS;
  const primarySummary = accountsSummary?.["PRIMARY-ACCOUNTS-SUMMARY"];
  const additionalSummary = accountsSummary?.["ADDITIONAL-SUMMARY"] || [];

  // Calculate analytics
  const overdueAccounts = tradelines.filter(
    (t: any) =>
      parseFloat(t["OVERDUE-AMT"]?.replace(/,/g, "") || "0") > 0 ||
      t.HISTORY?.[0]?.VALUES?.includes("900") ||
      t.HISTORY?.[0]?.VALUES?.includes("030") ||
      t.HISTORY?.[0]?.VALUES?.includes("060") ||
      t.HISTORY?.[0]?.VALUES?.includes("090"),
  );

  const totalOverdueAmount = tradelines.reduce((sum: number, t: any) => {
    const overdue = t["OVERDUE-AMT"]?.replace(/,/g, "") || "0";
    return sum + parseFloat(overdue);
  }, 0);

  // Recent inquiries (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentInquiries = inquiryHistory.filter((inq: any) => {
    if (!inq["INQUIRY-DT"]) return false;
    const inquiryDate = new Date(
      inq["INQUIRY-DT"].split("-").reverse().join("-"),
    );
    return inquiryDate >= thirtyDaysAgo;
  });

  // Separate loans by Security Status
  const securedLoans = tradelines.filter(
    (t: any) => t["SECURITY-STATUS"]?.toUpperCase() === "SECURED",
  );

  const unsecuredLoans = tradelines.filter(
    (t: any) => t["SECURITY-STATUS"]?.toUpperCase() !== "SECURED",
  );

  // Separate unsecured loans into payday and non-payday
  // Credit Cards are always payday, OR unsecured loans with disbursed amount < 100,000
  const unsecuredPaydayLoans = unsecuredLoans.filter((t: any) => {
    const acctType = (t["ACCT-TYPE"] || "").toUpperCase();
    const isCreditCard = acctType.includes("CREDIT CARD") || acctType.includes("CARD") || acctType.includes("CC");
    if (isCreditCard) return true; // Credit cards are always payday
    const disbursedAmount = parseFloat(
      t["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
    );
    return disbursedAmount < 500;
  });

  const unsecuredNonPaydayLoans = unsecuredLoans.filter((t: any) => {
    const acctType = (t["ACCT-TYPE"] || "").toUpperCase();
    const isCreditCard = acctType.includes("CREDIT CARD") || acctType.includes("CARD") || acctType.includes("CC");
    if (isCreditCard) return false; // Credit cards are never non-payday
    const disbursedAmount = parseFloat(
      t["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
    );
    return disbursedAmount >= 500;
  });
  return (
    <div className="space-y-4">
      {/* Quick Credit Profile Summary */}
      <div className="">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          Credit Profile Summary
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="bg-surface text-on-surface bg-opacity-20 rounded-lg p-3">
            <div className="text-2xl font-bold">{score?.VALUE || "N/A"}</div>
            <div className="text-xs opacity-90">Credit Score</div>
          </div>

          <div className="bg-surface text-on-surface bg-opacity-20 rounded-lg p-3">
            <div className="text-2xl font-bold">{tradelines.length}</div>
            <div className="text-xs opacity-90">Total Accounts</div>
          </div>

          <div className="bg-surface text-on-surface bg-opacity-20 rounded-lg p-3">
            <div className="text-2xl font-bold">{overdueAccounts.length}</div>
            <div className="text-xs opacity-90">Overdue Accounts</div>
          </div>

          <div className="bg-surface text-on-surface bg-opacity-20 rounded-lg p-3">
            <div className="text-2xl font-bold">{recentInquiries.length}</div>
            <div className="text-xs opacity-90">Recent Inquiries</div>
          </div>
        </div>
      </div>

      {/* Header Information */}
      {headerSegment && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Report Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                Report ID:
              </span>
              <div className="font-mono text-xs">
                {headerSegment["REPORT-ID"]}
              </div>
            </div>
            <div>
              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                Date of Issue:
              </span>
              <div>{headerSegment["DATE-OF-ISSUE"]}</div>
            </div>
            <div>
              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                Product Type:
              </span>
              <div>
                {headerSegment["PRODUCT-TYPE"]} v{headerSegment["PRODUCT-VER"]}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Credit Score Section */}
      {score && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Credit Score - {score.NAME}
          </h4>
          <div className="bg-[var(--color-background)] p-4 rounded-lg shadow-sm mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-4xl font-bold text-[var(--color-primary)]">
                  {score.VALUE}
                </div>
                <div className="text-[var(--color-on-surface)] opacity-50 text-xs mt-1">
                  {score.NAME}
                </div>
              </div>
              {/* Score interpretation */}
              <div className="flex-1 max-w-md">
                <div className="text-xs text-[var(--color-on-surface)] opacity-80 mb-2">
                  Score Range: 300-900
                </div>
                <div className="h-6 bg-gradient-to-r from-[var(--color-error)] via-[var(--color-warning)] to-[var(--color-success)] rounded-full relative">
                  <div
                    className="absolute top-0 h-full w-1 bg-[var(--color-background)] border-2 border-[var(--color-on-surface)] shadow-lg"
                    style={{
                      left: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((parseInt(score.VALUE) - 300) / 600) * 100,
                        ),
                      )}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--color-on-surface)] opacity-60 mt-1">
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Factors */}
          {score.FACTORS && score.FACTORS.length > 0 && (
            <div className="bg-[var(--color-background)] p-4 rounded-lg">
              <h5 className="font-semibold text-xs mb-3">
                Key Scoring Factors
              </h5>
              <div className="space-y-2">
                {score.FACTORS.map((factor: any, idx: number) => (
                  <div
                    key={`factor-${factor.TYPE}-${idx}`}
                    className="flex items-start gap-3 p-2 bg-[var(--color-surface)] rounded"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-xs">{factor.DESC}</div>
                      <div className="text-xs text-[var(--color-on-surface)] opacity-60 mt-1">
                        Code: {factor.TYPE}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Account Summary Statistics */}
      {primarySummary && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Account Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[var(--color-background)] p-3 rounded-lg">
              <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                Total Accounts
              </div>
              <div className="text-xl font-bold text-[var(--color-primary)]">
                {primarySummary["NUMBER-OF-ACCOUNTS"]}
              </div>
            </div>
            <div className="bg-[var(--color-background)] p-3 rounded-lg">
              <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                Active Accounts
              </div>
              <div className="text-xl font-bold text-[var(--color-success)]">
                {primarySummary["ACTIVE-ACCOUNTS"]}
              </div>
            </div>
            <div className="bg-[var(--color-background)] p-3 rounded-lg">
              <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                Total Balance
              </div>
              <div className="text-xl font-bold text-[var(--color-primary)]">
                {Conversion.formatCurrency(primarySummary["TOTAL-CURRENT-BALANCE"] || "0")}
              </div>
            </div>
            <div className="bg-[var(--color-background)] p-3 rounded-lg">
              <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                Overdue Accounts
              </div>
              <div className="text-xl font-bold text-[var(--color-error)]">
                {primarySummary["OVERDUE-ACCOUNTS"]}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Loan Category Summary Table */}
      <div className="">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          Loan Portfolio Summary (Active Accounts)
        </h4>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <table className="w-full text-xs">
            <thead className=" bg-opacity-10">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-center font-semibold border-l border-[var(--color-muted)] border-opacity-30">
                  Active Accounts
                </th>
                <th className="px-4 py-2 text-center font-semibold border-l border-[var(--color-muted)] border-opacity-30">
                  Disbursed Amount
                </th>
                <th className="px-4 py-2 text-center font-semibold border-l border-[var(--color-muted)] border-opacity-30">
                  Current Balance
                </th>
                <th className="px-4 py-2 text-center font-semibold border-l border-[var(--color-muted)] border-opacity-30">
                  Overdue Amount
                </th>
                <th className="px-4 py-2 text-center font-semibold border-l border-[var(--color-muted)] border-opacity-30">
                  Total EMI
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Secured Loans Row */}
              <tr className="border-t border-[var(--color-muted)] border-opacity-20">
                <td className="px-4 py-2 font-medium text-[var(--color-on-surface)]">
                  Secured Loans
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {
                    securedLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length
                  }
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(securedLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active").reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(securedLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30">
                  <span className="text-[var(--color-error)]">
                    {Conversion.formatCurrency(securedLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ))}
                  </span>
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(securedLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) => sum + calculateEMI(l).emi,
                      0,
                    ))}
                </td>
              </tr>

              {/* Unsecured - Non-Payday Row */}
              <tr className="border-t border-[var(--color-muted)] border-opacity-20">
                <td className="px-4 py-2 font-medium text-[var(--color-on-surface)]">
                  Unsecured - Non-Payday (≥ BHD 500)
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {
                    unsecuredNonPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length
                  }
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredNonPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredNonPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30">
                  <span className="text-[var(--color-error)]">
                    {Conversion.formatCurrency(unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ))}
                  </span>
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredNonPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) => sum + calculateEMI(l).emi,
                      0,
                    ))}
                </td>
              </tr>

              {/* Unsecured - Payday Row */}
              <tr className="border-t border-[var(--color-muted)] border-opacity-20">
                <td className="px-4 py-2 font-medium text-[var(--color-on-surface)]">
                  Unsecured - Payday (&lt; BHD 500)
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {
                    unsecuredPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length
                  }
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["CURRENT-BAL"]?.replace(/RP/g, "") || "0", // Corrected typo in original code if it was there, or just keeping match
                        ),
                      0,
                    ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30">
                  <span className="text-[var(--color-error)]">
                    {Conversion.formatCurrency(unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ))}
                  </span>
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(unsecuredPaydayLoans
                    .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                    .reduce(
                      (sum: number, l: any) =>
                        sum +
                        parseFloat(
                          l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                        ),
                      0,
                    ))}
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr className="border-t-2 border-[var(--color-muted)] border-opacity-40 bg-[var(--color-surface)] font-bold">
                <td className="px-4 py-2 font-bold text-[var(--color-on-surface)]">
                  Grand Total
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 font-bold text-[var(--color-on-surface)]">
                  {securedLoans.filter(
                    (t: any) => t["ACCOUNT-STATUS"] === "Active",
                  ).length +
                    unsecuredNonPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length +
                    unsecuredPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 font-bold text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(Math.round(
                    securedLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ) +
                    unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ) +
                    unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ),
                  ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 font-bold text-[var(--color-on-surface)]">
                  {Conversion.formatCurrency(Math.round(
                    securedLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ) +
                    unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ) +
                    unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ),
                  ))}
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30">
                  <span className="font-bold text-[var(--color-error)]">
                    {Conversion.formatCurrency(Math.round(
                      securedLoans
                        .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                        .reduce(
                          (sum: number, l: any) =>
                            sum +
                            parseFloat(
                              l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ),
                          0,
                        ) +
                      unsecuredNonPaydayLoans
                        .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                        .reduce(
                          (sum: number, l: any) =>
                            sum +
                            parseFloat(
                              l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ),
                          0,
                        ) +
                      unsecuredPaydayLoans
                        .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                        .reduce(
                          (sum: number, l: any) =>
                            sum +
                            parseFloat(
                              l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ),
                          0,
                        ),
                    ))}
                  </span>
                </td>
                <td className="px-4 py-2 text-center border-l border-[var(--color-muted)] border-opacity-30 font-bold text-[var(--color-on-surface)]">

                  {Math.round(
                    securedLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) => sum + calculateEMI(l).emi,
                        0,
                      ) +
                    unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) => sum + calculateEMI(l).emi,
                        0,
                      ) +
                    unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .reduce(
                        (sum: number, l: any) =>
                          sum +
                          parseFloat(
                            l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                          ),
                        0,
                      ),
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Account Details Table - Separated by Security Status and Loan Type */}
      {/* Secured Loans - Tabbed View */}
      {securedLoans.length > 0 && (
        <div className="bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">Secured Loans</h4>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-[var(--color-muted)] border-opacity-20">
            {(
              [
                "Active",
                "Closed",
                "Delinquent",
                "Settled",
                "Write-Off",
              ] as const
            ).map((status) => {
              const count =
                status === "Delinquent"
                  ? securedLoans.filter((t: any) => {
                    const history = t.HISTORY?.[0];
                    return (
                      history?.VALUES?.includes("900") ||
                      history?.VALUES?.includes("030") ||
                      history?.VALUES?.includes("060") ||
                      history?.VALUES?.includes("090")
                    );
                  }).length
                  : status === "Settled"
                    ? securedLoans.filter((t: any) =>
                      t["ACCOUNT-STATUS"]?.includes("Settled"),
                    ).length
                    : status === "Write-Off"
                      ? securedLoans.filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      ).length
                      : securedLoans.filter(
                        (t: any) => t["ACCOUNT-STATUS"] === status,
                      ).length;

              if (count === 0) return null;

              const statusColors = {
                Active: "bg-[var(--color-success)]",
                Closed: "bg-[var(--color-muted)]",
                Delinquent: "bg-[var(--color-error)]",
                Settled: "bg-[var(--color-warning)]",
                "Write-Off": "bg-[var(--color-error)]",
              };

              return (
                <button
                  key={status}
                  onClick={() => setSecuredLoansTab(status)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${securedLoansTab === status
                    ? `${statusColors[status]} bg-opacity-20 border-b-2 ${statusColors[status]}`
                    : "text-[var(--color-on-surface)] opacity-60 hover:opacity-80"
                    }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {securedLoansTab === "Active" &&
            securedLoans.filter((t: any) => t["ACCOUNT-STATUS"] === "Active").length > 0 && (
              <div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs ">
                    <thead className="bg-[var(--color-success)] bg-opacity-10 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">
                          Account Type
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Security Status
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Disburser Date
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Lender
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Disbursed Amount
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Current Balance
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Overdue Amount
                        </th>
                        <th
                          className="px-2 py-2 text-right font-medium tooltip"
                          title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                        >
                          EMI
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Status
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Payment History
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Reported Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {securedLoans
                        .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                        .map((account: any, idx: number) => {
                          const isOverdue =
                            parseFloat(
                              account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ) > 0;
                          const history = account.HISTORY?.[0];
                          const hasDelinquency =
                            history?.VALUES?.includes("900") ||
                            history?.VALUES?.includes("030") ||
                            history?.VALUES?.includes("060") ||
                            history?.VALUES?.includes("090");

                          return (
                            <tr
                              key={`secured-active-${account["ACCT-NUMBER"]}-${idx}`}
                              className="hover:bg-[var(--color-success)] hover:bg-opacity-5"
                            >
                              <td className="px-2 py-2">
                                {account["ACCT-TYPE"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["SECURITY-STATUS"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["DISBURSED-DT"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["CREDIT-GRANTOR"] || "N/A"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isOverdue && (
                                  <span className="text-[var(--color-error)] font-medium">
                                    {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(
                                      /,/g,
                                      "",
                                    ) || "0",)}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <span className="text-[var(--color-success)]">
                                    {Conversion.formatCurrency(0)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center group relative">
                                <span className="cursor-help">
                                  {Conversion.formatCurrency(calculateEMI(account).emi)}
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {calculateEMI(account).description}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)]">
                                  {account["ACCOUNT-STATUS"] || "Unknown"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                {(() => {
                                  if (hasDelinquency) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                        Delinquent
                                      </span>
                                    );
                                  }
                                  if (history) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                        Regular
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[var(--color-on-surface)] opacity-60">
                                      N/A
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                                {account["REPORTED-DT"] || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Total Row */}
                      {securedLoans.filter(
                        (t: any) => t["ACCOUNT-STATUS"] === "Active",
                      ).length > 0 && (
                          <tr className="bg-[var(--color-success)] bg-opacity-10 font-bold border-t-2 border-[var(--color-success)] border-opacity-30">
                            <td colSpan={4} className="px-2 py-2 text-center">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Active",
                                ).reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                      "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Active",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Active",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Active",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum + calculateEMI(l).emi,
                                  0,
                                ))}
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-center">
                              -
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Closed Tab */}
          {securedLoansTab === "Closed" &&
            securedLoans.filter((t: any) => t["ACCOUNT-STATUS"] === "Closed")
              .length > 0 && (
              <div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs ">
                    <thead className="bg-[var(--color-muted)] bg-opacity-10 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">
                          Account Type
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Security Status
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Disburser Date
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Lender
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Disbursed Amount
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Current Balance
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Overdue Amount
                        </th>
                        <th
                          className="px-2 py-2 text-right font-medium tooltip"
                          title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                        >
                          EMI
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Status
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Payment History
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Reported Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {securedLoans
                        .filter((t: any) => t["ACCOUNT-STATUS"] === "Closed")
                        .map((account: any, idx: number) => {
                          const isOverdue =
                            parseFloat(
                              account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ) > 0;
                          const history = account.HISTORY?.[0];
                          const hasDelinquency =
                            history?.VALUES?.includes("900") ||
                            history?.VALUES?.includes("030") ||
                            history?.VALUES?.includes("060") ||
                            history?.VALUES?.includes("090");

                          return (
                            <tr
                              key={`secured-closed-${account["ACCT-NUMBER"]}-${idx}`}
                              className="hover:bg-[var(--color-muted)] hover:bg-opacity-5"
                            >
                              <td className="px-2 py-2">
                                {account["ACCT-TYPE"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["SECURITY-STATUS"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["DISBURSED-DT"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["CREDIT-GRANTOR"] || "N/A"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isOverdue && (
                                  <span className="text-[var(--color-error)] font-medium">
                                    {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(
                                      /,/g,
                                      "",
                                    ) || "0",)}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <span className="text-[var(--color-success)]">
                                    {Conversion.formatCurrency(0)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center group relative">
                                <span className="cursor-help">
                                  {Conversion.formatCurrency(calculateEMI(account).emi)}
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {calculateEMI(account).description}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)]">
                                  {account["ACCOUNT-STATUS"] || "Unknown"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                {(() => {
                                  if (hasDelinquency) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                        Delinquent
                                      </span>
                                    );
                                  }
                                  if (history) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                        Regular
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[var(--color-on-surface)] opacity-60">
                                      N/A
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                                {account["REPORTED-DT"] || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Total Row */}
                      {securedLoans.filter(
                        (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                      ).length > 0 && (
                          <tr className="bg-[var(--color-muted)] bg-opacity-10 font-bold border-t-2 border-[var(--color-muted)] border-opacity-30">
                            <td colSpan={4} className="px-2 py-2 text-center">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                      "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                    ),
                                  0,
                                ))}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(securedLoans
                                .filter(
                                  (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                                )
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum + calculateEMI(l).emi,
                                  0,
                                ))}
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-center">
                              -
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Delinquent Tab */}
          {securedLoansTab === "Delinquent" &&
            securedLoans.filter((t: any) => {
              const history = t.HISTORY?.[0];
              return (
                history?.VALUES?.includes("900") ||
                history?.VALUES?.includes("030") ||
                history?.VALUES?.includes("060") ||
                history?.VALUES?.includes("090")
              );
            }).length > 0 && (
              <div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs ">
                    <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">
                          Account Type
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Security Status
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Disburser Date
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Lender
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Disbursed Amount
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Current Balance
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Overdue Amount
                        </th>
                        <th
                          className="px-2 py-2 text-right font-medium tooltip"
                          title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                        >
                          EMI
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Status
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Payment History
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Reported Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {securedLoans
                        .filter((t: any) => {
                          const history = t.HISTORY?.[0];
                          return (
                            history?.VALUES?.includes("900") ||
                            history?.VALUES?.includes("030") ||
                            history?.VALUES?.includes("060") ||
                            history?.VALUES?.includes("090")
                          );
                        })
                        .map((account: any, idx: number) => {
                          const isOverdue =
                            parseFloat(
                              account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ) > 0;

                          return (
                            <tr
                              key={`secured-delinquent-${account["ACCT-NUMBER"]}-${idx}`}
                              className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                            >
                              <td className="px-2 py-2">
                                {account["ACCT-TYPE"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["SECURITY-STATUS"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["DISBURSED-DT"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["CREDIT-GRANTOR"] || "N/A"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isOverdue && (
                                  <span className="text-[var(--color-error)] font-medium">
                                    {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(
                                      /,/g,
                                      "",
                                    ) || "0",)}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <span className="text-[var(--color-success)]">
                                    {Conversion.formatCurrency(0)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center group relative">
                                <span className="cursor-help">
                                  {Conversion.formatCurrency(calculateEMI(account).emi)}
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {calculateEMI(account).description}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                  {account["ACCOUNT-STATUS"] || "Unknown"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              </td>
                              <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                                {account["REPORTED-DT"] || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Total Row */}
                      {securedLoans.filter((t: any) => {
                        const history = t.HISTORY?.[0];
                        return (
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090")
                        );
                      }).length > 0 && (
                          <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                            <td colSpan={4} className="px-2 py-2 text-center">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-center">

                              {securedLoans
                                .filter((t: any) => {
                                  const history = t.HISTORY?.[0];
                                  return (
                                    history?.VALUES?.includes("900") ||
                                    history?.VALUES?.includes("030") ||
                                    history?.VALUES?.includes("060") ||
                                    history?.VALUES?.includes("090")
                                  );
                                })
                                .reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                      "0",
                                    ),
                                  0,
                                )}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) => {
                                const history = t.HISTORY?.[0];
                                return (
                                  history?.VALUES?.includes("900") ||
                                  history?.VALUES?.includes("030") ||
                                  history?.VALUES?.includes("060") ||
                                  history?.VALUES?.includes("090")
                                );
                              }).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) => {
                                const history = t.HISTORY?.[0];
                                return (
                                  history?.VALUES?.includes("900") ||
                                  history?.VALUES?.includes("030") ||
                                  history?.VALUES?.includes("060") ||
                                  history?.VALUES?.includes("090")
                                );
                              }).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) => {
                                const history = t.HISTORY?.[0];
                                return (
                                  history?.VALUES?.includes("900") ||
                                  history?.VALUES?.includes("030") ||
                                  history?.VALUES?.includes("060") ||
                                  history?.VALUES?.includes("090")
                                );
                              }).reduce(
                                (sum: number, l: any) =>
                                  sum + calculateEMI(l).emi,
                                0,
                              ))}
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-center">
                              -
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Settled Tab */}
          {securedLoansTab === "Settled" &&
            securedLoans.filter((t: any) =>
              t["ACCOUNT-STATUS"]?.includes("Settled"),
            ).length > 0 && (
              <div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs ">
                    <thead className="bg-[var(--color-warning)] bg-opacity-10 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">
                          Account Type
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Security Status
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Disburser Date
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Lender
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Disbursed Amount
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Current Balance
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Overdue Amount
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Status
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Payment History
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Reported Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {securedLoans
                        .filter((t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Settled"),
                        )
                        .map((account: any, idx: number) => {
                          const isOverdue =
                            parseFloat(
                              account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ) > 0;
                          const history = account.HISTORY?.[0];
                          const hasDelinquency =
                            history?.VALUES?.includes("900") ||
                            history?.VALUES?.includes("030") ||
                            history?.VALUES?.includes("060") ||
                            history?.VALUES?.includes("090");

                          return (
                            <tr
                              key={`secured-settled-${account["ACCT-NUMBER"]}-${idx}`}
                              className="hover:bg-[var(--color-warning)] hover:bg-opacity-5"
                            >
                              <td className="px-2 py-2">
                                {account["ACCT-TYPE"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["SECURITY-STATUS"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["DISBURSED-DT"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["CREDIT-GRANTOR"] || "N/A"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isOverdue && (
                                  <span className="text-[var(--color-error)] font-medium">
                                    {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(
                                      /,/g,
                                      "",
                                    ) || "0",)}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <span className="text-[var(--color-success)]">
                                    {Conversion.formatCurrency(0)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)]">
                                  {account["ACCOUNT-STATUS"] || "Unknown"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                {(() => {
                                  if (hasDelinquency) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                        Delinquent
                                      </span>
                                    );
                                  }
                                  if (history) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                        Regular
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[var(--color-on-surface)] opacity-60">
                                      N/A
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                                {account["REPORTED-DT"] || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Total Row */}
                      {securedLoans.filter((t: any) =>
                        t["ACCOUNT-STATUS"]?.includes("Settled"),
                      ).length > 0 && (
                          <tr className="bg-[var(--color-warning)] bg-opacity-10 font-bold border-t-2 border-[var(--color-warning)] border-opacity-30">
                            <td colSpan={4} className="px-2 py-2 text-center">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-center">

                              {securedLoans
                                .filter((t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Settled"),
                                ).reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                      "0",
                                    ),
                                  0,
                                )}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Settled"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Settled"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter((t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Settled"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum + calculateEMI(l).emi,
                                0,
                              ))}
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-center">
                              -
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Write-Off Tab */}
          {securedLoansTab === "Write-Off" &&
            securedLoans.filter(
              (t: any) =>
                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                t["ACCOUNT-STATUS"]?.includes("WOF"),
            ).length > 0 && (
              <div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs ">
                    <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">
                          Account Type
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Security Status
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Disburser Date
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Lender
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Disbursed Amount
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Current Balance
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Overdue Amount
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Status
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Payment History
                        </th>
                        <th className="px-2 py-2 text-center font-medium">
                          Reported Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {securedLoans
                        .filter(
                          (t: any) =>
                            t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                            t["ACCOUNT-STATUS"]?.includes("WOF"),
                        )
                        .map((account: any, idx: number) => {
                          const isOverdue =
                            parseFloat(
                              account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                            ) > 0;
                          const history = account.HISTORY?.[0];
                          const hasDelinquency =
                            history?.VALUES?.includes("900") ||
                            history?.VALUES?.includes("030") ||
                            history?.VALUES?.includes("060") ||
                            history?.VALUES?.includes("090");

                          return (
                            <tr
                              key={`secured-writeoff-${account["ACCT-NUMBER"]}-${idx}`}
                              className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                            >
                              <td className="px-2 py-2">
                                {account["ACCT-TYPE"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["SECURITY-STATUS"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["DISBURSED-DT"] || "N/A"}
                              </td>
                              <td className="px-2 py-2">
                                {account["CREDIT-GRANTOR"] || "N/A"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                  "0",)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isOverdue && (
                                  <span className="text-[var(--color-error)] font-medium">
                                    {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(
                                      /,/g,
                                      "",
                                    ) || "0",)}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <span className="text-[var(--color-success)]">
                                    {Conversion.formatCurrency(0)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                  {account["ACCOUNT-STATUS"] || "Unknown"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                {(() => {
                                  if (hasDelinquency) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                        Delinquent
                                      </span>
                                    );
                                  }
                                  if (history) {
                                    return (
                                      <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                        Regular
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-[var(--color-on-surface)] opacity-60">
                                      N/A
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                                {account["REPORTED-DT"] || "N/A"}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Total Row */}
                      {securedLoans.filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      ).length > 0 && (
                          <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                            <td colSpan={4} className="px-2 py-2 text-center">
                              TOTAL
                            </td>
                            <td className="px-2 py-2 text-center">

                              {securedLoans
                                .filter(
                                  (t: any) =>
                                    t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                    t["ACCOUNT-STATUS"]?.includes("WOF"),
                                ).reduce(
                                  (sum: number, l: any) =>
                                    sum +
                                    parseFloat(
                                      l["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                      "0",
                                    ),
                                  0,
                                )}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter(
                                (t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                  t["ACCOUNT-STATUS"]?.includes("WOF"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter(
                                (t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                  t["ACCOUNT-STATUS"]?.includes("WOF"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              ))}
                            </td>
                            <td className="px-2 py-2 text-center">

                              {Conversion.formatCurrency(securedLoans.filter(
                                (t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                  t["ACCOUNT-STATUS"]?.includes("WOF"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum + calculateEMI(l).emi,
                                0,
                              ))}
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-center">
                              -
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Unsecured - Non-Payday Loans - Tabbed View */}
      {unsecuredNonPaydayLoans.length > 0 && (
        <div className="bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">
            Unsecured - Non-Payday (≥100k)
          </h4>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-[var(--color-muted)] border-opacity-20">
            {(
              [
                "Active",
                "Closed",
                "Delinquent",
                "Settled",
                "Write-Off",
              ] as const
            ).map((status) => {
              const count =
                status === "Delinquent"
                  ? unsecuredNonPaydayLoans.filter((t: any) => {
                    const history = t.HISTORY?.[0];
                    return (
                      history?.VALUES?.includes("900") ||
                      history?.VALUES?.includes("030") ||
                      history?.VALUES?.includes("060") ||
                      history?.VALUES?.includes("090")
                    );
                  }).length
                  : status === "Settled"
                    ? unsecuredNonPaydayLoans.filter((t: any) =>
                      t["ACCOUNT-STATUS"]?.includes("Settled"),
                    ).length
                    : status === "Write-Off"
                      ? unsecuredNonPaydayLoans.filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      ).length
                      : unsecuredNonPaydayLoans.filter(
                        (t: any) => t["ACCOUNT-STATUS"] === status,
                      ).length;

              if (count === 0) return null;

              const statusColors = {
                Active: "bg-[var(--color-success)]",
                Closed: "bg-[var(--color-muted)]",
                Delinquent: "bg-[var(--color-error)]",
                Settled: "bg-[var(--color-warning)]",
                "Write-Off": "bg-[var(--color-error)]",
              };

              return (
                <button
                  key={status}
                  onClick={() => setUnsecuredNonPaydayTab(status)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${unsecuredNonPaydayTab === status
                    ? `${statusColors[status]} bg-opacity-20 border-b-2 ${statusColors[status]}`
                    : "text-[var(--color-on-surface)] opacity-60 hover:opacity-80"
                    }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Disclosure */}
          <div className="text-xs text-[var(--color-on-surface)] opacity-70 mb-2 p-2 bg-[var(--color-background)] rounded">
            💡 Non-Payday Loans: Unsecured loans with disbursed amount ≥
            BHD 500
          </div>

          {/* Tab Content - Active */}
          {unsecuredNonPaydayTab === "Active" &&
            unsecuredNonPaydayLoans.filter(
              (t: any) => t["ACCOUNT-STATUS"] === "Active",
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-success)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-np-active-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-success)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredNonPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length > 0 && (
                        <tr className="bg-[var(--color-success)] bg-opacity-10 font-bold border-t-2 border-[var(--color-success)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredNonPaydayLoans
                              .filter(
                                (t: any) => t["ACCOUNT-STATUS"] === "Active",
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Closed */}
          {unsecuredNonPaydayTab === "Closed" &&
            unsecuredNonPaydayLoans.filter(
              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-muted)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredNonPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Closed")
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-np-closed-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-muted)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredNonPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                    ).length > 0 && (
                        <tr className="bg-[var(--color-muted)] bg-opacity-10 font-bold border-t-2 border-[var(--color-muted)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredNonPaydayLoans
                              .filter(
                                (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Delinquent */}
          {unsecuredNonPaydayTab === "Delinquent" &&
            unsecuredNonPaydayLoans.filter((t: any) => {
              const history = t.HISTORY?.[0];
              return (
                history?.VALUES?.includes("900") ||
                history?.VALUES?.includes("030") ||
                history?.VALUES?.includes("060") ||
                history?.VALUES?.includes("090")
              );
            }).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredNonPaydayLoans
                      .filter((t: any) => {
                        const history = t.HISTORY?.[0];
                        return (
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090")
                        );
                      })
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;

                        return (
                          <tr
                            key={`unsecured-np-delinq-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                Delinquent
                              </span>
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredNonPaydayLoans.filter((t: any) => {
                      const history = t.HISTORY?.[0];
                      return (
                        history?.VALUES?.includes("900") ||
                        history?.VALUES?.includes("030") ||
                        history?.VALUES?.includes("060") ||
                        history?.VALUES?.includes("090")
                      );
                    }).length > 0 && (
                        <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredNonPaydayLoans
                              .filter((t: any) => {
                                const history = t.HISTORY?.[0];
                                return (
                                  history?.VALUES?.includes("900") ||
                                  history?.VALUES?.includes("030") ||
                                  history?.VALUES?.includes("060") ||
                                  history?.VALUES?.includes("090")
                                );
                              }).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Settled */}
          {unsecuredNonPaydayTab === "Settled" &&
            unsecuredNonPaydayLoans.filter((t: any) =>
              t["ACCOUNT-STATUS"]?.includes("Settled"),
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-warning)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredNonPaydayLoans
                      .filter((t: any) =>
                        t["ACCOUNT-STATUS"]?.includes("Settled"),
                      )
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-np-settled-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-warning)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredNonPaydayLoans.filter((t: any) =>
                      t["ACCOUNT-STATUS"]?.includes("Settled"),
                    ).length > 0 && (
                        <tr className="bg-[var(--color-warning)] bg-opacity-10 font-bold border-t-2 border-[var(--color-warning)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredNonPaydayLoans
                              .filter((t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Settled"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Write-Off */}
          {unsecuredNonPaydayTab === "Write-Off" &&
            unsecuredNonPaydayLoans.filter(
              (t: any) =>
                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                t["ACCOUNT-STATUS"]?.includes("WOF"),
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredNonPaydayLoans
                      .filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      )
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-np-wof-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredNonPaydayLoans.filter(
                      (t: any) =>
                        t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                        t["ACCOUNT-STATUS"]?.includes("WOF"),
                    ).length > 0 && (
                        <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredNonPaydayLoans
                              .filter(
                                (t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                  t["ACCOUNT-STATUS"]?.includes("WOF"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredNonPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
      {/* Unsecured - Payday Loans - Tabbed View */}
      {unsecuredPaydayLoans.length > 0 && (
        <div className="bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3">
            Unsecured - Payday (Less than 100k)
          </h4>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-[var(--color-muted)] border-opacity-20">
            {(
              [
                "Active",
                "Closed",
                "Delinquent",
                "Settled",
                "Write-Off",
              ] as const
            ).map((status) => {
              const count =
                status === "Delinquent"
                  ? unsecuredPaydayLoans.filter((t: any) => {
                    const history = t.HISTORY?.[0];
                    return (
                      history?.VALUES?.includes("900") ||
                      history?.VALUES?.includes("030") ||
                      history?.VALUES?.includes("060") ||
                      history?.VALUES?.includes("090")
                    );
                  }).length
                  : status === "Settled"
                    ? unsecuredPaydayLoans.filter((t: any) =>
                      t["ACCOUNT-STATUS"]?.includes("Settled"),
                    ).length
                    : status === "Write-Off"
                      ? unsecuredPaydayLoans.filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      ).length
                      : unsecuredPaydayLoans.filter(
                        (t: any) => t["ACCOUNT-STATUS"] === status,
                      ).length;

              if (count === 0) return null;

              const statusColors = {
                Active: "bg-[var(--color-success)]",
                Closed: "bg-[var(--color-muted)]",
                Delinquent: "bg-[var(--color-error)]",
                Settled: "bg-[var(--color-warning)]",
                "Write-Off": "bg-[var(--color-error)]",
              };

              return (
                <button
                  key={status}
                  onClick={() => setUnsecuredPaydayTab(status)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${unsecuredPaydayTab === status
                    ? `${statusColors[status]} bg-opacity-20 border-b-2 ${statusColors[status]}`
                    : "text-[var(--color-on-surface)] opacity-60 hover:opacity-80"
                    }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Disclosure */}
          <div className="text-xs text-[var(--color-on-surface)] opacity-70 mb-2 p-2 bg-[var(--color-background)] rounded">
            💡 Payday Loans: Unsecured loans with disbursed amount less than
            BHD 500
          </div>

          {/* Tab Content - Active */}
          {unsecuredPaydayTab === "Active" &&
            unsecuredPaydayLoans.filter(
              (t: any) => t["ACCOUNT-STATUS"] === "Active",
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-success)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      {/* <th className="px-2 py-2 text-right font-medium tooltip" title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type.">EMI</th> */}
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Active")
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-pd-active-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-success)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            {/* <td className="px-2 py-2 text-center group relative">
                          <span className="cursor-help">
                            {Conversion.formatCurrency(calculateEMI(account).emi)}
                          </span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {calculateEMI(account).description}
                          </div>
                        </td> */}
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Active",
                    ).length > 0 && (
                        <tr className="bg-[var(--color-success)] bg-opacity-10 font-bold border-t-2 border-[var(--color-success)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredPaydayLoans
                              .filter(
                                (t: any) => t["ACCOUNT-STATUS"] === "Active",
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Active",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Closed */}
          {unsecuredPaydayTab === "Closed" &&
            unsecuredPaydayLoans.filter(
              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-muted)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredPaydayLoans
                      .filter((t: any) => t["ACCOUNT-STATUS"] === "Closed")
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-pd-closed-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-muted)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredPaydayLoans.filter(
                      (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                    ).length > 0 && (
                        <tr className="bg-[var(--color-muted)] bg-opacity-10 font-bold border-t-2 border-[var(--color-muted)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredPaydayLoans
                              .filter(
                                (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) => t["ACCOUNT-STATUS"] === "Closed",
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Delinquent */}
          {unsecuredPaydayTab === "Delinquent" &&
            unsecuredPaydayLoans.filter((t: any) => {
              const history = t.HISTORY?.[0];
              return (
                history?.VALUES?.includes("900") ||
                history?.VALUES?.includes("030") ||
                history?.VALUES?.includes("060") ||
                history?.VALUES?.includes("090")
              );
            }).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredPaydayLoans
                      .filter((t: any) => {
                        const history = t.HISTORY?.[0];
                        return (
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090")
                        );
                      })
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;

                        return (
                          <tr
                            key={`unsecured-pd-delinq-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                Delinquent
                              </span>
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredPaydayLoans.filter((t: any) => {
                      const history = t.HISTORY?.[0];
                      return (
                        history?.VALUES?.includes("900") ||
                        history?.VALUES?.includes("030") ||
                        history?.VALUES?.includes("060") ||
                        history?.VALUES?.includes("090")
                      );
                    }).length > 0 && (
                        <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredPaydayLoans
                              .filter((t: any) => {
                                const history = t.HISTORY?.[0];
                                return (
                                  history?.VALUES?.includes("900") ||
                                  history?.VALUES?.includes("030") ||
                                  history?.VALUES?.includes("060") ||
                                  history?.VALUES?.includes("090")
                                );
                              }).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) => {
                              const history = t.HISTORY?.[0];
                              return (
                                history?.VALUES?.includes("900") ||
                                history?.VALUES?.includes("030") ||
                                history?.VALUES?.includes("060") ||
                                history?.VALUES?.includes("090")
                              );
                            }).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Settled */}
          {unsecuredPaydayTab === "Settled" &&
            unsecuredPaydayLoans.filter((t: any) =>
              t["ACCOUNT-STATUS"]?.includes("Settled"),
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-warning)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredPaydayLoans
                      .filter((t: any) =>
                        t["ACCOUNT-STATUS"]?.includes("Settled"),
                      )
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-pd-settled-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-warning)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredPaydayLoans.filter((t: any) =>
                      t["ACCOUNT-STATUS"]?.includes("Settled"),
                    ).length > 0 && (
                        <tr className="bg-[var(--color-warning)] bg-opacity-10 font-bold border-t-2 border-[var(--color-warning)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredPaydayLoans
                              .filter((t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Settled"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter((t: any) =>
                              t["ACCOUNT-STATUS"]?.includes("Settled"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Tab Content - Write-Off */}
          {unsecuredPaydayTab === "Write-Off" &&
            unsecuredPaydayLoans.filter(
              (t: any) =>
                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                t["ACCOUNT-STATUS"]?.includes("WOF"),
            ).length > 0 && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-error)] bg-opacity-10 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">
                        Account Type
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Security Status
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Disburser Date
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Lender
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Disbursed Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Current Balance
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Overdue Amount
                      </th>
                      <th
                        className="px-2 py-2 text-right font-medium tooltip"
                        title="EMI: Where EMI > 25% of loan, use mentioned EMI. Otherwise, calculate as (Loan Amt × Annual Rate) / 12. Rates vary by loan type."
                      >
                        EMI
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Payment History
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Reported Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                    {unsecuredPaydayLoans
                      .filter(
                        (t: any) =>
                          t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                          t["ACCOUNT-STATUS"]?.includes("WOF"),
                      )
                      .map((account: any, idx: number) => {
                        const isOverdue =
                          parseFloat(
                            account["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                          ) > 0;
                        const history = account.HISTORY?.[0];
                        const hasDelinquency =
                          history?.VALUES?.includes("900") ||
                          history?.VALUES?.includes("030") ||
                          history?.VALUES?.includes("060") ||
                          history?.VALUES?.includes("090");

                        return (
                          <tr
                            key={`unsecured-pd-wof-${account["ACCT-NUMBER"]}-${idx}`}
                            className="hover:bg-[var(--color-error)] hover:bg-opacity-5"
                          >
                            <td className="px-2 py-2">
                              {account["ACCT-TYPE"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["SECURITY-STATUS"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["DISBURSED-DT"] || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              {account["CREDIT-GRANTOR"] || "N/A"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["DISBURSED-AMT"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Conversion.formatCurrency(account["CURRENT-BAL"]?.replace(/,/g, "") ||
                                "0",)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isOverdue ? (
                                <span className="text-[var(--color-error)] font-medium">
                                  {Conversion.formatCurrency(account["OVERDUE-AMT"]?.replace(/,/g, "") ||
                                    "0",)}
                                </span>
                              ) : (
                                <span className="text-[var(--color-success)]">
                                  {Conversion.formatCurrency(0)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center group relative">
                              <span className="cursor-help">
                                {Conversion.formatCurrency(calculateEMI(account).emi)}
                              </span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {calculateEMI(account).description}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]">
                                {account["ACCOUNT-STATUS"] || "Unknown"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {hasDelinquency ? (
                                <span className="px-1 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)] rounded text-xs">
                                  Delinquent
                                </span>
                              ) : history ? (
                                <span className="px-1 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)] rounded text-xs">
                                  Regular
                                </span>
                              ) : (
                                <span className="text-[var(--color-on-surface)] opacity-60">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 text-center text-[var(--color-on-surface)] text-xs">
                              {account["REPORTED-DT"] || "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    {/* Total Row */}
                    {unsecuredPaydayLoans.filter(
                      (t: any) =>
                        t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                        t["ACCOUNT-STATUS"]?.includes("WOF"),
                    ).length > 0 && (
                        <tr className="bg-[var(--color-error)] bg-opacity-10 font-bold border-t-2 border-[var(--color-error)] border-opacity-30">
                          <td colSpan={4} className="px-2 py-2 text-center">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-center">

                            {unsecuredPaydayLoans
                              .filter(
                                (t: any) =>
                                  t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                  t["ACCOUNT-STATUS"]?.includes("WOF"),
                              ).reduce(
                                (sum: number, l: any) =>
                                  sum +
                                  parseFloat(
                                    l["DISBURSED-AMT"]?.replace(/,/g, "") || "0",
                                  ),
                                0,
                              )}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["CURRENT-BAL"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum +
                                parseFloat(
                                  l["OVERDUE-AMT"]?.replace(/,/g, "") || "0",
                                ),
                              0,
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center">

                            {Conversion.formatCurrency(unsecuredPaydayLoans.filter(
                              (t: any) =>
                                t["ACCOUNT-STATUS"]?.includes("Write Off") ||
                                t["ACCOUNT-STATUS"]?.includes("WOF"),
                            ).reduce(
                              (sum: number, l: any) =>
                                sum + calculateEMI(l).emi,
                              0,
                            ))}
                          </td>
                          <td colSpan={2} className="px-2 py-2 text-center">
                            -
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
      {/* Recent Credit Inquiries */}
      {inquiryHistory.length > 0 && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Recent Credit Inquiries ({inquiryHistory.length})
            {recentInquiries.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)] rounded-full text-xs">
                {recentInquiries.length} in last 30 days
              </span>
            )}
          </h4>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-background)] sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Date</th>
                  <th className="px-2 py-2 text-left font-medium">Lender</th>
                  <th className="px-2 py-2 text-left font-medium">Purpose</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2 text-center font-medium">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                {inquiryHistory
                  .slice(0, 20)
                  .map((inquiry: any, idx: number) => {
                    const inquiryDate = inquiry["INQUIRY-DT"];
                    const isRecent = recentInquiries.some(
                      (recent: any) => recent["INQUIRY-DT"] === inquiryDate,
                    );

                    return (
                      <tr
                        key={`inquiry-${inquiryDate}-${idx}`}
                        className={`hover:bg-[var(--color-background)] ${isRecent
                          ? "bg-[var(--color-warning)] bg-opacity-5"
                          : ""
                          }`}
                      >
                        <td className="px-2 py-2">{inquiryDate || "N/A"}</td>
                        <td className="px-2 py-2">
                          {inquiry["LENDER-NAME"] || "N/A"}
                        </td>
                        <td className="px-2 py-2">
                          {inquiry["CREDIT-INQ-PURPS-TYPE"] || "N/A"}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {inquiry.AMOUNT &&
                            parseFloat(inquiry.AMOUNT.replace(/,/g, "")) > 0
                            ? Conversion.formatCurrency(inquiry.AMOUNT)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-0.5 bg-[var(--color-muted)] bg-opacity-20 rounded text-xs">
                            {inquiry["CREDIT-INQUIRY-STAGE"] || "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Identity Variations */}
      {demogs?.VARIATIONS && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Identity Variations
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demogs.VARIATIONS.map((variation: any, idx: number) => (
              <div
                key={`variation-${variation.TYPE}-${idx}`}
                className="bg-[var(--color-background)] p-3 rounded-lg"
              >
                <h5 className="font-semibold text-xs mb-2 text-[var(--color-primary)]">
                  {variation.TYPE.replace(/-/g, " ")
                    .replace("VARIATIONS", "")
                    .trim()}
                </h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {variation.VARIATION?.slice(0, 5).map(
                    (item: any, itemIdx: number) => (
                      <div
                        key={`${variation.TYPE}-item-${itemIdx}`}
                        className="text-xs"
                      >
                        <span className="font-medium">{item.VALUE}</span>
                        {item["REPORTED-DT"] && (
                          <span className="ml-2 text-[var(--color-on-surface)] opacity-60">
                            (Reported: {item["REPORTED-DT"]})
                          </span>
                        )}
                      </div>
                    ),
                  )}
                  {variation.VARIATION?.length > 5 && (
                    <div className="text-xs text-[var(--color-on-surface)] opacity-60 italic">
                      +{variation.VARIATION.length - 5} more variations
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Risk Analysis */}
      {(overdueAccounts.length > 0 ||
        totalOverdueAmount > 0 ||
        recentInquiries.length > 3) && (
          <div className="bg-[var(--color-error)] bg-opacity-10 p-4 rounded-lg border-2 border-[var(--color-error)] border-opacity-30">
            <h4 className="font-semibold text-sm mb-3 text-[var(--color-on-error)] flex items-center gap-2">
              <span>⚠️</span> Risk Indicators
            </h4>
            <div className="space-y-3 text-xs">
              {overdueAccounts.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-[var(--color-background)] rounded">
                  <span className="font-medium">Accounts with Overdue:</span>
                  <span className="text-[var(--color-error)] font-bold">
                    {overdueAccounts.length}
                  </span>
                </div>
              )}
              {totalOverdueAmount > 0 && (
                <div className="flex items-center justify-between p-2 bg-[var(--color-background)] rounded">
                  <span className="font-medium">Total Overdue Amount:</span>
                  <span className="text-[var(--color-error)] font-bold">
                    {Conversion.formatCurrency(totalOverdueAmount)}
                  </span>
                </div>
              )}
              {recentInquiries.length > 3 && (
                <div className="flex items-center justify-between p-2 bg-[var(--color-background)] rounded">
                  <span className="font-medium">Recent Inquiries (30 days):</span>
                  <span className="text-[var(--color-warning)] font-bold">
                    {recentInquiries.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      {/* Additional Summary Attributes */}
      {additionalSummary.length > 0 && (
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Additional Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {additionalSummary.map((attr: any, idx: number) => (
              <div
                key={`attr-${attr["ATTR-NAME"]}-${idx}`}
                className="bg-[var(--color-background)] p-2 rounded"
              >
                <div className="text-[var(--color-on-surface)] opacity-70 mb-1">
                  {attr["ATTR-NAME"]
                    .replace(/NUM-|GRANTORS-?/g, "")
                    .replace(/-/g, " ")}
                </div>
                <div className="font-bold">{attr["ATTR-VALUE"]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// PDF Viewer Modal Component
const PdfViewerModal = ({
  isOpen,
  onClose,
  pages,
  loading,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly pages: string[];
  readonly loading: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      size="full"
      isOpen={isOpen}
      onClose={onClose}
      title="Equifax BRE Report"
    >
      <div>
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Spinner theme="light" />
              <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                Loading PDF...
              </p>
            </div>
          )}

          {!loading && pages.length > 0 && (
            <div className="space-y-4">
              {pages.map((pageDataUrl, index) => (
                <div
                  key={`pdf-page-${index}-${pageDataUrl.substring(0, 50)}`}
                  className="border border-[var(--color-muted)] border-opacity-30 rounded-lg overflow-hidden"
                >
                  <div className="bg-[var(--color-muted)] bg-opacity-10 px-3 py-2 text-xs font-medium text-[var(--color-on-surface)] opacity-80">
                    Page {index + 1} of {pages.length}
                  </div>
                  <img
                    src={pageDataUrl}
                    alt={`PDF Page ${index + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && pages.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                No pages to display
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

// Helper component to handle document URLs (could be actual URL or S3 key)
const DocumentUrlHandler = ({
  documentUrl,
  fetchSignedUrl,
}: {
  readonly documentUrl: string;
  readonly fetchSignedUrl: (key: string) => Promise<string>;
}) => {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if it's already a full URL (starts with http/https)
        if (
          documentUrl.startsWith("http://") ||
          documentUrl.startsWith("https://")
        ) {
          setFinalUrl(documentUrl);
        } else {
          // It's a key, fetch signed URL
          const urlString = await fetchSignedUrl(documentUrl);
          setFinalUrl(
            typeof urlString === "string" ? urlString : (urlString as any)?.url,
          );
        }
      } catch (err) {
        console.error("Error processing document URL:", err);
        setError("Failed to load document URL");
      } finally {
        setLoading(false);
      }
    };

    handleUrl();
  }, [documentUrl, fetchSignedUrl]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline)] shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70">
            Document URL
          </span>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin text-current"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="text-xs">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !finalUrl) {
    return (
      <div className="p-4 rounded-xl bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-[var(--color-error)]">
            {error || "Document URL not available"}
          </span>
        </div>
      </div>
    );
  }
  if (!finalUrl) {
    return null;
  }
  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline)] shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70">
          Document URL
        </span>
        <a
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary hover:text-primary-hover px-3 py-1 rounded-lg
                 bg-primary/10 hover:bg-primary/20 transition-all"
        >
          View Document →
        </a>
      </div>
    </div>
  );
};

// Bureau Loan Summary Component - Summary of Bureau Loans Format
const BureauLoanSummary = ({
  data,
}: {
  readonly data?: BureauLoanSummaryData | null;
}) => {
  if (!data || !data.debt) {
    return (
      <div className="text-xs text-[var(--color-on-surface)] opacity-70">
        No bureau loan summary data available
      </div>
    );
  }

  // Define all rows with their categories and parameters
  const rows = [
    { category: "Debt", parameter: "Debt Across all loans", data: data.debt, showScoreAndLeverage: true, categoryRowSpan: 1 },
    { category: "Enquiry", parameter: "Enquiry in last 3 months", data: data.enquiry3Months, categoryRowSpan: 3 },
    { category: "", parameter: "Enquiry in last 6 months", data: data.enquiry6Months },
    { category: "", parameter: "Total", data: data.enquiryTotal },
    { category: "DPD Status", parameter: "DPD status in last 3 months", data: data.dpd3Months, categoryRowSpan: 2 },
    { category: "", parameter: "DPD status in last 6 months", data: data.dpd6Months },
    { category: "Write off", parameter: "Write off in last 3 months", data: data.writeOff3Months, categoryRowSpan: 4 },
    { category: "", parameter: "Write off in last 6 months", data: data.writeOff6Months },
    { category: "", parameter: "Write off in last 12 months", data: data.writeOff12Months },
    { category: "", parameter: "Write off in last 24 months", data: data.writeOff24Months },
  ];

  const getScoreClassName = (score?: number) => {
    if (!score) return "";
    if (score >= 650) return "bg-[var(--color-success)] bg-opacity-20 text-[var(--color-on-success)]";
    if (score >= 600) return "bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-on-warning)]";
    return "bg-[var(--color-error)] bg-opacity-20 text-[var(--color-on-error)]";
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case "Debt": return "bg-blue-50 dark:bg-blue-900/20";
      case "Enquiry": return "bg-purple-50 dark:bg-purple-900/20";
      case "DPD Status": return "bg-orange-50 dark:bg-orange-900/20";
      case "Write off": return "bg-red-50 dark:bg-red-900/20";
      default: return "";
    }
  };

  return (
    <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-x-auto">
      <h4 className="font-semibold text-sm mb-4 text-[var(--color-on-surface)]">
        📊 Summary of Bureau Loans
      </h4>

      <table className="w-full text-xs border-collapse min-w-[1200px]">
        <thead>
          {/* Main Header Row */}
          <tr className="bg-[var(--color-background)] border-b-2 border-[var(--color-muted)] border-opacity-30">
            <th rowSpan={2} className="px-2 py-2 text-left font-semibold border-r border-[var(--color-muted)] border-opacity-20 min-w-[80px]">Category</th>
            <th rowSpan={2} className="px-2 py-2 text-left font-semibold border-r border-[var(--color-muted)] border-opacity-20 min-w-[160px]">Parameters</th>
            <th colSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20">Closed</th>
            <th colSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20">Live</th>
            <th colSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20">Secured Live</th>
            <th colSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20">Unsecured Live</th>
            <th colSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20">Payday</th>
            <th rowSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20 min-w-[50px]">Score</th>
            <th rowSpan={2} className="px-2 py-2 text-center font-semibold border-r border-[var(--color-muted)] border-opacity-20 min-w-[70px]">Leverage Payday</th>
            <th rowSpan={2} className="px-2 py-2 text-center font-semibold min-w-[70px]">Leverage Monthly</th>
          </tr>
          {/* Sub Header Row */}
          <tr className="bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-20">
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium">TL #</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium border-r border-[var(--color-muted)] border-opacity-20">Value</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium">TL #</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium border-r border-[var(--color-muted)] border-opacity-20">Value</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium">TL #</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium border-r border-[var(--color-muted)] border-opacity-20">Value</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium">TL #</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium border-r border-[var(--color-muted)] border-opacity-20">Value</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium">TL #</th>
            <th className="px-1 py-1 text-center text-xs opacity-60 font-medium border-r border-[var(--color-muted)] border-opacity-20">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.category}-${row.parameter}-${idx}`}
              className="border-b border-[var(--color-muted)] border-opacity-10 hover:bg-[var(--color-background)] hover:bg-opacity-50"
            >
              {/* Category Column - with rowSpan */}
              {row.category && row.categoryRowSpan && (
                <td
                  rowSpan={row.categoryRowSpan}
                  className={`px-2 py-2 font-semibold text-xs border-r border-[var(--color-muted)] border-opacity-20 align-top ${getCategoryBgColor(row.category)}`}
                >
                  {row.category}
                </td>
              )}

              {/* Parameters Column */}
              <td className="px-2 py-2 text-xs border-r border-[var(--color-muted)] border-opacity-20">
                {row.parameter}
              </td>

              {/* Closed TL # */}
              <td className="px-1 py-2 text-center font-medium">
                {row.data.closed.tlCount}
              </td>
              {/* Closed Value */}
              <td className="px-1 py-2 text-center text-[var(--color-success)] font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {Conversion.formatCurrency(row.data.closed.tlValue)}
              </td>

              {/* Live TL # */}
              <td className="px-1 py-2 text-center font-medium">
                {row.data.live.tlCount}
              </td>
              {/* Live Value */}
              <td className="px-1 py-2 text-center text-[var(--color-primary)] font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {Conversion.formatCurrency(row.data.live.tlValue)}
              </td>

              {/* Secured Live TL # */}
              <td className="px-1 py-2 text-center font-medium">
                {row.data.securedLive.tlCount}
              </td>
              {/* Secured Live Value */}
              <td className="px-1 py-2 text-center text-[var(--color-info)] font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {Conversion.formatCurrency(row.data.securedLive.tlValue)}
              </td>

              {/* Unsecured Live TL # */}
              <td className="px-1 py-2 text-center font-medium">
                {row.data.unsecuredLive.tlCount}
              </td>
              {/* Unsecured Live Value */}
              <td className="px-1 py-2 text-center text-[var(--color-warning)] font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {Conversion.formatCurrency(row.data.unsecuredLive.tlValue)}
              </td>

              {/* Payday TL # */}
              <td className="px-1 py-2 text-center font-medium">
                {row.data.payday.tlCount}
              </td>
              {/* Payday Value */}
              <td className="px-1 py-2 text-center text-[var(--color-error)] font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {Conversion.formatCurrency(row.data.payday.tlValue)}
              </td>

              {/* Score */}
              <td className="px-1 py-2 text-center border-r border-[var(--color-muted)] border-opacity-20">
                {row.showScoreAndLeverage && row.data.score ? (
                  <span className={`font-bold px-1.5 py-0.5 rounded inline-block text-xs ${getScoreClassName(row.data.score)}`}>
                    {row.data.score}
                  </span>
                ) : (
                  <span className="opacity-30">-</span>
                )}
              </td>

              {/* Leverage Payday */}
              <td className="px-1 py-2 text-center font-medium border-r border-[var(--color-muted)] border-opacity-20">
                {row.showScoreAndLeverage && row.data.leverageVsPaydayLiability !== undefined ? (
                  `${row.data.leverageVsPaydayLiability.toFixed(2)}`
                ) : (
                  <span className="opacity-30">-</span>
                )}
              </td>

              {/* Leverage Monthly */}
              <td className="px-1 py-2 text-center font-medium">
                {row.showScoreAndLeverage && row.data.leverageVsMonthlyLiability !== undefined ? (
                  `${row.data.leverageVsMonthlyLiability.toFixed(2)}`
                ) : (
                  <span className="opacity-30">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 pt-4 border-t border-[var(--color-muted)] border-opacity-20 text-xs text-[var(--color-on-surface)] opacity-70">
        <p className="font-semibold mb-2">Legend:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><strong>TL #:</strong> Number of Trade Lines</li>
          <li><strong>Value:</strong> Total Value in BHD</li>
          <li><strong>Score:</strong> Credit Score (shown only for Debt row)</li>
          <li><strong>Leverage Payday:</strong> Total Live Liability / Payday Liability ratio</li>
          <li><strong>Leverage Monthly:</strong> Total Live Liability / Monthly Liability ratio</li>
          <li><strong>DPD Status:</strong> Accounts with Days Past Due (delinquent accounts)</li>
          <li><strong>Write off:</strong> Accounts that have been written off</li>
        </ul>
      </div>
    </div>
  );
};
