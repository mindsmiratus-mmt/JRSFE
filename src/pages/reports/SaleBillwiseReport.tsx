import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Download,
  Calendar,
  RefreshCw,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  User,
  Store,
  CreditCard,
  Tag,
  Receipt,
  Scale,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useInvoices, useAllInvoice, type Invoice, type InvoiceItem } from "@/hooks/useInvoice";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { exportToCSV, exportToExcel, printReportTable, printGroupedSaleReport, type ExportColumn, type StatCardItem } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const SaleBillwiseReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Sale Report (Billwise)');

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Set of expanded invoice IDs (by default all open)
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<number>>(new Set());

  const { data: paginatedData, isLoading: isPaginatedLoading } = useInvoices({
    page: 1,
    pageSize: 1000,
    keyword: searchTerm || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    shopId: filterShopId || undefined,
  });

  const { data: allInvoices, isLoading: isAllLoading } = useAllInvoice();
  const isLoading = isPaginatedLoading || isAllLoading;

  const filteredInvoices = useMemo(() => {
    const rawList = allInvoices || (paginatedData as any)?.data || [];
    return rawList.filter((inv: Invoice) => {
      if (fromDate && new Date(inv.invoiceDate) < new Date(fromDate)) return false;
      if (toDate && new Date(inv.invoiceDate) > new Date(toDate + "T23:59:59")) return false;
      if (filterShopId && inv.shopId && inv.shopId !== filterShopId) return false;

      if (selectedMetal !== "ALL") {
        const hasMetal = inv.items?.some(
          (it) => it.metal?.toUpperCase() === selectedMetal.toUpperCase()
        );
        if (!hasMetal) return false;
      }

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesInv = inv.invoiceNo?.toLowerCase().includes(kw);
        const matchesCustomer = inv.customer?.name?.toLowerCase().includes(kw) || inv.customer?.phone?.includes(kw);
        const matchesGstin = inv.customer?.gstin?.toLowerCase().includes(kw);
        const matchesShop = inv.shop?.name?.toLowerCase().includes(kw) || inv.shop?.shopCode?.toLowerCase().includes(kw);
        const matchesItem = inv.items?.some(
          (it) =>
            it.itemName?.toLowerCase().includes(kw) ||
            it.tagNumber?.toLowerCase().includes(kw) ||
            it.metal?.toLowerCase().includes(kw) ||
            it.category?.toLowerCase().includes(kw)
        );
        if (!matchesInv && !matchesCustomer && !matchesGstin && !matchesShop && !matchesItem) return false;
      }
      return true;
    });
  }, [allInvoices, paginatedData, fromDate, toDate, filterShopId, selectedMetal, searchTerm]);

  // Keep all open by default when filteredInvoices change
  useEffect(() => {
    if (filteredInvoices.length > 0) {
      setExpandedInvoiceIds(new Set(filteredInvoices.map((inv: Invoice) => inv.id)));
    } else {
      setExpandedInvoiceIds(new Set());
    }
  }, [filteredInvoices]);

  const toggleInvoiceExpand = (id: number) => {
    setExpandedInvoiceIds((prev) => {
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
    setExpandedInvoiceIds(new Set(filteredInvoices.map((inv: Invoice) => inv.id)));
  };

  const collapseAll = () => {
    setExpandedInvoiceIds(new Set());
  };

  const displayedInvoices = useMemo(() => {
    if (pageSize >= 9999) return filteredInvoices;
    const startIndex = (page - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, page, pageSize]);

  // Summary Metrics
  const stats = useMemo(() => {
    let totalItemsCount = 0;
    let totalGoldWt = 0;
    let totalDiamondWt = 0;
    let totalSilverWt = 0;
    let totalTaxableAmt = 0;
    let totalTaxAmt = 0;
    let totalSaleValue = 0;

    filteredInvoices.forEach((inv: Invoice) => {
      totalSaleValue += num(inv.totalAmount);
      totalTaxAmt += num(inv.cgst) + num(inv.sgst) + num(inv.igst);

      inv.items?.forEach((item: InvoiceItem) => {
        if (selectedMetal !== "ALL" && item.metal?.toUpperCase() !== selectedMetal.toUpperCase()) {
          return;
        }
        const metal = (item.metal || "").toLowerCase();
        if (metal.includes("gold")) {
          totalGoldWt += num(item.netWeight || item.grossWeight);
        } else if (metal.includes("diamond")) {
          totalDiamondWt += num(item.diamondWeight || item.diamondCarat);
        } else if (metal.includes("silver")) {
          totalSilverWt += num(item.netWeight || item.grossWeight);
        }

        totalItemsCount += num(item.quantity || 1);
        totalTaxableAmt += num(item.totalSalePriceBeforeTax || item.totalSalePrice);
      });
    });

    return {
      totalBills: filteredInvoices.length,
      totalItemsCount,
      totalGoldWt,
      totalDiamondWt,
      totalSilverWt,
      totalTaxableAmt,
      totalTaxAmt,
      totalSaleValue,
    };
  }, [filteredInvoices, selectedMetal]);

  // Export Columns
  const exportColumns: ExportColumn[] = [
    { header: "Bill No.", key: "billNo" },
    { header: "Date", key: "date" },
    { header: "Customer Name", key: "customerName" },
    { header: "Phone", key: "customerPhone" },
    { header: "Shop Name", key: "shopName font-mono" },
    { header: "GST No.", key: "gstNo" },
    { header: "Payment Method", key: "paymentMethod" },
    { header: "Tag Number", key: "tagNumber" },
    { header: "Product Name", key: "itemName" },
    { header: "Metal", key: "metal" },
    { header: "Category", key: "category" },
    { header: "Purity", key: "purity" },
    { header: "Gross Wt. (g)", key: "grossWeight", formatter: (v) => formatWeight(v) },
    { header: "Net Wt. (g)", key: "netWeight", formatter: (v) => formatWeight(v) },
    { header: "Stone Wt. (g)", key: "stoneWeight", formatter: (v) => formatWeight(v) },
    { header: "Diamond Wt. (ct)", key: "diamondWeight", formatter: (v) => formatWeight(v) },
    { header: "Making Charges (₹)", key: "makingCharges", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Discount (₹)", key: "discount", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Tax (₹)", key: "tax", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Item Total (₹)", key: "itemTotal", formatter: (v) => num(v).toLocaleString("en-IN") },
    { header: "Bill Total (₹)", key: "billTotal", formatter: (v) => num(v).toLocaleString("en-IN") },
  ];

  const exportData = useMemo(() => {
    const rows: any[] = [];
    filteredInvoices.forEach((inv: Invoice) => {
      const dateStr = inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy hh:mm a") : "-";
      const custName = inv.customer?.name || "Cash Customer";
      const custPhone = inv.customer?.phone || "-";
      const shopName = inv.shop?.name || selectedShop?.name || "Main Shop";
      const gstNo = inv.customer?.gstin || "-";
      const paymentMethod = inv.paymentMethod || "Cash";

      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: InvoiceItem) => {
          if (selectedMetal !== "ALL" && item.metal?.toUpperCase() !== selectedMetal.toUpperCase()) {
            return;
          }
          const taxTotal = num(item.igst) || (num(item.cgst) + num(item.sgst));
          rows.push({
            billNo: inv.invoiceNo || `INV-${inv.id}`,
            date: dateStr,
            customerName: custName,
            customerPhone: custPhone,
            shopName: shopName,
            gstNo: gstNo,
            paymentMethod: paymentMethod,
            tagNumber: item.tagNumber || `ITEM-${item.itemId}`,
            itemName: item.itemName || "Jewelry Item",
            metal: item.metal || "Gold",
            category: item.category || "-",
            purity: item.gPurityId || item.purityPercent || "22K",
            grossWeight: num(item.grossWeight),
            netWeight: num(item.netWeight),
            stoneWeight: num(item.stoneWeight),
            diamondWeight: num(item.diamondWeight || item.diamondCarat),
            makingCharges: num(item.makingCharges),
            discount: num(item.discount),
            tax: taxTotal,
            itemTotal: num(item.totalSalePrice),
            billTotal: num(inv.totalAmount),
          });
        });
      } else {
        rows.push({
          billNo: inv.invoiceNo || `INV-${inv.id}`,
          date: dateStr,
          customerName: custName,
          customerPhone: custPhone,
          shopName: shopName,
          gstNo: gstNo,
          paymentMethod: paymentMethod,
          tagNumber: "-",
          itemName: "Summary Invoice",
          metal: "-",
          category: "-",
          purity: "-",
          grossWeight: 0,
          netWeight: 0,
          stoneWeight: 0,
          diamondWeight: 0,
          makingCharges: 0,
          discount: 0,
          tax: num(inv.cgst) + num(inv.sgst) + num(inv.igst),
          itemTotal: num(inv.totalAmount),
          billTotal: num(inv.totalAmount),
        });
      }
    });
    return rows;
  }, [filteredInvoices, selectedMetal, selectedShop]);

  const handleExportCSV = () => {
    exportToCSV(`Sale_Billwise_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} billwise records to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Sale_Billwise_Report_${format(new Date(), "yyyyMMdd")}`, exportColumns, exportData);
    toast.success(`Exported ${exportData.length} billwise records to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All Shops"} | Date Range: ${fromDate || "Start"} to ${toDate || "Today"}${selectedMetal !== "ALL" ? ` | Metal: ${selectedMetal}` : ""}`;
    const statCards: StatCardItem[] = [
      {
        label: "Total Invoices",
        value: stats.totalBills,
        bgColor: "#f8fafc",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/></svg>`,
      },
      {
        label: "Items Sold",
        value: stats.totalItemsCount,
        bgColor: "#f8fafc",
        textColor: "#0f172a",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.586-6.586a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
      },
      {
        label: "Gold Wt Sold",
        value: `${formatWeight(stats.totalGoldWt)} g`,
        bgColor: "#fffbeb",
        textColor: "#b45309",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>`,
      },
      {
        label: "Diamond Wt",
        value: `${formatWeight(stats.totalDiamondWt)} ct`,
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>`,
      },
      {
        label: "Silver Wt",
        value: `${formatWeight(stats.totalSilverWt)} g`,
        bgColor: "#f8fafc",
        textColor: "#475569",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>`,
      },
      {
        label: "Total Tax / GST",
        value: `₹${stats.totalTaxAmt.toLocaleString("en-IN")}`,
        bgColor: "#faf5ff",
        textColor: "#6b21a8",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/></svg>`,
      },
      {
        label: "Total Sale Value",
        value: `₹${stats.totalSaleValue.toLocaleString("en-IN")}`,
        bgColor: "#ecfdf5",
        textColor: "#047857",
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a3.5 3.5 0 0 0 0-7H6"/></svg>`,
      },
    ];
    printGroupedSaleReport("Sale Report (Billwise & Metalwise)", subTitle, statCards, filteredInvoices, selectedMetal);
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
            <Receipt className="w-8 h-8 text-emerald-600" />
            Sale Report (Billwise & Metalwise)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Grouped bill-level invoice details with expandable item breakdown, metal weights & GST taxes
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
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Invoices</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalBills}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Items Sold</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalItemsCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Gold Wt Sold</p>
          <p className="text-xl font-bold text-amber-700">{formatWeight(stats.totalGoldWt)} g</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Diamond Wt</p>
          <p className="text-xl font-bold text-blue-700">{formatWeight(stats.totalDiamondWt)} ct</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Silver Wt</p>
          <p className="text-xl font-bold text-slate-600">{formatWeight(stats.totalSilverWt)} g</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Tax / GST</p>
          <p className="text-xl font-bold text-purple-700">₹{stats.totalTaxAmt.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Sale Value</p>
          <p className="text-xl font-bold text-emerald-700">₹{stats.totalSaleValue.toLocaleString("en-IN")}</p>
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
              <option value={15}>15 bills per page</option>
              <option value={30}>30 bills per page</option>
              <option value={50}>50 bills per page</option>
              <option value={100}>100 bills per page</option>
              <option value={99999}>All Bills (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Bill No, Customer, GSTIN..."
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
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Metal Filter</label>
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
            Showing <strong>{filteredInvoices.length}</strong> invoice bills matching filters
          </span>
          {(searchTerm || fromDate || toDate || selectedMetal !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setSelectedMetal("ALL"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Billwise Grouped Accordion List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading bills and items...</div>
        ) : displayedInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No bills found matching your criteria.</div>
        ) : (
          displayedInvoices.map((inv: Invoice) => {
            const isExpanded = expandedInvoiceIds.has(inv.id);
            const items = inv.items?.filter((item) => {
              if (selectedMetal === "ALL") return true;
              return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
            }) || [];

            const formattedDate = inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd MMM yyyy, hh:mm a") : "-";

            return (
              <div key={inv.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all shadow-2xs">
                {/* Invoice Parent Header Row */}
                <div
                  onClick={() => toggleInvoiceExpand(inv.id)}
                  className="bg-slate-50 hover:bg-slate-100/80 p-4 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-4 transition-colors border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-base">{inv.invoiceNo || `INV-${inv.id}`}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {inv.status || "Paid"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-2 text-xs min-w-[180px]">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">{inv.customer?.name || "Cash Customer"}</p>
                      <p className="text-slate-500">{inv.customer?.phone || "-"}</p>
                    </div>
                  </div>

                  {/* Shop Info */}
                  <div className="flex items-center gap-2 text-xs min-w-[180px]">
                    <Store className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{inv.shop?.name || "-"}</p>
                      {inv.shop?.shopCode && <span className="font-mono text-[10px] bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded">{inv.shop.shopCode}</span>}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center gap-2 text-xs">
                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 font-medium">
                      {inv.paymentMethod || "Cash"}
                    </span>
                  </div>

                  {/* Items Count & Total Amount */}
                  <div className="flex items-center gap-4 text-right">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Items Count</span>
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                        {items.length} {items.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>

                    <div className="text-right pl-2 border-l border-slate-200">
                      <span className="text-xs text-slate-500 block">Total Sale Value</span>
                      <span className="text-base font-extrabold text-[#b08d28]">
                        ₹{Number(inv.totalAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-menu Collapsible Item Table */}
                {isExpanded && (
                  <div className="bg-white p-3 border-t border-slate-100 overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No item details available for this metal filter.</div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3"># Tag / Code</th>
                            <th className="py-2.5 px-3">Item Name</th>
                            <th className="py-2.5 px-3">Metal / Category</th>
                            <th className="py-2.5 px-3">Purity</th>
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
                          {items.map((item: InvoiceItem, idx: number) => {
                            const taxVal = num(item.igst) || (num(item.cgst) + num(item.sgst));
                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">{item.tagNumber || `ITEM-${item.itemId}`}</span>
                                    {item.isReturn && (
                                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                        RETURN
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.itemName || "Jewelry Item"}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-medium text-slate-700">{item.metal || "Gold"}</span>
                                  {item.category && <span className="text-slate-400 ml-1">({item.category})</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700">{item.gPurityId || item.purityPercent || "22K"}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatWeight(item.grossWeight)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(item.netWeight)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatWeight(item.stoneWeight)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{item.diamondCarat || item.diamondWeight ? formatWeight(item.diamondCarat || item.diamondWeight) : "0.000"}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{num(item.makingCharges).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-rose-600 font-medium">₹{num(item.discount).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">₹{taxVal.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-[#b08d28]">₹{num(item.totalSalePrice).toLocaleString("en-IN")}</td>
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
        {pageSize < 9999 && filteredInvoices.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200 gap-4 mt-2 shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredInvoices.length)} of {filteredInvoices.length} bills
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 text-xs">Prev</Button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700">
                {page} / {Math.ceil(filteredInvoices.length / pageSize)}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(filteredInvoices.length / pageSize)} onClick={() => setPage(page + 1)} className="h-8 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleBillwiseReport;
