import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postPaytringCallback } from '../../services/api/payment.api';

export function PaymentStatusSync() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
   
  useEffect(() => {
    const syncPaymentStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await postPaytringCallback(orderId);
        
        setStatus({
          success: response.success,
          message: response.message,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sync payment status');
        setStatus({
          success: false,
          message: 'Error syncing payment status',
        });
      } finally {
        setLoading(false);
      }
    };

    syncPaymentStatus();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <h1 className="text-2xl font-bold mb-4">Payment Status Sync</h1>
        <p className="text-gray-600">Syncing payment status with Paytering...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className={`p-6 rounded-lg ${status?.success ? 'bg-green-100' : 'bg-red-100'}`}>
        <h1 className={`text-2xl font-bold mb-4 ${status?.success ? 'text-green-700' : 'text-red-700'}`}>
          {status?.success ? '✓ Success' : '✗ Failed'}
        </h1>
        <p className={`text-lg ${status?.success ? 'text-green-600' : 'text-red-600'}`}>
          {status?.message}
        </p>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>
    </div>
  );
}