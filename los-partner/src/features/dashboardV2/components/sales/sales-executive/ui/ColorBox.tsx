interface StatusItem {
  label: string;
  count: number;
  percentage: number;
}

interface ColouredBoxProps {
  icon: React.ReactNode;
  leadNumber?: number;
  title: string;
  color: string;
  borderColor?: string;
  statusObj?: StatusItem[];
  isLeadPercentage?: boolean;
  leadPercentage?: number;
  conversionNumber?: number;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
  subtitle?: string;
}

// Helper function to determine if a color is dark
const isDarkColor = (hexColor: string): boolean => {
  try {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  } catch {
    return false;
  }
};

const ColouredBox = ({
  icon,
  leadNumber = 0,
  title,
  color,
  borderColor,
  statusObj = [],
  isLeadPercentage = false,
  conversionNumber,
  leadPercentage,
  onClick,
  className = "",
  loading = false,
  subtitle,
}: ColouredBoxProps) => {
  const textColor = isDarkColor(color) ? 'text-white' : 'text-black';
  const borderDashColor = isDarkColor(color) ? 'border-white' : 'border-black';
  const spinnerBorderColor = isDarkColor(color) ? 'border-b-2 border-white' : 'border-b-2 border-black';
  
  return (
    <div
      className={`rounded-xl p-3 lg:p-4 ${textColor} min-w-0 flex-1 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={{
        backgroundColor: color,
        border: borderColor ? `2px solid ${borderColor}` : "none",
      }}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className={`animate-spin rounded-full h-8 w-8 ${spinnerBorderColor}`}></div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3 min-h-[56px]">
            <div className="flex items-start gap-2 lg:gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">{icon}</div>
              <div className="flex flex-col -mt-1 gap-1 flex-1 min-w-0">
                <span className="text-lg lg:text-xl font-semibold">{(leadNumber ?? 0).toLocaleString()}</span>
                <span className="text-[11px] lg:text-xs opacity-90 leading-tight">{title}</span>
                {subtitle && <span className="text-[10px] lg:text-xs opacity-70">{subtitle}</span>}
              </div>
              <div className="flex flex-col gap-1.5 -mt-1 items-end flex-shrink-0">
                {isLeadPercentage && leadPercentage !== undefined && (
                  <span
                    className="text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded"
                    style={{ backgroundColor: borderColor }}
                  >
                    {leadPercentage}%
                  </span>
                )}
                {conversionNumber !== undefined && (
                  <span className="text-[10px] lg:text-xs opacity-80 whitespace-nowrap">
                    {conversionNumber} <span className="hidden lg:inline">Conversion{conversionNumber !== 1 ? 's' : ''}</span><span className="lg:hidden">Conv</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`border-t ${borderDashColor} border-dashed mb-3`}></div>
          <div className="flex gap-2 lg:gap-3 text-[11px] lg:text-xs">
            {statusObj.map((status) => (
              <div key={status.label} className="flex justify-between gap-2 flex-1 min-w-0">
                <div className="opacity-80 flex flex-col gap-1 min-w-0">
                  <span className="truncate">{status.label}</span>
                  <span className="opacity-80">{status.percentage}%</span>
                </div>
                <div className="flex-shrink-0">
                  <span className="font-bold">{(status.count ?? 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ColouredBox;

