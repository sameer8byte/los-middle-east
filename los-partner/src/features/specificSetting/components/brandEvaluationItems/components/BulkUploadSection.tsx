import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiCloudArrowUp, HiDocument, HiCheck, HiXMark, HiExclamationTriangle } from 'react-icons/hi2';
import { Button } from '../../../../../common/ui/button';
import { Spinner } from '../../../../../common/ui/spinner';
import {
  BulkUploadResult,
  bulkUploadFromCsv,
} from '../../../../../shared/services/api/settings/brandEvaluationItems.setting.api';

interface BulkUploadSectionProps {
  onUploadSuccess: () => void;
}

export function BulkUploadSection({ onUploadSuccess }: BulkUploadSectionProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    setUploadResult(null);
  };

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
      const result = await bulkUploadFromCsv(brandId, file);
      setUploadResult(result);
      
      if (result.errors > 0) {
        toast.warn(`CSV uploaded with ${result.errors} errors. Check details below.`);
      } else {
        toast.success(`CSV uploaded successfully! Created ${result.created} items, skipped ${result.skipped} duplicates.`);
      }
      
      if (result.created > 0) {
        onUploadSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload CSV file';
      toast.error(errorMessage);
      console.error('Upload error:', error);
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
      'parameter,requiredValue,sources,stage,isActive,priority,description',
      'Credit Score,>=650,CIBIL;Experian,ONE,true,1,Minimum credit score requirement',
      'Monthly Income,>50000,Bank Statement;Salary Slip,ONE,true,2,Monthly income verification',
      'Employment Type,Salaried,HR Verification;Offer Letter,TWO,true,3,Employment type check'
    ];
    
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_evaluation_items.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getDropZoneClass = () => {
    if (isDragActive) {
      return 'border-[var(--primary)] bg-[var(--primary)] bg-opacity-5';
    }
    if (file) {
      return 'border-green-500 bg-green-50';
    }
    return 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)] hover:bg-opacity-50';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--border)] p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Bulk Upload Evaluation Items
            </h2>
            <button
              onClick={downloadSampleCsv}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Download Sample CSV
            </button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Upload evaluation items in bulk using a CSV file. Required columns: parameter, requiredValue, sources (semicolon-separated).
            Optional columns: stage (ONE/TWO/THREE), isActive (true/false), priority (number), description.
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
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                <HiDocument className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {file.name}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
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
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <HiXMark className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-[var(--muted)] rounded-full">
                <HiCloudArrowUp className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {isDragActive ? 'Drop the CSV file here' : 'Click to select CSV file or drag and drop'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
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
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-sm border border-[var(--border)] p-6">
          <div className="flex items-center mb-4">
            <HiCheck className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-600">Upload Complete</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{uploadResult.created}</div>
              <div className="text-sm text-green-800">Items Created</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{uploadResult.skipped}</div>
              <div className="text-sm text-yellow-800">Items Skipped</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{uploadResult.errors}</div>
              <div className="text-sm text-red-800">Errors</div>
            </div>
          </div>

          {/* Skipped Items */}
          {uploadResult.details.skippedItems.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <HiExclamationTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">
                  Skipped Items ({uploadResult.details.skippedItems.length})
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded p-3">
                {uploadResult.details.skippedItems.map((item, index) => (
                  <p key={index} className="text-xs text-yellow-800 mb-1">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Error Details */}
          {uploadResult.details.errors.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <HiXMark className="w-4 h-4 text-red-600 mr-2" />
                <span className="font-medium text-red-800">
                  Errors ({uploadResult.details.errors.length})
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                {uploadResult.details.errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-800 mb-1">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadResult.created > 0 && (
            <div className="text-sm text-[var(--muted-foreground)]">
              Successfully created {uploadResult.created} evaluation item{uploadResult.created !== 1 ? 's' : ''}.
              {uploadResult.skipped > 0 && ` ${uploadResult.skipped} duplicate${uploadResult.skipped !== 1 ? 's' : ''} were skipped.`}
            </div>
          )}
        </div>
      )}

      {/* CSV Format Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">CSV Format Instructions</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Required columns:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><code>parameter</code> - The evaluation parameter name</li>
            <li><code>requiredValue</code> - The required value for evaluation</li>
            <li><code>sources</code> - Data sources (separate multiple with semicolon)</li>
          </ul>
          <p className="mt-2"><strong>Optional columns:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><code>stage</code> - Evaluation stage (ONE, TWO, or THREE, defaults to ONE)</li>
            <li><code>isActive</code> - Active status (true or false, defaults to true)</li>
            <li><code>priority</code> - Priority number (defaults to 0)</li>
            <li><code>description</code> - Optional description</li>
          </ul>
          <p className="mt-2"><strong>Example:</strong></p>
          <code className="block bg-blue-100 p-2 rounded text-xs mt-1">
            Credit Score,&gt;=650,CIBIL;Experian,ONE,true,1,Minimum credit score requirement
          </code>
        </div>
      </div>
    </div>
  );
}
