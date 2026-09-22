import type { LucideIcon } from "lucide-react";

export type { LucideIcon };

// Single icon wrapper so the set stays swappable (spec section 11). Icons are
// decorative by default; pass aria-label + aria-hidden={false} for meaningful ones.
interface IconProps {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function Icon({ icon: Glyph, size = 16, strokeWidth = 2, className, ...rest }: IconProps) {
  return <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest} />;
}