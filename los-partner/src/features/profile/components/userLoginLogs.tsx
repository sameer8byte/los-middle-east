import { useParams } from "react-router-dom";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
 
import { useState, useEffect } from "react";
import { HiOutlineShieldCheck } from "react-icons/hi";
import { partnerUserLogin, getPartnerUserLoginLogs } from "../../../shared/services/api/partner-user.api";
import { PartnerUserLoginLog } from "../../../shared/types/partnerUser";
import { useAppSelector } from "../../../shared/redux/store";
 
export function UserLoginLogs() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const user = useAppSelector((state) => state.auth.data);

  const [isLoading, setIsLoading] = useState(false);
  const [loginLog, setLoginLog] = useState<PartnerUserLoginLog | null>(null);

  const handelPartnerUserLogin = async () => {
    if (!user?.id || !brandId) return;

    const confirmed = window.confirm(
      !loginLog || !loginLog.firstLogin
        ? "Are you sure you want to log in? After logging in, you will start receiving leads."
        : "Are you sure you want to log out? After logging out, you will not receive any leads for today."
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const log = await partnerUserLogin(brandId, user.id);
      if (log) {
        setLoginLog(log);
      }
      console.log(`Logged in user ${user.id} for brand ${brandId}`);
    } catch (error) {
      console.error("Error logging user login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchLoginLog = async () => {
      if (!user?.id || !brandId) return;
      setIsLoading(true);
      try {
        const log = await getPartnerUserLoginLogs(brandId, user.id);
        if (log) {
          setLoginLog(log);
        }
      } catch (error) {
        console.error("Error fetching login log:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoginLog();
  }, [user.id, brandId]);

  return (
    <Dialog
      isOpen={getQuery("partner_user_login_logs") === "true"}
      onClose={() => removeQuery("partner_user_login_logs")}
      title="Login Activity"
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--color-primary)] bg-opacity-15 rounded-lg">
                <HiOutlineShieldCheck className="w-6 h-6 text-[var(--color-on-primary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                  User Login Activity
                </h3>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                  Login activity for a user can be used to allocate leads to the
                  credit management team.
                </p>
              </div>
            </div>

            {loginLog?.firstLogin && (
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--color-on-background)]">First Login</p>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  {new Date(loginLog.firstLogin).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 text-[var(--color-on-surface)] opacity-80">
          {isLoading ? (
            <p>Loading login activity...</p>
          ) : loginLog ? (
            <div className="space-y-2">
              {loginLog.lastLogout ? (
                <p>
                  <span className="font-medium">Last Logout:</span>{" "}
                  {new Date(loginLog.lastLogout).toLocaleString()}
                </p>
              ) : (
                <p className="text-[var(--color-warning)]">User is currently logged in.</p>
              )}
            </div>
          ) : (
            <p className="text-[var(--color-on-surface)] opacity-70">
              No Today's login activity found for this user.
            </p>
          )}
        </div>
        {(!loginLog?.firstLogin || !loginLog.lastLogout) && (
          <div>
            <button
              onClick={handelPartnerUserLogin}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition"
            >
              {isLoading
                ? "Processing..."
                : !loginLog || !loginLog.firstLogin
                ? "Login Now"
                : "Logout Now"}
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
