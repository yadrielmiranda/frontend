"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DIMENSION_FONT_WEIGHT,
} from "./dimension-style";

export const DIMENSION_SCREEN_FONT_SIZE_PX = 20;

type DimensionTextProps = Omit<
  React.SVGProps<SVGTextElement>,
  "fontSize" | "ref"
> & {
  fallbackFontSize: number;
  screenFontSizePx?: number;
};

/**
 * Keeps measurement labels at one CSS-pixel size while the product SVG scales.
 * The fallback is used for SSR and is replaced before the first browser paint.
 */
export function DimensionText({
  fallbackFontSize,
  screenFontSizePx = DIMENSION_SCREEN_FONT_SIZE_PX,
  ...props
}: DimensionTextProps) {
  const textRef = useRef<SVGTextElement>(null);
  const [fontSize, setFontSize] = useState(fallbackFontSize);

  const updateFontSize = useCallback(() => {
    const matrix = textRef.current?.getScreenCTM();
    if (!matrix) return;

    const renderedScale = Math.hypot(matrix.c, matrix.d);
    if (!Number.isFinite(renderedScale) || renderedScale <= 0) return;

    const nextFontSize = Number(
      (screenFontSizePx / renderedScale).toFixed(3),
    );
    setFontSize((current) =>
      Math.abs(current - nextFontSize) < 0.01 ? current : nextFontSize,
    );
  }, [screenFontSizePx]);

  useLayoutEffect(() => {
    const text = textRef.current;
    const svg = text?.ownerSVGElement;
    if (!text || !svg) return;

    let animationFrame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateFontSize);
    };

    updateFontSize();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(svg);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateFontSize]);

  return (
    <text
      {...props}
      ref={textRef}
      fill={props.fill ?? DIMENSION_COLOR}
      stroke={props.stroke ?? "none"}
      fontFamily={props.fontFamily ?? DIMENSION_FONT_FAMILY}
      fontWeight={props.fontWeight ?? DIMENSION_FONT_WEIGHT}
      fontSize={fontSize}
      data-screen-font-size={screenFontSizePx}
    />
  );
}
