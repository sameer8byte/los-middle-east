import React, { useState } from "react";

import { FaRegCopy } from "react-icons/fa6";
import { getBankDetails } from "../../utils/bankDetails";
import salary4sureqrcode from "../../assets/bankQrCode/salary4sureqrcode.png";
import quaQRCode from "../../assets/bankQrCode/quaQRCode.png";
import paisaPopQRCode from "../../assets/bankQrCode/PaisaPopQRCode.png";
import minutesLoanQRCode from "../../assets/bankQrCode/MinutesLoanQRCode.png";
import zepotofinanceqrcode from "../../assets/bankQrCode/ZeptoFinanceQRCode.jpg";
import zepotofinanceqrcode2 from "../../assets/bankQrCode/ZeptoFinanceQRCode2.jpg";
import {
  createPaymentForLoanInquiry,
  initiateLoanInquiry,
  postLoanRepayment,
  verifyLoanInquiry,
} from "../../services/api/payment.api";

const getBanners = () => {
  const domain = window.location.hostname;
  const domainParts = domain.split(".");
  const mainDomain = domainParts.slice(-2).join(".");
  if (mainDomain === "salary4sure.com") return [salary4sureqrcode];
  if (mainDomain === "qualoan.com") return [quaQRCode];
  if (mainDomain === "paisapop.com") return [paisaPopQRCode];
  if (mainDomain === "minutesloan.com") return [minutesLoanQRCode];
  // if (mainDomain === "localhost") return [zepotofinanceqrcode, zepotofinanceqrcode2];
  if (mainDomain === "zeptofinance.com") return [zepotofinanceqrcode, zepotofinanceqrcode2];
  return [];
};

const paymentMethod = import.meta.env.VITE_REPAYMENT_PAYMENT_METHOD || "";

interface Loan {
  id: string;
  formattedLoanId: string;
  status: string;
  amount: number;
  purpose: string;
  loanType: string;
  applicationDate: string;
  approvalDate: string;
  disbursementDate: string;
  closureDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RepaymentDetails {
  principalAmount: number;
  totalInterest: number;
  totalPenalties: number;
  totalRepayment: number;
}

interface InquiryState {
  step: "initial" | "otp" | "verify" | "repayment" | "payment";
  identifier: string;
  identifierType: "MOBILE" | "PAN";
  publicLoanInquiriesId: string;
  otp: string;
  selectedLoan: Loan | null;
  loans: Loan[];
  repaymentDetails: RepaymentDetails | null;
  error: string;
  loading: boolean;
  rateLimitRemaining: number;
  showBankDetails: boolean;
}

// PAN Validation Hint Component
interface PanValidationHintProps {
  panValue: string;
}

const PanValidationHint: React.FC<PanValidationHintProps> = ({ panValue }) => {
  const validatePan = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (pan.length === 0) {
      return null;
    }

    if (panRegex.test(pan)) {
      return {
        valid: true,
        message: "✓ Valid PAN format",
        color: "text-green-400",
      };
    }

    // Detailed validation feedback
    const letterCount = (pan.match(/[A-Z]/g) || []).length;
    const digitCount = (pan.match(/[0-9]/g) || []).length;
    const totalLength = pan.length;

    if (totalLength < 10) {
      return {
        valid: false,
        message: `PAN should be 10 characters (you have ${totalLength})`,
        color: "text-orange-400",
      };
    }

    if (totalLength > 10) {
      return {
        valid: false,
        message: `PAN should be 10 characters (you have ${totalLength})`,
        color: "text-red-400",
      };
    }

    if (letterCount < 6) {
      return {
        valid: false,
        message: "First 5 and last 1 characters must be letters",
        color: "text-red-400",
      };
    }

    if (digitCount < 4) {
      return {
        valid: false,
        message: "Middle 4 characters must be digits",
        color: "text-red-400",
      };
    }

    return {
      valid: false,
      message: "Invalid PAN format (5 letters, 4 digits, 1 letter)",
      color: "text-red-400",
    };
  };

  const validation = validatePan(panValue);

  if (!validation) return null;

  return (
    <p className={`text-xs mt-2 ${validation.color}`}>{validation.message}</p>
  );
};

