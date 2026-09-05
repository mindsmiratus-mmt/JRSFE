import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Gem,
  Scale,
  TrendingUp,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useStockEntries, type StockEntry } from "@/hooks/useStockEntry";
import { useCurrentRates, type CurrentRate } from "@/hooks/useCurruntrate";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { exportToCSV, exportToExcel, printReportTable, type ExportColumn } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const MetalReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Metal Report');

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [expandedRateIds, setExpandedRateIds] = useState<Set<string>>(new Set());

  // Fetch real API data: Stock Entries (/api/StockEntry) & Current Rates (/api/CurrentRate)
  const { data: rawStockEntries = [], isLoading: isLoadingStock } = useStockEntries();
  const { data: rawCurrentRates = [], isLoading: isLoadingRates } = useCurrentRates();

  const isLoading = isLoadingStock || isLoadingRates;

  // Filter raw stock entries by date, shop, and search term
  const filteredStockEntries = useMemo(() => {
    return (rawStockEntries || []).filter((entry: StockEntry) => {
      const entryDate = entry.createDate || (entry as any).updateDate;
      if (fromDate && new Date(entryDate) < new Date(fromDate)) return false;
      if (toDate && new Date(entryDate) > new Date(toDate + "T23:59:59")) return false;

      if (filterShopId && entry.shopId && entry.shopId !== filterShopId) return false;

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesTag = entry.tagNumber?.toLowerCase().includes(kw);
        const matchesName = entry.itemName?.toLowerCase().includes(kw);
        const matchesMetal = entry.metal?.toLowerCase().includes(kw);
        const matchesPurity = entry.caratOrKT?.toLowerCase().includes(kw) || entry.purityPercent?.toLowerCase().includes(kw);
        const matchesDPurity = entry.dPurityId?.toLowerCase().includes(kw);
        if (!matchesTag && !matchesName && !matchesMetal && !matchesPurity && !matchesDPurity) return false;
      }

      return true;
    });
  }, [rawStockEntries, fromDate, toDate, filterShopId, searchTerm]);

  // Group strictly by Current Rate ID using Recorded Rates on Stock Entries (purchaseGoldRate / purchaseDiamondRate)
  const rateIdGroupList = useMemo(() => {
    const list: any[] = [];
    let counter = 1;

    (rawCurrentRates || []).forEach((rateItem: CurrentRate) => {
      const rateId = (rateItem.id || "").trim();
      const rateIdUpper = rateId.toUpperCase();
      const metalType = (rateItem.metalType || "Gold").trim();
      const metalUpper = metalType.toUpperCase();
      const fallbackRate = num(rateItem.rate);
      const unit = rateItem.unit || (metalUpper === "DIAMOND" ? "CT" : "gm");

      if (selectedMetal !== "ALL" && metalUpper !== selectedMetal.toUpperCase()) {
        return;
      }

      // Find stock entries matching this specific Current Rate ID
      const matchingItems = filteredStockEntries.filter((item: StockEntry) => {
        const itemMetal = (item.metal || "Gold").toUpperCase();

        if (metalUpper === "DIAMOND") {
          const dPurity = (item.dPurityId || "").toUpperCase();
          const clarity = (item.clarity || "").toUpperCase();
          const hasDiamond = num(item.diamondCarat || item.diamondWeight) > 0;
          if (!hasDiamond) return false;

          if (dPurity === rateIdUpper || clarity === rateIdUpper || rateIdUpper.includes(dPurity)) {
            return true;
          }
          return itemMetal === "DIAMOND";
        } else {
          // Gold / Silver rate matching
          if (!itemMetal.includes(metalUpper)) return false;

          const itemKt = (item.caratOrKT || "").toUpperCase();
          const itemPurity = (item.purityPercent || "").trim();

          if (itemKt === rateIdUpper || itemKt.includes(rateIdUpper)) return true;
          if (itemPurity && rateItem.purity && itemPurity.includes(rateItem.purity)) return true;
          if (rateItem.description && itemKt && rateItem.description.toUpperCase().includes(itemKt)) return true;

          return false;
        }
      });

      let totalGrossWeight = 0;
      let totalNetWeight = 0;
      let totalPureWeight = 0;
      let totalDiamondCarat = 0;
      let totalRecordedValuation = 0;
      let totalRecordedSalePrice = 0;
      let sumRates = 0;

      matchingItems.forEach((item: StockEntry) => {
        const gross = num(item.grossWeight);
        const net = num(item.netWeight || item.grossWeight);
        let pure = num(item.pureWeight);
        const dCarat = num(item.diamondCarat || item.diamondWeight);
        const purityPct = num(item.purityPercent || (rateItem.purity ? num(rateItem.purity) : 91.6));

        if (pure === 0 && net > 0) {
          pure = net * (purityPct / 100);
        }

        totalGrossWeight += gross;
        totalNetWeight += net;
        totalPureWeight += pure;
        totalDiamondCarat += dCarat;
        totalRecordedSalePrice += num(item.salePrice);

        if (metalUpper === "DIAMOND") {
          const itemRate = num(item.purchaseDiamondRate) > 0 ? num(item.purchaseDiamondRate) : fallbackRate;
          sumRates += itemRate;
          totalRecordedValuation += dCarat * itemRate;
        } else {
          const itemRate = num(item.purchaseGoldRate) > 0 ? num(item.purchaseGoldRate) : fallbackRate;
          sumRates += itemRate;
          totalRecordedValuation += (pure > 0 ? pure : net) * itemRate;
        }
      });

      const avgRecordedRate = matchingItems.length > 0 ? sumRates / matchingItems.length : fallbackRate;

      list.push({
        sNo: counter++,
        rateId,
        description: rateItem.description || `${rateId} ${metalType}`,
        metalType,
        recordedRate: avgRecordedRate > 0 ? avgRecordedRate : fallbackRate,
        unit,
        purity: rateItem.purity || "-",
        makingCharge: num(rateItem.makingCharge),
        items: matchingItems,
        itemsCount: matchingItems.length,
        totalGrossWeight,
        totalNetWeight,
        totalPureWeight,
        totalDiamondCarat,
        totalValuation: totalRecordedValuation,
        totalRecordedSalePrice,
      });
    });

    return list;
  }, [rawCurrentRates, filteredStockEntries, selectedMetal]);

  useEffect(() => {
    if (rateIdGroupList.length > 0) {
      setExpandedRateIds(new Set(rateIdGroupList.map((g) => g.rateId)));
    } else {
      setExpandedRateIds(new Set());
    }
  }, [rateIdGroupList]);

  const toggleRateExpand = (id: string) => {
    setExpandedRateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRateIds(new Set(rateIdGroupList.map((g) => g.rateId)));
  };

  const collapseAll = () => {
    setExpandedRateIds(new Set());
  };

  const displayedGroups = useMemo(() => {
    if (pageSize >= 9999) return rateIdGroupList;
    const startIndex = (page - 1) * pageSize;
    return rateIdGroupList.slice(startIndex, startIndex + pageSize);
  }, [rateIdGroupList, page, pageSize]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalGoldWeight = 0;
    let totalSilverWeight = 0;
    let totalDiamondCarat = 0;
    let totalRecordedValuation = 0;
    let totalItems = 0;

    rateIdGroupList.forEach((g) => {
      totalItems += g.itemsCount;
      totalRecordedValuation += g.totalValuation;

      if (g.metalType.toUpperCase() === "DIAMOND") {
        totalDiamondCarat += g.totalDiamondCarat;
      } else if (g.metalType.toUpperCase() === "SILVER") {
        totalSilverWeight += g.totalNetWeight;
      } else {
        totalGoldWeight += g.totalNetWeight;
      }
    });

    return {
      totalCategories: rateIdGroupList.length,
      totalItems,
      totalGoldWeight,
      totalSilverWeight,
      totalDiamondCarat,
      totalRecordedValuation,
    };
  }, [rateIdGroupList]);

  // CSV / Excel Export columns & data - Strictly Rate ID level summary (no individual items)
  const exportColumns: ExportColumn[] = [
    { header: "S. No.", key: "sNo" },
    { header: "Rate ID", key: "rateId" },
    { header: "Description", key: "description" },
    { header: "Metal Type", key: "metalType" },
    { header: "Recorded Rate (₹)", key: "recordedRate", formatter: (v, r: any) => `₹${num(v).toLocaleString("en-IN")}/${r.unit}` },
    { header: "Stock Items Count", key: "itemsCount" },
    { header: "Total Gross Wt. (g)", key: "totalGrossWeight", formatter: (v) => formatWeight(v) },
    { header: "Total Net Wt. (g)", key: "totalNetWeight", formatter: (v) => formatWeight(v) },
    { header: "Total Pure Wt. (g)", key: "totalPureWeight", formatter: (v) => formatWeight(v) },
    { header: "Total Diamond Wt. (ct)", key: "totalDiamondCarat", formatter: (v) => formatWeight(v) },
    { header: "Total Recorded Valuation (₹)", key: "totalValuation", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Total Recorded Sale Price (₹)", key: "totalRecordedSalePrice", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "From Date", key: "fromDateStr" },
    { header: "To Date", key: "toDateStr" },
  ];

  const exportData = useMemo(() => {
    const fromStr = fromDate || "Start";
    const toStr = toDate || "Today";
    return rateIdGroupList.map((g) => ({
      sNo: g.sNo,
      rateId: g.rateId,
      description: g.description,
      metalType: g.metalType,
      recordedRate: g.recordedRate,
      unit: g.unit,
      itemsCount: g.itemsCount,
      totalGrossWeight: g.totalGrossWeight,
      totalNetWeight: g.totalNetWeight,
      totalPureWeight: g.totalPureWeight,
      totalDiamondCarat: g.totalDiamondCarat,
      totalValuation: g.totalValuation,
      totalRecordedSalePrice: g.totalRecordedSalePrice,
      fromDateStr: fromStr,
      toDateStr: toStr,
    }));
  }, [rateIdGroupList, fromDate, toDate]);

  const handleExportCSV = () => {
    exportToCSV(`Rate_ID_Summary_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} rate ID summaries to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Rate_ID_Summary_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} rate ID summaries to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All"} | Date Range: ${fromDate || "Start"} to ${toDate || "Today"}`;
    printReportTable("Recorded Rate ID Metal Valuation Report", subTitle, exportColumns, exportData);
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
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-500" /> Recorded Rate Metal Cost Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Summary per Current Rate ID (`12K`, `14K`, `18K`, `20K`, `22K`, `24K`, `SI-GH`, etc.) with pure weight & recorded valuation
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Rate Categories</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalCategories}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-600" /> Total Gold Weight
          </p>
          <p className="text-xl font-bold text-amber-700">{formatWeight(stats.totalGoldWeight)} g</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-slate-500" /> Total Silver Weight
          </p>
          <p className="text-xl font-bold text-slate-700">{formatWeight(stats.totalSilverWeight)} g</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Gem className="w-3.5 h-3.5 text-blue-600" /> Diamond Carat
          </p>
          <p className="text-xl font-bold text-blue-700">{formatWeight(stats.totalDiamondCarat)} ct</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Recorded Valuation
          </p>
          <p className="text-xl font-bold text-emerald-700">₹{stats.totalRecordedValuation.toLocaleString("en-IN")}</p>
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
              <option value={15}>15 rates per page</option>
              <option value={30}>30 rates per page</option>
              <option value={50}>50 rates per page</option>
              <option value={100}>100 rates per page</option>
              <option value={99999}>All Rates (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Rate ID, Description, Tag, Item..."
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
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-amber-600" />
            Showing <strong>{rateIdGroupList.length}</strong> rate categories matching criteria
          </span>
          {(searchTerm || fromDate || toDate || selectedMetal !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setSelectedMetal("ALL"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Rate ID Grouped Accordion List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading current rates & stock entries...</div>
        ) : displayedGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No rate categories found matching criteria.</div>
        ) : (
          displayedGroups.map((g) => {
            const isExpanded = expandedRateIds.has(g.rateId);
            const isDiamond = g.metalType.toUpperCase() === "DIAMOND";

            return (
              <div key={g.rateId} className="border border-slate-200 rounded-lg overflow-hidden transition-all shadow-2xs">
                {/* Header Row */}
                <div
                  onClick={() => toggleRateExpand(g.rateId)}
                  className="bg-slate-50 hover:bg-slate-100/80 p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition-colors border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-amber-600" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 text-base">{g.rateId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isDiamond ? 'bg-blue-100 text-blue-800 border-blue-200' : g.metalType.toUpperCase() === 'SILVER' ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                          {g.metalType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>
                    </div>
                  </div>

                  {/* Recorded Rate Badge */}
                  <div className="text-xs min-w-[160px]">
                    <span className="text-slate-500 block">Recorded Purchase Rate</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{g.recordedRate.toLocaleString("en-IN")} / {g.unit}
                    </span>
                  </div>

                  {/* Stock Quantity / Items */}
                  <div className="text-xs min-w-[140px]">
                    <span className="text-slate-500 block">Stock Items Count</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {g.itemsCount} {g.itemsCount === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  {/* Weight Summary */}
                  <div className="text-xs min-w-[160px]">
                    <span className="text-slate-500 block">{isDiamond ? "Total Diamond Carat" : "Total Net / Pure Wt."}</span>
                    {isDiamond ? (
                      <span className="font-bold text-blue-700 text-sm">{formatWeight(g.totalDiamondCarat)} ct</span>
                    ) : (
                      <span className="font-bold text-amber-700 text-sm">
                        {formatWeight(g.totalNetWeight)} g <span className="text-xs text-slate-500 font-normal">({formatWeight(g.totalPureWeight)} g pure)</span>
                      </span>
                    )}
                  </div>

                  {/* Valuation */}
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Recorded Rate Valuation</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      ₹{g.totalValuation.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Sub-table */}
                {isExpanded && (
                  <div className="bg-white p-3 border-t border-slate-100 overflow-x-auto">
                    {g.items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No active stock items matching this Rate ID.</div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3"># Tag / Code</th>
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 font-mono">Kt / Clarity</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Gross Wt. (g)</th>
                            <th className="py-2.5 px-3 text-right">Net Wt. (g)</th>
                            <th className="py-2.5 px-3 text-right">{isDiamond ? "Diamond Wt. (ct)" : "Pure Wt. (g)"}</th>
                            <th className="py-2.5 px-3 text-right">Recorded Rate (₹/{g.unit})</th>
                            <th className="py-2.5 px-3 text-right">Recorded Valuation (₹)</th>
                            <th className="py-2.5 px-3 text-right">Recorded Sale Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.items.map((item: StockEntry, idx: number) => {
                            const gross = num(item.grossWeight);
                            const net = num(item.netWeight || item.grossWeight);
                            const pure = num(item.pureWeight || net);
                            const dCarat = num(item.diamondCarat || item.diamondWeight);

                            const itemRecordedRate = isDiamond
                              ? (num(item.purchaseDiamondRate) > 0 ? num(item.purchaseDiamondRate) : g.recordedRate)
                              : (num(item.purchaseGoldRate) > 0 ? num(item.purchaseGoldRate) : g.recordedRate);

                            const itemValuation = isDiamond
                              ? dCarat * itemRecordedRate
                              : (pure > 0 ? pure : net) * itemRecordedRate;

                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                  <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">{item.tagNumber || `TAG-${item.id}`}</span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.itemName || "Jewelry Item"}</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.category || "-"}</td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                                  {item.caratOrKT || "22K"}
                                  {item.dPurityId ? <span className="ml-1 font-semibold text-blue-700">[{item.dPurityId}]</span> : ''}
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{item.quantity || 1}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatWeight(gross)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(net)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                                  {isDiamond ? `${formatWeight(dCarat)} ct` : formatWeight(pure)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{itemRecordedRate.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                                  ₹{itemValuation.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-700">₹{num(item.salePrice).toLocaleString("en-IN")}</td>
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
        {pageSize < 9999 && rateIdGroupList.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200 gap-4 mt-2 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, rateIdGroupList.length)} of {rateIdGroupList.length} rate categories
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 text-xs">Prev</Button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                {page} / {Math.ceil(rateIdGroupList.length / pageSize)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(rateIdGroupList.length / pageSize)} onClick={() => setPage(page + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetalReport;
