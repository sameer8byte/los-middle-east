interface SignzyFormat {
  readonly raw?: {
    readonly result?: {
      readonly active?: string;
      readonly reason?: string;
      readonly nameMatch?: string;
      readonly auditTrail?: {
        readonly value?: string;
        readonly nature?: string;
        readonly timestamp?: string;
      };
      readonly mobileMatch?: string;
      readonly bankTransfer?: {
        readonly bankRRN?: string;
        readonly beneIFSC?: string;
        readonly beneMMID?: string;
        readonly beneName?: string;
        readonly response?: string;
        readonly beneMobile?: string;
      };
      readonly nameMatchScore?: number;
      readonly signzyReferenceId?: string;
    };
  };
  readonly message?: string;
  readonly success?: boolean;
  readonly provider?: string;
  readonly nameMatch?: boolean;
  readonly accountHolderName?: string;
}

interface DigitapFormat {
  readonly code?: string;
  readonly model?: {
    readonly rrn?: string;
    readonly status?: string;
    readonly isNameMatch?: boolean;
    readonly paymentMode?: string;
    readonly clientRefNum?: string;
    readonly matchingScore?: number;
    readonly transactionId?: string;
    readonly beneficiaryName?: string;
  };
}

interface DigitapWrappedFormat {
  readonly raw?: {
    readonly code?: string;
    readonly model?: {
      readonly rrn?: string;
      readonly status?: string;
      readonly isNameMatch?: boolean;
      readonly paymentMode?: string;
      readonly clientRefNum?: string;
      readonly matchingScore?: number;
      readonly transactionId?: string;
      readonly beneficiaryName?: string;
    };
  };
  readonly message?: string;
  readonly success?: boolean;
  readonly provider?: string;
  readonly nameMatch?: boolean;
  readonly accountHolderName?: string;
}

type PennyDropResponse = SignzyFormat | DigitapFormat | DigitapWrappedFormat | null | undefined;

interface PennyDropVerificationCardProps {
  readonly pennyDropResponse: PennyDropResponse;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) {
    return "bg-gradient-to-r from-emerald-500 to-green-400";
  } else if (score >= 50) {
    return "bg-gradient-to-r from-amber-500 to-yellow-400";
  }
  return "bg-gradient-to-r from-red-500 to-orange-400";
};

const getScoreTextColor = (score: number): string => {
  if (score >= 80) {
    return "text-emerald-600";
  } else if (score >= 50) {
    return "text-amber-600";
  }
  return "text-red-600";
};

export function PennyDropVerificationCard({
  pennyDropResponse,
}: Readonly<PennyDropVerificationCardProps>) {
  if (!pennyDropResponse) {
    return null;
  }

  // Detect format and extract data
  const isSignzyFormat = (
    response: any
  ): response is SignzyFormat => {
    return response?.raw?.result || response?.provider === "SIGNZY";
  };

  const isDigitapWrappedFormat = (
    response: any
  ): response is DigitapWrappedFormat => {
    return response?.raw?.model && response?.provider === "DIGITAP";
  };

  const isDigitapFormat = (
    response: any
  ): response is DigitapFormat => {
    return response?.model && !response?.raw;
  };

  let displayData = {
    beneficiaryName: "",
    nameMatch: false,
    matchingScore: 0,
    status: "",
    referenceId: "",
    timestamp: "",
    provider: "Unknown",
  };

  if (isSignzyFormat(pennyDropResponse)) {
    const result = pennyDropResponse.raw?.result;
    displayData = {
      beneficiaryName: result?.bankTransfer?.beneName || pennyDropResponse.accountHolderName || "N/A",
      nameMatch: pennyDropResponse.nameMatch || result?.nameMatch === "yes" || false,
      matchingScore: result?.nameMatchScore ? Math.round(result.nameMatchScore * 100) : 0,
      status: result?.reason || "pending",
      referenceId: result?.signzyReferenceId || "",
      timestamp: result?.auditTrail?.timestamp || "",
      provider: pennyDropResponse.provider || "SIGNZY",
    };
  } else if (isDigitapWrappedFormat(pennyDropResponse)) {
    const model = pennyDropResponse.raw?.model;
    displayData = {
      beneficiaryName: model?.beneficiaryName || pennyDropResponse.accountHolderName || "N/A",
      nameMatch: pennyDropResponse.nameMatch || model?.isNameMatch || false,
      matchingScore: model?.matchingScore || 0,
      status: model?.status || "pending",
      referenceId: model?.rrn || model?.transactionId || "",
      timestamp: "",
      provider: pennyDropResponse.provider || "DIGITAP",
    };
  } else if (isDigitapFormat(pennyDropResponse)) {
    const model = pennyDropResponse.model;
    displayData = {
      beneficiaryName: model?.beneficiaryName || "N/A",
      nameMatch: model?.isNameMatch || false,
      matchingScore: model?.matchingScore || 0,
      status: model?.status || "pending",
      referenceId: model?.rrn || model?.transactionId || "",
      timestamp: "",
      provider: "Digitap",
    };
  }

  return (
    <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div>
          <h4 className="text-sm font-bold text-emerald-800">
            Penny Drop Verification
          </h4>
          <p className="text-xs text-emerald-600">
            Bank account verified via {displayData.provider}
          </p>
        </div>
      </div>

      {/* Main Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Beneficiary Name */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1 uppercase tracking-wide">
            Beneficiary Name
          </p>
          <p className="text-sm font-bold text-gray-900">
            {displayData.beneficiaryName}
          </p>
        </div>

        {/* Name Match Status */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1 uppercase tracking-wide">
            Name Match
          </p>
          <div className="flex items-center gap-2">
            {displayData.nameMatch ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Matched
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Mismatch
              </span>
            )}
          </div>
        </div>

        {/* Matching Score */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1 uppercase tracking-wide">
            Matching Score
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreColor(
                  displayData.matchingScore
                )}`}
                style={{
                  width: `${displayData.matchingScore}%`,
                }}
              />
            </div>
            <span
              className={`text-sm font-bold min-w-[3rem] text-right ${getScoreTextColor(
                displayData.matchingScore
              )}`}
            >
              {displayData.matchingScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="mt-3 pt-3 border-t border-emerald-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {displayData.status && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-medium">Status:</span>
              <span className="text-gray-700 capitalize">
                {displayData.status}
              </span>
            </div>
          )}
          {displayData.timestamp && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="text-emerald-600 font-medium">Verified On:</span>
              <span className="text-gray-700">
                {new Date(displayData.timestamp).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
