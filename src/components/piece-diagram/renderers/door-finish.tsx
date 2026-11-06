import React from "react";

export function shadeDoorColor(color: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const channels = [1, 3, 5].map(start => {
    const channel = parseInt(color.slice(start, start + 2), 16);
    const shaded = Math.round(channel + (target - channel) * Math.abs(amount));
    return shaded.toString(16).padStart(2, "0");
  });
  return `#${channels.join("").toUpperCase()}`;
}

// The white samples come from the Pivot drawing. Other finishes use the catalog color.
export function doorFinish(color: string) {
  return (whiteSample: string, amount: number) => color === "#FFFFFF" ? whiteSample : shadeDoorColor(color, amount);
}

type FinishProps = { id: string; finish: ReturnType<typeof doorFinish> };

export function DoorFrameGradient({ id, finish }: FinishProps) {
  return <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor={finish("#F5F7F6", 0.16)} />
    <stop offset="0.46" stopColor={finish("#EEF1EF", 0)} />
    <stop offset="1" stopColor={finish("#E0E5E3", -0.16)} />
  </linearGradient>;
}

export function DoorLeafGradient({ id, finish, joinedHeight }: FinishProps & { joinedHeight?: number }) {
  // Connected profiles share lighting at the same elevation, including on a mirrored leaf.
  return <linearGradient id={id} gradientUnits={joinedHeight === undefined ? undefined : "userSpaceOnUse"}
    x1="0" y1="0" x2={joinedHeight === undefined ? 1 : 0} y2={joinedHeight ?? 1}>
    <stop offset="0" stopColor={finish("#F2F4F2", 0.12)} />
    <stop offset="0.62" stopColor={finish("#F0F2F0", 0)} />
    <stop offset="1" stopColor={finish("#ECEFED", -0.07)} />
  </linearGradient>;
}
