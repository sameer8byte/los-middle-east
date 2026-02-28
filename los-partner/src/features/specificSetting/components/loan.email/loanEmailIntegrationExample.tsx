// Example integration for any loan list component
// This shows how to add email reminder functionality to existing loan tables

import { useState } from 'react';
import { LoanEmailReminder } from './loanEmailReminder';
import { EmailReminderManager } from './emailReminderManager';
import { LoanStatusBadge } from '../../../../common/ui/LoanStatusBadge';

// Option 1: Individual Email Reminder Button for each loan
export function LoanEmailReminderButton({ 
  brandId, 
  loanId, 
  className = "" 
}: Readonly<{ 
  brandId: string; 
  loanId: string; 
  className?: string; 
}>) {
  return (
    <div className={className}>
      <LoanEmailReminder
        brandId={brandId}
        loanId={loanId}
        triggerType="manual"
        buttonText="Send Reminder"
        buttonVariant="outline"
        size="sm"
        showConfirmDialog={true}
      />
    </div>
  );
}

// Option 2: Complete Email Reminder Manager (for loan list headers)
export function LoanListEmailManager({ 
  brandId, 
  className = "" 
}: Readonly<{ 
  brandId: string; 
  className?: string; 
}>) {
  return (
    <div className={className}>
      <EmailReminderManager
        brandId={brandId}
        showBulkActions={true}
        size="sm"
      />
    </div>
  );
}

// Option 3: Inline Email Reminder Integration Example
export function ExampleLoanListIntegration() {
  const [loans] = useState([
    { id: '1', formattedLoanId: 'LOAN001', status: 'ACTIVE' },
    { id: '2', formattedLoanId: 'LOAN002', status: 'ACTIVE' },
  ]);
  
  const brandId = "your-brand-id"; // Get this from your app context/params

  return (
    <div className="space-y-4">
      {/* Header with bulk actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Active Loans</h2>
        <EmailReminderManager
          brandId={brandId}
          showBulkActions={true}
          size="md"
        />
      </div>

      {/* Table with individual actions */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="bg-white border-b border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {loan.formattedLoanId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
<LoanStatusBadge status={loan.status} />                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {/* Individual loan email reminder */}
                    <LoanEmailReminder
                      brandId={brandId}
                      loanId={loan.id}
                      triggerType="manual"
                      buttonText="Remind"
                      buttonVariant="outline"
                      size="sm"
                      showConfirmDialog={true}
                    />
                    
                    {/* Other existing actions can go here */}
                    <button className="text-blue-600 hover:text-blue-900">
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Quick integration tips:
/*
1. For loan list headers (bulk operations):
   <EmailReminderManager brandId={brandId} showBulkActions={true} />

2. For individual loan actions:
   <LoanEmailReminder brandId={brandId} loanId={loan.id} size="sm" />

3. To add to existing table column:
   In your column definition, add:
   {
     key: "emailReminder",
     label: "Email",
     render: (_: any, loan: Loan) => (
       <LoanEmailReminder
         brandId={brandId}
         loanId={loan.id}
         buttonText="📧"
         size="sm"
       />
     ),
   }

4. To add to action dropdown menus:
   <LoanEmailReminder
     brandId={brandId}
     loanId={loan.id}
     buttonText="Send Email Reminder"
     buttonVariant="secondary"
     size="sm"
   />
*/

export default ExampleLoanListIntegration;
