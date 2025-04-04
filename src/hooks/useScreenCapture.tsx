// src/hooks/useScreenCapture.tsx

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { uploadScreenshot } from "./screenCapture/utils/uploadUtils";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus, ScreenCaptureConfig } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { requestMediaPermission, stopMediaTracks } from "./screenCapture/mediaStream";
import { lockConfiguration } from "./screenCapture/config";

const { logDebug, logError } = createLogger();

export interface CaptureConfig {
  autoStart?: boolean;
  interval?: number;
  captureCount?: number;
  autoUpload?: boolean;
  offline?: boolean;
  suppressPermissionPrompt?: boolean;
}

export const useScreenCapture = (countdownSeconds = 10, config?: CaptureConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    autoStart = true,
    interval = 10,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false
  } = config || {};

  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration({
    useLowResolution: true,
    captureWithAudio: false,
    disableAdvancedSDK: suppressPermissionPrompt
  }));

  const stopCapture = useCallback(() => {
    logDebug("[useScreenCapture] Stopping capture");
    if (timerRef.current) clearInterval(timerRef.current
