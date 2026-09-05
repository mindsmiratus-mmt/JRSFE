import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  User,
  Store,
  Tag,
  Receipt,
  Scale,
  IndianRupee,
  FileText,
  Boxes,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useOrderList } from "@/hooks/useOrder";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { exportToCSV, exportToExcel, printGroupedPurchaseReport, type ExportColumn, type StatCardItem } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";

type ItemCostDetails = {
  goldCost?: number;
  diamondCost?: number;
  stoneCost?: number;
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  otherCharges?: number;
  totalSalePrice?: number;
};

type CartItem = {
  id?: string;
  itemId?: number;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;
  gPurityId?: string;
  purityPercent?: string;
  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;
  huid?: string;
  itemCostDetails?: ItemCostDetails;
};

type CartData = {
  id?: string;
  status?: number;
  shopId?: number;
  userId?: number;
  paymentMethod?: string;
  items?: CartItem[];
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  grandTotal?: number;
  currency?: string;
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseCartData = (raw: unknown): CartData | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as CartData;
    } catch {
      return null;
    }
  }
  return raw as CartData;
};

export const PurchaseReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Purchase Report');

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [advanceFilter, setAdvanceFilter] = useState<string>("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Set of expanded order IDs (all open by default)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(new Set());

  const { data: orderListResponse, isLoading } = useOrderList({
    userId: undefined,
    shopId: filterShopId ?? undefined,
    page: 1,
    pageSize: 10000,
  });

  const rawOrders = useMemo(() => orderListResponse?.data ?? [], [orderListResponse]);

  const normalizedOrders = useMemo(() => {
    return rawOrders.map((order: any) => {
      const cart = parseCartData(order.cartData);
      const items = cart?.items ?? [];
      const grandTotal = num(cart?.grandTotal ?? order.invoice?.totalAmount);
      const makingCharges = num(cart?.makingCharges);
      const discount = num(cart?.discount);
      const igst = num(cart?.igst);
      const cgst = num(cart?.cgst);
      const sgst = num(cart?.sgst);
      const advanceAmount = num(order.advanceAmount);
      const balanceAmount = num(order.balanceAmount);

      return {
        ...order,
        parsedCart: cart,
        cartItems: items,
        itemsCount: items.reduce((sum: number, item: CartItem) => sum + num(item.quantity || 1), 0),
        grandTotal,
        makingCharges,
        discount,
        igst,
        cgst,
        sgst,
        isAdvanceOrder: !!order.isAdvanceOrder,
        advanceAmount,
        balanceAmount,
      };
    });
  }, [rawOrders]);

  const filteredOrders = useMemo(() => {
    return normalizedOrders.filter((order: any) => {
      if (fromDate && new Date(order.createdAt) < new Date(fromDate)) return false;
      if (toDate && new Date(order.createdAt) > new Date(toDate + "T23:59:59")) return false;
      if (filterShopId && order.shopId && order.shopId !== filterShopId) return false;

      if (statusFilter !== "All" && order.status !== statusFilter) return false;

      if (advanceFilter !== "All") {
        if (advanceFilter === "Advance" && !order.isAdvanceOrder) return false;
        if (advanceFilter === "Regular" && order.isAdvanceOrder) return false;
      }

      if (selectedMetal !== "ALL") {
        const hasMetal = order.cartItems.some(
          (it: CartItem) => it.metal?.toUpperCase() === selectedMetal.toUpperCase()
        );
        if (!hasMetal) return false;
      }

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesOrder = order.orderNo?.toLowerCase().includes(kw) || String(order.id).includes(kw);
        const matchesInvoice = order.invoice?.invoiceNo?.toLowerCase().includes(kw);
        const matchesCustomer = order.customer?.name?.toLowerCase().includes(kw) || order.customer?.phone?.includes(kw);
        const matchesItem = order.cartItems.some(
          (it: CartItem) =>
            it.itemName?.toLowerCase().includes(kw) ||
            it.tagNumber?.toLowerCase().includes(kw) ||
            it.metal?.toLowerCase().includes(kw) ||
            it.category?.toLowerCase().includes(kw)
        );
        if (!matchesOrder && !matchesInvoice && !matchesCustomer && !matchesItem) return false;
      }
      return true;
    });
  }, [normalizedOrders, fromDate, toDate, filterShopId, statusFilter, advanceFilter, selectedMetal, searchTerm]);

  // Keep all open by default when filteredOrders change
  useEffect(() => {
    if (filteredOrders.length > 0) {
      setExpandedOrderIds(new Set(filteredOrders.map((o: any) => o.id)));
    } else {
      setExpandedOrderIds(new Set());
    }
  }, [filteredOrders]);

  const toggleOrderExpand = (id: number) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedOrderIds(new Set(filteredOrders.map((o: any) => o.id)));
  };

  const collapseAll = () => {
    setExpandedOrderIds(new Set());
  };

  // Pagination for order list
  const displayedOrders = useMemo(() => {
    if (pageSize >= 9999) return filteredOrders;
    const startIndex = (page - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, page, pageSize]);

  // Summary Statistics
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalItems = filteredOrders.reduce((sum: number, o: any) => sum + num(o.itemsCount), 0);
    const totalAmount = filteredOrders.reduce((sum: number, o: any) => sum + num(o.grandTotal), 0);
    const totalAdvanceOrders = filteredOrders.filter((o: any) => o.isAdvanceOrder).length;
    const totalAdvanceAmount = filteredOrders.reduce((sum: number, o: any) => sum + num(o.advanceAmount), 0);
    const totalBalanceAmount = filteredOrders.reduce((sum: number, o: any) => sum + num(o.balanceAmount), 0);

    return {
      totalOrders,
      totalItems,
      totalAmount,
      totalAdvanceOrders,
      totalAdvanceAmount,
      totalBalanceAmount,
    };
  }, [filteredOrders]);

  // Flattened Export Data for CSV, Excel, and PDF Print
  const exportData = useMemo(() => {
    const rows: any[] = [];
    filteredOrders.forEach((order: any) => {
      const orderDateStr = order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy hh:mm a") : "-";
      const custName = order.customer?.name || "Guest Customer";
      const custPhone = order.customer?.phone || "-";
      const shopName = selectedShop?.name || "Main Shop";
      const invoiceNo = order.invoice?.invoiceNo || (order.invoiceId ? `INV-${order.invoiceId}` : "-");

      if (order.cartItems && order.cartItems.length > 0) {
        order.cartItems.forEach((item: CartItem) => {
          if (selectedMetal !== "ALL" && item.metal?.toUpperCase() !== selectedMetal.toUpperCase()) {
            return;
          }
          const taxTotal = num(item.itemCostDetails?.igst || num(item.itemCostDetails?.cgst) + num(item.itemCostDetails?.sgst));
          rows.push({
            orderNo: order.orderNo || `ORD-${order.id}`,
            orderId: order.id,
            orderType: order.isAdvanceOrder ? "Advance" : "Regular",
            orderDate: orderDateStr,
            customerName: custName,
            customerPhone: custPhone,
            shopName: shopName,
            invoiceNo: invoiceNo,
            status: order.status || "-",
            tagNumber: item.tagNumber || `ITEM-${item.itemId}`,
            itemName: item.itemName || "Jewelry Item",
            metal: item.metal || "Gold",
            category: item.category || "-",
            purity: item.gPurityId || item.purityPercent || "22K",
            quantity: item.quantity || 1,
            grossWeight: num(item.grossWeight),
            netWeight: num(item.netWeight),
            stoneWeight: num(item.stoneWeight),
            diamondWeight: num(item.diamondWeight || item.diamondCarat),
            makingCharges: num(item.itemCostDetails?.makingCharges),
            discount: num(item.itemCostDetails?.discount),
            tax: taxTotal,
            itemPrice: num(item.itemCostDetails?.totalSalePrice),
            advanceAmount: order.advanceAmount,
            balanceAmount: order.balanceAmount,
            totalAmount: order.grandTotal,
          });
        });
      } else {
        rows.push({
          orderNo: order.orderNo || `ORD-${order.id}`,
          orderId: order.id,
          orderType: order.isAdvanceOrder ? "Advance" : "Regular",
          orderDate: orderDateStr,
          customerName: custName,
          customerPhone: custPhone,
          shopName: shopName,
          invoiceNo: invoiceNo,
          status: order.status || "-",
          tagNumber: "-",
          itemName: "No items",
          metal: "-",
          category: "-",
          purity: "-",
          quantity: 0,
          grossWeight: 0,
          netWeight: 0,
          stoneWeight: 0,
          diamondWeight: 0,
          makingCharges: order.makingCharges,
          discount: order.discount,
          tax: order.igst + order.cgst + order.sgst,
          itemPrice: order.grandTotal,
          advanceAmount: order.advanceAmount,
          balanceAmount: order.balanceAmount,
          totalAmount: order.grandTotal,
        });
      }
    });
    return rows;
  }, [filteredOrders, selectedMetal, selectedShop]);

  const exportColumns: ExportColumn[] = [
    { header: "Order No.", key: "orderNo" },
    { header: "Order ID", key: "orderId" },
    { header: "Order Type", key: "orderType" },
    { header: "Order Date", key: "orderDate" },
    { header: "Customer Name", key: "customerName" },
    { header: "Phone", key: "customerPhone" },
    { header: "Shop", key: "shopName" },
    { header: "Invoice No.", key: "invoiceNo" },
    { header: "Status", key: "status" },
    { header: "Tag Number", key: "tagNumber" },
    { header: "Product Name", key: "itemName" },
    { header: "Metal", key: "metal" },
    { header: "Category", key: "category" },
    { header: "Purity", key: "purity" },
    { header: "Qty", key: "quantity" },
    { header: "Gross Wt. (g)", key: "grossWeight", formatter: (v) => formatWeight(v) },
    { header: "Net Wt. (g)", key: "netWeight", formatter: (v) => formatWeight(v) },
    { header: "Stone Wt. (g)", key: "stoneWeight", formatter: (v) => formatWeight(v) },
    { header: "Diamond Wt. (ct)", key: "diamondWeight", formatter: (v) => formatWeight(v) },
    { header: "Making Chg. (₹)", key: "makingCharges", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Discount (₹)", key: "discount", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Tax (₹)", key: "tax", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Item Price (₹)", key: "itemPrice", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Advance Amt. (₹)", key: "advanceAmount", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Balance Amt. (₹)", key: "balanceAmount", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Total Amount (₹)", key: "totalAmount", formatter: (v) => num(v).toLocaleString("en-IN") },
  ];

  const handleExportCSV = () => {
    exportToCSV(`Purchase_Order_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} order records to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Purchase_Order_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} order records to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All Shops"} | Date Range: ${fromDate || "Start"} to ${toDate || "Today"}${selectedMetal !== "ALL" ? ` | Metal: ${selectedMetal}` : ""}`;
    const statCards: StatCardItem[] = [
      {
        label: "Total Orders",
        value: stats.totalOrders,
        bgColor: "#fef3c7",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      },
      {
        label: "Total Items",
        value: stats.totalItems,
        bgColor: "#eff6ff",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.586-6.586a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
      },
      {
        label: "Total Amount",
        value: `\u20B9${stats.totalAmount.toLocaleString("en-IN")}`,
        bgColor: "#ecfdf5",
        textColor: "#047857",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a3.5 3.5 0 0 0 0-7H6"/></svg>`,
      },
      {
        label: "Advance Orders",
        value: stats.totalAdvanceOrders,
        bgColor: "#fef3c7",
        textColor: "#b45309",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      },
      {
        label: "Advance Collected",
        value: `\u20B9${stats.totalAdvanceAmount.toLocaleString("en-IN")}`,
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
      },
      {
        label: "Balance Pending",
        value: `\u20B9${stats.totalBalanceAmount.toLocaleString("en-IN")}`,
        bgColor: "#fff7ed",
        textColor: "#c2410c",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      },
    ];
    printGroupedPurchaseReport("Purchase & Order Report", subTitle, statCards, filteredOrders, selectedMetal);
  };

  const applyDatePreset = (preset: "TODAY" | "YESTERDAY" | "THIS_MONTH" | "ALL") => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (preset === "TODAY") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "YESTERDAY") {
      setFromDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
      setToDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
    } else if (preset === "THIS_MONTH") {
      setFromDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setToDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    } else {
      setFromDate(null);
      setToDate(null);
    }
    setPage(1);
  };

  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view Reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-amber-600" />
            Purchase & Order Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete order history details, itemwise breakdown, advance & balance amounts, and CSV export
          </p>
        </div>

        {canExport && (
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleExportCSV} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel (.xls)
            </Button>
            <Button onClick={handlePrintPDF} className="bg-[#b08d28] hover:bg-[#967720] text-white">
              <Printer className="w-4 h-4 mr-1.5" /> Print / PDF
            </Button>
          </div>
        )}
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Orders</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Items</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalItems}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Amount</p>
          <p className="text-xl font-bold text-emerald-700">₹{stats.totalAmount.toLocaleString("en-IN")}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Advance Orders</p>
          <p className="text-xl font-bold text-amber-700">{stats.totalAdvanceOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Advance Collected</p>
          <p className="text-xl font-bold text-blue-700">₹{stats.totalAdvanceAmount.toLocaleString("en-IN")}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Balance Pending</p>
          <p className="text-xl font-bold text-orange-700">₹{stats.totalBalanceAmount.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Presets:
            </span>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset("TODAY")} className="h-7 text-xs">Today</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset("YESTERDAY")} className="h-7 text-xs">Yesterday</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset("THIS_MONTH")} className="h-7 text-xs">This Month</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset("ALL")} className="h-7 text-xs">All Time</Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={expandAll} className="h-8 text-xs font-medium border-slate-300">
              <ChevronsUpDown className="w-3.5 h-3.5 mr-1 text-slate-600" /> Expand All
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll} className="h-8 text-xs font-medium border-slate-300">
              <ChevronDown className="w-3.5 h-3.5 mr-1 text-slate-600" /> Collapse All
            </Button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-800 ml-2"
            >
              <option value={15}>15 orders per page</option>
              <option value={30}>30 orders per page</option>
              <option value={50}>50 orders per page</option>
              <option value={100}>100 orders per page</option>
              <option value={99999}>All Orders (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Order No, Customer, Tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Shop Filter</label>
            <ShopSelect
              value={filterShopId}
              onChange={(newShopId) => {
                setFilterShopId(newShopId);
                setPage(1);
              }}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="PendingPayment">Pending Payment</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Order Type</label>
            <select
              value={advanceFilter}
              onChange={(e) => { setAdvanceFilter(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm"
            >
              <option value="All">All Types</option>
              <option value="Advance">Advance Orders</option>
              <option value="Regular">Regular Orders</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">From Date</label>
            <DateInput value={fromDate || ""} onValueChange={(val) => { setFromDate(val); setPage(1); }} placeholder="Start Date" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">To Date</label>
            <DateInput value={toDate || ""} onValueChange={(val) => { setToDate(val); setPage(1); }} placeholder="End Date" />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Showing <strong>{filteredOrders.length}</strong> orders matching filters
          </span>
          {(searchTerm || fromDate || toDate || statusFilter !== "All" || advanceFilter !== "All" || selectedMetal !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setStatusFilter("All"); setAdvanceFilter("All"); setSelectedMetal("ALL"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Orders Grouped Accordion List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading orders...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No orders found matching criteria.</div>
        ) : (
          displayedOrders.map((order: any) => {
            const isExpanded = expandedOrderIds.has(order.id);
            const items = order.cartItems?.filter((item: CartItem) => {
              if (selectedMetal === "ALL") return true;
              return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
            }) || [];

            const formattedDate = order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a") : "-";

            return (
              <div key={order.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all shadow-2xs">
                {/* Order Header Row */}
                <div
                  onClick={() => toggleOrderExpand(order.id)}
                  className="bg-slate-50 hover:bg-slate-100/80 p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition-colors border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-amber-600" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-base">{order.orderNo || `ORD-${order.id}`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${order.isAdvanceOrder ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-200 text-slate-700"}`}>
                          {order.isAdvanceOrder ? "Advance" : "Regular"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${order.status === "PendingPayment" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                          {order.status || "Closed"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-2 text-xs min-w-[180px]">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">{order.customer?.name || "Guest Customer"}</p>
                      <p className="text-slate-500">{order.customer?.phone || "-"}</p>
                    </div>
                  </div>

                  {/* Invoice Reference */}
                  <div className="flex items-center gap-2 text-xs min-w-[160px]">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 block">Invoice</span>
                      <span className="font-mono font-semibold text-slate-800">{order.invoice?.invoiceNo || (order.invoiceId ? `INV-${order.invoiceId}` : "Not Invoiced")}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="flex items-center gap-4 text-right">
                    {order.isAdvanceOrder && (
                      <div className="text-right border-r border-slate-200 pr-3">
                        <span className="text-[11px] text-slate-500 block">Adv / Bal</span>
                        <span className="text-xs font-semibold text-blue-700 block">Adv: ₹{order.advanceAmount.toLocaleString("en-IN")}</span>
                        <span className="text-xs font-semibold text-orange-700 block">Bal: ₹{order.balanceAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Amount</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        ₹{Number(order.grandTotal || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-menu Collapsible Item Table */}
                {isExpanded && (
                  <div className="bg-white p-3 border-t border-slate-100 overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No cart items in this order.</div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3"># Tag / Code</th>
                            <th className="py-2.5 px-3">Item Name</th>
                            <th className="py-2.5 px-3">Metal / Category</th>
                            <th className="py-2.5 px-3">Purity</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Gross Wt. (g)</th>
                            <th className="py-2.5 px-3 text-right">Net Wt. (g)</th>
                            <th className="py-2.5 px-3 text-right">Stone Wt.</th>
                            <th className="py-2.5 px-3 text-right">Diamond Wt.</th>
                            <th className="py-2.5 px-3 text-right">Making Chg. (₹)</th>
                            <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                            <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                            <th className="py-2.5 px-3 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item: CartItem, idx: number) => {
                            const itemPrice = num(item.itemCostDetails?.totalSalePrice);
                            const makingChg = num(item.itemCostDetails?.makingCharges);
                            const discountVal = num(item.itemCostDetails?.discount);
                            const taxVal = num(item.itemCostDetails?.igst || num(item.itemCostDetails?.cgst) + num(item.itemCostDetails?.sgst));
                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                  <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">{item.tagNumber || `ITEM-${item.itemId}`}</span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.itemName || "Jewelry Item"}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-medium text-slate-700">{item.metal || "Gold"}</span>
                                  {item.category && <span className="text-slate-400 ml-1">({item.category})</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700">{item.gPurityId || item.purityPercent || "22K"}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{item.quantity || 1}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatWeight(item.grossWeight)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(item.netWeight)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatWeight(item.stoneWeight)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{item.diamondCarat || item.diamondWeight ? formatWeight(item.diamondCarat || item.diamondWeight) : "0.000"}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{makingChg.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600 font-medium">₹{discountVal.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{taxVal.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-[#b08d28]">₹{itemPrice.toLocaleString("en-IN")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination Footer */}
        {pageSize < 9999 && filteredOrders.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200 gap-4 mt-2 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 text-xs">Prev</Button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                {page} / {Math.ceil(filteredOrders.length / pageSize)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(filteredOrders.length / pageSize)} onClick={() => setPage(page + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseReport;
