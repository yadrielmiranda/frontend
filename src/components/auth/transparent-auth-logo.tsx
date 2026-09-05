"use client";

import { useEffect, useRef } from "react";

const SAFARI_VIDEO = "/branding/authentic-login-logo-safari.mov";

const DEFAULT_VIDEO = "/branding/authentic-login-logo.webm";

const POSTER = "/branding/authentic-login-logo.png";

type AlphaVideoConfiguration = {
  contentType: string;
  width: number;
  height: number;
  bitrate: number;
  framerate: number;

  // Nombre actual de la especificación.
  hasAlphaChannel?: boolean;

  // Nombre utilizado por implementaciones anteriores de Safari.
  alphaChannel?: boolean;
};

type AlphaDecodingResult = {
  supported: boolean;

  // Nombre actual.
  configuration?: {
    video?: AlphaVideoConfiguration;
  };

  // Compatibilidad con implementaciones anteriores.
  supportedConfiguration?: {
    video?: AlphaVideoConfiguration;
  };
};

type OptionalMediaCapabilities = {
  mediaCapabilities?: {
    decodingInfo: (configuration: {
      type: "file";
      video: AlphaVideoConfiguration;
    }) => Promise<AlphaDecodingResult>;
  };
};

function isSafariFamily(): boolean {
  const userAgent = navigator.userAgent;

  const isIOS =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isDesktopSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|OPiOS|FxiOS|Firefox/i.test(
      userAgent,
    );

  return isIOS || isDesktopSafari;
}

function browserCanPlayHevc(): boolean {
  const probe = document.createElement("video");

  return (
    probe.canPlayType('video/quicktime; codecs="hvc1"') !== "" ||
    probe.canPlayType('video/mp4; codecs="hvc1"') !== ""
  );
}

async function shouldUseSafariVideo(): Promise<boolean> {
  // Los demás navegadores deben usar WebM.
  if (!isSafariFamily()) {
    return false;
  }

  const hevcFallback = browserCanPlayHevc();

  const mediaCapabilities = (navigator as unknown as OptionalMediaCapabilities)
    .mediaCapabilities;

  if (!mediaCapabilities?.decodingInfo) {
    return hevcFallback;
  }

  try {
    const result = await mediaCapabilities.decodingInfo({
      type: "file",
      video: {
        contentType: 'video/mp4; codecs="hvc1"',
        width: 752,
        height: 720,
        bitrate: 2_800_000,
        framerate: 24,

        // Especificación actual.
        hasAlphaChannel: true,

        // Compatibilidad con Safari anterior.
        alphaChannel: true,
      },
    });

    const returnedVideo =
      result.configuration?.video ?? result.supportedConfiguration?.video;

    const alphaWasRecognized =
      returnedVideo?.hasAlphaChannel === true ||
      returnedVideo?.alphaChannel === true;

    if (result.supported && alphaWasRecognized) {
      return true;
    }

    // Safari puede reproducirlo aunque su implementación
    // no devuelva explícitamente la propiedad alpha.
    return hevcFallback;
  } catch {
    return hevcFallback;
  }
}

export function TransparentAuthLogo({ companyName }: { companyName: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function configureVideo() {
      const useSafariVideo = await shouldUseSafariVideo();

      if (cancelled) return;

      const video = videoRef.current;
      if (!video) return;

      // Ayuda a que Safari permita autoplay.
      video.muted = true;
      video.defaultMuted = true;

      video.src = useSafariVideo ? SAFARI_VIDEO : DEFAULT_VIDEO;

      video.load();

      try {
        await video.play();
      } catch {
        // Si autoplay es bloqueado, permanece visible
        // el poster PNG.
      }
    }

    void configureVideo();

    return () => {
      cancelled = true;

      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="relative h-44 w-full max-w-sm sm:h-56 lg:h-[330px] lg:max-w-lg">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster={POSTER}
        width={752}
        height={720}
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        tabIndex={-1}
        aria-label={companyName}
        draggable={false}
        className="pointer-events-none h-full w-full select-none bg-transparent object-contain drop-shadow-[0_22px_55px_rgba(220,38,38,0.35)]"
      />

      {/* Evita las opciones flotantes de Edge al hacer hover */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 cursor-default"
      />
    </div>
  );
}
