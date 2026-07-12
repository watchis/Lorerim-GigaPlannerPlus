export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toByte = (channel: number) => Math.round(clamp01(channel) * 255);
  const rr = toByte(r).toString(16).padStart(2, "0");
  const gg = toByte(g).toString(16).padStart(2, "0");
  const bb = toByte(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function parseHexColor(input: string): Rgb | null {
  const match = input.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;

  const hex = match[1]!;
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0]! + hex[0]!, 16) / 255,
      g: parseInt(hex[1]! + hex[1]!, 16) / 255,
      b: parseInt(hex[2]! + hex[2]!, 16) / 255,
    };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function parseRgbFunctionColor(input: string): Rgb | null {
  const match = input
    .trim()
    .match(/^rgba?\(\s*([\d.]+)(?:[,\s]+)([\d.]+)(?:[,\s]+)([\d.]+)/i);
  if (!match) return null;

  return {
    r: Number(match[1]) / 255,
    g: Number(match[2]) / 255,
    b: Number(match[3]) / 255,
  };
}

export function parseColor(input: string): Rgb | null {
  const normalized = input.trim();
  return parseHexColor(normalized) ?? parseRgbFunctionColor(normalized);
}

export function normalizeColorToHex(input: string): string {
  const parsed = parseColor(input);
  return parsed ? rgbToHex(parsed) : input.trim();
}

function lerpLinearRgb(from: Rgb, to: Rgb, t: number): Rgb {
  const lr = srgbToLinear(from.r) + (srgbToLinear(to.r) - srgbToLinear(from.r)) * t;
  const lg = srgbToLinear(from.g) + (srgbToLinear(to.g) - srgbToLinear(from.g)) * t;
  const lb = srgbToLinear(from.b) + (srgbToLinear(to.b) - srgbToLinear(from.b)) * t;

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

/** Blend from the current color to the target in linear RGB space. */
export function lerpColor(from: string, to: string, t: number): string {
  if (t <= 0) return normalizeColorToHex(from);
  if (t >= 1) return normalizeColorToHex(to);

  const fromRgb = parseColor(from);
  const toRgb = parseColor(to);
  if (!fromRgb || !toRgb) {
    return t < 0.5 ? normalizeColorToHex(from) : normalizeColorToHex(to);
  }

  return rgbToHex(lerpLinearRgb(fromRgb, toRgb, t));
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
