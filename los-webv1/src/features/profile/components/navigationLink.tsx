import { JSX, useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BiChevronRight,
  BiLogOut,
  BiBriefcase,
  BiBarChart,
  BiHelpCircle,
  BiShieldQuarter,
  BiLock,
  BiFileBlank,
  BiBlanket,
  BiMenu,
  BiX,
} from "react-icons/bi";
import { handelLogout } from "../../../hooks/handelLogout";
import { useAppSelector } from "../../../redux/store";

interface NavItem {
  id: number;
  name: string;
  icon: JSX.Element;
  path: string;
  color?: string;
  category: "main" | "support" | "account";
  type: "query" | "redirect" | "button";
}

export default function NavigationLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const brand = useAppSelector((state) => state.index);
  const [activePath, setActivePath] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname.split("/").pop();
    setActivePath(currentPath || "");
  }, [location]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const navLinks = useMemo<NavItem[]>(
    () => [
      {
        id: 1,
        name: "Personal Information",
        icon: <BiBriefcase size={22} />,
        path: "personal-information",
        category: "main",
        type: "query",
      },
      {
        id: 2,
        name: "Employment Information",
        icon: <BiBriefcase size={22} />,
        path: "employment-information",
        category: "main",
        type: "query",
      },
      {
        id: 3,
        name: "Bank Information",
        icon: <BiBlanket size={22} />,
        path: "bank-information",
        category: "main",
        type: "query",
      },
      {
        id: 4,
        name: "Loan Information",
        icon: <BiBarChart size={22} />,
        path: "loan-information",
        category: "main",
        type: "query",
      },
      {
        id: 5,
        name: "Documents",
        icon: <BiFileBlank size={22} />,
        path: "documents",
        category: "main",
        type: "query",
      },
      {
        id: 6,
        name: "Help & Support",
        icon: <BiHelpCircle size={22} />,
        path: "help-and-support",
        category: "support",
        type: "query",
      },
      {
        id: 7,
        name: "Terms & Conditions",
        icon: <BiShieldQuarter size={22} />,
        path: brand.brandPolicyLinks.termsConditionUrl,
        category: "support",
        type: "redirect",
      },
      {
        id: 8,
        name: "Privacy Policy",
        icon: <BiLock size={22} />,
        path: brand.brandPolicyLinks.privacyPolicyUrl,
        category: "support",
        type: "redirect",
      },
      {
        id: 9,
        name: "Logout",
        icon: <BiLogOut size={22} />,
        path: "logout",
        color: "#dc2626",
        category: "account",
        type: "button",
      },
    ],
    [brand]
  );

  const handleNavigation = async (item: NavItem) => {
    if (item.path === "logout") {
      try {
        await handelLogout();
        navigate("/login");
      } catch (error) {
        console.error("Logout failed:", error);
      }
      return;
    }
    if (item.type === "redirect") {
      window.location.href = item.path;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("profileId", item.path);
    window.history.pushState({}, "", `?${params}`);
    window.location.href = `?${params}`;
  };

  const renderLinks = (category: NavItem["category"]) =>
    navLinks
      .filter((item) => item.category === category)
      .map((item) => {
        const isActive = activePath === item.path;
        const isLogout = item.path === "logout";
        return (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            className="
              w-full flex items-center justify-between gap-3 px-3 py-3 
              transition-all duration-200 ease-out font-medium text-sm
              relative group outline-none
            "
            style={{
              borderRadius: "var(--radius-brand)",
              backgroundColor: isActive 
                ? "var(--color-primary)" 
                : isLogout 
                ? "transparent" 
                : "transparent",
              color: isActive 
                ? "var(--color-on-primary)" 
                : isLogout 
                ? "var(--color-error)" 
                : "var(--color-on-surface)",
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isLogout) {
                e.currentTarget.style.backgroundColor = "var(--color-surface)";
              }
              if (isLogout) {
                e.currentTarget.style.backgroundColor = "var(--color-error)";
                e.currentTarget.style.color = "var(--color-on-primary)";
                e.currentTarget.style.opacity = "0.85";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
              if (isLogout) {
                e.currentTarget.style.color = "var(--color-error)";
                e.currentTarget.style.opacity = "1";
              }
            }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span 
                className="flex-shrink-0 transition-all duration-200"
                style={{
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  opacity: isActive ? "1" : "0.7",
                }}
              >
                {item.icon}
              </span>
              <span className="truncate text-sm" style={{ fontFamily: "var(--font-brand)" }}>
                {item.name}
              </span>
            </div>
            <BiChevronRight 
              size={16} 
              className="flex-shrink-0 transition-all duration-200"
              style={{
                transform: isActive ? "translateX(4px) scale(1.1)" : "translateX(-2px) scale(0.9)",
                opacity: isActive ? "1" : "0.4",
              }}
            />
          </button>
        );
      });

  return (
    <>
      {/* Mobile Menu Button */}
      <div 
        className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 mb-2 transition-all duration-200"
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-brand)",
          border: "1px solid rgba(var(--primary), 0.15)",
        } as React.CSSProperties}
      >
        <div>
          <span 
            className="text-xs uppercase tracking-wider font-bold block leading-none" 
            style={{ 
              color: "var(--color-on-surface)",
              fontFamily: "var(--font-brand)",
              fontSize: "var(--text-base)",
            }}
          >
            Menu
          </span>
          <span 
            className="text-xs leading-tight block mt-0.5" 
            style={{ 
              color: "var(--color-muted)",
              fontSize: "11px",
              fontFamily: "var(--font-brand)",
            }}
          >
            Navigate
          </span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2 transition-all duration-200 outline-none"
          style={{
            backgroundColor: isMenuOpen ? "var(--color-error)" : "var(--color-primary)",
            color: "var(--color-on-primary)",
            borderRadius: "var(--radius-brand)",
            opacity: "0.9",
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
        >
          {isMenuOpen ? <BiX size={18} /> : <BiMenu size={18} />}
        </button>
      </div>

      {/* Desktop Menu */}
      <div 
        className="hidden md:flex flex-col p-6 overflow-y-auto transition-all duration-300"
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-brand)",
          border: "1px solid rgba(var(--on-surface), 0.08)",
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="mb-6 pb-4" style={{ borderBottom: "1px solid rgba(var(--on-surface), 0.08)" }}>
          <h2 
            className="text-base font-bold leading-tight" 
            style={{ 
              color: "var(--color-on-surface)",
              fontFamily: "var(--font-brand)",
            }}
          >
            Profile
          </h2>
        </div>

        {/* Navigation Section */}
        <div className="mb-5">
          <h3 
            className="text-xs font-bold uppercase tracking-wider mb-2 px-1" 
            style={{ 
              color: "var(--color-muted)",
              fontSize: "10px",
              fontFamily: "var(--font-brand)",
              letterSpacing: "0.5px",
            }}
          >
            Navigation
          </h3>
          <div className="space-y-1">
            {renderLinks("main")}
          </div>
        </div>

        {/* Support Section */}
        <div className="mb-5">
          <h3 
            className="text-xs font-bold uppercase tracking-wider mb-2 px-1" 
            style={{ 
              color: "var(--color-muted)",
              fontSize: "10px",
              fontFamily: "var(--font-brand)",
              letterSpacing: "0.5px",
            }}
          >
            Support
          </h3>
          <div className="space-y-1">
            {renderLinks("support")}
          </div>
        </div>

        {/* Account Section */}
        <div 
          className="mt-auto pt-5" 
          style={{ borderTop: "1px solid rgba(var(--on-surface), 0.08)" }}
        >
          <h3 
            className="text-xs font-bold uppercase tracking-wider mb-2 px-1" 
            style={{ 
              color: "var(--color-muted)",
              fontSize: "10px",
              fontFamily: "var(--font-brand)",
              letterSpacing: "0.5px",
            }}
          >
            Account
          </h3>
          <div className="space-y-1">
            {renderLinks("account")}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 flex justify-end animate-in fade-in duration-300"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="w-80 shadow-2xl max-h-screen overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300"
            style={{ backgroundColor: "var(--color-background)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="sticky top-0 px-6 py-5 flex items-center justify-between z-10 transition-all duration-200"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
              } as React.CSSProperties}
            >
              <div>
                <h2 
                  className="text-lg font-bold leading-tight" 
                  style={{ 
                    fontFamily: "var(--font-brand)",
                    color: "var(--color-on-primary)",
                  }}
                >
                  Menu
                </h2>
                <p 
                  className="text-xs mt-1" 
                  style={{ 
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "11px",
                    fontFamily: "var(--font-brand)",
                  }}
                >
                  Navigate profile
                </p>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="hover:opacity-80 p-2 rounded-lg transition-all duration-200 outline-none"
                style={{ 
                  color: "var(--color-on-primary)",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                }}
              >
                <BiX size={20} />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
              {/* Navigation Section */}
              <div>
                <h3 
                  className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1" 
                  style={{ 
                    color: "var(--color-muted)",
                    fontSize: "10px",
                    fontFamily: "var(--font-brand)",
                    letterSpacing: "0.5px",
                  }}
                >
                  Navigation
                </h3>
                <div className="space-y-1">
                  {renderLinks("main")}
                </div>
              </div>

              {/* Support Section */}
              <div>
                <h3 
                  className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1" 
                  style={{ 
                    color: "var(--color-muted)",
                    fontSize: "10px",
                    fontFamily: "var(--font-brand)",
                    letterSpacing: "0.5px",
                  }}
                >
                  Support
                </h3>
                <div className="space-y-1">
                  {renderLinks("support")}
                </div>
              </div>

              {/* Account Section */}
              <div style={{ borderTop: "1px solid rgba(var(--on-surface), 0.08)", paddingTop: "1.5rem" }}>
                <h3 
                  className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1" 
                  style={{ 
                    color: "var(--color-muted)",
                    fontSize: "10px",
                    fontFamily: "var(--font-brand)",
                    letterSpacing: "0.5px",
                  }}
                >
                  Account
                </h3>
                <div className="space-y-1">
                  {renderLinks("account")}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="px-6 py-3 text-center text-xs transition-all duration-200"
              style={{
                borderTop: "1px solid rgba(var(--on-surface), 0.08)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-muted)",
                fontSize: "11px",
                fontFamily: "var(--font-brand)",
              } as React.CSSProperties}
            >
              v1.0 • Quapay Partner
            </div>
          </div>
        </div>
      )}
    </>
  );
}
