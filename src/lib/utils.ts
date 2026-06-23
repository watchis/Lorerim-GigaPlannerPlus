import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasDisplayText(text: string | undefined | null): boolean {
  const trimmed = text?.trim() ?? "";
  return trimmed.length > 0 && /[A-Za-z0-9]/.test(trimmed);
}

export function stripLeadingPunctuation(text: string): string {
  return text.replace(/^[.!;]\s+/, "").trim();
}
