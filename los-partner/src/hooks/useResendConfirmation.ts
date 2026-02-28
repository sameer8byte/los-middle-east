import {  useState } from "react";
import { BrandProviderName } from "../constant/enum";

interface ResendData {
  agreementId: string;
  agreementUserId: string;
  loanId: string;
  customerName: string;
}

export function useResendConfirmation() {
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendData, setResendData] = useState<ResendData | null>(null);
  //  const apiProviders = useAppSelector((state) =>
  //     selectProvidersByType(state, BrandProviderType.LOAN_AGREEMENT)
  //   );
    // const signdeskProvider = apiProviders.find(
    //   (p) => p.provider === BrandProviderName.SIGNDESK
    // );
    // const signzyProvider = apiProviders.find(
    //   (p) => p.provider === BrandProviderName.SIGNZY
    // );
  const [selectedProvider, setSelectedProvider] = useState<BrandProviderName>(
    BrandProviderName.SIGNDESK
  );

  const handleResendConfirmation = (
    agreementId: string,
    agreementUserId: string,
    loanId: string,
    customerName: string
  ) => {
    setResendData({
      agreementId,
      agreementUserId,
      loanId,
      customerName,
    });
    setShowResendConfirmation(true);
  };

  const cancelResend = () => {
    setShowResendConfirmation(false);
    setResendData(null);
    setSelectedProvider(BrandProviderName.SIGNDESK);
  };

  const handleProviderChange = (provider: BrandProviderName) => {
    setSelectedProvider(provider);
  };

  const getResendProps = () => ({
    showResendConfirmation,
    resendData,
    selectedProvider,
    handleResendConfirmation,
    handleProviderChange,
    cancelResend,
  });
  return {
    showResendConfirmation,
    resendData,
    selectedProvider,
    handleResendConfirmation,
    handleProviderChange,
    cancelResend,
    getResendProps,
  };
}
