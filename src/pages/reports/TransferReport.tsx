import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Truck,
  Store,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useStockTransfersPaged, useStockTransfers } from "@/hooks/useStockTransfer";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { exportToCSV, exportToExcel, printGroupedTransferReport, type ExportColumn, type StatCardItem } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const TransferReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Transfer Report');

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [expandedTransferIds, setExpandedTransferIds] = useState<Set<number>>(new Set());

  // Call POST /StockTransfer/paged API with filters & shopId
  const { data: pagedResponse, isLoading: isLoadingPaged } = useStockTransfersPaged({
    page: 1,
    pageSize: 10000,
    keyword: searchTerm || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    shopId: filterShopId || undefined,
    destinationShopId: filterShopId || undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
  });

  const { data: allTransfersList = [], isLoading: isLoadingAll } = useStockTransfers();

  const isLoading = isLoadingPaged || isLoadingAll;

  const rawTransfers = useMemo(() => {
    if (pagedResponse?.data && pagedResponse.data.length > 0) {
      return pagedResponse.data;
    }
    return allTransfersList || [];
  }, [pagedResponse, allTransfersList]);

  const normalizedTransfers = useMemo(() => {
    return (rawTransfers || []).map((t: any) => {
      const items = t.transferItems || t.items || [];
      const totalItems = items.length;
      const totalGrossWeight = items.reduce((sum: number, it: any) => sum + num(it.grossWeight || it.stockEntry?.grossWeight), 0);
      const totalNetWeight = items.reduce((sum: number, it: any) => sum + num(it.netWeight || it.stockEntry?.netWeight), 0);

      return {
        ...t,
        items,
        totalItems,
        totalGrossWeight,
        totalNetWeight,
      };
    });
  }, [rawTransfers]);

  const filteredTransfers = useMemo(() => {
    return normalizedTransfers.filter((t: any) => {
      if (fromDate && new Date(t.transferDate || t.createDate) < new Date(fromDate)) return false;
      if (toDate && new Date(t.transferDate || t.createDate) > new Date(toDate + "T23:59:59")) return false;

      if (filterShopId) {
        const matchesSource = t.sourceShopId === filterShopId;
        const matchesDest = t.destinationShopId === filterShopId;
        if (!matchesSource && !matchesDest) return false;
      }

      if (statusFilter !== "All" && t.status && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      if (selectedMetal !== "ALL") {
        const hasMetal = t.items.some(
          (it: any) => (it.metal || it.stockEntry?.metal)?.toUpperCase() === selectedMetal.toUpperCase()
        );
        if (!hasMetal) return false;
      }

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesNo = (t.transferNumber || `TRF-${t.id}`).toLowerCase().includes(kw);
        const matchesChallan = (t.challanNumber || "").toLowerCase().includes(kw);
        const matchesSource = (t.sourceShop?.name || "").toLowerCase().includes(kw);
        const matchesDest = (t.destinationShop?.name || "").toLowerCase().includes(kw);
        const matchesPorter = (t.porter?.name || "").toLowerCase().includes(kw);
        const matchesItem = t.items.some(
          (it: any) =>
            (it.tagNumber || it.stockEntry?.tagNumber || "").toLowerCase().includes(kw) ||
            (it.itemName || it.stockEntry?.itemName || "").toLowerCase().includes(kw)
        );
        if (!matchesNo && !matchesChallan && !matchesSource && !matchesDest && !matchesPorter && !matchesItem) return false;
      }

      return true;
    });
  }, [normalizedTransfers, fromDate, toDate, filterShopId, statusFilter, selectedMetal, searchTerm]);

  useEffect(() => {
    if (filteredTransfers.length > 0) {
      setExpandedTransferIds(new Set(filteredTransfers.map((t: any) => t.id)));
    } else {
      setExpandedTransferIds(new Set());
    }
  }, [filteredTransfers]);

  const toggleTransferExpand = (id: number) => {
    setExpandedTransferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTransferIds(new Set(filteredTransfers.map((t: any) => t.id)));
  };

  const collapseAll = () => {
    setExpandedTransferIds(new Set());
  };

  const displayedTransfers = useMemo(() => {
    if (pageSize >= 9999) return filteredTransfers;
    const startIndex = (page - 1) * pageSize;
    return filteredTransfers.slice(startIndex, startIndex + pageSize);
  }, [filteredTransfers, page, pageSize]);

  const stats = useMemo(() => {
    const totalTransfers = filteredTransfers.length;
    let totalItems = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    filteredTransfers.forEach((t: any) => {
      totalItems += t.totalItems;
      totalGrossWeight += t.totalGrossWeight;
      totalNetWeight += t.totalNetWeight;
    });

    return {
      totalTransfers,
      totalItems,
      totalGrossWeight,
      totalNetWeight,
    };
  }, [filteredTransfers]);

  const exportData = useMemo(() => {
    const rows: any[] = [];
    filteredTransfers.forEach((t: any) => {
      const dateStr = t.transferDate || t.createDate ? format(new Date(t.transferDate || t.createDate), "dd/MM/yyyy hh:mm a") : "-";
      const sourceShopName = t.sourceShop?.name || `Shop #${t.sourceShopId}`;
      const destShopName = t.destinationShop?.name || `Shop #${t.destinationShopId}`;
      const porterName = t.porter?.name || "-";

      if (t.items && t.items.length > 0) {
        t.items.forEach((item: any) => {
          const metalType = item.metal || item.stockEntry?.metal || "Gold";
          if (selectedMetal !== "ALL" && metalType.toUpperCase() !== selectedMetal.toUpperCase()) {
            return;
          }
          rows.push({
            transferNo: t.transferNumber || `TRF-${t.id}`,
            challanNo: t.challanNumber || "-",
            transferDate: dateStr,
            sourceShop: sourceShopName,
            destinationShop: destShopName,
            porter: porterName,
            status: t.status || "Pending",
            tagNumber: item.tagNumber || item.stockEntry?.tagNumber || `ITEM-${item.stockEntryId || item.id}`,
            itemName: item.itemName || item.stockEntry?.itemName || "Jewelry Item",
            metal: metalType,
            category: item.category || item.stockEntry?.category || "-",
            purity: item.caratOrKT || item.stockEntry?.caratOrKT || "22K",
            quantity: item.quantity || 1,
            grossWeight: num(item.grossWeight || item.stockEntry?.grossWeight),
            netWeight: num(item.netWeight || item.stockEntry?.netWeight),
            stoneWeight: num(item.stoneWeight || item.stockEntry?.stoneWeight),
            diamondWeight: num(item.diamondWeight || item.stockEntry?.diamondWeight),
          });
        });
      } else {
        rows.push({
          transferNo: t.transferNumber || `TRF-${t.id}`,
          challanNo: t.challanNumber || "-",
          transferDate: dateStr,
          sourceShop: sourceShopName,
          destinationShop: destShopName,
          porter: porterName,
          status: t.status || "Pending",
          tagNumber: "-",
          itemName: "No items",
          metal: "-",
          category: "-",
          purity: "-",
          quantity: 0,
          grossWeight: t.totalGrossWeight,
          netWeight: t.totalNetWeight,
          stoneWeight: 0,
          diamondWeight: 0,
        });
      }
    });
    return rows;
  }, [filteredTransfers, selectedMetal]);

  const exportColumns: ExportColumn[] = [
    { header: "Transfer No.", key: "transferNo" },
    { header: "Challan No.", key: "challanNo" },
    { header: "Transfer Date", key: "transferDate" },
    { header: "Source Shop", key: "sourceShop" },
    { header: "Destination Shop", key: "destinationShop" },
    { header: "Porter", key: "porter" },
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
  ];

  const handleExportCSV = () => {
    exportToCSV(`Transfer_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} transfer records to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Transfer_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} transfer records to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All"} | Date Range: ${fromDate || "Start"} to ${toDate || "Today"}${selectedMetal !== "ALL" ? ` | Metal: ${selectedMetal}` : ""}`;
    const statCards: StatCardItem[] = [
      {
        label: "Total Transfers",
        value: stats.totalTransfers,
        bgColor: "#eef2ff",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
      },
      {
        label: "Items Transferred",
        value: stats.totalItems,
        bgColor: "#eff6ff",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.586-6.586a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
      },
      {
        label: "Total Gross Weight",
        value: `${formatWeight(stats.totalGrossWeight)} g`,
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>`,
      },
      {
        label: "Total Net Weight",
        value: `${formatWeight(stats.totalNetWeight)} g`,
        bgColor: "#eef2ff",
        textColor: "#3730a3",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>`,
      },
    ];
    printGroupedTransferReport(
      "Stock Transfer Report (Itemwise)",
      subTitle,
      statCards,
      filteredTransfers,
      selectedMetal,
      "#4f46e5",
      "Porter",
      "porter.name"
    );
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
            <ArrowLeftRight className="w-8 h-8 text-indigo-600" /> Stock Transfer Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete inter-shop transfer logs, itemized weights, porter details, and CSV exports
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
          <p className="text-xs text-slate-500 font-medium">Total Transfers</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalTransfers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Items Transferred</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Gross Weight</p>
          <p className="text-xl font-bold text-blue-700">{formatWeight(stats.totalGrossWeight)} g</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Net Weight</p>
          <p className="text-xl font-bold text-indigo-700">{formatWeight(stats.totalNetWeight)} g</p>
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
              <option value={15}>15 transfers per page</option>
              <option value={30}>30 transfers per page</option>
              <option value={50}>50 transfers per page</option>
              <option value={100}>100 transfers per page</option>
              <option value={99999}>All Transfers (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Transfer No, Tag, Porter..."
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
            Showing <strong>{filteredTransfers.length}</strong> transfer records matching filters
          </span>
          {(searchTerm || fromDate || toDate || statusFilter !== "All" || selectedMetal !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setStatusFilter("All"); setSelectedMetal("ALL"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Transfer Accordion List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading transfers...</div>
        ) : displayedTransfers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No transfer records found matching criteria.</div>
        ) : (
          displayedTransfers.map((t: any) => {
            const isExpanded = expandedTransferIds.has(t.id);
            const items = t.items?.filter((item: any) => {
              if (selectedMetal === "ALL") return true;
              const metal = item.metal || item.stockEntry?.metal;
              return metal?.toUpperCase() === selectedMetal.toUpperCase();
            }) || [];

            const formattedDate = t.transferDate || t.createDate ? format(new Date(t.transferDate || t.createDate), "dd MMM yyyy, hh:mm a") : "-";

            return (
              <div key={t.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all shadow-2xs">
                {/* Header Row */}
                <div
                  onClick={() => toggleTransferExpand(t.id)}
                  className="bg-slate-50 hover:bg-slate-100/80 p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition-colors border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-base">{t.transferNumber || `TRF-${t.id}`}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {t.status || "Completed"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Source & Destination Shops */}
                  <div className="flex items-center gap-2 text-xs min-w-[220px]">
                    <Store className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800">{t.sourceShop?.name || `Shop #${t.sourceShopId}`}</span>
                      <span className="text-slate-400 mx-1">➔</span>
                      <span className="font-semibold text-indigo-700">{t.destinationShop?.name || `Shop #${t.destinationShopId}`}</span>
                    </div>
                  </div>

                  {/* Porter Info */}
                  <div className="flex items-center gap-2 text-xs min-w-[140px]">
                    <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 block">Porter</span>
                      <span className="font-medium text-slate-800">{t.porter?.name || "-"}</span>
                    </div>
                  </div>

                  {/* Weight Summary */}
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Items / Weight</span>
                    <span className="text-sm font-extrabold text-indigo-700">
                      {t.totalItems} Items ({formatWeight(t.totalGrossWeight)} g)
                    </span>
                  </div>
                </div>

                {/* Sub-table */}
                {isExpanded && (
                  <div className="bg-white p-3 border-t border-slate-100 overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No item details in this transfer.</div>
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item: any, idx: number) => {
                            const tagNo = item.tagNumber || item.stockEntry?.tagNumber || `ITEM-${item.stockEntryId || item.id}`;
                            const name = item.itemName || item.stockEntry?.itemName || "Jewelry Item";
                            const metal = item.metal || item.stockEntry?.metal || "Gold";
                            const cat = item.category || item.stockEntry?.category || "-";
                            const purity = item.caratOrKT || item.stockEntry?.caratOrKT || "22K";
                            const gross = num(item.grossWeight || item.stockEntry?.grossWeight);
                            const net = num(item.netWeight || item.stockEntry?.netWeight);
                            const stone = num(item.stoneWeight || item.stockEntry?.stoneWeight);
                            const diamond = num(item.diamondWeight || item.stockEntry?.diamondWeight);

                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                  <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">{tagNo}</span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{name}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-medium text-slate-700">{metal}</span>
                                  {cat !== "-" && <span className="text-slate-400 ml-1">({cat})</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700">{purity}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{item.quantity || 1}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatWeight(gross)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(net)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatWeight(stone)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatWeight(diamond)}</td>
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
        {pageSize < 9999 && filteredTransfers.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200 gap-4 mt-2 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredTransfers.length)} of {filteredTransfers.length} transfers
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 text-xs">Prev</Button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                {page} / {Math.ceil(filteredTransfers.length / pageSize)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(filteredTransfers.length / pageSize)} onClick={() => setPage(page + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferReport;