const RepaymentNow: React.FC = () => {
  const [inquiry, setInquiry] = useState<InquiryState>({
    step: "initial",
    identifier: "",
    identifierType: "MOBILE",
    publicLoanInquiriesId: "",
    otp: "",
    selectedLoan: null,
    loans: [],
    repaymentDetails: null,
    error: "",
    loading: false,
    rateLimitRemaining: 5,
    showBankDetails: false,
  });
  const [copied, setCopied] = useState(false);

  // STEP 1: Initiate Inquiry
  const handleInitiateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inquiry.identifier) {
      setInquiry((prev) => ({ ...prev, error: "Please enter mobile or PAN" }));
      return;
    }

    setInquiry((prev) => ({ ...prev, loading: true, error: "" }));
    const identifier =
      inquiry.identifierType === "MOBILE"
        ? inquiry.identifier.startsWith("+91")
          ? inquiry.identifier
          : `+91${inquiry.identifier}`
        : inquiry.identifier;
    try {
      const response = await initiateLoanInquiry(
        identifier,
        inquiry.identifierType,
      );
      setInquiry((prev) => ({
        ...prev,
        step: "otp",
        publicLoanInquiriesId: response.data.publicLoanInquiriesId,
        rateLimitRemaining: response.data.rateLimit.remaining,
        loading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setInquiry((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inquiry.otp || inquiry.otp.length !== 6) {
      setInquiry((prev) => ({
        ...prev,
        error: "Please enter a valid 6-digit OTP",
      }));
      return;
    }

    setInquiry((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await verifyLoanInquiry(
        inquiry.publicLoanInquiriesId,
        inquiry.otp,
        inquiry.identifier,
      );
      setInquiry((prev) => ({
        ...prev,
        step: "verify",
        loans: response.data.activeLoans || response.data.loans || [],
        loading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setInquiry((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // STEP 3: Get Repayment Details
  const handleSelectLoan = async (loan: Loan) => {
    setInquiry((prev) => ({
      ...prev,
      loading: true,
      error: "",
      selectedLoan: loan,
    }));

    try {
      const response = await postLoanRepayment(
        inquiry.publicLoanInquiriesId,
        inquiry.otp,
        loan.id,
      );

      setInquiry((prev) => ({
        ...prev,
        step: "repayment",
        repaymentDetails: response.data,
        loading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setInquiry((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // STEP 4: Create Payment
  const handleCreatePayment = async (
    method: "RAZORPAY" | "PAYTERNING" | "CASHFREE" | "MANUAL",
  ) => {
    if (method === "MANUAL") {
      setInquiry((prev) => ({
        ...prev,
        showBankDetails: true,
      }));
      return;
    }
    setInquiry((prev) => ({ ...prev, loading: true, error: "" }));

    try {

      const response = await createPaymentForLoanInquiry(
        inquiry.publicLoanInquiriesId,
        inquiry.otp,
        inquiry.selectedLoan?.id || "",
        method,
      );
      if (method === "PAYTERNING" && response.data.paymentLink) {
        window.location.href = response.data.paymentLink;
      } else if (method === "CASHFREE" && response.data.paymentLink) {
        window.location.href = response.data.paymentLink;
      } else if (method === "RAZORPAY" && response.data.paymentLink) {
        window.location.href = response.data.paymentLink;
      } else {
        setInquiry((prev) => ({
          ...prev,
          step: "payment",
          loading: false,
        }));
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setInquiry((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // Reset Handler
  const handleReset = () => {
    setInquiry({
      step: "initial",
      identifier: "",
      identifierType: "MOBILE",
      publicLoanInquiriesId: "",
      otp: "",
      selectedLoan: null,
      loans: [],
      repaymentDetails: null,
      error: "",
      loading: false,
      rateLimitRemaining: 5,
      showBankDetails: false,
    });
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);

      // hide after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div className=" bg-(--background) text-(--text-primary) min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-14 px-4 py-16 relative">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h2 className="text-4xl font-bold mb-3 bg-(--primary)  text-transparent bg-clip-text drop-shadow-lg">
            {inquiry.step === "initial"
              ? "Check Your Loan"
              : inquiry.step === "otp"
                ? "Verify OTP"
                : inquiry.step === "verify"
                  ? "Select Loan"
                  : inquiry.step === "repayment"
                    ? "Repayment - Bank Details"
                    : "Payment Confirmed"}
          </h2>
          <div className="w-20 mx-auto h-1 bg-linear-to-r from-(--primary) via-(--secondary) to-(--primary) rounded-full mb-2"></div>
          <p className="text-lg text-(--text-secondary)">
            {inquiry.step === "initial"
              ? "Enter your mobile or PAN to check your loan details"
              : inquiry.step === "otp"
                ? "Enter the OTP sent to your registered number"
                : inquiry.step === "verify"
                  ? "Select a loan to proceed with repayment"
                  : inquiry.step === "repayment"
                    ? "Pay your loan securely with the details and instant UPI scan below"
                    : "Your payment has been processed successfully"}
          </p>
        </div>

        {/* Error Message */}

        <div className="flex flex-col md:flex-row gap-8">
          <div className="m-auto w-full max-w-md">
            {/* STEP 1: Initial Inquiry */}
            {inquiry.step === "initial" && (
              <form
                onSubmit={handleInitiateInquiry}
                className="max-w-md mx-auto w-full"
              >
                <div className="bg-(--background-secondary) p-8 rounded-3xl shadow-2xl border border-(--border-primary) backdrop-blur-md">
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-3 text-(--primary)">
                      Identifier Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="MOBILE"
                          checked={inquiry.identifierType === "MOBILE"}
                          onChange={(e) =>
                            setInquiry((prev) => ({
                              ...prev,
                              identifierType: e.target.value as
                                | "MOBILE"
                                | "PAN",
                              identifier: "",
                            }))
                          }
                          className="mr-2"
                        />
                        <span>Mobile</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="PAN"
                          checked={inquiry.identifierType === "PAN"}
                          onChange={(e) =>
                            setInquiry((prev) => ({
                              ...prev,
                              identifierType: e.target.value as
                                | "MOBILE"
                                | "PAN",
                              identifier: "",
                            }))
                          }
                          className="mr-2"
                        />
                        <span>PAN</span>
                      </label>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-3 text-(--primary)">
                      {inquiry.identifierType === "MOBILE"
                        ? "Mobile Number"
                        : "PAN Number"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        inquiry.identifierType === "MOBILE"
                          ? "9999999999"
                          : "ABCDE1234F"
                      }
                      value={inquiry.identifier.replace(/^\+91/, "")}
                      onChange={(e) => {
                        let value = e.target.value.trim();

                        if (inquiry.identifierType === "MOBILE") {
                          value = value.replace(/\D/g, "").slice(0, 10);
                          value = value ? `+91${value}` : "";
                        } else {
                          value = value.toUpperCase();
                        }

                        setInquiry((prev) => ({ ...prev, identifier: value }));
                      }}
                      className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-lg text-(--text-primary) focus:outline-none focus:border-(--primary)"
                    />
                    <p className="text-xs text-(--text-secondary) mt-2">
                      {inquiry.identifierType === "MOBILE"
                        ? "Enter 10 digits (will add +91 prefix automatically)"
                        : "Format: 5 letters, 4 digits, 1 letter (auto-capitalized)"}
                    </p>

                    {inquiry.identifierType === "PAN" && inquiry.identifier && (
                      <PanValidationHint panValue={inquiry.identifier} />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={inquiry.loading}
                    className="w-full bg-(--primary)  py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {inquiry.loading ? "Sending OTP..." : "Get OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {inquiry.step === "otp" && (
              <form
                onSubmit={handleVerifyOTP}
                className="max-w-md mx-auto w-full"
              >
                <div className="bg-(--background-secondary) p-8 rounded-3xl shadow-2xl border border-(--border-primary) backdrop-blur-md">
                  <div className="mb-6 text-center">
                    <p className="text-sm text-(--text-secondary)">
                      OTP sent to {inquiry.identifier}
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-3 text-(--primary)">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={inquiry.otp}
                      onChange={(e) =>
                        setInquiry((prev) => ({ ...prev, otp: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-(--background-primary) border border-(--border-primary) rounded-lg text-(--text-primary) focus:outline-none focus:border-(--primary) text-center text-2xl tracking-widest"
                    />
                  </div>
                  {inquiry.error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 m-2 text-red-400">
                      {inquiry.error}
                    </div>
                  )}

                  <p className="text-xs text-(--text-secondary) mb-6">
                    Attempts remaining: {inquiry.rateLimitRemaining}
                  </p>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 border border-(--border-primary) py-3 rounded-lg font-semibold text-(--primary) hover:bg-(--primary)/10 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={inquiry.loading}
                      className="flex-1 bg-(--primary) py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {inquiry.loading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Loan Selection */}
            {inquiry.step === "verify" && (
              <div className="max-w-2xl mx-auto w-full">
                <div className="bg-(--background-secondary) p-8 rounded-3xl shadow-2xl border border-(--border-primary) backdrop-blur-md">
                  <h3 className="text-xl font-bold text-(--primary) mb-6">
                    Your Loans ({inquiry.loans.length})
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {inquiry.loans.map((loan) => (
                      <button
                        key={loan.id}
                        onClick={() => handleSelectLoan(loan)}
                        disabled={inquiry.loading}
                        className="w-full p-4 border border-(--border-primary) rounded-lg hover:border-(--primary) hover:bg-(--primary)/10 transition text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-(--primary)">
                              {loan.formattedLoanId}
                            </p>
                            <p className="text-sm text-(--text-secondary) mt-1">
                              Amount: BHD{loan.amount.toLocaleString("en-IN")}
                            </p>
                            <p className="text-xs text-(--text-secondary) mt-1">
                              Status:{" "}
                              <span className="capitalize">{loan.status}</span>
                            </p>
                          </div>
                          <span className="text-(--secondary-accent)">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleReset}
                    className="w-full mt-6 border border-(--border-primary) py-3 rounded-lg font-semibold text-(--primary) hover:bg-(--primary)/10 transition"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Repayment Details & Bank Details */}
            {inquiry.step === "repayment" && (
              <div
                className={`${inquiry.showBankDetails ? "grid md:grid-cols-2 gap-12" : ""
                  } bg-(--background-secondary) p-10 rounded-3xl shadow-2xl border border-(--border-primary) backdrop-blur-md`}
              >
                {/* LEFT: Repayment Details */}
                <div className="w-full min-w-sm mx-auto flex flex-col gap-5">
                  <div className="px-8 pt-8 flex items-center gap-3">
                    <span className="text-[1.4rem] font-bold text-(--primary) tracking-wider drop-shadow-md">
                      Loan: {inquiry.selectedLoan?.formattedLoanId}
                    </span>
                  </div>

                  {inquiry.repaymentDetails && (
                    <table className="w-full text-left my-2 text-(--text-primary)">
                      <tbody>
                        <tr>
                          <td className="py-3 px-5 font-semibold text-(--primary)">
                            Principal
                          </td>
                          <td className="py-3 px-5">
                            BHD
                            {inquiry.repaymentDetails.principalAmount?.toLocaleString(
                              "en-IN",
                            ) || 0}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-5 font-semibold text-(--primary)">
                            Interest
                          </td>
                          <td className="py-3 px-5">
                            BHD
                            {inquiry.repaymentDetails.totalInterest?.toLocaleString(
                              "en-IN",
                            ) || 0}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-5 font-semibold text-(--primary)">
                            Penalties
                          </td>
                          <td className="py-3 px-5">
                            BHD
                            {inquiry.repaymentDetails.totalPenalties?.toLocaleString(
                              "en-IN",
                            ) || 0}
                          </td>
                        </tr>
                        <tr className="bg-(--primary)/10 font-bold">
                          <td className="py-3 px-5 font-semibold text-(--primary)">
                            Total Repayment
                          </td>
                          <td className="py-3 px-5 text-(--primary)">
                            BHD
                            {inquiry.repaymentDetails.totalRepayment?.toLocaleString(
                              "en-IN",
                            ) || 0}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  <div className="px-8 pb-8">
                    <div className="rounded-xl bg-(--primary)/10 px-4 py-3 text-xs text-(--primary) border border-(--primary)/40">
                      Please use these details for secure repayments via bank
                      transfer. For UPI, scan the QR code.
                    </div>
                  </div>

                  <div className="px-8 pb-8 space-y-3">
                    <button
                      onClick={() => handleCreatePayment(paymentMethod)}
                      disabled={inquiry.loading}
                      className="w-full bg-(--primary) py-3 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {inquiry.loading
                        ? "Processing..."
                        : `Pay Now With ${paymentMethod}`}
                    </button>
                    <button
                      onClick={() => handleCreatePayment("MANUAL")}
                      disabled={inquiry.loading}
                      className="w-full border border-(--border-primary) py-3 rounded-lg font-bold text-(--primary) hover:bg-(--primary)/10 disabled:opacity-50 transition"
                    >
                      Manual Transfer
                    </button>
                    {inquiry.showBankDetails && (
                      <div>
                        <div className="w-full  mx-auto flex flex-col items-center gap-5 rounded-md border border-(--primary)/20 bg-(--background-secondary-dark) shadow-lg py-2">
                          <span className="font-bold text-md text-(--primary) drop-shadow-md ">
                            Scan & Pay Instantly - Manual Transfer
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Payment Success */}
            {inquiry.step === "payment" && (
              <div className="max-w-md mx-auto w-full">
                <div className="bg-(--background-secondary) p-8 rounded-3xl shadow-2xl border border-green-500/30 backdrop-blur-md text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">
                    Payment Initiated
                  </h3>
                  <p className="text-(--text-secondary) mb-6">
                    Your payment request has been created successfully. You can
                    proceed with the bank transfer using the details above.
                  </p>
                  <button
                    onClick={handleReset}
                    className="w-full bg-(--primary) py-3 rounded-lg font-bold text-white hover:opacity-90 transition"
                  >
                    Start New Inquiry
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex  flex-col md:flex-row gap-8 w-full max-w-2xl mx-auto">
            {getBankDetails().map((details, index) => (
              <div
                key={index}
                className="w-full flex flex-col items-center gap-5 rounded-2xl border border-(--primary)/20 bg-(--background-secondary-dark) shadow-lg py-8"
              >
                <span className=" text-xl text-(--secondary) drop-shadow-md flex flex-col items-center">
                  <div className="font-bold text-xl text-(--primary) drop-shadow-md text-center">
                    {details.companyName}
                  </div>
                </span>
                <img
                  src={getBanners()[index] || getBanners()[0]}
                  alt={`Scan to Pay ${index + 1}`}
                  className="border-4 border-dashed border-(--border-primary) rounded-xl w-60 h-60 object-contain bg-(--background-primary-dark) shadow"
                />
                {details.upiId && (
                  <div className="font-medium max-w-sm  text-base mt-3 text-(--primary) ">
                    UPI ID:{" "}
                    <span className="font-semibold">
                      {details.upiId.length > 15 ? `${details.upiId.slice(0, 15)}...` : details.upiId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(details.upiId)}
                      className="ml-2 text-sm text-(--text-primary) underline"
                    >
                      <FaRegCopy />
                    </button>
                    {copied && (
                      <span className="text-(--text-primary) text-sm font-medium ml-2">
                        Copied!
                      </span>
                    )}
                  </div>
                )}
                {inquiry.showBankDetails && (
                  <div
                    className="w-full px-6 mt-6 space-y-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div>
                      <p className="text-xs text-(--text-secondary) mb-1">
                        Bank Name
                      </p>
                      <p className="text-sm font-semibold">
                        {details.bankName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-(--text-secondary) mb-1">
                        Account Number
                      </p>
                      <p className="text-sm font-semibold tracking-wider">
                        {details.accountNo}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-(--text-secondary) mb-1">
                        IFSC Code
                      </p>
                      <p className="text-sm font-semibold">
                        {details.ifsc}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-(--text-secondary) mb-1">
                        Branch Address
                      </p>
                      <p className="text-sm font-semibold">
                        {details.branchAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-(--text-secondary) mb-1">
                        Account Type
                      </p>
                      <p className="text-sm font-semibold">
                        {details.accountType}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepaymentNow;
