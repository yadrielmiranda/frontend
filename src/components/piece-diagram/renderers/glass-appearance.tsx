import React from "react";

export type GlassOverlayRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

function normalizedTint(value?: string | null): string | null {
  const tint = value?.trim();

  if (!tint || !/^#[0-9A-Fa-f]{6}$/.test(tint)) return null;

  const normalized = tint.toUpperCase();
  return normalized === "#FFFFFF" || normalized === "#F7FBFF"
    ? null
    : normalized;
}

export function GlassAppearanceLayer({
  rects,
  glassTintHex,
  hasCoating,
  hasPrivacy,
}: {
  rects: readonly GlassOverlayRect[];
  glassTintHex?: string | null;
  hasCoating?: boolean;
  hasPrivacy?: boolean;
}) {
  const tint = normalizedTint(glassTintHex);

  if (!tint && !hasCoating && !hasPrivacy) return null;

  return (
    <g pointerEvents="none" data-layer="GLASS_APPEARANCE">
      {tint
        ? rects.map((rect, index) => (
            <rect
              key={`tint-${index}`}
              {...rect}
              fill={tint}
              fillOpacity={0.3}
              style={{ mixBlendMode: "multiply" }}
              data-glass-effect="TINT"
            />
          ))
        : null}

      {hasPrivacy
        ? rects.map((rect, index) => (
            <rect
              key={`privacy-${index}`}
              {...rect}
              fill="#334155"
              fillOpacity={0.18}
              style={{ mixBlendMode: "multiply" }}
              data-glass-effect="PRIVACY"
            />
          ))
        : null}

      {hasCoating
        ? rects.map((rect, index) => (
            <rect
              key={`coating-${index}`}
              {...rect}
              fill="#BFEAFF"
              fillOpacity={hasPrivacy ? 0.06 : 0.11}
              style={{ mixBlendMode: "screen" }}
              data-glass-effect="COATING"
            />
          ))
        : null}
    </g>
  );
}
