import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type CashfreeCheckoutOptions = {
  paymentSessionId: string;
};

interface CashfreeSDK {
  checkout: (options: CashfreeCheckoutOptions) => Promise<void>;
}

type CashfreeConstructor = (options: { mode: string }) => CashfreeSDK;

declare global {
  interface Window {
    Cashfree?: CashfreeConstructor;
  }
}

// Augment globalThis with Window properties
declare const window: Window;

const centerStyles: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
};

export default function CashfreeCheckout() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // Read session_id from URL
  const sessionId = globalThis.location?.search
    ? new URLSearchParams(globalThis.location.search).get("session_id")
    : null;

  useEffect(() => {
    if (!sessionId) {
      setError("Cashfree session_id is missing in URL");
      setLoading(false);
      return;
    }

    // Prevent double execution (React StrictMode)
    if (initializedRef.current) return;
    initializedRef.current = true;

    // eslint-disable-next-line sonarjs/cognitive-complexity
    const loadCashfreeSDK = async (): Promise<CashfreeConstructor> => {
      if (window.Cashfree) {
        return window.Cashfree;
      }

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;

      // eslint-disable-next-line no-inner-declarations
      const loadScript = (): Promise<CashfreeConstructor> => {
        return new Promise((resolve, reject) => {
          // eslint-disable-next-line func-style
          const onScriptLoad = () => {
            if (window.Cashfree) {
              resolve(window.Cashfree);
            } else {
              reject(new Error("Cashfree SDK loaded but not available"));
            }
          };

          // eslint-disable-next-line func-style
          const onScriptError = () => {
            reject(new Error("Failed to load Cashfree SDK script"));
          };

          script.onload = onScriptLoad;
          script.onerror = onScriptError;
          document.body.appendChild(script);
        });
      };

      return loadScript();
    };

    // eslint-disable-next-line no-inner-declarations
    const initializePayment = async (): Promise<void> => {
      try {
        const Cashfree = await loadCashfreeSDK();
        const cashfree = Cashfree?.({
          mode: "production",
        });

        await cashfree?.checkout({
          paymentSessionId: sessionId,
        });
      } catch (err) {
        console.error(err);
        const errorMsg =
          err instanceof Error ? err.message : "Unable to start payment";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initializePayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={centerStyles}>
        <h3>Redirecting to payment...</h3>
        <p>Please do not refresh or press back</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centerStyles}>
        <h3 style={{ color: "red" }}>Payment Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={centerStyles}>
      <h3>Opening Cashfree Checkout…</h3>
    </div>
  );
}
