import { Menu } from "@headlessui/react";
import { Fragment, useMemo } from "react";
import {
  HiUser,
  HiClipboardList,
  HiCog,
  HiQuestionMarkCircle,
  HiLogout,
  HiChevronDown,
} from "react-icons/hi";
import Avatar from "../../../common/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { PartnerUserPermissionEnum } from "../../../constant/enum";
import { logout } from "../../../shared/services/api/auth.api";
import { useAppSelector } from "../../../shared/redux/store";

export default function UserMenu() {
  const { brandId } = useParams<{ brandId: string }>();
  const customer = useAppSelector((state) => state.auth.data);
  const navigate = useNavigate();
  const { setQuery } = useQueryParams();

  const clearStorageAndCookies = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name =
        eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  };

  const handleLogout = async () => {
    try {
      const response = await logout();
      if (!response) throw new Error("Logout API returned no response");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearStorageAndCookies();
      navigate("/login");
    }
  };

  const handleClick = (item: (typeof menuItems)[0]) => {
    if (item.label === "Logout") {
      handleLogout();
    } else if (item.label === "Profile") {
      setQuery("is_profile", "true");
    } else if (item.label === "Activity Log") {
      setQuery("partner_user_login_logs", "true");
    } else if (item.label === "call me requests") {
      if (brandId) {
        setQuery("is_call_me_requests", "true");
      }
    } else if (item.href) {
      navigate(item.href);
    }
  };

  const menuItems = useMemo(
    () => [
      { label: "Profile", icon: HiUser, href: null, isActive: true },

      {
        label: "Activity Log",
        icon: HiClipboardList,
        href: null,
        isActive: !!(
          customer?.permissions.includes(PartnerUserPermissionEnum.CREDIT_EXECUTIVE) &&
          customer?.reportsToId
        ),
      },

      { label: "Settings", icon: HiCog, href: brandId ? `/${brandId}/settings` : "/settings", isActive: true },
      {
        label: "call me requests",
        icon: HiClipboardList,
        href: null,
        isActive: !!brandId,
        divider: true,
      },
      {
        label: "Help Centre",
        icon: HiQuestionMarkCircle,
        href: brandId ? `/${brandId}/help-center` : undefined,
        isActive: !!brandId,
      },
      {
        label: "Logout",
        icon: HiLogout,
        href: null,
        divider: true,
        isActive: true,
      },
    ],
    [brandId]
  );

  return (
    <div className="relative inline-block text-left">
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center space-x-3 rounded-full hover:bg-gray-50 p-2 transition-colors">
          <Avatar name={customer?.name || "User"} size="w-10 h-10" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-[var(--on-surface)]">
              {customer?.name || "User"}
            </span>
            <span className="text-xs text-[var(--on-surface)]/50">
              {customer?.role?.[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "User"}
            </span>
          </div>
          <HiChevronDown className="w-4 h-4 text-gray-400" />
        </Menu.Button>
        <Menu.Items className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 cursor-pointer">
          {menuItems
            .filter((item) => item.isActive === true)
            .map((item, index) => (
              <Fragment key={index}>
                {item.divider && <div className="border-t my-1" />}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleClick(item)}
                      className={`${
                        active ? "bg-[var(--muted)]/5" : ""
                      } group flex w-full items-center px-4 py-2 text-sm text-[var(--on-surface)] font-medium cursor-pointer hover:bg-[var(--muted)]/5 transition-colors`}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-[var(--on-surface)]/50" />
                      {item.label}
                    </button>
                  )}
                </Menu.Item>
              </Fragment>
            ))}
        </Menu.Items>
      </Menu>
    </div>
  );
}
