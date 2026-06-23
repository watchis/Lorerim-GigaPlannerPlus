import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const TOOLTIP_OFFSET = 12;
const VIEWPORT_PADDING = 8;

function clampTooltipToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
  return {
    x: Math.min(Math.max(x, VIEWPORT_PADDING), maxX),
    y: Math.min(Math.max(y, VIEWPORT_PADDING), maxY),
  };
}

export const tooltipSurfaceClassName =
  "z-30 overflow-visible rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-foreground)] shadow-[var(--shadow-panel)]";

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

export function CursorTooltip({
  children,
  content,
  className,
  style,
}: {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = (event: MouseEvent) => {
    setPosition({
      x: event.clientX + TOOLTIP_OFFSET,
      y: event.clientY + TOOLTIP_OFFSET,
    });
  };

  useLayoutEffect(() => {
    if (!open || !tooltipRef.current) return;
    const { width, height } = tooltipRef.current.getBoundingClientRect();
    const clamped = clampTooltipToViewport(position.x, position.y, width, height);
    if (clamped.x !== position.x || clamped.y !== position.y) {
      setPosition(clamped);
    }
  }, [open, position]);

  return (
    <>
      <div
        className={className}
        style={style}
        onMouseEnter={(event) => {
          updatePosition(event);
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onMouseMove={updatePosition}
      >
        {children}
      </div>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              tooltipSurfaceClassName,
              "pointer-events-none fixed max-w-xs animate-in fade-in-0 zoom-in-95",
            )}
            style={{ left: position.x, top: position.y }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
