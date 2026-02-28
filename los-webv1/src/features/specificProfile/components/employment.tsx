import { useEffect, useState } from "react";
import { updateEmployment } from "../../../redux/slices/employment";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { getEmployment } from "../../../services/api/employment.api";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

export function Employment() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const brand = useAppSelector((state) => state.index);
  const employment = useAppSelector((state) => state.employment);
  const { fetchSignedUrl, loading, error } = useAwsSignedUrl();

  const [payslips, setPayslips] = useState<
    {
      id: string;
      userId: string;
      employmentId: string;
      month: number;
      year: number;
      filePrivateKey: string;
      fileName: string;
      uploadedAt: Date;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >([]);

  // Initial data fetch
  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const response = await getEmployment(userData.user.employmentId);
        if (response) {
          dispatch(updateEmployment(response));
          setPayslips(response.payslips);
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    }

    if (userData.user.employmentId) {
      fetchUserDetails();
    }
  }, [userData.user.employmentId, dispatch]);

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-brand shadow-md">
      <div className="flex items-center mb-8">
        <svg
          className="w-8 h-8 mr-3 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h1 className="text-2xl font-bold text-gray-800">Employment Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <DetailItem
            label="Company Name"
            value={employment.companyName}
            highlight
          />

          <div className="p-4 bg-gray-50 rounded-brand">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Company Address
            </h3>
            <p className="text-gray-800">
              {employment.companyAddress || "N/A"}
              {employment.pinCode && `, ${employment.pinCode}`}
            </p>
          </div>

          <DetailItem
            label="Date of Joining"
            value={
              employment.joiningDate
                ? new Date(employment.joiningDate).toLocaleDateString()
                : "N/A"
            }
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <DetailItem
            label="Designation"
            value={employment.designation || "N/A"}
          />
          <DetailItem
            label="Official Email"
            value={employment.officialEmail || "N/A"}
            highlight
          />

          <div className="bg-surface text-on-surface p-4 rounded-brand">
            <h3 className="text-sm font-medium text-primary mb-2">
              Salary Details
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-mono">
                  {employment.salaryExceedsBase ?
                      `${brand.brandConfig.salaryThresholdAmount}+` :
                       employment.salary} 

                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Date:</span>
                <span>
                  {employment.expectedDateOfSalary
                    ? `${employment.expectedDateOfSalary}th of the month` 
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Mode:</span>
                <span>{employment.modeOfSalary || "N/A"}</span>
              </div>
            </div>
          </div>

          <DetailItem
            label="UAN Number"
            value={employment.uanNumber || "N/A"}
            monospace
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-600">
          Error fetching payslips: {error.message}
        </div>
      )}

      {payslips?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Payslips
          </h2>
          <ul className="space-y-4">
            {payslips.map((payslip) => (
              <li key={payslip.id} className="bg-gray-50 p-4 rounded-brand">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Payslip for {payslip.month}/{payslip.year}
                  </span>
                  <button
                    onClick={() => {
                      fetchSignedUrl(payslip.filePrivateKey);
                    }}
                    className="text-primary hover:underline"
                  >
                    {loading ? (
                      <span className="loader"></span>
                    ) : (
                      "Download"
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Enhanced DetailItem component
function DetailItem({
  label,
  value,
  highlight = false,
  monospace = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  monospace?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-brand ${highlight ? "bg-surface text-on-surface" : "bg-gray-50"}`}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">{label}:</span>
        <span className={`text-gray-800 ${monospace ? "font-mono" : ""}`}>
          {value || "N/A"}
        </span>
      </div>
    </div>
  );
}
