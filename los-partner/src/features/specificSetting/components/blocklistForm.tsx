import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { postBlocklistPan, postBlocklistMobile, postBlocklistAadhar, postBlocklistPincode, postBlocklistAccountNumber } from "../../../shared/services/api/settings/brandBlockList.setting.api";
import { Button } from "../../../common/ui/button";

type BlocklistType = "pan" | "mobile" | "aadhar" | "pincode" | "accountNumber";

interface BlocklistFormData {
  pancard?: string;
  mobile?: string;
  aadharNumber?: string;
  pincode?: string;
  accountNumber?: string;
  brandId: string;
  customerName?: string;
  reason?: string;
  dpd?: number;
  partnerUserName?: string;
}

// Validation functions
const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

const validateAadhaar = (aadhaar: string): boolean => {
  const aadhaarRegex = /^[0-9]{12}$/;
  return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
};

const validatePincode = (pincode: string): boolean => {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
};

const validateAccountNumber = (accountNumber: string): boolean => {
  // Account numbers are typically 9-18 digits, allowing alphanumeric characters
  const accountRegex = /^[A-Z0-9]{9,18}$/;
  return accountRegex.test(accountNumber);
};

export function BlocklistForm (){
    const {brandId} = useParams<{brandId: string}>();
  const [type, setType] = useState<BlocklistType>("pan");
  const [formData, setFormData] = useState<BlocklistFormData>({
    brandId: brandId || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (type === "pan") {
      const pan = formData.pancard?.trim();
      if (!pan) {
        errors.pancard = "PAN is required";
      } else if (!validatePAN(pan)) {
        errors.pancard = "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)";
      }
    } else if (type === "mobile") {
      const mobile = formData.mobile?.trim();
      if (!mobile) {
        errors.mobile = "Mobile number is required";
      }
    } else if (type === "aadhar") {
      const aadhaar = formData.aadharNumber?.trim();
      if (!aadhaar) {
        errors.aadharNumber = "CPR Card number is required";
      } else if (!validateAadhaar(aadhaar)) {
        errors.aadharNumber = "Invalid CPR Card format. Must be exactly 12 digits";
      }
    } else if (type === "pincode") {
      const pincode = formData.pincode?.trim();
      if (!pincode) {
        errors.pincode = "Pincode is required";
      } else if (!validatePincode(pincode)) {
        errors.pincode = "Invalid pincode format. Must be exactly 6 digits";
      }
    } else if (type === "accountNumber") {
      const accountNumber = formData.accountNumber?.trim();
      if (!accountNumber) {
        errors.accountNumber = "Account number is required";
      } else if (!validateAccountNumber(accountNumber)) {
        errors.accountNumber = "Invalid account number format. Must be 9-18 alphanumeric characters";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
        const payload: BlocklistFormData = {
            ...formData,
            brandId: formData.brandId.trim(),
        };
        if (type === "pan") {
            payload.pancard = formData.pancard?.trim();
            await postBlocklistPan(payload);
        }
        else if (type === "mobile") {
            payload.mobile = formData.mobile?.trim();
            await postBlocklistMobile(payload);
        }
        else if (type === "aadhar") {
            payload.aadharNumber = formData.aadharNumber?.trim().replace(/\s/g, '');
            await postBlocklistAadhar(payload);
        }
        else if (type === "pincode") {
            payload.pincode = formData.pincode?.trim();
            // Note: You'll need to implement postBlocklistPincode API function
            await postBlocklistPincode(payload);
        }
        else if (type === "accountNumber") {
            payload.accountNumber = formData.accountNumber?.trim().toUpperCase();
            // Note: You'll need to implement postBlocklistAccountNumber API function
            await postBlocklistAccountNumber(payload);
        }
      setMessage("Upsert successful!");
      setFormData({ brandId: brandId || "" }); // Reset form
    } catch (error: any) {
      setMessage("Error: " + (error?.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getTypeDisplayName = (type: BlocklistType) => {
    switch (type) {
      case "pan": return "TaxID";
      case "mobile": return "Mobile Number";
      case "aadhar": return "CPR Card Number";
      case "pincode": return "Pincode";
      case "accountNumber": return "Account Number";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--color-on-background)] mb-2">Blocklist Management</h1>
          <p className="text-[var(--color-on-surface)] opacity-70">Add entries to the blocklist for enhanced security and compliance</p>
        </div>

        {/* Main Form Card */}
        <div className="var(--color-background) rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          {/* Card Header */}
          <div className="bg-[var(--color-on-background)] px-6 py-4">
            <h2 className="text-lg font-medium text-[var(--color-on-primary)]">Add New Entry</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-on-background)]">
                Entry Type
              </label>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as BlocklistType)}
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 var(--color-background) text-[var(--color-on-background)]"
              >
                <option value="pan">TaxID</option>
                <option value="mobile">Mobile Number</option>
                <option value="aadhar">CPR Card Number</option>
                <option value="pincode">Pincode</option>
                <option value="accountNumber">Account Number</option>
              </select>
            </div>

            {/* Dynamic Input Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-on-background)]">
                {getTypeDisplayName(type)} *
              </label>
              {type === "pan" && (
                <div>
                  <input
                    type="text"
                    name="pancard"
                    placeholder="Enter PAN number (e.g., ABCDE1234F)"
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400 ${
                      validationErrors.pancard ? 'border-error' : 'border-[var(--color-muted)] border-opacity-50'
                    }`}
                    required
                    maxLength={10}
                    style={{textTransform: 'uppercase'}}
                  />
                  {validationErrors.pancard && (
                    <p className="mt-1 text-sm text-[var(--color-on-error)]">{validationErrors.pancard}</p>
                  )}
                </div>
              )}

              {type === "mobile" && (
                <div>
                  <input
                    type="tel"
                    name="mobile"
                    placeholder="Enter mobile number (e.g., +91 9876543210)"
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400 ${
                      validationErrors.mobile ? 'border-error' : 'border-[var(--color-muted)] border-opacity-50'
                    }`}
                    required
                  />
                  {validationErrors.mobile && (
                    <p className="mt-1 text-sm text-[var(--color-on-error)]">{validationErrors.mobile}</p>
                  )}
                </div>
              )}

              {type === "aadhar" && (
                <div>
                  <input
                    type="text"
                    name="aadharNumber"
                    placeholder="Enter CPR Card number (12 digits)"
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400 ${
                      validationErrors.aadharNumber ? 'border-error' : 'border-[var(--color-muted)] border-opacity-50'
                    }`}
                    required
                    maxLength={14}
                    pattern="[0-9\s]*"
                  />
                  {validationErrors.aadharNumber && (
                    <p className="mt-1 text-sm text-[var(--color-on-error)]">{validationErrors.aadharNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-on-surface)] opacity-70">Enter 12 digits (spaces allowed)</p>
                </div>
              )}

              {type === "pincode" && (
                <div>
                  <input
                    type="text"
                    name="pincode"
                    placeholder="Enter pincode (6 digits)"
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400 ${
                      validationErrors.pincode ? 'border-error' : 'border-[var(--color-muted)] border-opacity-50'
                    }`}
                    required
                    maxLength={6}
                    pattern="[0-9]*"
                  />
                  {validationErrors.pincode && (
                    <p className="mt-1 text-sm text-[var(--color-on-error)]">{validationErrors.pincode}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-on-surface)] opacity-70">Enter exactly 6 digits</p>
                </div>
              )}

              {type === "accountNumber" && (
                <div>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="Enter account number (9-18 characters)"
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400 ${
                      validationErrors.accountNumber ? 'border-error' : 'border-[var(--color-muted)] border-opacity-50'
                    }`}
                    required
                    maxLength={18}
                    style={{textTransform: 'uppercase'}}
                  />
                  {validationErrors.accountNumber && (
                    <p className="mt-1 text-sm text-[var(--color-on-error)]">{validationErrors.accountNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-on-surface)] opacity-70">Enter 9-18 alphanumeric characters</p>
                </div>
              )}
            </div>

            {/* Grid Layout for Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-on-background)]">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  placeholder="Enter customer name"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-on-background)]">
                  Partner Username
                </label>
                <input
                  type="text"
                  name="partnerUserName"
                  placeholder="Enter partner username"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-on-background)]">
                  Reason
                </label>
                <input
                  type="text"
                  name="reason"
                  placeholder="Enter reason for blocklist"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-on-background)]">
                  DPD (Days Past Due)
                </label>
                <input
                  type="number"
                  name="dpd"
                  placeholder="Enter DPD value"
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] transition-colors duration-200 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
               >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  "Add to Blocklist"
                )}
              </Button>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`p-4 rounded-md border ${
                message.includes("Error") 
                  ? "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 text-[var(--color-on-error)]" 
                  : "bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 text-[var(--color-on-success)]"
              }`}>
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm font-medium">
                      {message.includes("Error") ? "Error" : "Success"}
                    </p>
                    <p className="text-sm">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-[var(--color-on-background)] rounded-lg p-6">
          <h3 className="text-lg font-medium text-[var(--color-on-primary)] mb-3">Important Information</h3>
          <ul className="text-[var(--color-muted)] text-sm space-y-2">
            <li>• All entries are permanent and will be applied immediately</li>
            <li>• Ensure accuracy of the information before submission</li>
            <li>• Contact support team for any removal requests</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
