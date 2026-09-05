import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────
// Base HoverCard primitives with Portal/Fixed positioning
// ─────────────────────────────────────────────

const HoverCardContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

const HoverCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const [timer, setTimer] = React.useState<ReturnType<typeof setTimeout> | null>(
    null
  );
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timer) clearTimeout(timer);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    const t = setTimeout(() => setOpen(false), 250);
    setTimer(t);
  };

  return (
    <HoverCardContext.Provider value={{ open, setOpen, triggerRef }}>
      <div
        className={cn("relative inline-block", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </HoverCardContext.Provider>
  );
};

const HoverCardTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { triggerRef } = React.useContext(HoverCardContext);
  return (
    <div
      ref={triggerRef as React.RefObject<HTMLDivElement>}
      className={cn("inline-block cursor-pointer", className)}
    >
      {children}
    </div>
  );
};

const HoverCardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open, triggerRef } = React.useContext(HoverCardContext);
  const [coords, setCoords] = React.useState({
    top: 0,
    left: 0,
    showAbove: false,
  });

  // Calculate position on open and clamp to viewport
  React.useEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 0;
    const viewportWidth = window.innerWidth || 0;

    const CARD_WIDTH = 420; // matches max width
    const V_OFFSET = 8; // gap from trigger
    const H_PADDING = 8; // min distance from viewport sides
    const APPROX_CARD_HEIGHT = 420; // approximate card height

    const spaceBelow = viewportHeight - rect.bottom;
    const showAbove = spaceBelow < APPROX_CARD_HEIGHT;

    let top = showAbove ? rect.top - V_OFFSET : rect.bottom + V_OFFSET;
    let left = rect.left + rect.width / 2;

    // Clamp horizontally so card stays inside viewport
    if (viewportWidth > 0) {
      const minLeft = H_PADDING + CARD_WIDTH / 2;
      const maxLeft = viewportWidth - H_PADDING - CARD_WIDTH / 2;
      left = Math.min(maxLeft, Math.max(minLeft, left));
    }

    // Clamp vertically a bit so it can't completely leave the screen
    if (viewportHeight > 0) {
      const minTop = V_OFFSET;
      const maxTop = viewportHeight - V_OFFSET;
      top = Math.min(maxTop, Math.max(minTop, top));
    }

    // Optional: on very small screens, center the card
    if (viewportWidth > 0 && viewportWidth < 640) {
      left = viewportWidth / 2;
    }

    setCoords({ top, left, showAbove });
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    // Fixed position relative to viewport, prevents clipping by table overflow
    <div
      className={cn(
        "fixed z-[9999] bg-white border border-border rounded-xl shadow-2xl",
        // Responsive width: max 420px, but fit within viewport on mobile
        "max-w-[420px] w-[calc(100vw-32px)]",
        // Ensure card never exceeds viewport height
        "max-h-[80vh] overflow-hidden",
        // Simple fade in
        "animate-in fade-in-0 duration-150",
        // center horizontally around left coord
        "-translate-x-1/2",
        coords.showAbove ? "-translate-y-full" : "",
        className
      )}
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────
// Metal details helper
// ─────────────────────────────────────────────

interface MetalDetail {
  label: string;
  weight?: number;
  purity?: string | number;
  cost?: number;
}

const getMetalDetails = (item: any): MetalDetail[] => {
  const metals: MetalDetail[] = [];
  const cd = item.itemCostDetails || {};

  if (item.metal?.toLowerCase().includes("gold")) {
    metals.push({
      label: "Gold",
      weight: item.netWeight ?? item.grossWeight,
      purity: item.gPurityId || item.purityPercent,
      cost: cd.goldCost,
    });
  }

  if ((item.diamondWeight ?? 0) > 0 || (cd.diamondCost ?? 0) > 0) {
    metals.push({
      label: "Diamond",
      weight: Number((5 * (item.diamondWeight ?? 0)).toFixed(3)),
      purity: item.dPurityId || item.clarity,
      cost: cd.diamondCost,
    });
  }

  if ((item.stoneWeight ?? 0) > 0 || (cd.stoneCost ?? 0) > 0) {
    metals.push({
      label: item.stoneName || "Stone",
      weight: item.stoneWeight,
      purity: "",
      cost: cd.stoneCost,
    });
  }

  if (item.metal?.toLowerCase().includes("silver")) {
    metals.push({
      label: "Silver",
      weight: item.netWeight ?? item.grossWeight,
      purity: item.gPurityId || item.purityPercent,
      cost: cd.silverCost ?? cd.goldCost,
    });
  }

  return metals;
};

// ─────────────────────────────────────────────
// OrderItemsHoverCard — used exclusively in Sale page
// ─────────────────────────────────────────────

interface OrderItemsHoverCardProps {
  items: any[];
  orderNo: string;
  grandTotal: number;
}

const OrderItemsHoverCard = ({
  items,
  orderNo,
  grandTotal,
}: OrderItemsHoverCardProps) => {
  const itemCount = items?.length || 0;
  if (itemCount === 0) return <span className="text-gray-500">0 Items</span>;

  return (
    <HoverCard>
      <HoverCardTrigger>
        <div className="flex items-center gap-2 cursor-pointer group w-fit">
          <span className="font-medium underline decoration-dotted underline-offset-4 group-hover:text-blue-600 transition-colors">
            {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </span>
          <Info className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600" />
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="p-0">
        {/* Header */}
        <div className="bg-muted/50 p-3 border-b flex justify-between items-center rounded-t-xl">
          <h4 className="font-semibold text-sm">Order Details</h4>
          <Badge variant="outline">{orderNo}</Badge>
        </div>

        {/* Items list */}
        <ScrollArea className="max-h-[320px]">
          <div className="p-4 space-y-4">
            {items.map((item: any, idx: number) => {
              const metals = getMetalDetails(item);
              return (
                <div
                  key={idx}
                  className="bg-card border rounded-md p-3 text-sm space-y-2 shadow-sm"
                >
                  {/* Item name + price */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-blue-700">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.metal} | {item.category}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Tag: {item.tagNumber}
                        {item.huid ? ` | HUID: ${item.huid}` : ""}
                      </p>
                    </div>
                    <span className="font-mono font-bold">
                      ₹
                      {(
                        item.itemCostDetails?.totalSalePrice ||
                        item.tagePrice ||
                        0
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Metal breakdown */}
                  {metals.length > 0 && (
                    <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded space-y-1">
                      {metals.map((m, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center border-b last:border-b-0 pb-1 last:pb-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] text-gray-400 uppercase tracking-wide">
                              {m.label}
                            </span>
                            <span>
                              Wt: {m.weight ?? 0}
                              {m.label === "Diamond" ? " ct" : " g"}
                              {m.purity ? ` | Purity: ${m.purity}` : ""}
                            </span>
                          </div>
                          <span className="font-medium">
                            ₹{(m.cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer total */}
        <div className="p-3 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
          <span className="text-sm font-medium">Order Total</span>
          <span className="text-lg font-bold text-green-700">
            ₹{grandTotal?.toLocaleString("en-IN")}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export { HoverCard, HoverCardTrigger, HoverCardContent, OrderItemsHoverCard };