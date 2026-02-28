import { memo, useState, useCallback, useEffect } from "react";
import { cn } from "../lib/utils";
import Sidebar from "./sidebar";
import Breadcrumbs from "../common/ui/breadcrumbs";
import { NotificationBell } from "../common/ui/notification-bell";
import { UserMenuComponent } from "../features/profile";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../shared/redux/store";
import { updateBrandData } from "../shared/redux/slices/brand.slice";
import { getGeneral } from "../shared/services/api/settings/general.setting.api";
import { AcefoneIframeDialer } from "../features/acefone/components";

export const Layout = memo(({ children }: { children: React.ReactNode }) => {
  
  const { brandId } = useParams<{ brandId: string }>();
  const dispatch = useAppDispatch();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check if current domain is salary4sure
  const isSalary4sureDomain = typeof window !== 'undefined' && window.location.hostname.includes('salary4sure.com');

  // Check if current domain is zeptofinance or minutesloan (for Acefone dialer)
  const isAcefoneDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('zeptofinance.com') ||
    window.location.hostname.includes('qualoan.com') ||
    window.location.hostname.includes('minutesloan.com') ||
    window.location.hostname.includes('localhost') // For local testing
  );
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!brandId) {
      return;
    }
    const fetchGeneralSetting = async () => {
      const response = await getGeneral(brandId);
      if (!response) {
        console.log("Failed to fetch general settings for brand:", brandId);
      }
      dispatch(updateBrandData(response));
      // You can handle the response here if needed
    };
    fetchGeneralSetting();
  }, [brandId, dispatch]);

  return (
    <div className="min-h-screen bg-[#FEFEFE]">
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main
          className={cn(
            "flex-1 bg-gray-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
            isSidebarOpen ? "ml-[284px]" : "ml-16"
          )}
        >
            {/* Fixed Header with Breadcrumbs and Notifications */}
            <div className="flex-shrink-0 bg-white border-b border-[#E5E5E5] px-6 py-3 h-[78px] flex items-center justify-between">
              <div>
                <Breadcrumbs />
              </div>
              <div className="flex items-center space-x-4">
                {isAcefoneDomain && <AcefoneIframeDialer />}
                {!isSalary4sureDomain && <NotificationBell />}
                <UserMenuComponent />
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto ">
              {children}
            </div>
        </main>
      </div>
    </div>
  );
});