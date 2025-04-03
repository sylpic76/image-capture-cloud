
import { useState, useEffect } from 'react';
import { checkNetworkConnectivity } from '@/utils/projectUtils';

/**
 * Type définissant les états possibles de connexion réseau
 */
export type NetworkStatus = 'online' | 'offline' | 'uncertain';

/**
 * Hook pour surveiller l'état de la connexion réseau, avec une approche moins restrictive
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'uncertain');
  
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const isConnected = await checkNetworkConnectivity();
        setNetworkStatus(isConnected ? 'online' : 'offline');
      } catch (error) {
        // En cas d'erreur, on considère que l'état est incertain plutôt qu'offline
        console.warn("Erreur lors de la vérification réseau", error);
        // On préfère faire confiance à l'API navigator.onLine
        setNetworkStatus(navigator.onLine ? 'uncertain' : 'offline');
      }
    };
    
    // Vérification immédiate avec un délai pour éviter les faux positifs
    setTimeout(checkNetwork, 1000);
    
    // Puis vérification toutes les 60 secondes (au lieu de 30)
    const interval = setInterval(checkNetwork, 60000);
    
    // Écoute des événements online/offline du navigateur
    const handleOnline = () => {
      console.log("[Network] Le navigateur signale une connexion");
      setNetworkStatus('online');
    };
    
    const handleOffline = () => {
      console.log("[Network] Le navigateur signale une déconnexion");
      // On passe à "uncertain" plutôt que directement à "offline"
      setNetworkStatus('uncertain');
      
      // On vérifie après un court délai pour confirmer
      setTimeout(checkNetwork, 2000);
    };
    
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
