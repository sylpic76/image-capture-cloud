
import { useState, useEffect } from 'react';
import { checkNetworkConnectivity } from '@/utils/projectUtils';

/**
 * Hook to monitor network connectivity status
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'uncertain'>('uncertain');
  
  useEffect(() => {
    const checkNetwork = async () => {
      const isConnected = await checkNetworkConnectivity();
      setNetworkStatus(isConnected ? 'online' : 'offline');
    };
    
    // Check immediately on mount
    checkNetwork();
    
    // Then check every 30 seconds
    const interval = setInterval(checkNetwork, 30000);
    
    // Listen to browser's online/offline events
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return networkStatus;
}
