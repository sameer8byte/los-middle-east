import AnimatedSvgCarousel from "../../../common/ui/animatedSvgCarousel";
import EmailVerificationV2 from "./emailVerificationV2";
 import PersonalDetails from "./personalDetails";

function EmailV2Component() {
  return (
    <div className="flex flex-col  md:flex-row items-center  h-[calc(100vh-4rem)] justify-between relative">
      <div className="hidden md:flex md:w-2/5 h-full justify-center items-center">
      <AnimatedSvgCarousel />
     </div>
      <PersonalDetails />
      <div className="w-full md:w-3/5 h-full bg-gray-50  flex justify-center items-center">
        <EmailVerificationV2 />
      </div>
    </div>
  );
}
export default EmailV2Component;
