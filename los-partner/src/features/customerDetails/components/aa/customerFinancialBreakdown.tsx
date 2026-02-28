import React, { useState, useMemo } from "react";
import { FaChevronDown, FaChevronUp, FaMoneyBillWave, FaHandHoldingUsd, FaCreditCard, FaWallet } from "react-icons/fa";

interface CustomerFinancialBreakdownProps {
  jsonData: any;
}

export const CustomerFinancialBreakdown: React.FC<CustomerFinancialBreakdownProps> = ({ jsonData }) => {
  const [isOpen, setIsOpen] = useState(true);

  const parsedData = useMemo(() => {
    try {
      return typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }, [jsonData]);

  const finalOutput = parsedData?.finalOutput?.overall;

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const monthlyData = useMemo(() => {
    if (!finalOutput) return [];

    const salaryCredits = finalOutput.VAR01A0321 || {};
    const loanDisbursements = finalOutput.VAR01AAI21 || {};
    const emiPaid = finalOutput.VAR02A0421 || {};

    const allMonths = new Set([
      ...Object.keys(salaryCredits),
      ...Object.keys(loanDisbursements),
      ...Object.keys(emiPaid)
    ]);

    return Array.from(allMonths)
      .sort()
      .reverse()
      .map(month => {
        const salary = salaryCredits[month] || 0;
        const loanAmount = loanDisbursements[month] || 0;
        const emi = emiPaid[month] || 0;
        const remaining = salary + loanAmount - emi;

        return { month, salary, loanAmount, loanCount: loanAmount > 0 ? 1 : 0, repayments: emi, remaining };
      });
  }, [finalOutput]);

  if (!parsedData) return null;

  return (
    <div className="w-full mt-4 bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FaWallet className="w-5 h-5 text-indigo-600" />
          <div className="text-left">
            <h4 className="text-base font-semibold text-gray-900">Monthly Financial Breakdown</h4>
            <p className="text-xs text-gray-500">Salary, Loans, Repayments & Balance</p>
          </div>
        </div>
        {isOpen ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-5 space-y-6">
          {/* Section 1: Monthly Salary Credits */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
              <h5 className="text-sm font-semibold text-gray-800">Monthly Salary Credits</h5>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyData.map(({ month, salary }) => (
                <div key={`salary-${month}`} className="bg-white rounded p-2 border border-green-100">
                  <div className="text-xs text-gray-600 mb-1">{month}</div>
                  <div className={`text-sm font-semibold ${salary > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                    {salary > 0 ? formatCurrency(salary) : 'Not Received'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Monthly Loans Taken */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <FaHandHoldingUsd className="w-5 h-5 text-blue-600" />
              <h5 className="text-sm font-semibold text-gray-800">Monthly Loans Taken</h5>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyData.map(({ month, loanCount, loanAmount }) => (
                <div key={`loan-${month}`} className="bg-white rounded p-2 border border-blue-100">
                  <div className="text-xs text-gray-600 mb-1">{month}</div>
                  {loanAmount > 0 ? (
                    <>
                      {loanCount > 0 && <div className="text-xs text-blue-600 font-medium">{loanCount} loan(s)</div>}
                      <div className="text-sm font-semibold text-blue-700">{formatCurrency(loanAmount)}</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">No loans</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Monthly Loan Repayments */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <FaCreditCard className="w-5 h-5 text-orange-600" />
              <h5 className="text-sm font-semibold text-gray-800">Monthly Loan Repayments (EMIs & Debits)</h5>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyData.map(({ month, repayments }) => (
                <div key={`repay-${month}`} className="bg-white rounded p-2 border border-orange-100">
                  <div className="text-xs text-gray-600 mb-1">{month}</div>
                  <div className={`text-sm font-semibold ${repayments > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                    {repayments > 0 ? formatCurrency(repayments) : 'No payments'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Amount Remaining in Hand */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <FaWallet className="w-5 h-5 text-purple-600" />
              <h5 className="text-sm font-semibold text-gray-800">Amount Remaining in Hand</h5>
              <span className="text-xs text-gray-500">(Salary+Loanstaken-Repayment )</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyData.map(({ month, remaining }) => (
                <div key={`remaining-${month}`} className="bg-white rounded p-2 border border-purple-100">
                  <div className="text-xs text-gray-600 mb-1">{month}</div>
                  <div className={`text-sm font-semibold ${remaining >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                    {formatCurrency(remaining)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
