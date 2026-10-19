type CameraReader = { read: (video: HTMLVideoElement) => string | null };

type CameraSessionOptions = {
  video: HTMLVideoElement;
  loadReader: () => Promise<CameraReader>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  onReady: () => void;
  onDetected: (code: string) => void;
  onError: (error: unknown) => void;
};

function cameraError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

/** Own the video listeners and startup deadline; cancellation never waits for play(). */
function waitForVideo(video: HTMLVideoElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("canplay", ready);
      video.removeEventListener("playing", ready);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
      if (error) reject(error);
      else resolve();
    };
    const ready = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) finish();
    };
    const failed = () => finish(cameraError("NotReadableError"));
    const aborted = () => finish(cameraError("AbortError"));
    const deadline = setTimeout(() => finish(cameraError("CameraStartupTimeout")), 15000);
    video.addEventListener("loadeddata", ready);
    video.addEventListener("canplay", ready);
    video.addEventListener("playing", ready);
    video.addEventListener("error", failed);
    signal.addEventListener("abort", aborted);
    if (signal.aborted) { aborted(); return; }
    try {
      void Promise.resolve(video.play()).then(ready, finish);
    } catch (error) {
      finish(error);
    }
  });
}

/** A one-reading session. Calling stop is safe before permission resolves or after capture. */
export function startMaterialCamera(options: CameraSessionOptions): () => void {
  const { video } = options;
  const startup = new AbortController();
  let active = true;
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopTracks = (media: MediaStream) => {
    media.getTracks().forEach((track) => {
      track.removeEventListener("ended", ended);
      track.stop();
    });
  };
  const stop = () => {
    if (!active) return;
    active = false;
    startup.abort();
    clearTimeout(timer);
    const ownedStream = stream;
    stream = null;
    if (ownedStream) {
      stopTracks(ownedStream);
      // A cancelled older session must not detach a newly opened camera.
      if (video.srcObject === ownedStream) {
        video.pause();
        video.srcObject = null;
      }
    }
  };
  const failed = (error: unknown) => {
    if (!active) return;
    stop();
    options.onError(error);
  };
  const ended = () => failed(cameraError("CameraInterrupted"));

  void (async () => {
    try {
      const reader = await options.loadReader();
      if (!active) return;
      const media = await options.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (!active) { stopTracks(media); return; }
      stream = media;
      media.getTracks().forEach((track) => track.addEventListener("ended", ended));
      video.srcObject = media;
      await waitForVideo(video, startup.signal);
      if (!active) return;
      options.onReady();

      const scan = () => {
        if (!active) return;
        let code: string | null;
        try {
          code = reader.read(video);
        } catch (error) {
          failed(error);
          return;
        }
        if (!active) return;
        if (code !== null && code.length > 0) {
          stop();
          options.onDetected(code);
          return;
        }
        timer = setTimeout(scan, 200);
      };
      // Keep application callbacks outside the decoder's exception handling.
      timer = setTimeout(scan, 0);
    } catch (error) {
      failed(error);
    }
  })();

  return stop;
}

export function materialCameraErrorMessage(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera access was denied. Allow camera access in your browser settings, then try again. You can also enter the barcode manually or use a barcode reader.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Connect a camera, use a barcode reader, or enter the barcode manually.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is unavailable or in use by another app. Close other camera apps and try again, or enter the barcode manually.";
    case "CameraInterrupted":
      return "The camera stopped. Try again, use a barcode reader, or enter the barcode manually.";
    default:
      return "The camera could not start or read a barcode. Try again, use a barcode reader, or enter the barcode manually.";
  }
}
