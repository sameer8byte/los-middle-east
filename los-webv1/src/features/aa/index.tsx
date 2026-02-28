import { useState, useEffect, useCallback, useRef } from "react";
import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineExclamationCircle,
  AiOutlineLoading3Quarters,
  AiOutlineLink,
} from "react-icons/ai";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { postConsentRequest } from "../../services/api/aa.api";
import { AAConsentStatus } from "../../types/aa-consent-request";
import { updateConsentRequestStatus } from "../../redux/slices/aaConsentRequests";

interface ConsentData {
  consentRequestId: string;
  clientTransactionId: string;
  redirectionUrl: string;
  consentHandle: string;
}

interface ConsentStatus {
  status: "S" | "F" | "N";
  message: string;
  txnid?: string;
}

const rotatingMessages = [
  "You closed the consent window before completing the process.",
  "Don't worry, you can try again!",
  "Your data is safe — just re-initiate the request.",
  "Still want to continue? Just hit retry.",
];

const FinduitIntegration = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const aaConsentRequests = useAppSelector((state) => state.aaConsentRequests);

  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    | "initial"
    | "consent"
    | "awaiting-consent"
    | "consent-complete"
    | "consent-closed"
  >("initial");
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  const [messageIndex, setMessageIndex] = useState(0);

  const messageReceivedRef = useRef(false);
  const checkClosedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createConsentRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postConsentRequest(user.id, user.brandId);
      if (!response?.redirectionUrl)
        throw new Error("Consent URL not available");

      setConsentData(response);
      openPopupWindow(response.redirectionUrl);
      setStep("awaiting-consent");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const retryConsent = () => {
    setConsentStatus(null);
    setConsentData(null);
    setMessageIndex(0);
    setStep("initial");
    createConsentRequest();
  };

  const openPopupWindow = useCallback((url: string) => {
    const width = window.screen.availWidth * 0.66;
    const height = window.screen.availHeight * 0.66;
    const left = (window.screen.availWidth - width) / 2;
    const top = (window.screen.availHeight - height) / 2;

    const popup = window.open(
      url,
      "aa_consent",
      `resizable=yes,width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) return;

    setPopupWindow(popup);
    messageReceivedRef.current = false;

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        checkClosedIntervalRef.current = null;
        setPopupWindow(null);
        if (!messageReceivedRef.current) {
          setConsentStatus({
            status: "N",
            message: rotatingMessages[0],
          });
          setMessageIndex(0);
          setStep("consent-closed");
        }
      }
    }, 2000);

    checkClosedIntervalRef.current = checkClosed;
  }, []);

  useEffect(() => {
    return () => {
      if (checkClosedIntervalRef.current) {
        clearInterval(checkClosedIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { status, txnid } = event.data || {};
      if (!status) return;

      messageReceivedRef.current = true;

      const messageMap: Record<string, string> = {
        S: "Consent approved successfully!",
        F: "Consent rejected by the user.",
        N: rotatingMessages[0],
      };

      if (status === "S") {
        dispatch(
          updateConsentRequestStatus({
            id: consentData?.consentRequestId || "",
            status: AAConsentStatus.ACTIVE,
          })
        );
      } else if (status === "F") {
        dispatch(
          updateConsentRequestStatus({
            id: consentData?.consentRequestId || "",
            status: AAConsentStatus.REJECTED,
          })
        );
      }

      setConsentStatus({ status, message: messageMap[status], txnid });
      setStep("consent-complete");

      if (popupWindow && !popupWindow.closed) popupWindow.close();
      setPopupWindow(null);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [popupWindow, consentData, dispatch]);

  // Rotate message every 5 seconds when status === "N"
  useEffect(() => {
    if (consentStatus?.status !== "N") return;

    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % rotatingMessages.length);
      setConsentStatus((prevStatus) =>
        prevStatus?.status === "N"
          ? {
              ...prevStatus,
              message:
                rotatingMessages[(messageIndex + 1) % rotatingMessages.length],
            }
          : prevStatus
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [consentStatus, messageIndex]);

  const isConsentAlreadyApproved = aaConsentRequests.consentRequests.some(
    (request) => request.consentStatus === AAConsentStatus.ACTIVE
  );

  const renderStatusMessage = () => {
    if (!consentStatus) return null;

    const statusMap = {
      S: {
        icon: AiOutlineCheckCircle,
        bg: "var(--color-success)",
        text: "var(--color-on-surface)",
      },
      F: {
        icon: AiOutlineCloseCircle,
        bg: "var(--color-error)",
        text: "var(--color-on-surface)",
      },
      N: {
        icon: AiOutlineExclamationCircle,
        bg: "var(--color-warning)",
        text: "var(--color-on-surface)",
      },
    };

    const { icon: Icon, bg, text } = statusMap[consentStatus.status];

    return (
      <div
        className="p-4 rounded-md border"
        style={{ backgroundColor: `${bg}1A`, color: text }}
      >
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5" style={{ color: bg }} />
          <span className="font-medium text-sm">{consentStatus.message}</span>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md flex items-center text-sm transition-all border"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface)",
              borderColor: "var(--color-outline)",
            }}
          >
            {/* <AiOutlineLoading3Quarters className="h-4 w-4 mr-2" /> */}
            Refresh Page
          </button>
        </div>

        {step === "consent-closed" && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={retryConsent}
              className="px-4 py-2 rounded-md flex items-center text-sm transition-all"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              <AiOutlineLink className="h-4 w-4 mr-2" />
              Retry Consent
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md flex items-center text-sm transition-all border"
              style={{
                backgroundColor: "var(--color-surface)",
                color: "var(--color-on-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <AiOutlineLoading3Quarters className="h-4 w-4 mr-2" />
              Refresh Page
            </button>
          </div>
        )}
      </div>
    );
  };

  if (isConsentAlreadyApproved) {
    return (
      <div
        className="rounded-md p-4 text-sm flex items-center space-x-2"
        style={{
          backgroundColor: "var(--color-success)",
          color: "var(--color-on-surface)",
        }}
      >
        <AiOutlineCheckCircle className="h-5 w-5" />
        <span>
          AA verified! You have an active consent. You may now proceed to the
          next step.
        </span>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          className="rounded-md p-4 text-sm flex items-center space-x-2 mb-4 border"
          style={{
            backgroundColor: "var(--color-error)1A",
            color: "var(--color-error)",
          }}
        >
          <AiOutlineExclamationCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div
        className="rounded-md p-6 space-y-4 shadow-sm border"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "#E5E7EB",
        }}
      >
        {step === "initial" && !consentData && (
          <button
            onClick={createConsentRequest}
            disabled={loading}
            className="px-4 py-2 rounded-md flex items-center transition-all disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            {loading && (
              <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin mr-2" />
            )}
            Generate Consent Request
          </button>
        )}

        {step === "awaiting-consent" && (
          <div
            className="text-sm flex items-center space-x-2 p-3 rounded-md"
            style={{
              backgroundColor: "var(--color-warning)1A",
              color: "var(--color-warning)",
            }}
          >
            <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
            <span>Waiting for user to complete consent...</span>
          </div>
        )}

        {["consent-complete", "consent-closed"].includes(step) &&
          renderStatusMessage()}
      </div>
    </div>
  );
};

export default FinduitIntegration;
