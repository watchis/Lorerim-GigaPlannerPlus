import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { resolveCursorTooltipPosition } from "@/lib/tooltipPosition";
import { cn } from "@/lib/utils";

export const tooltipSurfaceClassName =
  "z-[100] overflow-visible rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-foreground)] shadow-[var(--shadow-panel)]";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        tooltipSurfaceClassName,
        "animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export function useSupportsHover(): boolean {
  const [supportsHover, setSupportsHover] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return supportsHover;
}

type HoverTapTooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  align?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["align"];
  contentClassName?: string;
  triggerClassName?: string;
};

/** Tooltip that opens on hover (desktop) or tap (touch). */
export function HoverTapTooltip({
  children,
  content,
  side = "bottom",
  align = "center",
  contentClassName,
  triggerClassName,
}: HoverTapTooltipProps) {
  const supportsHover = useSupportsHover();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || supportsHover) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, supportsHover]);

  const handleTap = (event: MouseEvent<HTMLSpanElement>) => {
    if (supportsHover) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  };

  return (
    <Tooltip
      open={supportsHover ? undefined : open}
      onOpenChange={supportsHover ? undefined : setOpen}
    >
      <TooltipTrigger asChild>
        <span
          ref={triggerRef}
          className={cn("inline-flex", triggerClassName)}
          onClick={handleTap}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function InfoTooltipButton({
  text,
  className,
  iconClassName,
  side = "bottom",
}: {
  text: string;
  className?: string;
  iconClassName?: string;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
}) {
  return (
    <HoverTapTooltip content={text} side={side} contentClassName="max-w-xs">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-7 min-w-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] md:min-h-0 md:min-w-0",
          className,
        )}
        aria-label={text}
      >
        <Info className={cn("h-3.5 w-3.5", iconClassName)} />
      </button>
    </HoverTapTooltip>
  );
}

export function CursorTooltip({
  children,
  content,
  className,
  style,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  touchAnchor,
  contentScale = 1,
  contentClassName,
}: {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  touchAnchor?: { x: number; y: number } | null;
  contentScale?: number;
  contentClassName?: string;
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isTouchControlled = controlledOpen !== undefined;
  const open = isTouchControlled ? controlledOpen && !disabled : hoverOpen && !disabled;

  useEffect(() => {
    if (disabled) {
      if (isTouchControlled) onOpenChange?.(false);
      else setHoverOpen(false);
    }
  }, [disabled, isTouchControlled, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (touchAnchor) {
      setAnchor({ x: touchAnchor.x, y: touchAnchor.y });
    }
  }, [touchAnchor]);

  const updateAnchor = (event: MouseEvent) => {
    setAnchor({ x: event.clientX, y: event.clientY });
  };

  useLayoutEffect(() => {
    if (!open || disabled || !tooltipRef.current) return;

    const el = tooltipRef.current;
    const updateDisplay = () => {
      const { width, height } = el.getBoundingClientRect();
      const resolved = resolveCursorTooltipPosition(anchor.x, anchor.y, width, height);
      setPosition((prev) => {
        if (prev && prev.x === resolved.x && prev.y === resolved.y) return prev;
        return resolved;
      });
    };

    updateDisplay();

    const observer = new ResizeObserver(updateDisplay);
    observer.observe(el);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateDisplay);
    viewport?.addEventListener("scroll", updateDisplay);
    window.addEventListener("resize", updateDisplay);

    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", updateDisplay);
      viewport?.removeEventListener("scroll", updateDisplay);
      window.removeEventListener("resize", updateDisplay);
    };
  }, [open, anchor, disabled, contentScale]);

  const tooltipStyle: CSSProperties = {
    left: position?.x ?? -9999,
    top: position?.y ?? -9999,
    visibility: position ? "visible" : "hidden",
    ...(contentScale !== 1
      ? {
          transform: `scale(${contentScale})`,
          transformOrigin: "top left",
        }
      : undefined),
  };

  return (
    <>
      <div
        className={className}
        style={style}
        onMouseEnter={(event) => {
          if (disabled || isTouchControlled) return;
          updateAnchor(event);
          setHoverOpen(true);
        }}
        onMouseLeave={() => {
          if (disabled || isTouchControlled) return;
          setHoverOpen(false);
        }}
        onMouseMove={(event) => {
          if (disabled || isTouchControlled) return;
          updateAnchor(event);
        }}
      >
        {children}
      </div>
      {open && !disabled &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              tooltipSurfaceClassName,
              "pointer-events-none fixed max-w-xs animate-in fade-in-0 zoom-in-95",
              contentClassName,
            )}
            style={tooltipStyle}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
