import { useAppSelector } from "../redux/store";

const useSignUpVersion = () => {
  const index = useAppSelector((state) => state.index);
  const user = useAppSelector((state) => state.user);
  return (user.user.signUpVersion || index.brandConfig.signUpVersion)?.trim();
};

export default useSignUpVersion;
