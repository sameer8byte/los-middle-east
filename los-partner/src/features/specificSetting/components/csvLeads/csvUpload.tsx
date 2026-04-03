import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { HiCloudArrowUp, HiDocument, HiCheck, HiXMark } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { Button } from '../../../../common/ui/button';
import { Spinner } from '../../../../common/ui/spinner';
import { uploadLeadFormsCsv, type UploadResult } from '../../../../shared/services/api/leads/leads.api';

interface CsvUploadProps {
  readonly onUploadSuccess?: () => void;
}

export function CsvUpload({ onUploadSuccess }: CsvUploadProps) {
  const { brandId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    setUploadResult(null);
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file || !brandId) return;

    setUploading(true);
    setUploadResult(null);
    
    try {
      const result = await uploadLeadFormsCsv(brandId, file);
      setUploadResult(result);
      
      if (result.errors && result.errors.length > 0) {
        toast.warn(`CSV uploaded with ${result.errors.length} warnings. Check details below.`);
      } else {
        toast.success(`CSV uploaded successfully! Processed ${result.processedRows} of ${result.totalRows} rows.`);
      }
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload CSV file';
      toast.error(errorMessage);
      console.error('Upload error:', error);
      
      // Show specific error details if available
      if (error?.response?.data?.errors) {
        setUploadResult({
          message: errorMessage,
          totalRows: 0,
          processedRows: 0,
          errors: Array.isArray(error.response.data.errors)
            ? error.response.data.errors
            : [error.response.data.errors]
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadResult(null);
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,form_name,is_organic,platform,are_you_a_salaried_employee?,what_is_your_monthly_salary?,enter_your_pan_no.?,email,full_name,phone,street_address,city',
      '2005841990185513,9/18/25,120231416659170434,Sample Ad,120231416659160434,Sample AdSet,120231416659050434,Sample Campaign,1425897142005191,Sample Form,false,ig,yes,"below_BHD 500",MKSPS5529L,sample@example.com,John Doe,+919876543210,123 Sample Street,Sample City'
    ];
    
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_lead_forms.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Get drop zone class name based on state
  const getDropZoneClass = () => {
    if (isDragActive) {
      return 'border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-5';
    }
    if (file) {
      return 'border-[var(--color-success)] bg-[var(--color-success)] bg-opacity-5';
    }
    return 'border-[var(--color-muted)] border-opacity-50 hover:border-[var(--color-primary)] hover:bg-[var(--color-background)]';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
            Upload CSV Lead Forms
          </h2>
          <button
            onClick={downloadSampleCsv}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Download Sample CSV
          </button>
        </div>
        <p className="text-sm text-[var(--color-on-surface)] opacity-70">
          Upload your lead form data in CSV format. Supported columns: id, created_time, ad_id, ad_name, 
          adset_id, adset_name, campaign_id, campaign_name, form_id, form_name, is_organic, platform, 
          are_you_a_salaried_employee?, what_is_your_monthly_salary?, enter_your_pan_no.?, email, 
          full_name, phone, street_address, city
        </p>
      </div>

      {/* File Drop Zone */}
      <button
        type="button"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${getDropZoneClass()}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {file ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-[var(--color-success)] bg-opacity-10 rounded-full">
              <HiDocument className="w-8 h-8 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-on-background)]">
                {file.name}
              </p>
              <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                removeFile();
              }}
              className="text-[var(--color-on-error)] border-[var(--color-error)]"
            >
              <HiXMark className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-[var(--color-muted)] bg-opacity-20 rounded-full">
              <HiCloudArrowUp className="w-8 h-8 text-[var(--color-on-surface)] opacity-50" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-on-surface)]">
                {isDragActive ? 'Drop the CSV file here' : 'Click to select CSV file or drag and drop'}
              </p>
              <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                CSV files only, up to 10MB
              </p>
            </div>
          </div>
        )}
      </button>

      {/* Upload Button */}
      {file && !uploadResult && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Spinner theme="dark" />
                <span className="ml-2">Uploading...</span>
              </>
            ) : (
              <>
                <HiCloudArrowUp className="w-4 h-4 mr-2" />
                Upload CSV
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-6 p-4 bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 rounded-lg">
          <div className="flex items-center mb-2">
            <HiCheck className="w-5 h-5 text-[var(--color-success)] mr-2" />
            <span className="font-medium text-[var(--color-success)]">Upload Successful</span>
          </div>
          <div className="text-sm text-[var(--color-on-surface)] space-y-1">
            <p><strong>Total Rows:</strong> {uploadResult.totalRows}</p>
            <p><strong>Processed Rows:</strong> {uploadResult.processedRows}</p>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-[var(--color-on-error)] font-medium">
                  <strong>Errors ({uploadResult.errors.length}):</strong>
                </p>
                <div className="max-h-32 overflow-y-auto mt-1">
                  {uploadResult.errors.map((error, index) => (
                    <p key={`error-${index}-${error.substring(0, 20)}`} className="text-xs text-[var(--color-on-error)] bg-red-50 p-1 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
