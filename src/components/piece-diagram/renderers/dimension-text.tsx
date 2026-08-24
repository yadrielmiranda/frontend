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
export const DIMENSION_LABEL_OUTWARD_GAP_PX = 10;
export const DIMENSION_LABEL_BELOW_LINE_PX = 24;
export const DIMENSION_LABEL_ABOVE_LINE_PX = -10;

type DimensionTextProps = Omit<
  React.SVGProps<SVGTextElement>,
  "dx" | "dy" | "fontSize" | "ref"
> & {
  fallbackFontSize: number;
  screenFontSizePx?: number;
  screenOffsetXPx?: number;
  screenOffsetYPx?: number;
};

/**
 * Keeps measurement labels at one CSS-pixel size while the product SVG scales.
 * The fallback is used for SSR and is replaced before the first browser paint.
 */
export function DimensionText({
  fallbackFontSize,
  screenFontSizePx = DIMENSION_SCREEN_FONT_SIZE_PX,
  screenOffsetXPx = 0,
  screenOffsetYPx = 0,
  ...props
}: DimensionTextProps) {
  const textRef = useRef<SVGTextElement>(null);
  const [layout, setLayout] = useState({
    fontSize: fallbackFontSize,
    offsetX: 0,
    offsetY: 0,
  });

  const updateFontSize = useCallback(() => {
    const matrix = textRef.current?.getScreenCTM();
    if (!matrix) return;

    const renderedScaleX = Math.hypot(matrix.a, matrix.b);
    const renderedScaleY = Math.hypot(matrix.c, matrix.d);
    if (
      !Number.isFinite(renderedScaleX) ||
      !Number.isFinite(renderedScaleY) ||
      renderedScaleX <= 0 ||
      renderedScaleY <= 0
    ) {
      return;
    }

    const nextLayout = {
      fontSize: Number((screenFontSizePx / renderedScaleY).toFixed(3)),
      offsetX: Number((screenOffsetXPx / renderedScaleX).toFixed(3)),
      offsetY: Number((screenOffsetYPx / renderedScaleY).toFixed(3)),
    };
    setLayout((current) =>
      Math.abs(current.fontSize - nextLayout.fontSize) < 0.01 &&
      Math.abs(current.offsetX - nextLayout.offsetX) < 0.01 &&
      Math.abs(current.offsetY - nextLayout.offsetY) < 0.01
        ? current
        : nextLayout,
    );
  }, [screenFontSizePx, screenOffsetXPx, screenOffsetYPx]);

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
      fontSize={layout.fontSize}
      dx={screenOffsetXPx === 0 ? undefined : layout.offsetX}
      dy={screenOffsetYPx === 0 ? undefined : layout.offsetY}
      data-screen-font-size={screenFontSizePx}
    />
  );
}
