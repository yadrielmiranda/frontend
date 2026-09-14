"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { SignatureStrokes } from "@/app/api/contracts.api";

export function SignaturePad({
  value,
  onChange,
  disabled,
}: {
  value: SignatureStrokes;
  onChange: (value: SignatureStrokes) => void;
  disabled?: boolean;
}) {
  const drawing = useRef(false);
  const current = useRef(value);
  current.current = value;
  const position = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x:
        Math.round(
          Math.min(
            1,
            Math.max(0, (event.clientX - bounds.left) / bounds.width),
          ) * 10000,
        ) / 10000,
      y:
        Math.round(
          Math.min(
            1,
            Math.max(0, (event.clientY - bounds.top) / bounds.height),
          ) * 10000,
        ) / 10000,
    };
  };
  function update(next: SignatureStrokes) {
    current.current = next;
    onChange(next);
  }
  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 600 180"
        preserveAspectRatio="none"
        aria-label="Draw your signature"
        className={`h-44 w-full rounded-lg border-2 bg-white ${disabled ? "opacity-60" : "cursor-crosshair"}`}
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          if (disabled || current.current.length >= 100) return;
          event.preventDefault();
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          update([...current.current, [position(event)]]);
        }}
        onPointerMove={(event) => {
          if (!drawing.current || disabled) return;
          const previous = current.current;
          if (previous.reduce((sum, stroke) => sum + stroke.length, 0) >= 2000)
            return;
          update([
            ...previous.slice(0, -1),
            [...previous[previous.length - 1], position(event)],
          ]);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      >
        <line
          x1="20"
          y1="148"
          x2="580"
          y2="148"
          stroke="#cbd5e1"
          strokeDasharray="4 4"
        />
        {value.map((stroke, index) => (
          <polyline
            key={index}
            points={stroke
              .map((point) => `${point.x * 600},${point.y * 180}`)
              .join(" ")}
            fill="none"
            stroke="#111827"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sign using your mouse, finger or stylus.
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !value.length}
          onClick={() => update([])}
        >
          Clear signature
        </Button>
      </div>
    </div>
  );
}
