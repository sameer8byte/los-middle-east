import { useAppSelector } from "../../../redux/store";
import { document_type_enum } from "../../../types/document";
import { maskAadhaar, maskPAN } from "../../../utils/utils";

export function Documents() {
  const userDocuments = useAppSelector((state) => state.documents);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          📄
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-500">Verification documents</p>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {userDocuments.documents?.length > 0 ? (
          userDocuments.documents.map((document, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                {/* Document Info */}
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">
                      {document.type === document_type_enum.AADHAAR ? '🆔' : '💳'}
                    </span>
                    <h4 className="font-medium text-gray-900">
                      {document.type === document_type_enum.AADHAAR ? 'Aadhaar Card' : 'PAN Card'}
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    <DocumentField
                      label="Document Number"
                      value={
                        document.type === document_type_enum.AADHAAR
                          ? maskAadhaar(document.documentNumber)
                          : maskPAN(document.documentNumber)
                      }
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="ml-4">
                  <StatusBadge status={document.status} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📄</span>
            </div>
            <p className="text-gray-500">No documents uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

const DocumentField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
      {label}
    </p>
    <p className="text-gray-900 font-medium">
      {value || "-"}
    </p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
        };
      case 'expired':
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📄',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
};

