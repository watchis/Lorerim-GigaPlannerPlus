import type { LucideIcon, LucideProps } from "lucide-react";
import { forwardRef } from "react";
import {
  Compass,
  Crosshair,
  EyeOff,
  Flame,
  FlaskConical,
  Gem,
  Hammer,
  Hand,
  HeartPulse,
  HelpCircle,
  Layers,
  MessagesSquare,
  Shield,
  Sparkles,
  Star,
  Sword,
  Swords,
  Tags,
  Users,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Chestplate = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 6c0-1.5 1.8-3 4-3s4 1.5 4 3" />
      <path d="M5 8c0 0 3.5-2 7-2s7 2 7 2v9c0 2-2.5 3.5-7 3.5S5 19 5 17V8z" />
      <path d="M12 8v11" />
      <path d="M8 11h8" />
    </svg>
  ),
);
Chestplate.displayName = "Chestplate";

const SKILL_ICONS: Record<string, LucideIcon> = {
  smithing: Hammer,
  "heavy-armor": Chestplate,
  block: Shield,
  "two-handed": Sword,
  "one-handed": Swords,
  marksman: Crosshair,
  evasion: Wind,
  sneak: EyeOff,
  wayfarer: Compass,
  finesse: Hand,
  speech: MessagesSquare,
  alchemy: FlaskConical,
  illusion: Sparkles,
  conjuration: Users,
  destruction: Flame,
  restoration: HeartPulse,
  alteration: Layers,
  enchanting: Gem,
  destiny: Star,
  traits: Tags,
};

export function getSkillIcon(skillId: string): LucideIcon {
  return SKILL_ICONS[skillId] ?? HelpCircle;
}

interface SkillIconProps {
  skillId: string;
  className?: string;
}

export function SkillIcon({ skillId, className }: SkillIconProps) {
  const Icon = getSkillIcon(skillId);
  return <Icon className={cn("shrink-0", className)} aria-hidden />;
}
