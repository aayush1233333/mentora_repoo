import { useRef, useState, useCallback, useEffect } from "react";

/**
 * useWebcam – manages webcam stream + periodic frame capture
 * @param {number} fps  – frames per second to sample (default 2)
 */
export function useWebcam(fps = 2) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const timerRef   = useRef(null);
  const [active,  setActive]  = useState(false);
  const [error,   setError]   = useState(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setError(null);
    } catch (err) {
      setError(err.message || "Camera access denied");
    }
  }, []);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  /**
   * Captures one JPEG frame from the video element and returns base64 string.
   * @param {number} quality  JPEG quality 0-1 (default 0.7)
   */
  const captureFrame = useCallback((quality = 0.7) => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.split(",")[1]; // return raw base64, no prefix
  }, []);

  /**
   * Starts an interval that calls `onFrame(b64)` at the given fps.
   */
  const startCapture = useCallback((onFrame) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const b64 = captureFrame();
      if (b64) onFrame(b64);
    }, Math.round(1000 / fps));
  }, [captureFrame, fps]);

  const stopCapture = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // cleanup on unmount
  useEffect(() => () => { stop(); stopCapture(); }, [stop, stopCapture]);

  return { videoRef, canvasRef, active, error, start, stop, captureFrame, startCapture, stopCapture };
}
