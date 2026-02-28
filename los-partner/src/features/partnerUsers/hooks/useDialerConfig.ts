import { useState } from "react";

export interface UseDialerConfigReturn {
  isDialerConfigOpen: boolean;
  selectedPartnerUserId: string | null;
  openDialerConfig: (userId: string) => void;
  closeDialerConfig: () => void;
}

export function useDialerConfig(): UseDialerConfigReturn {
  const [isDialerConfigOpen, setIsDialerConfigOpen] = useState(false);
  const [selectedPartnerUserId, setSelectedPartnerUserId] = useState<
    string | null
  >(null);

  const openDialerConfig = (userId: string) => {
    setSelectedPartnerUserId(userId);
    setIsDialerConfigOpen(true);
  };

  const closeDialerConfig = () => {
    setIsDialerConfigOpen(false);
    setSelectedPartnerUserId(null);
  };

  return {
    isDialerConfigOpen,
    selectedPartnerUserId,
    openDialerConfig,
    closeDialerConfig,
  };
}
