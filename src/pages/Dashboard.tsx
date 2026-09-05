import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  format,
  isAfter,
  eachDayOfInterval,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  Users,
  IndianRupee,
  Package,
  RotateCcw,
  TrendingUp,
  WalletCards,
  ShoppingBag,
  ClipboardList,
  Gem,
  Scale,
  Layers3,
  Boxes,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";

import {
  useTotalSell,
  useTotalCustomers,
  useTotalItems,
  useOldMetalPurchaseSummary,
} from "@/hooks/useDashboard";
import { useOrderList } from "@/hooks/useOrder";
import { useReturnList, usePendingApprovalList } from "@/hooks/useReturn";
import { useCurrentRates } from "@/hooks/useCurruntrate";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/hooks/useInvoice";
import { useAdvanceOrders } from "@/hooks/useAdvanceOrder";
import { useStockEntries } from "@/hooks/useStockEntry";
import { useStockTransfers } from "@/hooks/useStockTransfer";

const CHART_COLORS = [
  "#0f766e",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
] as const;

const formatCurrency = (value: number | string | undefined | null) => {
  const num = Number(value ?? 0);
  return `₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const toTitleCase = (value?: string | null) => {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text;
};

type TrendRow = {
  date: string;
  fullDate: string;
  orders: number;
  returns: number;
  sales: number;
  refunds: number;
};

type CustomTooltipEntry = {
  color?: string;
  name?: string | number;
  value?: string | number;
  dataKey?: string | number;
  payload?: TrendRow;
};

type CustomTrendTooltipProps = {
  active?: boolean;
  payload?: CustomTooltipEntry[];
  label?: string | number;
};

const CustomTrendTooltip = ({
  active,
  payload,
}: CustomTrendTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <div className="rounded-xl border border-[#d8e5e1] bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-[#203a34]">
        {row?.fullDate || "-"}
      </p>

      <div className="space-y-1.5 text-sm">
        {payload.map((entry, index) => {
          const label = String(entry.name ?? entry.dataKey ?? "Value");
          const rawValue = entry.value ?? 0;

          const displayValue =
            label === "Sales" || label === "Refunds"
              ? formatCurrency(Number(rawValue))
              : String(rawValue);

          return (
            <div
              key={`${label}-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color || "#94a3b8" }}
                />
                <span className="text-[#5f7f76]">{label}</span>
              </div>
              <span className="font-medium text-[#1f3732]">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const Dashboard = () => {
  const [showTopItemsModal, setShowTopItemsModal] = useState(false);
  const [showTopCustomersModal, setShowTopCustomersModal] = useState(false);

  const [fromDate, setFromDate] = useState<string | null>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState<string | null>(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  const { user, selectedShop } = useAuth();

  const userId = user?.id;
  const shopId = selectedShop?.id;

  const { data: sellData, isLoading: sellLoading } = useTotalSell(fromDate, toDate);
  const { data: customerData, isLoading: customerLoading } = useTotalCustomers();
  const { data: itemData, isLoading: itemLoading } = useTotalItems();
  const { data: oldMetalData, isLoading: oldMetalLoading } =
    useOldMetalPurchaseSummary(fromDate, toDate);

  const { data: ordersData, isLoading: ordersLoading } = useOrderList({
    userId: userId ?? undefined,
    shopId: shopId ?? undefined,
    page: 1,
    pageSize: 10000,
  });

  const { data: returnsData, isLoading: returnsLoading } = useReturnList({
    shopId: shopId ?? undefined,
    page: 1,
    pageSize: 10000,
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
  });

  const { data: pendingReturnsData } = usePendingApprovalList();
  const { data: currentRatesData, isLoading: ratesLoading } = useCurrentRates();

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    shopId: shopId ?? undefined,
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
    page: 1,
    pageSize: 10000,
  });

  const { data: advanceOrdersData, isLoading: advanceOrdersLoading } = useAdvanceOrders({
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
    page: 1,
    pageSize: 10000,
  });

  const { data: stockEntriesData, isLoading: stockEntriesLoading } = useStockEntries({
    shopId: shopId ?? undefined,
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
  });

  const { data: transfersData, isLoading: transfersLoading } = useStockTransfers();

  const rawOrders = useMemo(() => normalizeList(ordersData), [ordersData]);
  const rawReturns = useMemo(() => normalizeList(returnsData), [returnsData]);
  const pendingApprovalList = useMemo(
    () => normalizeList(pendingReturnsData),
    [pendingReturnsData]
  );
  const currentRates = useMemo(() => normalizeList(currentRatesData), [currentRatesData]);

  const allMappedOrders = useMemo(() => {
    return rawOrders.map((order: any) => ({
      id: order?.id,
      orderNo: order?.orderNo ?? "-",
      invoiceNo: order?.invoice?.invoiceNo ?? "-",
      customerName: order?.customer?.name ?? "-",
      customerPhone: order?.customer?.phone ?? "-",
      invoiceDate: order?.invoice?.invoiceDate ?? order?.createdAt ?? null,
      totalAmount: Number(
        order?.invoice?.totalAmount ?? order?.cartData?.grandTotal ?? 0
      ),
      paidAmount: Number(order?.invoice?.paidAmount ?? 0),
      walletRedeemedAmount: Number(order?.invoice?.walletRedeemedAmount ?? 0),
      paymentMethod: order?.invoice?.paymentMethod ?? "-",
      paymentStatus: order?.invoice?.status ?? "-",
      orderStatus: order?.status ?? "-",
      isAdvanceOrder: !!order?.isAdvanceOrder,
      advanceAmount: Number(order?.advanceAmount ?? 0),
      balanceAmount: Number(order?.balanceAmount ?? 0),
      deliveryDate: order?.deliveryDate ?? null,
      raw: order,
    }));
  }, [rawOrders]);

  const mappedOrders = useMemo(() => {
    return allMappedOrders.filter((order: any) => {
      if (!order.invoiceDate) return true;
      const orderDate = new Date(order.invoiceDate);
      if (fromDate && orderDate < startOfDay(new Date(fromDate))) return false;
      if (toDate && orderDate > endOfDay(new Date(toDate))) return false;
      return true;
    });
  }, [allMappedOrders, fromDate, toDate]);

  const mappedReturns = useMemo(() => {
    return rawReturns.map((ret: any) => ({
      id: ret?.id,
      returnNo: ret?.returnNo ?? "-",
      returnDate: ret?.returnDate ?? ret?.createdAt ?? null,
      customerName: ret?.customer?.name ?? "-",
      customerPhone: ret?.customer?.phone ?? "-",
      amount: Number(ret?.totalReturnAmount ?? 0),
      status: ret?.status ?? "-",
      itemName: ret?.items?.[0]?.itemName ?? ret?.items?.itemName ?? "-",
      category: ret?.items?.[0]?.category ?? ret?.items?.category ?? "-",
      metal: ret?.items?.[0]?.metal ?? ret?.items?.metal ?? "-",
      itemStatus: ret?.items?.[0]?.status ?? ret?.items?.status ?? "-",
      isItemRestorable:
        ret?.items?.[0]?.isItemRestorable ?? ret?.items?.isItemRestorable ?? false,
    }));
  }, [rawReturns]);

  const orderItems = useMemo(() => {
    return rawOrders.flatMap((order: any) => {
      const items = Array.isArray(order?.cartData?.items) ? order.cartData.items : [];
      return items.map((item: any, index: number) => ({
        key: `${order?.id ?? "order"}-${item?.id ?? index}`,
        orderId: order?.id,
        orderNo: order?.orderNo ?? "-",
        invoiceNo: order?.invoice?.invoiceNo ?? "-",
        customerName: order?.customer?.name ?? "-",
        createdAt: order?.invoice?.invoiceDate ?? order?.createdAt ?? null,
        itemId: item?.itemId ?? null,
        tagNumber: item?.tagNumber ?? "-",
        itemName: item?.itemName ?? "-",
        metal: toTitleCase(item?.metal),
        category: toTitleCase(item?.category),
        pricingModel: toTitleCase(item?.pricingModel),
        quantity: Number(item?.quantity ?? 0),
        grossWeight: Number(item?.grossWeight ?? 0),
        netWeight: Number(item?.netWeight ?? 0),
        stoneWeight: Number(item?.stoneWeight ?? 0),
        diamondWeight: Number(item?.diamondWeight ?? 0),
        totalSalePrice: Number(
          item?.itemCostDetails?.totalSalePrice ?? item?.tagePrice ?? 0
        ),
        goldCost: Number(item?.itemCostDetails?.goldCost ?? 0),
        diamondCost: Number(item?.itemCostDetails?.diamondCost ?? 0),
        stoneCost: Number(item?.itemCostDetails?.stoneCost ?? 0),
        makingCharges: Number(item?.itemCostDetails?.makingCharges ?? 0),
        discount: Number(item?.itemCostDetails?.discount ?? 0),
        taxAmount: Number(
          item?.itemCostDetails?.igst ??
            Number(item?.itemCostDetails?.cgst ?? 0) +
              Number(item?.itemCostDetails?.sgst ?? 0)
        ),
        huid: item?.huid ?? "",
        isAdvanceOrder: !!order?.isAdvanceOrder,
        orderStatus: order?.status ?? "-",
      }));
    });
  }, [rawOrders]);

  const filteredOrderItems = useMemo(() => {
    return orderItems.filter((item: any) => {
      if (!item.createdAt) return true;
      const orderDate = new Date(item.createdAt);
      if (fromDate && orderDate < startOfDay(new Date(fromDate))) return false;
      if (toDate && orderDate > endOfDay(new Date(toDate))) return false;
      return true;
    });
  }, [orderItems, fromDate, toDate]);

  const recentOrders = useMemo(() => mappedOrders.slice(0, 10), [mappedOrders]);
  const recentReturns = useMemo(() => mappedReturns.slice(0, 10), [mappedReturns]);

  const totalOrderAmount = useMemo(
    () => mappedOrders.reduce((sum: number, item: any) => sum + item.totalAmount, 0),
    [mappedOrders]
  );

  const totalPaidAmount = useMemo(
    () => mappedOrders.reduce((sum: number, item: any) => sum + item.paidAmount, 0),
    [mappedOrders]
  );

  const totalWalletUsed = useMemo(
    () =>
      mappedOrders.reduce(
        (sum: number, item: any) => sum + item.walletRedeemedAmount,
        0
      ),
    [mappedOrders]
  );

  const totalReturnAmount = useMemo(
    () => mappedReturns.reduce((sum: number, item: any) => sum + item.amount, 0),
    [mappedReturns]
  );

  const totalOrderItems = useMemo(
    () => filteredOrderItems.reduce((sum, item) => sum + item.quantity, 0),
    [filteredOrderItems]
  );

  const totalGrossWeight = useMemo(
    () => filteredOrderItems.reduce((sum, item) => sum + item.grossWeight, 0),
    [filteredOrderItems]
  );

  const totalNetWeight = useMemo(
    () => filteredOrderItems.reduce((sum, item) => sum + item.netWeight, 0),
    [filteredOrderItems]
  );

  const totalMakingCharges = useMemo(
    () => filteredOrderItems.reduce((sum, item) => sum + item.makingCharges, 0),
    [filteredOrderItems]
  );

  // ─── 18 Cards Calculations ──────────────────────────────────────────────────
  
  // 1. Invoices
  const invoicesList = useMemo(() => invoicesData?.data ?? [], [invoicesData]);

  const totalBillsCount = useMemo(() => invoicesList.length, [invoicesList]);
  const totalSaleAmount = useMemo(() => {
    const invTotal = invoicesList.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0);
    if (invTotal > 0) return invTotal;
    if (sellData?.totalSell) return Number(sellData.totalSell);
    return 0;
  }, [invoicesList, sellData]);

  const saleMetalWeights = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let diamond = 0;
    if (invoicesList.length > 0) {
      invoicesList.forEach((inv) => {
        inv.items?.forEach((item) => {
          const metal = (item.metal || "").toLowerCase();
          const weight = Number(item.netWeight || item.grossWeight || 0);
          if (metal.includes("gold")) {
            gold += weight;
          } else if (metal.includes("silver")) {
            silver += weight;
          } else if (metal.includes("diamond")) {
            gold += weight;
            diamond += Number(item.diamondCarat || item.diamondWeight || 0);
          }
        });
      });
    }

    if (gold === 0 && silver === 0 && diamond === 0 && filteredOrderItems.length > 0) {
      filteredOrderItems.forEach((item: any) => {
        const metal = (item.metal || "").toLowerCase();
        const weight = Number(item.netWeight || item.grossWeight || 0);
        if (metal.includes("gold")) {
          gold += weight;
        } else if (metal.includes("silver")) {
          silver += weight;
        } else if (metal.includes("diamond")) {
          gold += weight;
          diamond += Number(item.diamondWeight || item.diamondCarat || 0);
        }
      });
    }
    return { gold, silver, diamond };
  }, [invoicesList, filteredOrderItems]);

  // 2. Advance Orders
  const advanceOrdersList = useMemo(() => {
    return mappedOrders.filter((ord: any) => !!ord.isAdvanceOrder);
  }, [mappedOrders]);

  const totalAdvanceOrdersCount = useMemo(() => advanceOrdersList.length, [advanceOrdersList]);
  const totalAdvanceAmount = useMemo(() => {
    return advanceOrdersList.reduce((sum, ord) => sum + Number(ord.advanceAmount ?? 0), 0);
  }, [advanceOrdersList]);

  const advanceMetalWeights = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let diamond = 0;
    filteredOrderItems.forEach((item: any) => {
      if (item.isAdvanceOrder) {
        const metal = (item.metal || "").toLowerCase();
        if (metal.includes("gold")) {
          gold += Number(item.netWeight || 0);
        } else if (metal.includes("silver")) {
          silver += Number(item.netWeight || 0);
        } else if (metal.includes("diamond")) {
          gold += Number(item.netWeight || 0);
          diamond += Number(item.diamondWeight || item.diamondCarat || 0);
        }
      }
    });
    return { gold, silver, diamond };
  }, [filteredOrderItems]);

  // 3. Returns
  const returnList = useMemo(() => normalizeList(returnsData), [returnsData]);

  const totalReturnCount = useMemo(() => returnList.length, [returnList]);

  const returnMetalWeights = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let diamond = 0;
    returnList.forEach((ret) => {
      const items = Array.isArray(ret.items) ? ret.items : [];
      items.forEach((item: any) => {
        const metal = (item.metal || "").toLowerCase();
        if (metal.includes("gold")) {
          gold += Number(item.netWeight || item.grossWeight || 0);
        } else if (metal.includes("silver")) {
          silver += Number(item.netWeight || item.grossWeight || 0);
        } else if (metal.includes("diamond")) {
          gold += Number(item.netWeight || 0);
          diamond += Number(item.diamondCarat || item.diamondWeight || 0);
        }
      });
    });
    return { gold, silver, diamond };
  }, [returnList]);

  // 4. Purchases (Stock Entries with modeOfStock === "PurchaseIn" and stockEntryType === "StockIn")
  const stockEntriesList = useMemo(() => stockEntriesData ?? [], [stockEntriesData]);

  const purchaseMetalWeights = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let diamond = 0;
    stockEntriesList.forEach((entry) => {
      const isStockIn = (entry.stockEntryType || "").toLowerCase() === "stockin";
      if (entry.modeOfStock === "PurchaseIn" && isStockIn) {
        const metal = (entry.metal || "").toLowerCase();
        const weight = Number(entry.netWeight || entry.grossWeight || 0);
        if (metal.includes("gold")) {
          gold += weight;
        } else if (metal.includes("silver")) {
          silver += weight;
        } else if (metal.includes("diamond")) {
          gold += weight;
          diamond += Number(entry.diamondCarat || entry.diamondWeight || 0);
        }
      }
    });
    return { gold, silver, diamond };
  }, [stockEntriesList]);

  // Old Metal Purchases
  const oldMetalCost = useMemo(() => oldMetalData?.totalCost ?? 0, [oldMetalData]);
  const oldMetalWeights = useMemo(() => {
    let gold = 0;
    let silver = 0;
    let diamond = 0;
    oldMetalData?.byMetalType?.forEach((item) => {
      const metal = (item.metalType || "").toLowerCase();
      if (metal.includes("gold")) {
        gold += Number(item.totalNetWeight || item.totalGrossWeight || 0);
      } else if (metal.includes("silver")) {
        silver += Number(item.totalNetWeight || item.totalGrossWeight || 0);
      } else if (metal.includes("diamond")) {
        diamond += Number(item.totalNetWeight || item.totalGrossWeight || 0);
      }
    });
    return { gold, silver, diamond };
  }, [oldMetalData]);

  // 5. Pending & Transit
  const pendingAdvanceOrdersList = useMemo(() => {
    return advanceOrdersList.filter((ord: any) => ord.orderStatus === "PendingPayment");
  }, [advanceOrdersList]);

  const pendingAdvanceCount = useMemo(() => pendingAdvanceOrdersList.length, [pendingAdvanceOrdersList]);

  const pendingBalanceAmount = useMemo(() => {
    return pendingAdvanceOrdersList.reduce((sum, ord) => sum + Number(ord.balanceAmount ?? 0), 0);
  }, [pendingAdvanceOrdersList]);

  const stockTransfersList = useMemo(() => transfersData ?? [], [transfersData]);

  const transitOwnShowroom = useMemo(() => {
    return stockTransfersList.filter((t: any) => {
      const isDest = t.destinationShopId === shopId;
      const isPending = !["received", "cancelled", "cancel", "rejected", "reject"].includes((t.status || "").toLowerCase());
      const matchDate = (!fromDate || !t.createDate || (new Date(t.createDate) >= new Date(fromDate) && new Date(t.createDate) <= new Date(toDate + "T23:59:59")));
      return isDest && isPending && matchDate;
    });
  }, [stockTransfersList, shopId, fromDate, toDate]);

  const transitOwnShowroomItems = useMemo(() => {
    return transitOwnShowroom.reduce((sum, t) => sum + (t.transferItems?.length || 0), 0);
  }, [transitOwnShowroom]);

  const transitAnotherShowroom = useMemo(() => {
    return stockTransfersList.filter((t: any) => {
      const isSrc = t.sourceShopId === shopId;
      const isDestOther = t.destinationShopId !== shopId;
      const isPending = !["received", "cancelled", "cancel", "rejected", "reject"].includes((t.status || "").toLowerCase());
      const matchDate = (!fromDate || !t.createDate || (new Date(t.createDate) >= new Date(fromDate) && new Date(t.createDate) <= new Date(toDate + "T23:59:59")));
      return isSrc && isDestOther && isPending && matchDate;
    });
  }, [stockTransfersList, shopId, fromDate, toDate]);

  const transitAnotherShowroomItems = useMemo(() => {
    return transitAnotherShowroom.reduce((sum, t) => sum + (t.transferItems?.length || 0), 0);
  }, [transitAnotherShowroom]);

  // 6. Top Lists (10 Items & 10 Customers)
  const top10ItemsSaleList = useMemo(() => {
    const itemSaleMap = new Map<string, { name: string; quantity: number; amount: number }>();
    invoicesList.forEach((inv: any) => {
      inv.items?.forEach((item: any) => {
        const name = item.itemName || "Unknown";
        const qty = Number(item.quantity || 0);
        const amt = Number(item.totalSalePrice || 0);
        const existing = itemSaleMap.get(name);
        if (existing) {
          existing.quantity += qty;
          existing.amount += amt;
        } else {
          itemSaleMap.set(name, { name, quantity: qty, amount: amt });
        }
      });
    });
    return Array.from(itemSaleMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [invoicesList]);

  const top10CustomersList = useMemo(() => {
    const customerMap = new Map<number, { id: number; name: string; phone: string; count: number; amount: number }>();
    invoicesList.forEach((inv: any) => {
      const cust = inv.customer;
      if (cust) {
        const id = cust.id;
        const name = cust.name || "Unknown";
        const phone = cust.phone || "-";
        const amt = Number(inv.totalAmount || 0);
        const existing = customerMap.get(id);
        if (existing) {
          existing.count += 1;
          existing.amount += amt;
        } else {
          customerMap.set(id, { id, name, phone, count: 1, amount: amt });
        }
      }
    });
    return Array.from(customerMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [invoicesList]);

  const goldRateCard = useMemo(() => {
    return (
      currentRates.find(
        (r: any) =>
          String(r?.metalType || "").toLowerCase().includes("gold") &&
          String(r?.purity || "").includes("24")
      ) ||
      currentRates.find((r: any) =>
        String(r?.metalType || "").toLowerCase().includes("gold")
      )
    );
  }, [currentRates]);

  const orderStatusData = useMemo(() => {
    const map = new Map<string, number>();
    mappedOrders.forEach((item: any) => {
      const key = item.paymentStatus || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [mappedOrders]);

  const returnStatusData = useMemo(() => {
    const map = new Map<string, number>();
    mappedReturns.forEach((item: any) => {
      const key = item.status || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [mappedReturns]);

  const paymentMethodData = useMemo(() => {
    const map = new Map<string, number>();

    mappedOrders.forEach((item: any) => {
      const methods = String(item.paymentMethod || "-")
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m && m !== "-");

      if (methods.length === 0) {
        map.set("Unknown", (map.get("Unknown") || 0) + 1);
        return;
      }

      methods.forEach((method) => {
        map.set(method, (map.get(method) || 0) + 1);
      });
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [mappedOrders]);

  const returnCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    mappedReturns.forEach((item: any) => {
      const key = item.category || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [mappedReturns]);

  const itemMetalData = useMemo(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      const key = item.metal || "Unknown";
      map.set(key, (map.get(key) || 0) + item.quantity);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orderItems]);

  const itemCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      const key = item.category || "Unknown";
      map.set(key, (map.get(key) || 0) + item.quantity);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orderItems]);

  const pricingModelData = useMemo(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      const key = item.pricingModel || "Unknown";
      map.set(key, (map.get(key) || 0) + item.quantity);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orderItems]);

  const topSoldItems = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; amount: number; metal: string; category: string }
    >();

    orderItems.forEach((item) => {
      const key = `${item.itemName}__${item.category}__${item.metal}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += item.totalSalePrice;
      } else {
        map.set(key, {
          name: item.itemName,
          quantity: item.quantity,
          amount: item.totalSalePrice,
          metal: item.metal,
          category: item.category,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orderItems]);

  const itemValueByMetalData = useMemo(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      const key = item.metal || "Unknown";
      map.set(key, (map.get(key) || 0) + item.totalSalePrice);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orderItems]);

  const oldMetalByTypeChart = useMemo(() => {
    return (oldMetalData?.byMetalType || []).map((item) => ({
      name: item.metalType || "Unknown",
      purchases: Number(item.totalPurchases ?? 0),
      grossWeight: Number(item.totalGrossWeight ?? 0),
      netWeight: Number(item.totalNetWeight ?? 0),
      cost: Number(item.totalCost ?? 0),
    }));
  }, [oldMetalData]);

  const activityTrendData = useMemo<TrendRow[]>(() => {
    const end = toDate ? endOfDay(new Date(toDate)) : endOfDay(new Date());
    const start = fromDate
      ? startOfDay(new Date(fromDate))
      : startOfDay(subDays(end, 9));

    const days = eachDayOfInterval({ start, end });
    const baseMap = new Map<string, TrendRow>();

    days.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      baseMap.set(key, {
        date: format(day, "dd MMM"),
        fullDate: key,
        orders: 0,
        returns: 0,
        sales: 0,
        refunds: 0,
      });
    });

    mappedOrders.forEach((item: any) => {
      const dateObj = safeDate(item.invoiceDate);
      if (!dateObj) return;
      const key = format(dateObj, "yyyy-MM-dd");
      if (!baseMap.has(key)) return;
      const row = baseMap.get(key)!;
      row.orders += 1;
      row.sales += item.totalAmount;
    });

    mappedReturns.forEach((item: any) => {
      const dateObj = safeDate(item.returnDate);
      if (!dateObj) return;
      const key = format(dateObj, "yyyy-MM-dd");
      if (!baseMap.has(key)) return;
      const row = baseMap.get(key)!;
      row.returns += 1;
      row.refunds += item.amount;
    });

    return Array.from(baseMap.values());
  }, [mappedOrders, mappedReturns, fromDate, toDate]);

  const topReturnItems = useMemo(() => {
    const map = new Map<string, number>();
    mappedReturns.forEach((item: any) => {
      const key = item.itemName || "Unknown";
      map.set(key, (map.get(key) || 0) + item.amount);
    });

    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [mappedReturns]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f8f7] via-[#f8fbfa] to-[#edf5f3]">
      <header className="sticky top-0 z-20 border-b border-[#d8e5e1] bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1f3732] sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-[#5f7f76]">
              Jewellery Retail Shop Management System overview
            </p>
            <p className="mt-1 text-sm text-[#7b9690]">
              {user?.fullName || user?.username || "User"} •{" "}
              {selectedShop?.name || "No shop selected"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <DateInput
              value={fromDate}
              placeholder="From Date"
              max={toDate || undefined}
              onValueChange={(val) => {
                if (val && toDate && isAfter(new Date(val), new Date(toDate))) {
                  toast.error("From date cannot be after To date");
                  return;
                }
                setFromDate(val);
              }}
            />

            <DateInput
              value={toDate}
              placeholder="To Date"
              min={fromDate || undefined}
              onValueChange={(val) => {
                if (val && fromDate && isAfter(new Date(fromDate), new Date(val))) {
                  toast.error("To date cannot be before From date");
                  return;
                }
                setToDate(val);
              }}
            />

            <button
              type="button"
              onClick={() => {
                setFromDate(null);
                setToDate(null);
              }}
              disabled={!fromDate && !toDate}
              className="h-10 rounded-xl border border-[#cfe0db] bg-white px-4 text-[#2b463f] hover:bg-[#f7fbfa] disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-8 p-6">
        {!selectedShop && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 shadow-sm">
            Please select a shop first to load dashboard data.
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Row 1 */}
          <DashboardCard
            title="Total No of bills"
            value={invoicesLoading ? "Loading..." : totalBillsCount}
            subtitle="Invoices generated in range"
            icon={<ClipboardList size={18} />}
          />
          <DashboardCard
            title="Total Sale Amt."
            value={invoicesLoading ? "Loading..." : formatCurrency(totalSaleAmount)}
            subtitle="Total amount from invoices"
            icon={<IndianRupee size={18} />}
            valueColor="text-emerald-700"
          />
          <DashboardCard
            title="Total Sale in Metal"
            value={<MetalBreakdown gold={saleMetalWeights.gold} silver={saleMetalWeights.silver} diamond={saleMetalWeights.diamond} />}
            icon={<Scale size={18} />}
          />

          {/* Row 2 */}
          <DashboardCard
            title="No of Advance orders"
            value={ordersLoading ? "Loading..." : totalAdvanceOrdersCount}
            subtitle="Orders placed with advance payment"
            icon={<ShoppingBag size={18} />}
          />
          <DashboardCard
            title="Total Advance Amt."
            value={ordersLoading ? "Loading..." : formatCurrency(totalAdvanceAmount)}
            subtitle="Collected advance deposits"
            icon={<IndianRupee size={18} />}
            valueColor="text-teal-700"
          />
          <DashboardCard
            title="Total Advance in Metal"
            value={<MetalBreakdown gold={advanceMetalWeights.gold} silver={advanceMetalWeights.silver} diamond={advanceMetalWeights.diamond} />}
            icon={<Scale size={18} />}
          />

          {/* Row 3 */}
          <DashboardCard
            title="Total Return Bills or Articles"
            value={returnsLoading ? "Loading..." : totalReturnCount}
            subtitle="Returns processed in range"
            icon={<RotateCcw size={18} />}
          />
          <DashboardCard
            title="Return Amount"
            value={returnsLoading ? "Loading..." : formatCurrency(totalReturnAmount)}
            subtitle="Refunded amount for returns"
            icon={<IndianRupee size={18} />}
            valueColor="text-rose-700"
          />
          <DashboardCard
            title="Total Return in Metal"
            value={<MetalBreakdown gold={returnMetalWeights.gold} silver={returnMetalWeights.silver} diamond={returnMetalWeights.diamond} />}
            icon={<Scale size={18} />}
          />

          {/* Row 4 */}
          <DashboardCard
            title="Total Purchase in Metal"
            value={<MetalBreakdown gold={purchaseMetalWeights.gold} silver={purchaseMetalWeights.silver} diamond={purchaseMetalWeights.diamond} />}
            subtitle="Vendor stock entries (PurchaseIn)"
            icon={<TrendingUp size={18} />}
          />
          <DashboardCard
            title="Total Old Metal Purchase Amt."
            value={oldMetalLoading ? "Loading..." : formatCurrency(oldMetalCost)}
            subtitle="Old metal purchased from customers"
            icon={<IndianRupee size={18} />}
            valueColor="text-amber-700"
          />
          <DashboardCard
            title="Total Old Metal Purchase in Metal"
            value={<MetalBreakdown gold={oldMetalWeights.gold} silver={oldMetalWeights.silver} diamond={oldMetalWeights.diamond} />}
            icon={<Scale size={18} />}
          />

          {/* Row 5 */}
          <DashboardCard
            title="Pending Advance order"
            value={ordersLoading ? "Loading..." : pendingAdvanceCount}
            subtitle="Advance orders in PendingPayment status"
            icon={<Boxes size={18} />}
          />
          <DashboardCard
            title="Total Pending Balance Amount"
            value={ordersLoading ? "Loading..." : formatCurrency(pendingBalanceAmount)}
            subtitle="Outstanding balance (उधार राशि)"
            icon={<IndianRupee size={18} />}
            valueColor="text-amber-800"
          />
          <DashboardCard
            title="Stock In transit pending Received at own showroom"
            value={transfersLoading ? "Loading..." : `${transitOwnShowroom.length} Transfers`}
            subtitle={`${transitOwnShowroomItems} items en route to us`}
            icon={<Layers3 size={18} />}
          />

          {/* Row 6 */}
          <DashboardCard
            title="Top 10 Items sale"
            value="View Top 10"
            subtitle="Click to see top sold products"
            icon={<TrendingUp size={18} />}
            onClick={() => setShowTopItemsModal(true)}
            bgClass="bg-[#f0f9f6]"
            borderClass="border-teal-200"
          />
          <DashboardCard
            title="Top 10 Customers"
            value="View Top 10"
            subtitle="Click to see top purchasing customers"
            icon={<Users size={18} />}
            onClick={() => setShowTopCustomersModal(true)}
            bgClass="bg-[#f0f9f6]"
            borderClass="border-teal-200"
          />
          <DashboardCard
            title="Stock In transit pending Received at another showroom"
            value={transfersLoading ? "Loading..." : `${transitAnotherShowroom.length} Transfers`}
            subtitle={`${transitAnotherShowroomItems} items sent to other shops`}
            icon={<Layers3 size={18} />}
          />
        </section>

        {/* Top 10 Items Modal */}
        <Modal
          isOpen={showTopItemsModal}
          onClose={() => setShowTopItemsModal(false)}
          title="Top 10 Sold Items"
        >
          {top10ItemsSaleList.length === 0 ? (
            <EmptyState text="No sold items in this date range." />
          ) : (
            <div className="space-y-3">
              {top10ItemsSaleList.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-[#e0ece8] bg-[#fbfdfc] px-4 py-3 shadow-sm hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[#234039]">{item.name}</p>
                      <p className="text-xs text-[#7b9690]">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-bold text-[#1f3732]">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </Modal>

        {/* Top 10 Customers Modal */}
        <Modal
          isOpen={showTopCustomersModal}
          onClose={() => setShowTopCustomersModal(false)}
          title="Top 10 Customers"
        >
          {top10CustomersList.length === 0 ? (
            <EmptyState text="No customers in this date range." />
          ) : (
            <div className="space-y-3">
              {top10CustomersList.map((cust, index) => (
                <div
                  key={`${cust.id}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-[#e0ece8] bg-[#fbfdfc] px-4 py-3 shadow-sm hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[#234039]">{cust.name}</p>
                      <p className="text-xs text-[#7b9690]">
                        {cust.phone} • {cust.count} order{cust.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-[#1f3732]">{formatCurrency(cust.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </Modal>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard title="Sales & Returns Trend" className="xl:col-span-2">
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#6c8881]">
              <span className="rounded-full bg-[#eef7f5] px-3 py-1">
                Range: {activityTrendData[0]?.date || "-"} to{" "}
                {activityTrendData[activityTrendData.length - 1]?.date || "-"}
              </span>
              <span className="rounded-full bg-[#eef7f5] px-3 py-1">
                Orders: {mappedOrders.length}
              </span>
              <span className="rounded-full bg-[#fff4e5] px-3 py-1">
                Returns: {mappedReturns.length}
              </span>
            </div>

            <div className="h-[360px]">
              {activityTrendData.length === 0 ? (
                <EmptyState text="No activity data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="date" stroke="#5f7f76" />
                    <YAxis yAxisId="count" stroke="#5f7f76" />
                    <YAxis yAxisId="amount" orientation="right" stroke="#94a3b8" />
                    <Tooltip content={<CustomTrendTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="orders"
                      stroke="#0f766e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Orders"
                    />
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="returns"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Returns"
                    />
                    <Line
                      yAxisId="amount"
                      type="monotone"
                      dataKey="sales"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                      name="Sales"
                    />
                    <Line
                      yAxisId="amount"
                      type="monotone"
                      dataKey="refunds"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                      name="Refunds"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
          <ChartCard title="Old Metal Purchase Summary">
            <div className="space-y-3">
              <MiniInfoCard
                icon={<RotateCcw size={18} />}
                label="Purchases"
                value={oldMetalLoading ? "Loading..." : oldMetalData?.totalPurchases ?? 0}
              />
              <MiniInfoCard
                icon={<Scale size={18} />}
                label="Gross Weight"
                value={oldMetalLoading ? "Loading..." : compactNumber(Number(oldMetalData?.totalGrossWeight ?? 0))}
              />
              <MiniInfoCard
                icon={<Layers3 size={18} />}
                label="Net Weight"
                value={oldMetalLoading ? "Loading..." : compactNumber(Number(oldMetalData?.totalNetWeight ?? 0))}
              />
              <MiniInfoCard
                icon={<IndianRupee size={18} />}
                label="Total Cost"
                value={oldMetalLoading ? "Loading..." : formatCurrency(oldMetalData?.totalCost)}
              />
            </div>
          </ChartCard>

          
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard title="Order Item Metal Mix">
            <div className="h-[300px]">
              {itemMetalData.length === 0 ? (
                <EmptyState text="No item metal data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemMetalData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {itemMetalData.map((_: any, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Order Item Categories">
            <div className="h-[300px]">
              {itemCategoryData.length === 0 ? (
                <EmptyState text="No item category data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="name" stroke="#5f7f76" />
                    <YAxis stroke="#5f7f76" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Pricing Model Mix">
            <div className="h-[300px]">
              {pricingModelData.length === 0 ? (
                <EmptyState text="No pricing model data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pricingModelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="name" stroke="#5f7f76" />
                    <YAxis stroke="#5f7f76" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Order Payment Status">
            <div className="h-[300px]">
              {orderStatusData.length === 0 ? (
                <EmptyState text="No order status data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="name" stroke="#5f7f76" />
                    <YAxis stroke="#5f7f76" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Return Categories">
            <div className="h-[300px]">
              {returnCategoryData.length === 0 ? (
                <EmptyState text="No return category data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={returnCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="name" stroke="#5f7f76" />
                    <YAxis stroke="#5f7f76" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          <ChartCard title="Return Status Breakdown">
            <div className="h-[360px]">
              {returnStatusData.length === 0 ? (
                <EmptyState text="No return data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={returnStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      innerRadius={58}
                      label
                    >
                      {returnStatusData.map((_: any, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Old Metal by Type" className="xl:col-span-2">
            <div className="h-[320px]">
              {oldMetalByTypeChart.length === 0 ? (
                <EmptyState text="No old metal purchase data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oldMetalByTypeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e1" />
                    <XAxis dataKey="name" stroke="#5f7f76" />
                    <YAxis stroke="#5f7f76" />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        if (String(name).toLowerCase().includes("cost")) {
                          return [formatCurrency(value), name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="purchases" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cost" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <TableCard title={`Recent Orders (${recentOrders.length})`} className="xl:col-span-2">
            {ordersLoading ? (
              <EmptyState text="Loading orders..." />
            ) : recentOrders.length === 0 ? (
              <EmptyState text="No recent orders found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e0ece8] text-left text-[#5f7f76]">
                      <th className="py-3 pr-3">Order No</th>
                      <th className="py-3 pr-3">Invoice No</th>
                      <th className="py-3 pr-3">Customer</th>
                      <th className="py-3 pr-3">Date</th>
                      <th className="py-3 pr-3">Payment</th>
                      <th className="py-3 pr-3 text-right">Total</th>
                      <th className="py-3 pr-3 text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any, index: number) => (
                      <tr key={order.id ?? index} className="border-b border-[#eef4f2]">
                        <td className="py-3 pr-3 font-medium">{order.orderNo}</td>
                        <td className="py-3 pr-3">{order.invoiceNo}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span>{order.customerName}</span>
                            <span className="text-xs text-[#7b9690]">
                              {order.customerPhone}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3">
                          {safeDate(order.invoiceDate)
                            ? format(new Date(order.invoiceDate as string), "dd MMM yyyy")
                            : "-"}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col gap-1">
                            <span>{order.paymentMethod}</span>
                            <StatusBadge label={order.paymentStatus || order.orderStatus} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-semibold text-[#1f3732]">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-[#1f3732]">
                              {formatCurrency(order.paidAmount)}
                            </span>
                            {!!order.walletRedeemedAmount && (
                              <span className="text-xs text-[#7b9690]">
                                Wallet: {formatCurrency(order.walletRedeemedAmount)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          <TableCard title={`Recent Returns (${recentReturns.length})`}>
            {returnsLoading ? (
              <EmptyState text="Loading returns..." />
            ) : recentReturns.length === 0 ? (
              <EmptyState text="No returns found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e0ece8] text-left text-[#5f7f76]">
                      <th className="py-3 pr-3">Return No</th>
                      <th className="py-3 pr-3">Customer</th>
                      <th className="py-3 pr-3">Item</th>
                      <th className="py-3 pr-3">Status</th>
                      <th className="py-3 pr-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReturns.map((ret: any, index: number) => (
                      <tr key={ret.id ?? index} className="border-b border-[#eef4f2]">
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#2b463f]">{ret.returnNo}</span>
                            <span className="whitespace-nowrap text-xs text-[#7b9690]">
                              {safeDate(ret.returnDate)
                                ? format(new Date(ret.returnDate as string), "dd MMM yyyy")
                                : "No date"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span>{ret.customerName}</span>
                            <span className="text-xs text-[#7b9690]">
                              {ret.customerPhone}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span>{ret.itemName}</span>
                            <span className="text-xs text-[#7b9690]">
                              {ret.category} • {ret.metal}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <StatusBadge label={ret.status} />
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-semibold text-[#1f3732]">
                          {formatCurrency(ret.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <TableCard title="Top Sold Items">
            {topSoldItems.length === 0 ? (
              <EmptyState text="No sold item data available." />
            ) : (
              <div className="space-y-3">
                {topSoldItems.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-[#e0ece8] bg-[#fbfdfc] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#234039]">{item.name}</p>
                      <p className="text-xs text-[#7b9690]">
                        {item.category} • {item.metal} • Qty {item.quantity}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-[#1f3732]">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TableCard>

          <TableCard title="Top Return Items">
            {topReturnItems.length === 0 ? (
              <EmptyState text="No return item data available." />
            ) : (
              <div className="space-y-3">
                {topReturnItems.map((item, index) => (
                  <div
                    key={item.name ?? index}
                    className="flex items-center justify-between rounded-xl border border-[#e0ece8] bg-[#fbfdfc] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#234039]">{item.name}</p>
                      <p className="text-xs text-[#7b9690]">High return value item</p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-[#1f3732]">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TableCard>

          <TableCard title="Quick Overview">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MiniInfoCard
                icon={<ShoppingBag size={18} />}
                label="Orders"
                value={mappedOrders.length}
              />
              <MiniInfoCard
                icon={<RotateCcw size={18} />}
                label="Returns"
                value={mappedReturns.length}
              />
              <MiniInfoCard
                icon={<ClipboardList size={18} />}
                label="Pending Returns"
                value={pendingApprovalList.length}
              />
              <MiniInfoCard
                icon={<Gem size={18} />}
                label="Order Value"
                value={compactNumber(totalOrderAmount)}
              />
            </div>
          </TableCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TableCard title="Current Metal Rates">
            {ratesLoading ? (
              <EmptyState text="Loading current rates..." />
            ) : currentRates.length === 0 ? (
              <EmptyState text="No current rates found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e0ece8] text-left text-[#5f7f76]">
                      <th className="py-3 pr-3">Description</th>
                      <th className="py-3 pr-3">Metal</th>
                      <th className="py-3 pr-3">Purity</th>
                      <th className="py-3 pr-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRates.slice(0, 6).map((rate: any, index: number) => (
                      <tr key={rate?.id ?? index} className="border-b border-[#eef4f2]">
                        <td className="py-3 pr-3 font-medium">
                          {rate?.description || "-"}
                        </td>
                        <td className="py-3 pr-3">{rate?.metalType || "-"}</td>
                        <td className="py-3 pr-3">{rate?.purity || "-"}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-semibold">
                          {formatCurrency(rate?.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          <TableCard title={`Order Items (${orderItems.length})`}>
            {orderItems.length === 0 ? (
              <EmptyState text="No order items found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e0ece8] text-left text-[#5f7f76]">
                      <th className="py-3 pr-3">Order</th>
                      <th className="py-3 pr-3">Item</th>
                      <th className="py-3 pr-3">Metal</th>
                      <th className="py-3 pr-3">Category</th>
                      <th className="py-3 pr-3">Qty</th>
                      <th className="py-3 pr-3 text-right">Net Wt</th>
                      <th className="py-3 pr-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.slice(0, 10).map((item) => (
                      <tr key={item.key} className="border-b border-[#eef4f2]">
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.orderNo}</span>
                            <span className="text-xs text-[#7b9690]">
                              {item.customerName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span>{item.itemName}</span>
                            <span className="text-xs text-[#7b9690]">
                              Tag: {item.tagNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">{item.metal}</td>
                        <td className="py-3 pr-3">{item.category}</td>
                        <td className="py-3 pr-3">{item.quantity}</td>
                        <td className="py-3 pr-3 text-right">{item.netWeight}</td>
                        <td className="py-3 pr-3 text-right font-semibold">
                          {formatCurrency(item.totalSalePrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accent?: "teal" | "green" | "blue" | "violet" | "amber" | "rose";
}) => {
  const accentMap: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };

  const iconClass = accentMap[accent || "teal"];

  return (
    <div className="rounded-2xl border border-[#d8e5e1] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-[#5f7f76]">
          <span className="h-2 w-2 rounded-full bg-[#9fd3c7]" />
          {title}
        </h3>
        <div className={`rounded-xl p-2 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-bold text-[#203a34]">{value}</p>
      {subtitle && <p className="mt-2 text-sm text-[#7b9690]">{subtitle}</p>}
    </div>
  );
};

const MetricPanel = ({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string | number;
  note?: string;
  icon: ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-[#d8e5e1] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[#5f7f76]">
        <div className="rounded-lg bg-[#eef7f5] p-2 text-[#25695c]">{icon}</div>
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold text-[#1f3732]">{value}</p>
      {note && <p className="mt-1 text-sm text-[#7b9690]">{note}</p>}
    </div>
  );
};

const ChartCard = ({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div className={`rounded-2xl border border-[#d8e5e1] bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 font-semibold text-[#2b463f]">{title}</h3>
      {children}
    </div>
  );
};

const TableCard = ({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div className={`rounded-2xl border border-[#d8e5e1] bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 font-semibold text-[#2b463f]">{title}</h3>
      {children}
    </div>
  );
};

const MiniInfoCard = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) => {
  return (
    <div className="rounded-xl border border-[#e0ece8] bg-[#fbfdfc] p-4">
      <div className="flex items-center gap-2 text-[#5f7f76]">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#234039]">{value}</p>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-[#7b9690]">
      {text}
    </div>
  );
};

const StatusBadge = ({ label }: { label: string }) => {
  const normalized = String(label).toLowerCase();

  const colorClass =
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("approved") ||
    normalized.includes("closed")
      ? "bg-green-100 text-green-700"
      : normalized.includes("pending")
      ? "bg-yellow-100 text-yellow-700"
      : normalized.includes("cancel") || normalized.includes("reject")
      ? "bg-red-100 text-red-700"
      : normalized.includes("repair")
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
};

const DashboardCard = ({
  title,
  value,
  subtitle,
  icon,
  onClick,
  bgClass = "bg-white",
  borderClass = "border-[#d8e5e1]",
  titleColor = "text-[#5f7f76]",
  valueColor = "text-[#203a34]",
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  bgClass?: string;
  borderClass?: string;
  titleColor?: string;
  valueColor?: string;
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border ${borderClass} ${bgClass} p-5 shadow-sm transition-all duration-300 ${
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-teal-300"
          : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={`flex items-center gap-2 font-semibold text-sm ${titleColor}`}>
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          {title}
        </h3>
        <div className="rounded-xl bg-[#eef7f5] p-2 text-[#25695c] shadow-inner transition-transform duration-300 hover:rotate-6">
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
      {subtitle && <div className="mt-2 text-xs text-[#7b9690]">{subtitle}</div>}
    </div>
  );
};

const MetalBreakdown = ({ gold, silver, diamond }: { gold: number; silver: number; diamond: number }) => (
  <div className="space-y-1 mt-1 text-sm font-medium">
    <div className="flex justify-between items-center bg-[#fbfdfc] px-2 py-1 rounded border border-[#eef4f2]">
      <span className="text-amber-700 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Gold
      </span>
      <span className="text-gray-800 font-bold">{gold.toFixed(3)} gm</span>
    </div>
    <div className="flex justify-between items-center bg-[#fbfdfc] px-2 py-1 rounded border border-[#eef4f2]">
      <span className="text-slate-500 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Silver
      </span>
      <span className="text-gray-800 font-bold">{silver.toFixed(3)} gm</span>
    </div>
    <div className="flex justify-between items-center bg-[#fbfdfc] px-2 py-1 rounded border border-[#eef4f2]">
      <span className="text-cyan-700 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Diamond
      </span>
      <span className="text-gray-800 font-bold">{diamond.toFixed(3)} ct</span>
    </div>
  </div>
);

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-[#d8e5e1] bg-white p-6 shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between border-b border-[#e0ece8] pb-3">
          <h3 className="text-lg font-bold text-[#1f3732]">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl font-semibold text-gray-500 hover:text-[#25695c]"
          >
            &times;
          </button>
        </div>
        <div className="mt-4 max-h-[400px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};