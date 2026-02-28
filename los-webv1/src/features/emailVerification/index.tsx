import EmailV1Component from "./components/v1";
import EmailV2Component from "./components/v2";
import useSignUpVersion from "../../hooks/useSignUpVersion";

function EmailVerificationComponent() {
  const signUpVersion = useSignUpVersion();
  if (signUpVersion === "V1") return <EmailV1Component />;
  if (signUpVersion === "V2") return <EmailV2Component />;
  return  <EmailV2Component />;
}
export default EmailVerificationComponent;
