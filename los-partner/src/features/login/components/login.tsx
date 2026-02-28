import React from "react";
import { useDevice } from "../../../hooks/useDevice";
import { Spinner } from "../../../common/ui/spinner";
import { ForgotPasswordEmail } from "./forgotPasswordEmail";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { postLogin } from "../../../shared/services/api/auth.api";
import { useAppDispatch } from "../../../shared/redux/store";
import {
  updateAccessToken,
  updatePartnerUserData,
} from "../../../shared/redux/slices/partnerUser.slice";
import {
  storeAuthTokens,
  validateLoginResponse,
  debugAuthState,
} from "../../../utils/auth.utils";

const Login = () => {
  const { postRegisterUserDevice } = useDevice();
  const dispatch = useAppDispatch();

  const [resetPassword, setResetPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // --- Get domain and theme ---
  const fullDomain = window.location.hostname.replace("www.", "");
  const baseDomain = fullDomain.split(".").slice(-2).join(".");
  const isLocalhost = fullDomain.includes("localhost");

  const isQualoan = baseDomain === "qualoan.com";
  const isMinutesLoan = baseDomain === "minutesloan.com";
  const isPaisapop = baseDomain === "paisapop.com";
  const isZeptoFinance = baseDomain === "zeptofinance.com";
  const isSalary4Sure = baseDomain === "salary4sure.com";
  const isFastsalary = baseDomain === "fastsalary.com";
  const isSalarybolt = baseDomain === "salarybolt.com";

  // Enhanced theme setup with localhost red theme + MinutesLoan customization
  let theme = {
    primary: "#1D4ED8", // Default Blue
    secondary: "#3B82F6",
    gradientFrom: "#1D4ED8",
    gradientVia: "#3B82F6",
    gradientTo: "#93C5FD",
    accent: "#2563EB",
    name: "8Byte Loan Origination System",
  };

  if (isLocalhost) {
    theme = {
      primary: "#141237",
      secondary: "#FF2D55",
      gradientFrom: "#141237",
      gradientVia: "#141237",
      gradientTo: "#FF2D55",
      accent: "#db2777",
      name: "Paisa Pop",
    };
  } else if (isQualoan) {
    theme = {
      primary: "#EA5E18",
      secondary: "#EA5E18",
      gradientFrom: "#EA5E18",
      gradientVia: "#EA5E18",
      gradientTo: "#EA5E18",
      accent: "#EA5E18",
      name: "Qualoan",
    };
  } else if (isMinutesLoan) {
    theme = {
      name: "MinutesLoan",
      primary: "#1C376F",
      secondary: "#2D8C8C",
      gradientFrom: "#1C376F",
      gradientVia: "#2D8C8C",
      gradientTo: "#A0D8D8",
      accent: "#145374",
    };
  } else if (isZeptoFinance) {
    theme = {
      primary: "#f26a3e", // updated primary color
      secondary: "#ff9b71", // complementary secondary color
      gradientFrom: "#f26a3e", // start of gradient
      gradientVia: "#ffad85", // middle of gradient
      gradientTo: "#ffd1c1", // end of gradient
      accent: "#e05a30", // accent color for highlights
      name: "ZeptoFinance",
    };
  } else if (isPaisapop) {
    theme = {
      primary: "#141237",
      secondary: "#FF2D55",
      gradientFrom: "#141237",
      gradientVia: "#141237",
      gradientTo: "#FF2D55",
      accent: "#db2777",
      name: "Paisa Pop",
    };
  } else if (isSalary4Sure) {
    theme = {
      primary: "#7FCD2C", // Bright Green (Primary Brand Color)
      secondary: "#4A4A4A", // Deep Gray - balanced contrast
      gradientFrom: "#6AB827", // Darker shade of primary for smooth gradient
      gradientVia: "#7FCD2C", // Primary in the center
      gradientTo: "#CFF4A6", // Soft pastel green for subtle highlight
      accent: "#2E7D12", // Rich darker green for buttons/CTA hover
      name: "Salary4Sure", // Brand
    };
  } else if (isFastsalary) {
    theme = {
      primary: "#001B72", // --fs-navy: Main Brand Color
      secondary: "#D4DEFF", // --fs-soft-blue: Secondary/Background Color
      gradientFrom: "#02030A", // Darkest shade from Hero Section gradient
      gradientVia: "#001B72", // --fs-navy: Center of gradient
      gradientTo: "#EB002B", // --fs-red: Highlights/Accent color
      accent: "#EB002B", // --fs-red: Primary Call-to-Action buttons
      name: "Fast Salary", // Updated Brand Name
    };
  } else if (isSalarybolt) {
    theme = {
      primary: "#1D4ED8",
      secondary: "#3B82F6",
      gradientFrom: "#1D4ED8",
      gradientVia: "#3B82F6",
      gradientTo: "#93C5FD",
      accent: "#2563EB",
      name: "Salarybolt",
    };
  }

  // --- Handle Login Submission ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const deviceId = (await postRegisterUserDevice()) || "";
      if (!deviceId) {
        setError("Failed to register device. Please try again.");
        return;
      }

      const response = await postLogin({ email, password, deviceId });
      if (!validateLoginResponse(response)) {
        setError(response?.message || "Invalid response from server.");
        return;
      }

      storeAuthTokens(response);
      dispatch(updateAccessToken(response.accessToken));
      dispatch(updatePartnerUserData(response.data));
      debugAuthState();
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, ${theme.gradientVia} 50%, ${theme.gradientTo} 100%)`,
      }}
    >
      {/* Enhanced animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs with staggered animations */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full mix-blend-overlay blur-3xl"
            style={{
              background:
                i % 3 === 0
                  ? theme.gradientFrom
                  : i % 3 === 1
                  ? theme.gradientVia
                  : theme.gradientTo,
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.4,
              animation: `float-${i % 3} ${
                15 + Math.random() * 15
              }s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}

        {/* Animated grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(${theme.accent} 1px, transparent 1px),
              linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: "grid-scroll 20s linear infinite",
          }}
        />

        {/* Radial glow effect */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
          style={{
            background: `radial-gradient(circle at center, ${theme.gradientVia}40 0%, transparent 70%)`,
            animation: "pulse-glow 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* Main container with entrance animation */}
      <div
        className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center justify-between bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-6 md:p-10"
        style={{ animation: "slide-in 0.6s ease-out" }}
      >
        {/* Left Section */}
        <div className="text-center md:text-left md:w-1/2 text-white space-y-8 px-4">
          <h1
            className="text-4xl md:text-5xl font-extrabold leading-tight"
            style={{ animation: "fade-in-up 0.8s ease-out 0.2s both" }}
          >
            Welcome to <br />
            <span
              className="drop-shadow-md"
              style={{
                // color: theme.accent,
                animation: "glow-text 2s ease-in-out infinite",
              }}
            >
              {theme.name}
            </span>
          </h1>
          <p
            className="text-lg opacity-90 leading-relaxed"
            style={{ animation: "fade-in-up 0.8s ease-out 0.4s both" }}
          >
            Greetings! Take your customer relationships to the next level with{" "}
            <span className="font-semibold">{theme.name}</span>.
          </p>
        </div>

        {/* Right Section - Login Card */}
        <div
          className="w-full md:w-1/2 bg-white text-gray-800 rounded-2xl shadow-lg p-8 md:p-10 mt-8 md:mt-0 transition-all hover:shadow-2xl"
          style={{ animation: "fade-in-up 0.8s ease-out 0.3s both" }}
        >
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md border border-red-300 text-sm animate-shake">
              {error}
            </div>
          )}

          {resetPassword ? (
            <ForgotPasswordEmail />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: theme.primary }}
                >
                  Sign In to {theme.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Kindly login using your authenticated credentials.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g., user@${baseDomain}`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-transparent transition-all"
                  style={
                    {
                      "--focus-color": theme.primary,
                    } as React.CSSProperties
                  }
                  onFocus={(e) =>
                    (e.target.style.boxShadow = `0 0 0 3px ${theme.primary}30`)
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-transparent pr-12 transition-all"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 3px ${theme.primary}30`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <FaEyeSlash size={18} />
                    ) : (
                      <FaEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: theme.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <div className="flex justify-center items-center space-x-2">
                    <Spinner />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setResetPassword(true)}
              className="text-sm hover:underline transition-all"
              style={{ color: theme.primary }}
            >
              Forgot your password?
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <span className="animate-pulse">🔒</span>
            <span>Secured </span>
          </div>
        </div>
      </div>

      {/* Powered by footer */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
        <div
          className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-lg"
          style={{ animation: "fade-in-up 0.8s ease-out 0.8s both" }}
        >
          <p className="text-black text-sm font-medium flex items-center gap-2">
            Powered by{" "}
            <span
              className="font-bold"
              style={{
                // color: theme.accent,
                textShadow: "0 0 10px currentColor",
              }}
            >
              8Byte.ai
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float-0 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(30px, -30px) scale(1.1); opacity: 0.6; }
          66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
        }
        @keyframes float-0 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(30px, -30px) scale(1.1); opacity: 0.6; }
          66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
        }

        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.4; }
          50% { transform: translate(-40px, -40px) rotate(180deg); opacity: 0.7; }
        }

        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, 30px) scale(1.2); opacity: 0.6; }
          75% { transform: translate(-30px, -20px) scale(0.8); opacity: 0.4; }
        }

        @keyframes grid-scroll {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow-text {
          0%, 100% { text-shadow: 0 0 20px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
        }

        @keyframes pulse-circle {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.5; }
        }

        @keyframes draw-path {
          0%, 100% { stroke-dasharray: 1000; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 1000; stroke-dashoffset: 500; }
        }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
        }

        .animate-shake { 
          animation: shake 0.5s ease-in-out; 
        }
      `}</style>
    </div>
  );
};

export default Login;
