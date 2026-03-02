import { memo, useMemo, useCallback, useState } from "react";
import {
  HiCog,
  HiChevronDown,
  HiChevronRight,
  HiDocumentText,
  HiShieldCheck,
  HiCurrencyDollar,
  HiCollection,
  HiQuestionMarkCircle,
  HiSearch,
} from "react-icons/hi";
import { TbLayoutSidebarFilled } from "react-icons/tb";
import { useLocation, useParams, Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";
import { useAppSelector } from "../../shared/redux/store";
import { selectIsLoanOnboarding } from "../../shared/redux/slices/brand.slice";
import { TbLayoutSidebarRightFilled } from "react-icons/tb";
import { RxDashboard } from "react-icons/rx";
import {
  LuCheckCheck,
  LuUserCog,
  LuUserRoundCheck,
  LuUserRoundCog,
  LuUsersRound,
} from "react-icons/lu";
import { BsCheck2Circle } from "react-icons/bs";
import {
  HiOutlineDocumentChartBar,
  HiOutlineDocumentCheck,
} from "react-icons/hi2";

const Sidebar = memo(
  ({
    isOpen,
    toggleSidebar,
  }: {
    isOpen: boolean;
    toggleSidebar: () => void;
  }) => {
    const loanOnboardingEnabled = useAppSelector(selectIsLoanOnboarding);

    const { data: partnerUser } = useAppSelector((state) => state.auth);
    const brandPaths = useAppSelector((state) => state.brand.brand_paths);
    const brandConfig = useAppSelector((state) => state.brand.brandConfig);
    const location = useLocation();
    const { brandId, fallbackpage } = useParams();
    const logoUrl = useAppSelector((state) => state.brand.logoUrl);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
      {},
    );
    const toggleSubMenu = useCallback((path: string) => {
      setExpandedMenus((prev) => ({
        ...prev,
        [path]: !prev[path],
      }));
    }, []);

    // Check if unallocated customers feature is allowed for this domain
    const isAllowUnallocatedCustomersPage =
      typeof globalThis !== "undefined" &&
      globalThis.window?.location.hostname === "localhost";

    const isAllowUnallocatedLoansPage =
      typeof globalThis !== "undefined" &&
      globalThis.window?.location.hostname === "localhost";

    // Helper function to get custom label for a path
    const getPathLabel = useCallback(
      (path: string, defaultLabel: string) => {
        const customPath = brandPaths?.find((bp: any) => bp.path === path);
        return customPath?.label || defaultLabel;
      },
      [brandPaths],
    );

    // Helper function to check if a path is disabled
    const isPathDisabled = useCallback(
      (path: string) => {
        if (!path) return false;
        const customPath = brandPaths?.find((bp: any) => bp.path === path);
        return customPath?.isDisabled === true;
      },
      [brandPaths],
    );

    const menuSections = useMemo(() => {
      if (!brandId) {
        return partnerUser?.role?.includes(PartnerUserRoleEnum.SUPER_ADMIN)
          ? [
              {
                title: "Administration",
                items: [
                  {
                    path: "admin",
                    label: "Admin Panel",
                    icon: <HiCog />,
                    permission: [],
                  },
                ],
              },
            ]
          : [];
      }

      const isLoanOpsV1 = brandConfig.loan_ops_version === "V1";
      const isLoanOpsV2 = brandConfig.loan_ops_version === "V2";

      const isDashboardV1 = brandConfig?.dashboard_version === "V1";
      const isDashboardV2 = brandConfig?.dashboard_version === "V2";
      const isLoanCollectionV1 = brandConfig.loan_collection_version === "V1";
      const isLoanCollectionV2 = brandConfig.loan_collection_version === "V2";

      const defaultLabels: Record<string, string> = {
        dashboard: "Dashboard",
        "global-search": "Global Search",
        user: "User & Roles",
        customers: "Customers",
        "unallocated-customers": "Unallocated Customers",
        loans: "Loans",
        "unallocated-loans": "Unallocated Loans",
        reports: "MIS Reports",
        "credit-executive": "Credit Executive",
        "sanction-manager": "Sanction Manager",
        "sanction-head": "Sanction Head",
        "loans-ops": "Loan Ops",
        collection: "All Collection",
        "pre-collection": "Pre - Collection",
        "post-collection": "Post - Collection",
        completed: "Completed Loans",
      };

      const sections = [
        {
          title: "General",
          items: [
            ...(isDashboardV1
              ? [
                  {
                    path: "dashboard-v1",
                    label: getPathLabel("dashboard", defaultLabels["dashboard"]),
                    icon: <RxDashboard />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.VIEW_DASHBOARD,
                    ],
                  },
                ]
              : []),
            ...(isDashboardV2
              ? [
                  {
                    path: "dashboard-v2",
                    label: getPathLabel("dashboard", defaultLabels["dashboard"]),
                    icon: <RxDashboard />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.VIEW_DASHBOARD,
                    ],
                  },
                ]
              : []),
            {
              path: "global-search",
              label: getPathLabel(
                "global-search",
                defaultLabels["global-search"],
              ),
              icon: <HiSearch />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.GLOBAL_SEARCH,
              ],
            },
          ],
        },
        {
          title: "Sales & Leads",
          items: [
            ...(!loanOnboardingEnabled
              ? [
                  {
                    path: "customers",
                    label: getPathLabel(
                      "customers",
                      defaultLabels["customers"],
                    ),
                    icon: <LuUsersRound />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.CUSTOMER,
                    ],
                  },
                ]
              : []),
            ...(isAllowUnallocatedCustomersPage
              ? [
                  {
                    path: "unallocated-customers",
                    label: getPathLabel(
                      "unallocated-customers",
                      defaultLabels["unallocated-customers"],
                    ),
                    icon: <LuUsersRound />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.ONBOARDING_IN_PROGRESS,
                    ],
                  },
                ]
              : []),
          ],
        },

        {
          title: "Loan Management",
          items: [
            {
              path: "loans",
              label: getPathLabel("loans", defaultLabels["loans"]),
              icon: <HiDocumentText />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.LOANS,
              ],
            },
            ...(isAllowUnallocatedLoansPage
              ? [
                  {
                    path: "unallocated-loans",
                    label: getPathLabel(
                      "unallocated-loans",
                      defaultLabels["unallocated-loans"],
                    ),
                    icon: <HiDocumentText />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.LOANS,
                    ],
                  },
                ]
              : []),
            {
              path: "credit-executive",
              label: getPathLabel(
                "credit-executive",
                defaultLabels["credit-executive"],
              ),
              icon: <LuUserRoundCheck />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.CREDIT_EXECUTIVE,
              ],
            },
            {
              path: "sanction-manager",
              label: getPathLabel(
                "sanction-manager",
                defaultLabels["sanction-manager"],
              ),
              icon: <HiShieldCheck />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.SANCTION_MANAGER,
              ],
            },
            {
              path: "sanction-head",
              label: getPathLabel(
                "sanction-head",
                defaultLabels["sanction-head"],
              ),
              icon: <LuUserRoundCog />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.SANCTION_HEAD,
              ],
            },
          ],
        },
        {
          title: "Disbursement Operation",
          items: [
            ...(isLoanOpsV1
              ? [
                  {
                    path: "loans-ops",
                    label: getPathLabel(
                      "loans-ops",
                      defaultLabels["loans-ops"],
                    ),
                    icon: <HiCurrencyDollar />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.LOAN_OPS,
                    ],
                  },
                ]
              : []),
            ...(isLoanOpsV2
              ? [
                  {
                    path: "loans-ops",
                    label: getPathLabel(
                      "loans-ops",
                      defaultLabels["loans-ops"],
                    ),
                    icon: <HiCurrencyDollar />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.LOAN_OPS,
                    ],
                    subItems: [
                      {
                        path: "loans-ops/pending-disbursement",
                        label: "Pending Disbursement",
                      },
                      {
                        path: "loans-ops/payment-approval",
                        label: "Pending Payment Approval",
                      },
                      {
                        path: "loans-ops/payment-rejected",
                        label: "Payment Rejection",
                      },
                      {
                        path: "loans-ops/payment-approved",
                        label: "Payment Approved",
                      },
                      {
                        path: "loans-ops/no-due-pending",
                        label: "No Due Pending",
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
        {
          title: "Collections",
          items: [
            // V1 Collections - Commented out
            ...(isLoanCollectionV1
              ? [
                  {
                    path: "collection",
                    label: "Collection",
                    icon: <HiCollection />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.COLLECTIONS,
                    ],
                    subItems: [
                      {
                        path: "collection",
                        label: "All Collection",
                      },
                      {
                        path: "pre-collection",
                        label: "Pre Collection",
                      },
                      {
                        path: "post-collection",
                        label: "Post Collection",
                      },
                    ],
                  },
                ]
              : []),
            // Add V2 collection routes if enabled 
            ...(isLoanCollectionV2
              ? [
                  {
                    path: "collection/all",
                    label: "All Collection",
                    icon: <HiCollection />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.COLLECTIONS,
                    ],
                  },
                  {
                    path: "collection/pre-collection",
                    label: "Pre Collection",
                    icon: <LuCheckCheck />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.PRE_COLLECTIONS,
                    ],
                  },
                  {
                    path: "collection/post-collection",
                    label: "Post Collection",
                    icon: <BsCheck2Circle />,
                    permission: [
                      PartnerUserPermissionEnum.ALL,
                      PartnerUserPermissionEnum.POST_COLLECTIONS,
                    ],
                  },
                ]
              : []),
          ],
        },
        {
          title: "Loan Closure",
          items: [
            {
              path: "completed",
              label: getPathLabel("completed", defaultLabels["completed"]),
              icon: <HiOutlineDocumentCheck />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.COMPLETED_LOANS,
              ],
              subItems: [
                {
                  path: "completed/all",
                  label: "All",
                },
                {
                  path: "completed/closed",
                  label: "Closed",
                },
                {
                  path: "completed/settled",
                  label: "Settlement",
                },
                {
                  path: "completed/writeoff",
                  label: "Writeoff",
                },
              ],
            },
          ],
        },
        {
          title: "Insights & Reports",
          items: [
            {
              path: "reports",
              label: getPathLabel("reports", defaultLabels["reports"]),
              icon: <HiOutlineDocumentChartBar />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.MASTER_REPORTS,
                PartnerUserPermissionEnum.DISBURSED_LOAN_REPORT,
                PartnerUserPermissionEnum.NON_DISBURSED_LOAN_REPORT,
                PartnerUserPermissionEnum.COMPLETED_LOAN_WITH_NO_REPET_REPORT,
                PartnerUserPermissionEnum.ACTIVE_LOANS_BY_DUE_DATE_REPORT,
                PartnerUserPermissionEnum.MASTER_COLLECTION_REPORT,
                PartnerUserPermissionEnum.COLLECTION_LOAN_REPORT,
                PartnerUserPermissionEnum.COLLECTION_DUE_REPORT,
                PartnerUserPermissionEnum.COLLECTION_ALLOCATION_EXECUTIVE_REPORT,
                PartnerUserPermissionEnum.CIC_REPORT,
                PartnerUserPermissionEnum.MARKETING_REPORT,
                PartnerUserPermissionEnum.PROCESS_DISBURSEMENT_TRANSACTION_REPORT,
                PartnerUserPermissionEnum.FIELD_VISIT_REPORT,
              ],
            },
          ],
        },
        {
          title: "User Management",
          items: [
            {
              path: "partner-users",
              label: getPathLabel("user", defaultLabels["user"]),
              icon: <LuUserCog />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.PARTNER_USER_MANAGEMENT,
              ],
            },
          ],
        },
        {
          title: "Administration",
          items: [
            ...(partnerUser?.role?.includes(PartnerUserRoleEnum.SUPER_ADMIN)
              ? [
                  {
                    path: "admin",
                    label: "Admin Panel",
                    icon: <HiCog />,
                    permission: [],
                  },
                ]
              : []),
            {
              path: "settings",
              label: "Settings",
              icon: <HiCog />,
              permission: [
                PartnerUserPermissionEnum.ALL,
                PartnerUserPermissionEnum.BRAND_SETTINGS,
              ],
            },
          ],
        },
        {
          title: "Support",
          items: [
            {
              path: "help-center",
              label: "Help",
              icon: <HiQuestionMarkCircle />,
              permission: [],
            },
          ],
        },
      ];

      return sections.filter((section) => section.items.length > 0);
    }, [
      partnerUser?.role,
      brandId,
      getPathLabel,
      isAllowUnallocatedCustomersPage,
      isAllowUnallocatedLoansPage,
      brandConfig,
      loanOnboardingEnabled,
    ]);

    const hasPermission = useCallback(
      (permission: PartnerUserPermissionEnum[]) => {
        if (!partnerUser) return false;
        if (
          partnerUser.role?.includes(PartnerUserRoleEnum.ADMIN) ||
          partnerUser.role?.includes(PartnerUserRoleEnum.SUPER_ADMIN)
        )
          return true;

        return permission.some((p) => partnerUser.permissions.includes(p));
      },
      [partnerUser],
    );

    const isMenuItemActive = useCallback(
      (itemPath: string) => {
        const expectedPath =
          itemPath === "admin" && !brandId
            ? `/${itemPath}`
            : `/${brandId}/${itemPath}`;
        if (location.pathname === expectedPath) return true;
        if (
          fallbackpage &&
          location.pathname.includes("/customers/") &&
          itemPath === fallbackpage
        )
          return true;
        return false;
      },
      [location.pathname, brandId, fallbackpage],
    );

    return (
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-[#EDEEF3] transition-all duration-300",
          isOpen ? "w-[284px]" : "w-16",
        )}
      >
        {/* Side bar */}
        <div
          className={cn(
            "w-full h-full flex flex-col transition-all duration-300",
            isOpen ? "p-6" : "p-2",
          )}
        >
          <div
            className={cn(
              "h-full flex flex-col bg-white transition-all duration-300",
              isOpen ? "w-[236px]" : "w-12",
            )}
          >
            {/* Logo Size */}
            <div
              className={cn(
                "flex items-center mb-[22px] transition-all duration-300",
                isOpen
                  ? "w-[236px] h-[62px] justify-between"
                  : "w-12 h-12 justify-center",
              )}
            >
              <div className={cn("flex items-center flex-1", !isOpen && "hidden")}>
                {logoUrl && (
                  <img
                    // src={logoUrl}
                    src="https://8byte-middle-east-logo.s3.ap-south-1.amazonaws.com/test.webp" 
                    alt="Stc Pay Loan Logo"
                    className="w-[112px] h-[62px] object-contain"
                  />
                )}
              </div>
              <button
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center justify-center w-6 h-6 text-[#262E3D] hover:text-[#262E3D] transition-colors",
                )}
              >
                {isOpen ? (
                  <TbLayoutSidebarFilled className="w-5 h-5" />
                ) : (
                  <TbLayoutSidebarRightFilled className="w-5 h-5" />
                )}
              </button>
            </div>

            <nav
              className={cn(
                "flex-1 transition-all duration-300",
                isOpen
                  ? "space-y-[22px] overflow-y-auto"
                  : "space-y-2 overflow-visible",
              )}
            >
              {menuSections.map((section) => {
                const visibleItems = section.items.filter(
                  (item: any) =>
                    hasPermission(
                      Array.isArray(item.permission)
                        ? item.permission
                        : [item.permission],
                    ) && !isPathDisabled(item.path),
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.title}>
                    {isOpen && (
                      <div className="mb-2 relative">
                        <h3
                          className="text-[14px] font-normal capitalize leading-[18px] ml-4 mt-2"
                          style={{
                            fontFamily: "Open Sans",
                            fontWeight: 400,
                            fontSize: "14px",
                            lineHeight: "18px",
                            letterSpacing: "0%",
                            textTransform: "capitalize",
                            width:
                              section.title === "User Management"
                                ? "121px"
                                : section.title === "Loan Management"
                                  ? "123px"
                                  : section.title === "Disbursement Operation"
                                    ? "163px"
                                    : section.title === "Loan Closure"
                                      ? "86px"
                                      : section.title === "Insights & Reports"
                                        ? "119px"
                                        : section.title === "Sales & Leads"
                                          ? "95px"
                                          : "52px",
                            height: "18px",
                            color: "var(--Text-Secondary, #83899F)",
                          }}
                        >
                          {section.title}
                        </h3>
                      </div>
                    )}

                    {/* Section Items */}
                    <div className="space-y-1">
                      {visibleItems.map((item: any) => (
                        <div key={item.path || item.label} className="relative group">
                          {item.subItems ? (
                            <>
                              <button
                                onClick={() => toggleSubMenu(item.path)}
                                className={cn(
                                  "flex items-center transition-colors group relative",
                                  isOpen
                                    ? "w-full h-11 gap-[10px] rounded-xl px-4 py-3"
                                    : "w-12 h-12 justify-center rounded-lg",
                                  isMenuItemActive(item.path) ||
                                    location.pathname.includes(
                                      `/${brandId}/${item.path}`,
                                    )
                                    ? "bg-blue-50 text-blue-700"
                                    : "hover:bg-gray-50 text-[#262E3D]",
                                )}
                              >
                                {!isOpen && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-md">
                                    {item.label}
                                  </div>
                                )}
                                <span className="w-5 h-5 text-[#262E3D] group-hover:text-[#262E3D] flex-shrink-0">
                                  {item.icon}
                                </span>
                                {isOpen && (
                                  <>
                                    <span className="flex-1 text-left text-sm font-semibold text-[var(--on-surface)]">
                                      {item.label}
                                    </span>
                                    <span className="flex-shrink-0">
                                      {expandedMenus[item.path] ? (
                                        <HiChevronDown className="w-4 h-4" />
                                      ) : (
                                        <HiChevronRight className="w-4 h-4" />
                                      )}
                                    </span>
                                  </>
                                )}
                              </button>
                              {expandedMenus[item.path] && isOpen && (
                                <div className="ml-8 mt-1 space-y-1">
                                  {item.subItems.map((subItem: any) => (
                                    <Link
                                      key={subItem.path}
                                      to={`/${brandId}/${subItem.path}`}
                                      className={cn(
                                        "flex items-center w-full h-8 gap-3 rounded-lg transition-colors px-2 py-1",
                                        location.pathname ===
                                          `/${brandId}/${subItem.path}`
                                          ? "bg-blue-50 text-blue-700"
                                          : "hover:bg-gray-50 text-[#262E3D]",
                                      )}
                                    >
                                      <span className="text-sm font-medium text-[var(--on-surface)]">
                                        {subItem.label}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <Link
                              to={
                                item.path === "admin" && !brandId
                                  ? `/${item.path}`
                                  : item.path === "help-center"
                                    ? brandId
                                      ? `/${brandId}/help-center`
                                      : "/help-center"
                                    : `/${brandId}/${item.path}`
                              }
                              className={cn(
                                "flex items-center transition-colors group relative",
                                isOpen
                                  ? "w-full h-11 gap-[10px] rounded-xl px-4 py-3"
                                  : "w-12 h-12 justify-center rounded-lg",
                                isMenuItemActive(item.path)
                                  ? "bg-blue-50 text-blue-700"
                                  : "hover:bg-gray-50 text-[#262E3D]",
                              )}
                            >
                              {!isOpen && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-md">
                                  {item.label}
                                </div>
                              )}
                              <span className="w-5 h-5 text-[#262E3D] group-hover:text-[#262E3D] flex-shrink-0">
                                {item.icon}
                              </span>
                              {isOpen && (
                                <span className="text-sm font-semibold text-[var(--on-surface)]">
                                  {item.label}
                                </span>
                              )}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    );
  },
);

export default Sidebar;
