import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Dialog from "../../../common/dialog";
import { BrandBankAccountType } from "../../../constant/enum";
import { createBrandBankAccount, getBrandBankAccounts, updateBrandBankAccount } from "../../../shared/services/api/settings/brandBankAccount.setting.api";

export function BankDetailsSettings() {
  const { brandId } = useParams();
  const [accountDetails, setAccountDetails] = useState<
    {
      id: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName: string;
      upiId?: string;
      bankAddress?: string;
      type: BrandBankAccountType;
      isPrimaryAccount: boolean;
      isActive: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFormData = {
    id: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    upiId: "",
    bankAddress: "",
    isPrimaryAccount: false,
    type: BrandBankAccountType.BANDHAN_BANK, // Default type
    isActive: true,
  };

  const [formData, setFormData] = useState<{
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    upiId?: string;
    bankAddress?: string;
    type: BrandBankAccountType; // Ensure this matches your enum
    isPrimaryAccount: boolean;
    isActive: boolean;
  }>(initialFormData);

  useEffect(() => {
    const fetchBankDetails = async () => {
      if (!brandId) {
        setError("Brand ID is missing");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getBrandBankAccounts(brandId);
        setAccountDetails(response || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to fetch bank details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, [brandId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" && (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreateDialog = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEditAccount = (accountId: string) => {
    const account = accountDetails.find((acc) => acc.id === accountId);
    if (account) {
      setFormData({
        id: account.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        branchName: account.branchName || "",
        type: account.type,
        upiId: account.upiId || "",
        bankAddress: account.bankAddress || "",
        isPrimaryAccount: account.isPrimaryAccount,
        isActive: account.isActive,
      });
      setIsEditing(true);
      setDialogOpen(true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    setFormLoading(true);

    try {
      if (isEditing && formData.id) {
        const response = await updateBrandBankAccount(brandId, formData.id, {
          bankName: formData.type.replace(/_/g, " "),
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          type: formData.type,
          branchName: formData.branchName || undefined,
          upiId: formData.upiId || undefined,
          bankAddress: formData.bankAddress || undefined,
          isPrimaryAccount: formData.isPrimaryAccount,
          isActive: formData.isActive,
        });

        if (response) {
          setAccountDetails((prev) =>
            prev.map((acc) => (acc.id === response.id ? response : acc))
          );
        }
      } else {
        const response = await createBrandBankAccount(brandId, {
          bankName: formData.type.replace(/_/g, " "),
          accountNumber: formData.accountNumber,
          type: formData.type,

          ifscCode: formData.ifscCode,
          branchName: formData.branchName || undefined,
          upiId: formData.upiId || undefined,
          bankAddress: formData.bankAddress || undefined,
          isPrimaryAccount: formData.isPrimaryAccount,
          isActive: formData.isActive,
        });
        if (response) {
          setAccountDetails((prev) => [...prev, response]);
        }
      }

      setDialogOpen(false);
      setFormData(initialFormData);
    } catch (err) {
      console.error("Failed to save account:", err);
      setError((err as Error).message || "Failed to save account.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-on-background)]">
              Bank Accounts
            </h1>
            <p className="text-[var(--color-on-surface)] opacity-70 mt-1">
              Manage your connected bank accounts
            </p>
          </div>
          <button
            onClick={openCreateDialog}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] px-4 py-2.5 rounded-lg shadow transition-all hover:shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add Account
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_:any, index) => (
              <div
                key={index}
                className="var(--color-background) p-5 rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-16 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-[var(--color-muted)] bg-opacity-30 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-2/3 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-[var(--color-muted)] bg-opacity-30 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-[var(--color-muted)] bg-opacity-30 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-3/4 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-[var(--color-muted)] bg-opacity-30 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/3 animate-pulse"></div>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <div className="h-8 bg-[var(--color-muted)] bg-opacity-30 rounded w-16 animate-pulse"></div>
                  <div className="h-8 bg-[var(--color-muted)] bg-opacity-30 rounded w-8 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-[var(--color-error)] bg-opacity-10 border-l-4 border-error p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-[var(--color-on-error)]">{error}</p>
              </div>
            </div>
          </div>
        ) : accountDetails.length === 0 ? (
          <div className="var(--color-background) rounded-xl border border-[var(--color-muted)] border-opacity-30 p-8 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-[var(--color-primary)] bg-opacity-10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-[var(--color-on-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-[var(--color-on-background)]">
              No bank accounts
            </h3>
            <p className="mt-1 text-[var(--color-on-surface)] opacity-70">
              Get started by adding your first bank account
            </p>
            <div className="mt-6">
              <button
                onClick={openCreateDialog}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none"
              >
                Add Account
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountDetails.map((account) => (
              <div
                key={account.id}
                className={`var(--color-background) rounded-xl border ${account.isPrimaryAccount
                    ? "border-primary border-2"
                    : "border-[var(--color-muted)] border-opacity-30"
                  } shadow-sm transition-all hover:shadow-md overflow-hidden`}
              >
                {account.isPrimaryAccount && (
                  <div className="bg-[var(--color-primary)] bg-opacity-100 py-1.5 text-center">
                    <span className="text-xs font-semibold text-[var(--color-on-primary)]">
                      PRIMARY ACCOUNT
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="bg-[var(--color-surface)] rounded-lg w-10 h-10 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-[var(--color-on-surface)] opacity-70"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="font-bold text-[var(--color-on-background)]">
                          {account.bankName}
                        </h3>
                        <div className="flex items-center mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${account.isActive
                                ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                                : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                              }`}
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-70 rounded-lg w-8 h-8 flex items-center justify-center">
                      {account.accountNumber.slice(-4)}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                      <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                        Account:{" "}
                        <span className="font-medium text-[var(--color-on-background)]">
                          {account.accountNumber}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                        IFSC:{" "}
                        <span className="font-medium text-[var(--color-on-background)]">
                          {account.ifscCode}
                        </span>
                      </span>
                    </div>
                    {account.branchName && (
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                          Branch:{" "}
                          <span className="font-medium text-[var(--color-on-background)]">
                            {account.branchName}-{account.type}
                          </span>
                        </span>
                      </div>
                    )}
                    {account.upiId && (
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                          UPI ID:{" "}
                          <span className="font-medium text-[var(--color-on-background)]">
                            {account.upiId}
                          </span>
                        </span>
                      </div>
                    )}
                    {account.bankAddress && (
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-[var(--color-on-surface)] opacity-50 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                          Address:{" "}
                          <span className="font-medium text-[var(--color-on-background)]">
                            {account.bankAddress}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <button
                      onClick={() => handleEditAccount(account.id)}
                      className="text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] font-medium flex items-center gap-1 text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </button>
                    {account.isPrimaryAccount && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog
          title={isEditing ? "Edit Bank Account" : "Add Bank Account"}
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setFormData(initialFormData);
          }}
        >
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                // {
                //   label: "Bank Name",
                //   name: "bankName",
                //   required: true,
                //   icon: "bank",
                // },
                {
                  label: "Account Number",
                  name: "accountNumber",
                  required: true,
                  icon: "credit-card",
                },
                {
                  label: "IFSC Code",
                  name: "ifscCode",
                  required: true,
                  icon: "shield-check",
                },
                {
                  label: "Branch Name",
                  name: "branchName",
                  icon: "location-marker",
                },

                {
                  label: "UPI ID",
                  name: "upiId",
                  icon: "currency-rupee",
                  colSpan: "md:col-span-2",
                },
                {
                  label: "Bank Address",
                  name: "bankAddress",
                  icon: "location-marker",
                  colSpan: "md:col-span-2",
                },
              ].map(({ label, name, required, icon, colSpan }) => (
                <div key={name} className={`${colSpan || ""}`}>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                    {label}
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {icon === "bank" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[var(--color-on-surface)] opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      )}
                      {icon === "credit-card" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[var(--color-on-surface)] opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      )}
                      {icon === "shield-check" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[var(--color-on-surface)] opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      )}
                      {icon === "location-marker" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[var(--color-on-surface)] opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                      {icon === "currency-rupee" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[var(--color-on-surface)] opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      name={name}
                      value={String(formData[name as keyof typeof formData])}
                      onChange={handleInputChange}
                      required={required}
                      className="block w-full pl-10 p-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                Bank Name
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="block w-full p-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {Object.values(BrandBankAccountType).map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center">
                <input
                  id="isPrimaryAccount"
                  type="checkbox"
                  name="isPrimaryAccount"
                  checked={formData.isPrimaryAccount}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[var(--color-on-primary)] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-primary"
                />
                <label
                  htmlFor="isPrimaryAccount"
                  className="ml-2 block text-sm font-medium text-[var(--color-on-surface)] opacity-80"
                >
                  Set as primary account
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[var(--color-on-primary)] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-primary"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 block text-sm font-medium text-[var(--color-on-surface)] opacity-80"
                >
                  Active account
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-[var(--color-error)] bg-opacity-10 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-[var(--color-on-error)]">Error</h3>
                    <div className="mt-2 text-sm text-[var(--color-on-error)]">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setFormData(initialFormData);
                }}
                className="px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-[var(--color-on-surface)] opacity-80 hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {formLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--color-on-primary)]"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEditing ? "Updating..." : "Saving..."}
                  </div>
                ) : isEditing ? (
                  "Update Account"
                ) : (
                  "Add Account"
                )}
              </button>
            </div>
          </form>
        </Dialog>
      </div>
    </div>
  );
}
