
// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BiPhoneCall } from "react-icons/bi";
import { BiPhoneIncoming } from "react-icons/bi";
import {
  MdCheckCircleOutline,
  MdCallEnd,
  MdCallMissed,
  MdWifi,
} from "react-icons/md";
import Dialog from "../../../common/dialog";

import { FiActivity, FiDollarSign, FiPhoneCall, FiType } from "react-icons/fi";
import { useAppSelector } from "../../../shared/redux/store";
import { generateAccessToken } from "../../../shared/services/api/customer.api";
import { MdOutlineCurrencyRupee } from "react-icons/md";
interface IceServer {
  urls: string;
  credential: string;
  username: string;
}

interface Client {
  browserId: string;
  clientId: string;
  deviceName: string;
  platform: number;
}

interface ConnectionResponse {
  r: number;
  clients: Client[];
  requestId: number;
  clientIp: string;
  connectionId: number;
  ice_servers: IceServer[];
  message: string;
  ping_after_ms: number;
  userId: string;
  projectId: number;
}

interface StringeeVoiceCallProps {
  phoneNumber?: string;
}

export function StringeeVoiceCall({ phoneNumber }: StringeeVoiceCallProps) {
  const auth = useAppSelector((state) => state.auth);
  const user = useAppSelector((state) => state.user);
  const { brandId, customerId } = useParams<{
    brandId: string;
    customerId: string;
  }>();
  const [tokenLoading, setTokenLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [loanId, setLoanId] = useState(null);
  const [loggedUserId, setLoggedUserId] = useState("Not logged");
  const [fromNumber, setFromNumber] = useState("");
  const [callTo, setCallTo] = useState(
    // remove + prefix if exists
    phoneNumber?.replace(/^\+/, "") || ""
  );
  const [callStatus, setCallStatus] = useState("Not started");
  const [callType, setCallType] = useState("...");
  const [callBtnDisabled, setCallBtnDisabled] = useState(true);
  const [hangupBtnDisabled, setHangupBtnDisabled] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);

  const stringeeClient = useRef(null);
  const call = useRef(null);
  const remoteVideo = useRef(null);

  const setupClientEvents = (client) => {
    client.on("connect", () => {
      console.log("connected to StringeeServer");
    });

    client.on("authen", (res: ConnectionResponse) => {
      console.log("on authen:", res);
      if (res.r === 0) {
        setLoggedUserId(res.userId);
        setCallStatus("Ready");
        setCallBtnDisabled(false);
      } else {
        setLoggedUserId(res.message);
      }
    });

    client.on("disconnect", () => {
      console.log("disconnected");
      setCallStatus("Disconnected");
      setCallBtnDisabled(false);
    });

    client.on("incomingcall", (incomingcall) => {
      call.current = incomingcall;
      setupCallEvents(incomingcall);
      setShowIncomingCall(true);
      setIncomingCall(incomingcall);
      setCallType(
        incomingcall.fromInternal ? "App-to-App call" : "Phone-to-App call"
      );
    });

    client.on("requestnewtoken", () => {
      console.log("request new token");
    });

    client.on("otherdeviceauthen", (data) => {
      console.log("otherdeviceauthen:", data);
    });
  };

  const setupCallEvents = (callInstance) => {
    setHangupBtnDisabled(false);

    callInstance.on("error", (info) => {
      console.log("on error:", info);
    });

    callInstance.on("addlocalstream", (stream) => {
      console.log("on addlocalstream", stream);
    });

    callInstance.on("addremotestream", (stream) => {
      console.log("on addremotestream", stream);
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = null;
        remoteVideo.current.srcObject = stream;
      }
    });

    callInstance.on("signalingstate", (state) => {
      console.log("signalingstate", state);
      if (state.code === 6 || state.code === 5) {
        setShowIncomingCall(false);
        callStopped();
      }
      setCallStatus(state.reason);
    });

    callInstance.on("mediastate", (state) => {
      console.log("mediastate", state);
    });

    callInstance.on("info", (info) => {
      console.log("on info", info);
    });

    callInstance.on("otherdevice", (data) => {
      console.log("on otherdevice:", data);
      if (
        (data.type === "CALL_STATE" && data.code >= 200) ||
        data.type === "CALL_END"
      ) {
        setShowIncomingCall(false);
      }
    });
  };

  const handleLogin = (token: string) => {
    setLoggedUserId("Connecting...");
    const client = new StringeeClient();
    stringeeClient.current = client;
    setupClientEvents(client);
    client.connect(token);
  };

  const handleMakeCall = async () => {
    if (!callTo) return;
    const from = fromNumber || loggedUserId;
    const isValidPhoneNumber = /^\+?[1-9]\d{1,14}$/.test(callTo);
    if (!isValidPhoneNumber) {
      setCallStatus("Invalid phone number format");
      return;
    }
    // await handleSubmit();
    const newCall = new StringeeCall(
      stringeeClient.current,
      from,
      callTo.replace(/^\+91/, "")
    );
    call.current = newCall;
    setupCallEvents(newCall);
    newCall.makeCall((res) => {
      console.log("make call callback:", res);
      if (res.r !== 0) {
        setCallStatus(res.message);
      } else {
        setCallType(
          res.toType === "internal" ? "App-to-App call" : "App-to-Phone call"
        );
      }
    });
  };

  const handleAnswerCall = () => {
    call.current.answer((res) => {
      console.log("answer res", res);
      setShowIncomingCall(false);
    });
  };

  const handleRejectCall = () => {
    call.current.reject((res) => {
      console.log("reject res", res);
      setShowIncomingCall(false);
    });
    callStopped();
  };

  const handleHangupCall = () => {
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    callStopped();
    call.current.hangup((res) => {
      console.log("hangup res", res);
    });
  };

  const callStopped = () => {
    setHangupBtnDisabled(true);

    setCallStatus("Call ended");
  };

  const handelAccessToken = async () => {
    if (!brandId || !customerId) {
      console.error("Brand ID or Customer ID is missing");
      return;
    }
    try {
      setTokenLoading(true);
      const response = await generateAccessToken(
        customerId,
        brandId,
        auth.data.id,
        loanId
      );
      if (response) {
        setAccessToken(response.accessToken);
        await handleLogin(response.accessToken);
        setFromNumber(response.fromPhoneNumber);
        console.log("Access token generated successfully:", response);
      } else {
        console.error("Failed to generate access token");
      }
    } catch (error) {
      console.error("Error generating access token:", error);
    } finally {
      setTokenLoading(false);
    }
    console.log("Access token:", accessToken);
  };

  const handelCloseDialog = () => {
    setAccessToken(null);
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    if (call.current) {
      call.current.hangup((res) => {
        console.log("hangup res on close dialog", res);
      });
    }
    if (stringeeClient.current) {
      stringeeClient.current.disconnect();
      stringeeClient.current = null;
    }
    setLoggedUserId("Not logged");
    setCallStatus("Not started");
    setCallType("...");
    setIncomingCall(null);
    setShowIncomingCall(false);
    setFromNumber("");
  };
  // Inside your component:
  useEffect(() => {
    if (!loanId && user?.loans?.length > 0) {
      setLoanId(user.loans[0].id);
    }
  }, [user?.loans]);
  const disabledStatus = ["Calling", "Ringing"];
  // This function can be used to update the repayment timeline
  return (
    <div>
      <button
        disabled={!!accessToken || tokenLoading}
        onClick={handelAccessToken}
        aria-busy={tokenLoading}
        aria-disabled={!!accessToken || tokenLoading}
        className={`group relative w-full max-w-xs my-2 px-6 py-4 rounded-2xl font-semibold transition-transform duration-300 ease-in-out
    ${
      accessToken || tokenLoading
        ? "bg-[var(--color-muted)] bg-opacity-50 text-[var(--color-on-surface)] opacity-70 cursor-not-allowed"
        : "bg-black text-white hover:bg-white hover:text-black hover:scale-[1.03] border border-black"
    }
    flex items-center justify-center space-x-3 focus:outline-none focus:ring-2 focus:ring-black`}
        title={
          accessToken
            ? "Access token already generated"
            : "Click to generate and initiate call"
        }
      >
        {tokenLoading ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="ml-2">Loading...</span>
          </>
        ) : (
          <>
            <BiPhoneCall className="w-6 h-6 flex-shrink-0 group-hover:animate-pulse" />
            <span>{accessToken ? "Connected ✓" : "Initiate Call Request"}</span>
          </>
        )}
      </button>

      <Dialog
        isOpen={!!accessToken}
        onClose={handelCloseDialog}
        title="Voice Call Interface"
      >
        <div className="space-y-6 text-sm font-medium text-[var(--color-on-background)]">
          {/* Connection Status */}
          <div className="bg-white p-4 rounded-xl border border-[var(--color-muted)] border-opacity-50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--color-muted)]/20 rounded-full animate-ping" />
                  <div className="relative w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <MdWifi className="text-white w-3 h-3" />
                  </div>
                </div>
                <h3 className="font-semibold text-[var(--color-on-background)]">Connected</h3>
              </div>
              <span className="bg-[var(--color-surface)] px-3 py-1 rounded-full text-xs font-medium text-[var(--color-on-surface)] opacity-80">
                #{loggedUserId.split("-")[0].toUpperCase() || "Unknown User"}
              </span>
            </div>
          </div>

          {/* Loan Selection */}
          <div className="space-y-1">
            <label className="flex items-center space-x-2 text-gray-700">
            <MdOutlineCurrencyRupee  className="w-4 h-4 text-black" />
              <span>Select Loan Account</span>
            </label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-muted)] border-opacity-50 bg-white focus:border-black focus:ring-1 focus:ring-black"
              value={loanId || ""}
              onChange={(e) => setLoanId(e.target.value)}
            >
              <option value="" disabled className="text-[var(--color-on-surface)] opacity-50">
                Choose a loan account
              </option>
              {user?.loans?.length > 0 ? (
                user.loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.formattedLoanId}
                  </option>
                ))
              ) : (
                <option disabled className="text-red-500">
                  No available loans
                </option>
              )}
            </select>
          </div>

          {/* Call Origin */}
          <div className="space-y-1">
            <label className="flex items-center space-x-2 text-[var(--color-on-surface)] opacity-80">
              <FiPhoneCall className="w-4 h-4 text-black" />
              <span>Call Origin</span>
            </label>
            <input
              type="text"
              value={fromNumber}
              disabled
              placeholder="+1 234 567 890"
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-muted)] border-opacity-50 bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80"
            />
          </div>

          {/* Destination Number & Controls */}
          <div className="pt-4 border-t border-[var(--color-muted)] border-opacity-30 space-y-3">
            <div className="space-y-1">
              <label className="flex items-center space-x-2 text-[var(--color-on-surface)] opacity-80">
                <FiPhoneCall className="w-4 h-4 text-black" />
                <span>Destination Number</span>
              </label>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="tel"
                  value={callTo}
                  disabled={!loggedUserId || callBtnDisabled}
                  placeholder="+1 234 567 890"
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-muted)] border-opacity-50 focus:border-black focus:ring-1 focus:ring-black disabled:bg-[var(--color-surface)] disabled:opacity-50"
                  onChange={(e) => setCallTo(e.target.value)}
                />
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={handleMakeCall}
                    disabled={
                      !callTo ||
                      callBtnDisabled ||
                      disabledStatus.includes(callStatus)
                    }
                    className={`w-full md:w-auto px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2
              ${
                !callTo ||
                callBtnDisabled ||
                disabledStatus.includes(callStatus)
                  ? "bg-[var(--color-muted)] bg-opacity-50 text-[var(--color-on-surface)] opacity-70 cursor-not-allowed"
                  : "bg-black text-white hover:bg-[var(--color-on-background)]"
              }`}
                  >
                    <BiPhoneIncoming className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                  <button
                    onClick={handleHangupCall}
                    disabled={hangupBtnDisabled}
                    className="w-full md:w-auto px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all disabled:bg-[var(--color-muted)] bg-opacity-50 disabled:cursor-not-allowed"
                  >
                    <MdCallEnd className="w-5 h-5" />
                    <span>End</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Incoming Call Alert */}
            {showIncomingCall && (
              <div className="animate-pulse bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-30 p-4 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-[var(--color-on-surface)] opacity-80">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600" />
                    </span>
                    <p className="font-medium">
                      Incoming call from:{" "}
                      <span className="font-semibold">
                        {incomingCall?.fromNumber}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnswerCall}
                      className="px-4 py-2 bg-black text-white rounded-md hover:bg-[var(--color-on-background)]"
                    >
                      <MdCheckCircleOutline className="inline-block w-4 h-4 mr-1" />
                      Answer
                    </button>
                    <button
                      onClick={handleRejectCall}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <MdCallMissed className="inline-block w-4 h-4 mr-1" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Call Status Display */}
            <div className="bg-white border border-[var(--color-muted)] border-opacity-30 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-xs text-[var(--color-on-surface)] opacity-70">
                <div className="flex items-center gap-2">
                  <FiActivity className="w-4 h-4 text-black" />
                  <div>
                    <div className="text-[var(--color-on-surface)] opacity-50">Status</div>
                    <div className="font-semibold text-[var(--color-on-background)]">
                      {callStatus || "Ready"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FiType className="w-4 h-4 text-black" />
                  <div>
                    <div className="text-[var(--color-on-surface)] opacity-50">Type</div>
                    <div className="font-semibold text-[var(--color-on-background)]">
                      {callType || "Voice"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden Remote Video */}
            <video ref={remoteVideo} playsInline autoPlay className="hidden" />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
