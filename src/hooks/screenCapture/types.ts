
export type ScreenCaptureStatus = 'idle' | 'requesting-permission' | 'active' | 'paused' | 'error';

export interface ScreenCaptureConfig {
  disableAdvancedSDK: boolean;
  requestFrameRate: number;
  enforceBasicMode: boolean;
  useLowResolution: boolean;
}

export interface ScreenCaptureDiagnostics {
  status: ScreenCaptureStatus;
  countdown: number;
  hasMediaStream: boolean;
  lastError: string | null;
  captures: number;
  successful: number;
  failed: number;
  configuration: ScreenCaptureConfig;
  browserInfo: string;
  isSdkDisabled: boolean;
}
