import React, { useState } from "react";
import LoginV2 from "./login.v2";
import SignupV2 from "./signup.v2";

type AuthView = "login" | "signup";

const AuthContainer: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>("signup");

  const handleSwitchToSignup = () => {
    setCurrentView("signup");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSwitchToLogin = () => {
    setCurrentView("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      {/* Login View */}
      {currentView === "login" && (
        <LoginV2 onSwitchToSignup={handleSwitchToSignup} />
      )}

      {/* Signup View */}
      {currentView === "signup" && (
        <SignupV2 onSwitchToLogin={handleSwitchToLogin} />
      )}
    </div>
  );
};

export default AuthContainer;
