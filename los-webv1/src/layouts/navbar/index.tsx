import { useAppSelector } from "../../redux/store";
import { useLocation } from "react-router-dom";
import { HiUser } from "react-icons/hi";
import { handelLogout } from "../../hooks/handelLogout";

export function Navbar() {
  const { pathname } = useLocation();
  const user = useAppSelector((state) => state.user);
  const brand = useAppSelector((state) => state.index);

  const shouldShowProfileButton =
    pathname !== "/profile" && pathname === "/loans";
  const shopLogout = user.accessToken && !shouldShowProfileButton;
  
  const shouldShowRepayNow= pathname=="/phone-verification"

  return (
    <nav className="sticky top-0 z-40 w-full bg-white shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-2 transition-transform hover:scale-105"
          >
         {brand?.logoUrl&&   <img
              src="https://8byte-middle-east-logo.s3.ap-south-1.amazonaws.com/Stc_pay.svg.png"
              alt="Brand Logo"
              height={40}
              className="h-10 object-cover"
            />}
          </a>
        </div>

        <div className="flex items-center gap-4">
          {shouldShowRepayNow && (
             <a
              href="/repay-now"
              className="flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2"
            >
              <span>Repay Now</span>
            </a>
          )}
          {shouldShowProfileButton && (
            <a
              href="/profile"
              className="flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2"
            >
              <HiUser className="h-5 w-5 text-on-primary" />
              <span>Profile</span>
            </a>
          )}
          {shopLogout && (
            <button
              onClick={handelLogout}
              aria-label="Logout"
              className="group items-center gap-2 rounded-brand bg-primary text-on-primary  px-5 py-2 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-105 hover:from-primary-hover hover:to-secondary-hover hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 md:inline-flex"
            >
              <span className="text-sm font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
