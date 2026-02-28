import AnimatedSvgCarousel from "../../common/ui/animatedSvgCarousel";
import PhoneVerification from "./components/phoneVerification";
import AuthContainer from "./components/v2";
import useSignUpVersion from "../../hooks/useSignUpVersion";

function PhoneVerificationComponent() {
  const signUpVersion = useSignUpVersion();
  return (
    <div className="flex flex-col md:flex-row items-center justify-between md:h-[calc(100vh-4rem)] relative">
      <div className=" hidden md:flex w-full md:w-1/2 h-full  justify-center items-center">
        <AnimatedSvgCarousel />
      </div>
      <div className="w-full md:w-1/2  md:h-full  md:bg-gray-50 flex justify-center items-center">
        {signUpVersion === "V2" ? (
          <AuthContainer />
        ) : (
          <PhoneVerification />
        )}
      </div>
    </div>
  );
}
export default PhoneVerificationComponent;
