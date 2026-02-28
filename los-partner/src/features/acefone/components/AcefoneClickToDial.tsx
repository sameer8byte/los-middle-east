import { useState } from "react";
import { BiPhoneCall } from "react-icons/bi";
import { toast } from "react-toastify";
import {
  acefoneDialerService,
  AcefoneDialerPayload,
} from "../../../shared/services/api/acefone.dialer.service";
import { useAppSelector } from "../../../shared/redux/store";
import { useParams } from "react-router-dom";
import { Button } from "../../../common/ui/button";
import { useAcefoneDialer } from "../context/AcefoneDialerContext";

interface AcefoneClickToDialProps {
  readonly userId: string;
  readonly loanId?: string;
  readonly alternatePhoneNumberId?: string;
}

interface AcefoneClickToDialButtonProps {
  readonly userId: string;
  readonly loanId?: string;
  readonly alternatePhoneNumberId?: string;
  readonly iconClassName?: string;
}

/**
 * Full button component with loading state for click-to-dial
 */
export function AcefoneClickToDial({
  userId,
  loanId,
  alternatePhoneNumberId,
}: AcefoneClickToDialProps) {
  const { brandId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAppSelector((state) => state.auth.data);
  const { openDialer } = useAcefoneDialer();

  const handleClickToDial = async () => {
    if (!brandId) {
      toast.error("Brand ID is missing. Cannot initiate call.");
      return;
    }
    if (!auth?.id) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    if (!userId) {
      toast.error("User ID is missing. Cannot initiate call.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: AcefoneDialerPayload = {
        userId: userId,
        partnerUserId: auth.id,
        brandId: brandId,
        ...(loanId && { loanId }),
        ...((alternatePhoneNumberId) && { alternatePhoneNumberId }),
        callType: "manual",
        callReason: "Click-to-dial call initiated by agent",
      };

      const response = await acefoneDialerService.initiateCall(payload);

      if (response.success && response.callId) {
        toast.success("Click to dial initiated successfully");
        openDialer();
      } else {
        toast.error(response.message || "Failed to initiate call");
      }
    } catch (error: any) {
      console.error("Click to dial error:", error);
      toast.error(error.message || "Failed to initiate click to dial");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={() => handleClickToDial()}
      disabled={isLoading || !auth?.id}
      title="Click to call customer"
    >
      <BiPhoneCall size={18} />
    </Button>
  );
}

/**
 * Compact icon button for inline click-to-dial (e.g., in tables)
 */
export function AcefoneClickToDialButton({
  userId,
  loanId,
  alternatePhoneNumberId,
  iconClassName = "h-4 w-4",
}: AcefoneClickToDialButtonProps) {
  const { brandId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAppSelector((state) => state.auth.data);
  const { openDialer } = useAcefoneDialer();

  const handleClickToDial = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!brandId) {
      toast.error("Brand ID is missing. Cannot initiate call.");
      return;
    }
    if (!auth?.id) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    if (!userId) {
      toast.error("User ID is missing. Cannot initiate call.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: AcefoneDialerPayload = {
        userId: userId,
        partnerUserId: auth.id,
        brandId: brandId,
        ...(loanId && { loanId }),
        ...((alternatePhoneNumberId) && { alternatePhoneNumberId }),
        callType: "manual",
        callReason: "Click-to-dial call initiated by agent",
      };

      const response = await acefoneDialerService.initiateCall(payload);

      if (response.success && response.callId) {
        toast.success("Click to dial initiated successfully");
        openDialer();
      } else {
        toast.error(response.message || "Failed to initiate call");
      }
    } catch (error: any) {
      console.error("Click to dial error:", error);
      toast.error(error.message || "Failed to initiate click to dial");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <button
      onClick={handleClickToDial}
      disabled={isLoading || !auth?.id}
      className="  inline-flex items-center justify-center
    h-9 w-9 rounded-full
    bg-green-50 text-green-700
    border border-green-200
    transition-all duration-150
    hover:bg-green-100 hover:border-green-300 hover:shadow
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
    >
      <BiPhoneCall className={iconClassName} />
    </button>
  );
}
