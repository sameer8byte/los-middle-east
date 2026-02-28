import React, { useState } from "react";
import { BiShield } from "react-icons/bi";
import { CgSmartphone } from "react-icons/cg";
import { RiMailLine } from "react-icons/ri";
import { FiCheck } from "react-icons/fi";

export default function ActiveTabUi({
  activeTab,
}: {
  activeTab: "mobile" | "email" | "application";
}) {
  const [, setActiveTab] = useState<"mobile" | "email" | "application">(activeTab);

  const tabs = [
    { id: "mobile", label: "Mobile", icon: <CgSmartphone /> },
    { id: "email", label: "Email", icon: <RiMailLine /> },
    { id: "application", label: "Application", icon: <BiShield /> },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div className="w-full max-w-2xl mx-auto ">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tighter">Apply for Your Loan</h1>
        <p className="mx-auto max-w-[700px] text-lg text-gray-500">
          Complete the form below to apply for your loan. It only takes a few minutes.
        </p>
      </div>

      <div className="mt-8 px-4 w-full flex justify-center">
        <div className="flex items-center gap-4">
          {tabs.map((tab, index) => {
            const status =
              index < activeIndex
                ? "completed"
                : index === activeIndex
                ? "active"
                : "upcoming";

            return (
              <React.Fragment key={tab.id}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => setActiveTab(tab.id as "mobile" | "email" | "application")}
                    className={`
                      h-10 w-10 rounded-full flex items-center justify-center
                      transition-all cursor-pointer
                      ${
                        status === "completed"
                          ? "bg-secondary hover:bg-secondary-hover"
                          : status === "active"
                          ? "bg-primary hover:bg-primary-hover"
                          : "bg-gray-200 hover:bg-gray-300"
                      }
                    `}
                  >
                    {status === "completed" ? (
                      <FiCheck className="h-5 w-5 text-white" />
                    ) : (
                      React.cloneElement(tab.icon, {
                        className: `h-5 w-5 ${
                          status === "active" ? "text-white" : "text-gray-500"
                        }`,
                      })
                    )}
                  </div>
                  <span
                    className={`
                      text-sm font-medium
                      ${
                        status === "completed"
                          ? "text-secondary"
                          : status === "active"
                          ? "text-primary"
                          : "text-gray-500"
                      }
                    `}
                  >
                    {tab.label}
                  </span>
                </div>

                {index < tabs.length - 1 && (
                  <div
                    className={`
                      w-16 h-1
                      ${index < activeIndex ? "bg-secondary" : "bg-gray-200"}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}