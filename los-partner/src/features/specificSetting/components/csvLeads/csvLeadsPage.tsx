import { useState } from 'react';
import { CsvUpload } from './csvUpload';
import { LeadFormsList } from './leadFormsList';

export function CsvLeadsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger refresh of the list component
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-background)]">
            CSV Lead Forms
          </h1>
          <p className="text-[var(--color-on-surface)] opacity-70 mt-1">
            Upload and manage lead form data from CSV files
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <CsvUpload onUploadSuccess={handleUploadSuccess} />

      {/* List Section */}
      <LeadFormsList refreshTrigger={refreshTrigger} />
    </div>
  );
}
