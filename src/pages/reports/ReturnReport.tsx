import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
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
  FileText,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useReturnList } from "@/hooks/useReturn";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { exportToCSV, exportToExcel, printGroupedReturnReport, type ExportColumn, type StatCardItem } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const ReturnReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Return Report');

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [expandedReturnIds, setExpandedReturnIds] = useState<Set<number>>(new Set());

  // Fetch Return API data: GET /api/Return?shopId=...&page=1&pageSize=10000
  const { data: returnApiResponse, isLoading } = useReturnList({
    shopId: filterShopId ?? undefined,
    page: 1,
    pageSize: 10000,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    keyword: searchTerm || undefined,
  });

  const rawReturnList = useMemo(() => {
    if (!returnApiResponse) return [];
    if (Array.isArray(returnApiResponse)) return returnApiResponse;
    if (Array.isArray((returnApiResponse as any).data)) return (returnApiResponse as any).data;
    if (Array.isArray((returnApiResponse as any).items)) return (returnApiResponse as any).items;
    return [];
  }, [returnApiResponse]);

  const normalizedReturns = useMemo(() => {
    return rawReturnList.map((ret: any) => {
      const items = ret.items || ret.returnItems || (ret.tagNumber || ret.itemName ? [ret] : []);
      const totalReturnAmount = num(ret.totalReturnAmount ?? ret.totalAmount ?? items.reduce((sum: number, it: any) => sum + num(it.totalReturnPrice || it.totalSalePrice || it.price), 0));
      const itemsCount = items.length;

      return {
        ...ret,
        items,
        itemsCount,
        totalReturnAmount,
      };
    });
  }, [rawReturnList]);

  const filteredReturns = useMemo(() => {
    return normalizedReturns.filter((ret: any) => {
      if (fromDate && new Date(ret.returnDate || ret.createDate) < new Date(fromDate)) return false;
      if (toDate && new Date(ret.returnDate || ret.createDate) > new Date(toDate + "T23:59:59")) return false;
      if (filterShopId && ret.shopId && ret.shopId !== filterShopId) return false;
      if (statusFilter !== "All" && ret.status && ret.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      if (selectedMetal !== "ALL") {
        const hasMetal = ret.items.some(
          (it: any) => it.metal?.toUpperCase() === selectedMetal.toUpperCase()
        );
        if (!hasMetal) return false;
      }

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesId = String(ret.id).includes(kw);
        const matchesInvoice = (ret.invoiceNo || ret.invoice?.invoiceNo || "").toLowerCase().includes(kw);
        const matchesCustomer = (ret.customerName || ret.customer?.name || "").toLowerCase().includes(kw) || (ret.customerPhone || ret.customer?.phone || "").includes(kw);
        const matchesItem = ret.items.some(
          (it: any) =>
            it.itemName?.toLowerCase().includes(kw) ||
            it.tagNumber?.toLowerCase().includes(kw) ||
            it.metal?.toLowerCase().includes(kw) ||
            it.category?.toLowerCase().includes(kw)
        );
        if (!matchesId && !matchesInvoice && !matchesCustomer && !matchesItem) return false;
      }

      return true;
    });
  }, [normalizedReturns, fromDate, toDate, filterShopId, statusFilter, selectedMetal, searchTerm]);

  useEffect(() => {
    if (filteredReturns.length > 0) {
      setExpandedReturnIds(new Set(filteredReturns.map((r: any) => r.id)));
    } else {
      setExpandedReturnIds(new Set());
    }
  }, [filteredReturns]);

  const toggleReturnExpand = (id: number) => {
    setExpandedReturnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedReturnIds(new Set(filteredReturns.map((r: any) => r.id)));
  };

  const collapseAll = () => {
    setExpandedReturnIds(new Set());
  };

  const displayedReturns = useMemo(() => {
    if (pageSize >= 9999) return filteredReturns;
    const startIndex = (page - 1) * pageSize;
    return filteredReturns.slice(startIndex, startIndex + pageSize);
  }, [filteredReturns, page, pageSize]);

  const stats = useMemo(() => {
    const totalReturns = filteredReturns.length;
    let totalItems = 0;
    let totalNetWeight = 0;
    let totalGrossWeight = 0;
    let totalReturnValue = 0;

    filteredReturns.forEach((ret: any) => {
      totalReturnValue += num(ret.totalReturnAmount);
      ret.items.forEach((it: any) => {
        totalItems += num(it.quantity || 1);
        totalNetWeight += num(it.netWeight);
        totalGrossWeight += num(it.grossWeight);
      });
    });

    return {
      totalReturns,
      totalItems,
      totalNetWeight,
      totalGrossWeight,
      totalReturnValue,
    };
  }, [filteredReturns]);

  const exportData = useMemo(() => {
    const rows: any[] = [];
    filteredReturns.forEach((ret: any) => {
      const returnDateStr = ret.returnDate || ret.createDate ? format(new Date(ret.returnDate || ret.createDate), "dd/MM/yyyy hh:mm a") : "-";
      const custName = ret.customer?.name || ret.customerName || "Guest Customer";
      const custPhone = ret.customer?.phone || ret.customerPhone || "-";
      const shopName = ret.shop?.name || selectedShop?.name || "Main Shop";
      const invoiceNo = ret.invoiceNo || ret.invoice?.invoiceNo || (ret.invoiceId ? `INV-${ret.invoiceId}` : "-");

      if (ret.items && ret.items.length > 0) {
        ret.items.forEach((item: any) => {
          if (selectedMetal !== "ALL" && item.metal?.toUpperCase() !== selectedMetal.toUpperCase()) {
            return;
          }
          const taxTotal = num(item.igst || num(item.cgst) + num(item.sgst));
          rows.push({
            returnId: ret.id,
            returnDate: returnDateStr,
            customerName: custName,
            customerPhone: custPhone,
            shopName: shopName,
            invoiceNo: invoiceNo,
            status: ret.status || "Completed",
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
            makingCharges: num(item.makingCharges),
            discount: num(item.discount),
            tax: taxTotal,
            returnPrice: num(item.totalReturnPrice || item.totalSalePrice || item.price),
            totalReturnAmount: ret.totalReturnAmount,
          });
        });
      } else {
        rows.push({
          returnId: ret.id,
          returnDate: returnDateStr,
          customerName: custName,
          customerPhone: custPhone,
          shopName: shopName,
          invoiceNo: invoiceNo,
          status: ret.status || "Completed",
          tagNumber: ret.tagNumber || "-",
          itemName: ret.itemName || "Returned Item",
          metal: ret.metal || "-",
          category: ret.category || "-",
          purity: ret.purity || "-",
          quantity: 1,
          grossWeight: num(ret.grossWeight),
          netWeight: num(ret.netWeight),
          stoneWeight: num(ret.stoneWeight),
          diamondWeight: num(ret.diamondWeight),
          makingCharges: num(ret.makingCharges),
          discount: num(ret.discount),
          tax: 0,
          returnPrice: ret.totalReturnAmount,
          totalReturnAmount: ret.totalReturnAmount,
        });
      }
    });
    return rows;
  }, [filteredReturns, selectedMetal, selectedShop]);

  const exportColumns: ExportColumn[] = [
    { header: "Return ID", key: "returnId" },
    { header: "Return Date", key: "returnDate" },
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
    { header: "Return Price (₹)", key: "returnPrice", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Total Return Value (₹)", key: "totalReturnAmount", formatter: (v) => num(v).toLocaleString("en-IN") },
  ];

  const handleExportCSV = () => {
    exportToCSV(`Return_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} return records to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Return_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} return records to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All"} | Date Range: ${fromDate || "Start"} to ${toDate || "Today"}${selectedMetal !== "ALL" ? ` | Metal: ${selectedMetal}` : ""}`;
    const statCards: StatCardItem[] = [
      {
        label: "Total Returns",
        value: stats.totalReturns,
        bgColor: "#cffafe",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7490" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
      },
      {
        label: "Items Returned",
        value: stats.totalItems,
        bgColor: "#eff6ff",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.586-6.586a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
      },
      {
        label: "Net Weight Returned",
        value: `${formatWeight(stats.totalNetWeight)} g`,
        bgColor: "#cffafe",
        textColor: "#155e75",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7490" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>`,
      },
      {
        label: "Total Return Value",
        value: `\u20B9${stats.totalReturnValue.toLocaleString("en-IN")}`,
        bgColor: "#ecfdf5",
        textColor: "#047857",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a3.5 3.5 0 0 0 0-7H6"/></svg>`,
      },
    ];
    printGroupedReturnReport("Return Report (Itemwise)", subTitle, statCards, filteredReturns, selectedMetal);
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
    <div className="space-y-6 p-4 sm:p-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-cyan-700" /> Return Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete returned item breakdown, refund amounts, invoice references, and CSV exports
          </p>
        </div>

        {canExport && (
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleExportCSV} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-1.5" /> CSV
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Returns</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalReturns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Items Returned</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Net Weight Returned</p>
          <p className="text-xl font-bold text-cyan-700">{formatWeight(stats.totalNetWeight)} g</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Return Value</p>
          <p className="text-xl font-bold text-emerald-700">₹{stats.totalReturnValue.toLocaleString("en-IN")}</p>
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
              <option value={15}>15 returns per page</option>
              <option value={30}>30 returns per page</option>
              <option value={50}>50 returns per page</option>
              <option value={100}>100 returns per page</option>
              <option value={99999}>All Returns (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Return ID, Tag, Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Shop Filter</label>
            <ShopSelect
              value={filterShopId}
              onChange={(id) => { setFilterShopId(id); setPage(1); }}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Metal</label>
            <select
              value={selectedMetal}
              onChange={(e) => { setSelectedMetal(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm"
            >
              <option value="ALL">All Metals</option>
              <option value="GOLD">Gold</option>
              <option value="DIAMOND">Diamond</option>
              <option value="SILVER">Silver</option>
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
            Showing <strong>{filteredReturns.length}</strong> return records matching filters
          </span>
          {(searchTerm || fromDate || toDate || statusFilter !== "All" || selectedMetal !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setStatusFilter("All"); setSelectedMetal("ALL"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Return Accordion List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading returns...</div>
        ) : displayedReturns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No return records found matching criteria.</div>
        ) : (
          displayedReturns.map((ret: any) => {
            const isExpanded = expandedReturnIds.has(ret.id);
            const items = ret.items?.filter((item: any) => {
              if (selectedMetal === "ALL") return true;
              return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
            }) || [];

            const formattedDate = ret.returnDate || ret.createDate ? format(new Date(ret.returnDate || ret.createDate), "dd MMM yyyy, hh:mm a") : "-";

            return (
              <div key={ret.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all shadow-2xs">
                {/* Header Row */}
                <div
                  onClick={() => toggleReturnExpand(ret.id)}
                  className="bg-slate-50 hover:bg-slate-100/80 p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition-colors border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-cyan-700" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-base">Return #{ret.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200`}>
                          {ret.status || "Completed"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-2 text-xs min-w-[180px]">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">{ret.customer?.name || ret.customerName || "Guest Customer"}</p>
                      <p className="text-slate-500">{ret.customer?.phone || ret.customerPhone || "-"}</p>
                    </div>
                  </div>

                  {/* Invoice Reference */}
                  <div className="flex items-center gap-2 text-xs min-w-[160px]">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 block">Invoice</span>
                      <span className="font-mono font-semibold text-slate-800">{ret.invoiceNo || ret.invoice?.invoiceNo || (ret.invoiceId ? `INV-${ret.invoiceId}` : "-")}</span>
                    </div>
                  </div>

                  {/* Return Value */}
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Total Return Value</span>
                    <span className="text-base font-extrabold text-cyan-700">
                      ₹{num(ret.totalReturnAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Sub-table */}
                {isExpanded && (
                  <div className="bg-white p-3 border-t border-slate-100 overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No returned item details.</div>
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
                            <th className="py-2.5 px-3 text-right">Return Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item: any, idx: number) => {
                            const returnPrice = num(item.totalReturnPrice || item.totalSalePrice || item.price);
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
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatWeight(item.diamondWeight || item.diamondCarat)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{num(item.makingCharges).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600 font-medium">₹{num(item.discount).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-cyan-700">₹{returnPrice.toLocaleString("en-IN")}</td>
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
        {pageSize < 9999 && filteredReturns.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200 gap-4 mt-2 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredReturns.length)} of {filteredReturns.length} returns
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 text-xs">Prev</Button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                {page} / {Math.ceil(filteredReturns.length / pageSize)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(filteredReturns.length / pageSize)} onClick={() => setPage(page + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnReport;
