import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  HiCog6Tooth,
  HiPaintBrush,
  HiDocumentText,
  HiEnvelope,
  HiMagnifyingGlass,
  HiChartBarSquare,
} from "react-icons/hi2";
import { CiMoneyBill } from "react-icons/ci";

export function SettingsList() {
  const { brandId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const groupedSettings = useMemo(() => [
    {
      title: "General Settings",
      items: [
        {
          id: 1,
          name: "General",
          description: "Manage basic brand configuration",
          icon: HiCog6Tooth,
          link: "/general",
        },
        {
          id: 2,
          name: "Appearance",
          description: "Customize theme and display settings",
          icon: HiPaintBrush,
          link: "/appearance",
        },
        {
          id: 3,
          name: "Brand Blogs",
          description: "Manage brand blog posts and articles",
          icon: HiDocumentText,
          link: "/brand-blogs",
        },
      ],
    },
    {
      title: "Brand Configuration",
      items: [
        {
          id: 6,
          name: "Brand Details",
          description: "Update brand information and URLs",
          icon: HiDocumentText,
          link: "/brand-details",
        },
        {
          id: 7,
          name: "Brand Configuration",
          description: "Configure brand-specific settings",
          icon: HiDocumentText,
          link: "/brand-config",
        },
        {
          id: 14,
          name: "Brand Sub-Domains",
          description: "Manage sub-domains associated with the brand",
          icon: HiDocumentText,
          link: "/brand-sub-domains",
        },
        {
          id: 16,
          name: "Brand Providers",
          description: "Configure third-party service providers",
          icon: HiCog6Tooth,
          link: "/brand-providers",
        },
        {
          id: 22,
          name: "Brand Loan Agreement Configs",
          description: "Configure loan agreement templates and settings",
          icon: HiDocumentText,
          link: "/brand-loan-agreement-configs",
        },
        {
          id: 24,
          name: "Brand Evaluation Items",
          description: "Manage brand evaluation criteria and items",
          icon: HiDocumentText,
          link: "/brand-evaluation-items",
        },
        {
          id: 27,
          name: "Brand Paths",
          description: "Manage custom navigation paths for the brand",
          icon: HiDocumentText,
          link: "/brand-paths",
        },
        {
          id: 29,
          name: "Partner Permissions",
          description: "Manage partner user permissions and permission groups",
          icon: HiCog6Tooth,
          link: "/partner-permissions",
        },
        {
          id: 30,
          name: "Acefone Configuration",
          description: "Manage Acefone dialer tokens and allowed caller IDs",
          icon: HiCog6Tooth,
          link: "/brand-acefone-config",
        },
        {
          id: 31,
          name: "API Keys",
          description: "Create and manage API keys for programmatic access",
          icon: HiCog6Tooth,
          link: "/api-keys",
        },
      ],
    },
    {
      title: "Financial Settings",
      items: [
        {
          id: 5,
          name: "Bank Details",
          description: "Manage bank account details for transactions",
          icon: HiDocumentText,
          link: "/bank-details",
        },
        {
          id: 8,
          name: "Loan Configuration",
          description: "Set up loan parameters and policies",
          icon: CiMoneyBill,
          link: "/loan-config",
        },
      ],
    },
    {
      title: "Operational Settings",
      items: [
        {
          id: 4,
          name: "Brand Policy Links",
          description: "Set up brand-specific policies and guidelines",
          icon: HiDocumentText,
          link: "/brand-policy",
        },
        {
          id: 9,
          name: "Blocklist",
          description: "Manage blocklisted PAN, Mobile, and Aadhaar numbers",
          icon: HiDocumentText,
          link: "/blocklist",
        },
        {
          id: 10,
          name: "Non-Repayment Dates",
          description: "Manage non-repayment dates for the brand",
          icon: HiDocumentText,
          link: "/non-repayment-dates",
        },
        {
          id: 25,
          name: "Activity Tracking",
          description: "Monitor partner user activity and engagement analytics",
          icon: HiChartBarSquare,
          link: "/activity-tracking",
        },
        {
          id: 50,
          name: "Partner Unavailability Dates",
          description: "Manage partner unavailability dates",
          icon: HiDocumentText,
          link: "/partner-unavailability-dates",
        },
        {
          id: 11,
          name: "Brand Cards",
          description: "Manage brand-specific cards",
          icon: HiDocumentText,
          link: "/brand-cards",
        },
        {
          id: 12,
          name: "Email Reminders",
          description:
            "Manage loan email reminder settings and send reminders",
          icon: HiEnvelope,
          link: "/email-reminders",
        },
        {
          id: 13,
          name: "CSV Lead Forms",
          description: "Upload and manage CSV lead form data",
          icon: HiDocumentText,
          link: "/csv-leads",
        },
        {
          id: 15,
          name: "Rejection Reasons",
          description: "Manage reasons for rejections",
          icon: HiDocumentText,
          link: "/rejection-reasons",
        },
      ],
    },
    {
      title: "Logs & Audit",
      items: [
        {
          id: 26,
          name: "Partner User Audit Logs",
          description: "View logs of partner user activities and changes",
          icon: HiDocumentText,
          link: "/partner-user-audit-logs",
        },
        {
          id: 17,
          name: "External Logs",
          description: "View logs of external API service requests",
          icon: HiDocumentText,
          link: "/external-logs",
        },
        {
          id: 18,
          name: "Penny Drop Logs",
          description: "View logs of penny drop bank account verifications",
          icon: HiDocumentText,
          link: "/penny-drop-logs",
        },
        {
          id: 19,
          name: "PAN Details Plus Logs",
          description: "View logs of PAN verification requests",
          icon: HiDocumentText,
          link: "/pan-details-logs",
        },
        {
          id: 20,
          name: "UAN to Employment Logs",
          description: "View logs of UAN to employment verification requests",
          icon: HiDocumentText,
          link: "/uan-to-employment-logs",
        },
        {
          id: 21,
          name: "Phone to UAN Logs",
          description: "View logs of phone to UAN verification requests",
          icon: HiDocumentText,
          link: "/phone-to-uan-logs",
        },
        {
          id: 23,
          name: "Mobile Verification Logs",
          description: "View logs of mobile to address verification requests",
          icon: HiDocumentText,
          link: "/mobile-verification-logs",
        },
        {
          id: 25,
          name: "DigiLocker 2.0 Logs",
          description: "View logs of Aadhaar DigiLocker verification requests",
          icon: HiDocumentText,
          link: "/digilocker-2.0-logs",
        },
      ],
    },
  ], []);

  // Filter settings based on search term and selected group
  const filteredGroupedSettings = useMemo(() => {
    let filtered = groupedSettings;

    if (selectedGroup) {
      filtered = filtered.filter((group) => group.title === selectedGroup);
    }
    if (searchTerm.trim()) {
      filtered = filtered
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.description.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    return filtered;
  }, [searchTerm, selectedGroup, groupedSettings]);

  if (!brandId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg">
          Brand ID is required to view settings
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Settings
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Manage your application configuration and preferences.
        </p>
      </div>

      {/* Group Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedGroup === null
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--color-background)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/50"
            }`}
          >
            All
          </button>
          {groupedSettings.map((group) => (
            <button
              key={group.title}
              onClick={() => setSelectedGroup(group.title)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedGroup === group.title
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--color-background)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/50"
              }`}
            >
              {group.title}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative flex items-center">
          <HiMagnifyingGlass className="absolute left-3 w-5 h-5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        {searchTerm && (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Found {filteredGroupedSettings.reduce((sum, g) => sum + g.items.length, 0)} results
          </p>
        )}
      </div>

      {filteredGroupedSettings.length === 0 && searchTerm ? (
        <div className="p-6 text-center bg-[var(--color-background)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--muted-foreground)]">
            No settings found matching "{searchTerm}"
          </p>
        </div>
      ) : (
        filteredGroupedSettings.map((group) => (
          <div key={group.title} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
              {group.items.map((setting) => {
                const Icon = setting.icon;
                return (
                  <Link
                    to={`/${brandId}/settings${setting.link}`}
                    key={setting.id}
                    className="group flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-3 rounded-md bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-on-primary)] group-hover:bg-opacity-20 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-md font-medium text-[var(--foreground)]">
                        {setting.name}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {setting.description}
                      </p>
                    </div>
                    <div className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
