import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useCustomerNavigator() {
  const navigate = useNavigate();

  const handleView = useCallback((customerId: string, brandId: string
    ,tabId: string
  ) => {
    navigate(`/${brandId}/${tabId}/customers/${customerId}?tab=PERSONAL_DETAILS`);
  }, [navigate]);

  return {
    handleView,
  };
}
