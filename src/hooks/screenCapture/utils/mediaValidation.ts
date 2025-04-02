
import { createLogger } from '../logger';

const { logDebug } = createLogger();

/**
 * Validates if a capture can be performed with the current state
 */
export const validateCapturePrerequisites = (
  mediaStream: MediaStream | null,
  status: string
): boolean => {
  if (!mediaStream) {
    logDebug(`Cannot capture: mediaStream is null`);
    return false;
  }
  
  if (status !== 'active') {
    logDebug(`Cannot capture: status=${status} is not active`);
    return false;
  }
  
  if (!mediaStream.active) {
    logDebug(`Cannot capture: mediaStream is no longer active`);
    return false;
  }
  
  return true;
};
