import { useQueryParams } from "../../hooks/useQueryParams";
import { CallMeRequest } from "./components/callMeRequest";
import { Profile } from "./components/profile";
import { UserLoginLogs } from "./components/userLoginLogs";
import UserMenu from "./components/userMenu";

export function UserMenuComponent() {
  const {
    getQuery
  } = useQueryParams();
  const profile = getQuery("is_profile") === "true";
  const isCallMeRequests = getQuery("is_call_me_requests") === "true";
  // partner_user_login_logs
  const partnerUserLoginLogs = getQuery("partner_user_login_logs") === "true";
  return (
    <div>
     {profile&& <Profile />}
     { partnerUserLoginLogs && <UserLoginLogs />}
     { isCallMeRequests && <CallMeRequest />}
        <UserMenu />
    </div>
  )

}