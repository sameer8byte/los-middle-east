import AnimatedSvgCarousel from "../../../common/ui/animatedSvgCarousel";
import EmailVerificationV1 from "./emailVerificationV1";

function EmailV1Component() {
  return (
    <div className="flex flex-col  md:flex-row items-center  h-[calc(100vh-2rem)] justify-between relative">
      <AnimatedSvgCarousel />

      <div className="w-full md:w-3/5 h-full bg-gray-50  flex justify-center items-center">
        <EmailVerificationV1 />
      </div>
    </div>
  );
}
export default EmailV1Component;
