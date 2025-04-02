
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig, ScreenCaptureDiagnostics } from './screenCapture/types';
import { defaultConfig, lockConfiguration } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { validateCapturePrerequisites } from './screenCapture/utils/mediaValidation';
import { setupNetworkMonitor } from './screenCapture/networkMonitor';
import { uploadScreenshot } from './screenCapture/utils/uploadUtils';
import { prepareVideoElement, createCanvasFromVideo, cleanupResources } from './screenCapture/utils/videoProcessing';

// Set the default interval to 5 seconds
export const useScreenCapture = (intervalSeconds = 5, config = defaultConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Utiliser des refs pour avoir des références stables
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration(config));
  const timerRef = useRef<number | undefined>(undefined);
  const isCapturingRef = useRef(false);

  const { logDebug, logError } = createLogger();

  // Manage counters
  const incrementCaptureCount = useCallback(() => {
    captureCountRef.current++;
    return captureCountRef.current;
  }, []);

  const incrementSuccessCount = useCallback(() => {
    successCountRef.current++;
  }, []);

  const incrementFailureCount = useCallback(() => {
    failureCountRef.current++;
  }, []);

  // Fonction améliorée pour demander les permissions avec gestion d'événements
  const requestPermission = useCallback(async () => {
    try {
      logDebug("Requesting screen capture permission...");
      setStatus('requesting-permission');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen capture not supported in this browser");
      }
      
      // Configuration optimisée pour la capture d'écran
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: configRef.current.useLowResolution ? 1280 : 1920 },
          height: { ideal: configRef.current.useLowResolution ? 720 : 1080 },
          frameRate: { ideal: configRef.current.requestFrameRate || 30 },
        }
      };
      
      logDebug(`Requesting media with constraints: ${JSON.stringify(constraints)}`);
      
      // Tentative avec gestion d'erreur améliorée
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      } catch (e) {
        // Si l'erreur est liée aux contraintes, réessayer avec des contraintes minimales
        if (e instanceof DOMException && 
            (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError')) {
          logDebug("Constraints not satisfied, retrying with minimal constraints");
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } else {
          throw e;
        }
      }
      
      if (!stream || !stream.active || stream.getTracks().length === 0) {
        throw new Error("Stream obtained but appears to be invalid");
      }
      
      // Ajouter des event listeners aux tracks
      stream.getTracks().forEach(track => {
        logDebug(`Track obtained: id=${track.id}, kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, readyState=${track.readyState}`);
        
        // Ajouter un listener pour détecter quand l'utilisateur arrête le partage
        track.addEventListener('ended', () => {
          logDebug(`Track ${track.id} ended naturally by user or system`);
          stopCapture();
        });
      });
      
      // Stocker le stream dans la ref et non dans l'état pour éviter des re-renders
      mediaStreamRef.current = stream;
      setStatus('active');
      toast.success("Capture d'écran activée. L'application peut maintenant capturer votre écran.");
      return true;
    } catch (error) {
      logError("Permission request failed", error);
      setStatus('error');
      setLastError(error instanceof Error ? error : new Error(String(error)));
      toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      return false;
    }
  }, [logDebug, logError]);

  // Fonction de capture avec réessai
  const captureScreen = useCallback(async () => {
    // Vérifier si une capture est déjà en cours pour éviter les captures concurrentes
    if (isCapturingRef.current) {
      logDebug("Skipping capture because another capture is already in progress");
      return null;
    }

    // Vérifier si le stream est valide
    if (!mediaStreamRef.current || !validateCapturePrerequisites(mediaStreamRef.current, status)) {
      logDebug("Stream invalid for capture, skipping");
      return null;
    }

    isCapturingRef.current = true;
    
    try {
      const captureId = incrementCaptureCount();
      logDebug(`Starting screen capture #${captureId}`);
      
      // Vérifier à nouveau si le stream est actif
      if (!mediaStreamRef.current.active) {
        throw new Error("MediaStream is no longer active");
      }
      
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video tracks found in MediaStream");
      }
      
      // Vérifier si les tracks sont toujours utilisables
      const activeTracks = videoTracks.filter(track => track.readyState === "live");
      if (activeTracks.length === 0) {
        throw new Error("No active video tracks available, all tracks are in 'ended' state");
      }
      
      // Utiliser les fonctions existantes pour capturer
      const video = await prepareVideoElement(mediaStreamRef.current);
      const blob = await createCanvasFromVideo(video);
      cleanupResources(video);
      
      // Uploader la capture d'écran
      const url = await uploadScreenshot(blob, captureId);
      
      setLastCaptureUrl(url);
      incrementSuccessCount();
      
      return url;
    } catch (error) {
      logError("Screen capture failed", error);
      incrementFailureCount();
      setLastError(error instanceof Error ? error : new Error(String(error)));
      toast.error("La capture d'écran a échoué. Veuillez vérifier votre connexion et réessayer.");
      return null;
    } finally {
      isCapturingRef.current = false;
    }
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, logDebug, logError]);

  // Fonction améliorée pour arrêter les pistes média
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    // Arrêter le timer de countdown
    if (timerRef.current !== undefined) {
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    
    // Arrêter toutes les pistes du stream
    if (mediaStreamRef.current) {
      const trackCount = mediaStreamRef.current.getTracks().length;
      logDebug(`Stopping ${trackCount} media tracks`);
      
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          logDebug(`Stopping track: ${track.kind}, id=${track.id}, readyState=${track.readyState}`);
          
          // Vérifier si la piste est déjà arrêtée
          if (track.readyState !== "ended") {
            track.stop();
            logDebug(`Successfully stopped track ${track.id}`);
          } else {
            logDebug(`Track ${track.id} already ended, skipping`);
          }
        } catch (e) {
          logError(`Error stopping track ${track.id}`, e);
        }
      });
      
      mediaStreamRef.current = null;
    }
    
    setStatus('idle');
    logDebug("Capture stopped, status set to idle");
  }, [logDebug, logError]);

  // Basculer entre actif/inactif pour la capture d'écran
  const toggleCapture = useCallback(async () => {
    logDebug(`Toggle capture called, current status: ${status}`);
    
    if (status === 'idle' || status === 'error') {
      const permissionGranted = await requestPermission();
      if (permissionGranted) {
        logDebug("Permission granted, setting countdown");
        setCountdown(intervalSeconds);
      }
    } else if (status === 'active') {
      logDebug("Pausing capture");
      setStatus('paused');
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused') {
      logDebug("Resuming capture");
      setStatus('active');
      setCountdown(intervalSeconds);
      toast.success("Capture d'écran reprise");
    }
  }, [status, requestPermission, intervalSeconds, logDebug]);

  // Gérer le minuteur de compte à rebours avec useEffect
  useEffect(() => {
    if (status === 'active') {
      logDebug(`Starting countdown timer with interval: ${intervalSeconds}s`);
      
      timerRef.current = window.setInterval(() => {
        setCountdown(prevCount => {
          const newCount = prevCount <= 1 ? intervalSeconds : prevCount - 1;
          logDebug(`Countdown: ${prevCount} -> ${newCount}`);
          
          if (prevCount <= 1) {
            logDebug("Countdown reached zero, capturing screen");
            captureScreen().catch(err => {
              logError("Error during capture in timer", err);
            });
          }
          
          return newCount;
        });
      }, 1000);
    } else if (timerRef.current !== undefined) {
      logDebug("Clearing countdown timer");
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }

    return () => {
      if (timerRef.current !== undefined) {
        logDebug("Cleanup: clearing countdown timer");
        window.clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [status, captureScreen, intervalSeconds, logDebug, logError]);

  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}, config=${JSON.stringify(configRef.current)}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status, logDebug]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logDebug("Component unmounting, cleaning up media stream");
      // Utiliser la fonction stopCapture pour assurer un nettoyage complet
      stopCapture();
    };
  }, [stopCapture, logDebug]);

  // Monitor browser console for unhandled fetch errors
  useEffect(() => {
    const cleanup = setupNetworkMonitor();
    return cleanup;
  }, []);

  // Get diagnostic information
  const getDiagnostics = useCallback((): ScreenCaptureDiagnostics => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStreamRef.current,
      lastError: lastError?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      configuration: {...configRef.current},
      browserInfo: navigator.userAgent,
      isSdkDisabled: configRef.current.disableAdvancedSDK
    };
  }, [status, countdown, lastError]);

  return {
    status,
    countdown,
    toggleCapture,
    stopCapture,
    captureScreen,
    lastCaptureUrl,
    getDiagnostics,
    sdkDisabled: configRef.current.disableAdvancedSDK
  };
};
