import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  Boxes,
  TrendingUp,
  Layers,
  Sparkles,
  RefreshCw,
  Coins,
  FileCheck,
  ListFilter,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { CommonTable } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { useInvoices, useAllInvoice, type Invoice, type InvoiceItem } from "@/hooks/useInvoice";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { exportToCSV, exportToExcel, printReportTable, type ExportColumn } from "@/utils/exportUtils";

import { getModulePermissions } from "@/utils/permission";

type ReportType = "sale-itemwise" | "sale-billwise" | "store-reports";

export const SaleReport = () => {
  // Navigation & Authentication context
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Sale Report');

  // State filters
  const [activeTab, setActiveTab] = useState<ReportType>("sale-billwise");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [selectedMetal, setSelectedMetal] = useState<string>("ALL");
  const [subReportType, setSubReportType] = useState<string>("PURCHASE");

  // Pagination controls — allows setting "All" (No pagination)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Fetch all invoices to allow comprehensive report computation & export
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

  // Filter raw invoice items based on user criteria
  const filteredInvoices = useMemo(() => {
    const rawList = allInvoices || (paginatedData as any)?.data || [];
    return rawList.filter((inv: Invoice) => {
      // Date filter
      if (fromDate && new Date(inv.invoiceDate) < new Date(fromDate)) return false;
      if (toDate && new Date(inv.invoiceDate) > new Date(toDate + "T23:59:59")) return false;

      // Shop filter
      if (filterShopId && inv.shopId && inv.shopId !== filterShopId) return false;

      // Keyword search
      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesInv = inv.invoiceNo?.toLowerCase().includes(kw);
        const matchesCustomer = inv.customer?.name?.toLowerCase().includes(kw);
        const matchesGstin = inv.customer?.gstin?.toLowerCase().includes(kw);
        const matchesItem = inv.items?.some(
          (it) =>
            it.itemName?.toLowerCase().includes(kw) ||
            it.tagNumber?.toLowerCase().includes(kw) ||
            it.metal?.toLowerCase().includes(kw)
        );
        if (!matchesInv && !matchesCustomer && !matchesGstin && !matchesItem) return false;
      }

      return true;
    });
  }, [allInvoices, paginatedData, fromDate, toDate, selectedShop, searchTerm]);

  // Flattened Itemwise sales data
  const itemwiseData = useMemo(() => {
    const rows: Array<{
      sNo: number;
      billNo: string;
      billDate: string;
      productCode: string;
      productName: string;
      metal: string;
      purity: string;
      grossWeight: number;
      netWeight: number;
      stoneWeight: number;
      diamondWeight: number;
      diamondCarat: number;
      makingCharges: number;
      taxableAmt: number;
      totalPrice: number;
    }> = [];

    let counter = 1;
    filteredInvoices.forEach((inv: Invoice) => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: InvoiceItem) => {
          if (selectedMetal !== "ALL" && item.metal?.toUpperCase() !== selectedMetal.toUpperCase()) {
            return;
          }
          rows.push({
            sNo: counter++,
            billNo: inv.invoiceNo || `INV-${inv.id}`,
            billDate: inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy") : "-",
            productCode: item.tagNumber || `ITEM-${item.itemId}`,
            productName: item.itemName || "Jewelry Item",
            metal: item.metal || "Gold",
            purity: item.gPurityId || item.purityPercent || "22K",
            grossWeight: Number(item.grossWeight || 0),
            netWeight: Number(item.netWeight || 0),
            stoneWeight: Number(item.stoneWeight || 0),
            diamondWeight: Number(item.diamondWeight || 0),
            diamondCarat: Number(item.diamondCarat || 0),
            makingCharges: Number(item.makingCharges || 0),
            taxableAmt: Number(item.totalSalePriceBeforeTax || item.totalSalePrice || 0),
            totalPrice: Number(item.totalSalePrice || 0),
          });
        });
      }
    });

    return rows;
  }, [filteredInvoices, selectedMetal]);

  // Billwise & Metalwise sales data
  const billwiseData = useMemo(() => {
    let counter = 1;
    return filteredInvoices.map((inv: Invoice) => {
      let goldWt = 0;
      let diamondWt = 0;
      let silverWt = 0;
      let totalMaking = 0;
      let totalMetalCost = 0;
      let taxableAmt = 0;

      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: InvoiceItem) => {
          const metal = (item.metal || "").toLowerCase();
          if (metal.includes("gold")) {
            goldWt += Number(item.netWeight || item.grossWeight || 0);
            totalMetalCost += Number(item.goldCost || 0);
          } else if (metal.includes("diamond")) {
            diamondWt += Number(item.diamondWeight || item.diamondCarat || 0);
            totalMetalCost += Number(item.diamondCost || 0);
          } else if (metal.includes("silver")) {
            silverWt += Number(item.netWeight || item.grossWeight || 0);
          }
          totalMaking += Number(item.makingCharges || 0);
          taxableAmt += Number(item.totalSalePriceBeforeTax || 0);
        });
      }

      if (taxableAmt === 0 && inv.totalAmount) {
        const totalTax = Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
        taxableAmt = inv.totalAmount - totalTax;
      }

      return {
        sNo: counter++,
        id: inv.id,
        billNo: inv.invoiceNo || `INV-${inv.id}`,
        date: inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd/MM/yyyy") : "-",
        customerName: inv.customer?.name || "Cash Customer",
        gstNo: inv.customer?.gstin || "-",
        goldWt: Number(goldWt.toFixed(3)),
        diamondWt: Number(diamondWt.toFixed(3)),
        silverWt: Number(silverWt.toFixed(3)),
        makingCharges: totalMaking,
        metalCost: totalMetalCost,
        taxableAmt: taxableAmt > 0 ? taxableAmt : inv.totalAmount,
        cgst: Number(inv.cgst || 0),
        sgst: Number(inv.sgst || 0),
        igst: Number(inv.igst || 0),
        discountAmt: 0,
        roundOff: 0,
        totalSaleValue: Number(inv.totalAmount || 0),
      };
    });
  }, [filteredInvoices]);

  // Overall KPI Summary
  const totalsSummary = useMemo(() => {
    const totalBills = filteredInvoices.length;
    let totalGrossWt = 0;
    let totalNetWt = 0;
    let totalGoldWt = 0;
    let totalDiamondWt = 0;
    let totalSilverWt = 0;
    let totalTaxable = 0;
    let totalSaleValue = 0;

    billwiseData.forEach((b: any) => {
      totalGoldWt += b.goldWt;
      totalDiamondWt += b.diamondWt;
      totalSilverWt += b.silverWt;
      totalTaxable += b.taxableAmt;
      totalSaleValue += b.totalSaleValue;
    });

    itemwiseData.forEach((it) => {
      totalGrossWt += it.grossWeight;
      totalNetWt += it.netWeight;
    });

    return {
      totalBills,
      totalItems: itemwiseData.length,
      totalGrossWt: Number(totalGrossWt.toFixed(3)),
      totalNetWt: Number(totalNetWt.toFixed(3)),
      totalGoldWt: Number(totalGoldWt.toFixed(3)),
      totalDiamondWt: Number(totalDiamondWt.toFixed(3)),
      totalSilverWt: Number(totalSilverWt.toFixed(3)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalSaleValue: Number(totalSaleValue.toFixed(2)),
    };
  }, [filteredInvoices, billwiseData, itemwiseData]);

  // Active dataset for pagination & export
  const currentActiveData = useMemo(() => {
    return activeTab === "sale-itemwise" || activeTab === "store-reports" ? itemwiseData : billwiseData;
  }, [activeTab, itemwiseData, billwiseData]);

  // Active dataset sliced for UI display if pagination enabled
  const displayedData = useMemo(() => {
    if (pageSize >= 9999) return currentActiveData; // Show All (No pagination)
    const startIndex = (page - 1) * pageSize;
    return currentActiveData.slice(startIndex, startIndex + pageSize);
  }, [currentActiveData, page, pageSize]);

  // Export columns mapping
  const itemwiseColumns: ExportColumn[] = [
    { header: "S. No.", key: "sNo" },
    { header: "Bill No.", key: "billNo" },
    { header: "Bill Date", key: "billDate" },
    { header: "Product Code", key: "productCode" },
    { header: "Product Name", key: "productName" },
    { header: "Metal", key: "metal" },
    { header: "Purity / Kt", key: "purity" },
    { header: "Gross Wt. (g)", key: "grossWeight", formatter: (v) => formatWeight(v) },
    { header: "Net Wt. (g)", key: "netWeight", formatter: (v) => formatWeight(v) },
    { header: "Stone Wt. (g/ct)", key: "stoneWeight", formatter: (v) => formatWeight(v) },
    { header: "Diamond Wt. (ct)", key: "diamondWeight", formatter: (v) => formatWeight(v) },
    { header: "Diamond Carat", key: "diamondCarat", formatter: (v) => (v ? Number(v).toFixed(2) : "0.00") },
    { header: "Taxable Amt. (₹)", key: "taxableAmt", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "Total Price (₹)", key: "totalPrice", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
  ];

  const billwiseColumns: ExportColumn[] = [
    { header: "S. No.", key: "sNo" },
    { header: "Bill No.", key: "billNo" },
    { header: "Date", key: "date" },
    { header: "Customer Name", key: "customerName" },
    { header: "GST No.", key: "gstNo" },
    { header: "Gold Wt. (g)", key: "goldWt", formatter: (v) => formatWeight(v) },
    { header: "Diamond Wt. (ct)", key: "diamondWt", formatter: (v) => formatWeight(v) },
    { header: "Silver Wt. (g)", key: "silverWt", formatter: (v) => formatWeight(v) },
    { header: "Making Charges (₹)", key: "makingCharges", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "Metal Cost (₹)", key: "metalCost", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "Taxable Amt. (₹)", key: "taxableAmt", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "CGST (₹)", key: "cgst", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "SGST (₹)", key: "sgst", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "IGST (₹)", key: "igst", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "Discount Amt. (₹)", key: "discountAmt", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
    { header: "Round Off", key: "roundOff", formatter: (v) => Number(v || 0).toFixed(2) },
    { header: "Total Sale Value (₹)", key: "totalSaleValue", formatter: (v) => Number(v || 0).toLocaleString("en-IN") },
  ];

  // Handler for Exporting CSV (Filtered data)
  const handleExportCSV = () => {
    const cols = activeTab === "sale-itemwise" || activeTab === "store-reports" ? itemwiseColumns : billwiseColumns;
    const name = activeTab === "sale-itemwise" ? "Sale_Report_Itemwise" : "Sale_Report_Billwise";
    exportToCSV(`${name}_${format(new Date(), "yyyyMMdd")}`, cols, currentActiveData);
    toast.success(`Exported ${currentActiveData.length} filtered rows to CSV!`);
  };

  // Handler for Exporting Excel (Filtered data)
  const handleExportExcel = () => {
    const cols = activeTab === "sale-itemwise" || activeTab === "store-reports" ? itemwiseColumns : billwiseColumns;
    const name = activeTab === "sale-itemwise" ? "Sale_Report_Itemwise" : "Sale_Report_Billwise";
    exportToExcel(`${name}_${format(new Date(), "yyyyMMdd")}`, cols, currentActiveData);
    toast.success(`Exported ${currentActiveData.length} filtered rows to Excel!`);
  };

  // Handler for Printing / PDF Export (Filtered data)
  const handlePrintPDF = () => {
    const cols = activeTab === "sale-itemwise" || activeTab === "store-reports" ? itemwiseColumns : billwiseColumns;
    const reportTitle =
      activeTab === "sale-itemwise"
        ? "Sale Report - Amount & Gms. (Itemwise)"
        : activeTab === "sale-billwise"
        ? "Sale Report - Billwise & Metalwise"
        : `${subReportType.replace("_", " ")} Report`;
    const subTitle = `Shop: ${selectedShop?.name || "All Shops"} | Filter: ${fromDate || "Start"} to ${toDate || "Today"}`;
    printReportTable(reportTitle, subTitle, cols, currentActiveData);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFromDate(null);
    setToDate(null);
    setSelectedMetal("ALL");
    setPage(1);
  };

  // Quick Date Preset Handlers
  const applyDatePreset = (preset: "TODAY" | "YESTERDAY" | "THIS_MONTH" | "ALL") => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (preset === "TODAY") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const yestStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
      setFromDate(yestStr);
      setToDate(yestStr);
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
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex flex-wrap items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-[#b08d28] shrink-0" />
            <span>Sale Report</span>
            {selectedShop?.name && (
              <span className="text-sm font-normal text-slate-500 bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 truncate max-w-[240px] sm:max-w-xs inline-block align-middle" title={selectedShop.name}>
                {selectedShop.name}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Filter, search, toggle full non-paginated view, and export to CSV, Excel & PDF
          </p>
        </div>

        {/* Action Export Buttons */}
        {canExport && (
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </Button>

            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-blue-600 text-blue-700 hover:bg-blue-50 font-medium flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel (.xls)
            </Button>

            <Button
              onClick={handlePrintPDF}
              className="bg-[#b08d28] hover:bg-[#967720] text-white font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print / PDF Report
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Value</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            ₹{totalsSummary.totalSaleValue.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-500">{totalsSummary.totalBills} Bills / Invoices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Taxable Amt.</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            ₹{totalsSummary.totalTaxable.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-500">Before GST / Taxes</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Gold Weight</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {totalsSummary.totalGoldWt} <span className="text-sm font-normal text-slate-500">gms</span>
          </p>
          <p className="text-xs text-slate-500">Net Gold Sold</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Diamond Weight</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {totalsSummary.totalDiamondWt} <span className="text-sm font-normal text-slate-500">ct</span>
          </p>
          <p className="text-xs text-slate-500">{totalsSummary.totalItems} Items Total</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <Button
          variant={activeTab === "sale-billwise" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("sale-billwise");
            setPage(1);
          }}
          className={cn(
            "font-medium transition-all",
            activeTab === "sale-billwise"
              ? "bg-[#b08d28] text-white shadow-xs hover:bg-[#967720]"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <FileText className="w-4 h-4 mr-2" />
          Sale Report – Billwise & Metalwise
        </Button>

        <Button
          variant={activeTab === "sale-itemwise" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("sale-itemwise");
            setPage(1);
          }}
          className={cn(
            "font-medium transition-all",
            activeTab === "sale-itemwise"
              ? "bg-[#b08d28] text-white shadow-xs hover:bg-[#967720]"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Boxes className="w-4 h-4 mr-2" />
          Sale Report – Itemwise (Amount & Gms)
        </Button>

        <Button
          variant={activeTab === "store-reports" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("store-reports");
            setPage(1);
          }}
          className={cn(
            "font-medium transition-all",
            activeTab === "store-reports"
              ? "bg-[#b08d28] text-white shadow-xs hover:bg-[#967720]"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Layers className="w-4 h-4 mr-2" />
          Other Store Reports
        </Button>
      </div>

      {/* Filter Bar & Quick Date Presets */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Presets:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyDatePreset("TODAY")}
              className="h-7 text-xs px-2.5"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyDatePreset("YESTERDAY")}
              className="h-7 text-xs px-2.5"
            >
              Yesterday
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyDatePreset("THIS_MONTH")}
              className="h-7 text-xs px-2.5"
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyDatePreset("ALL")}
              className="h-7 text-xs px-2.5"
            >
              All Time
            </Button>
          </div>

          {/* Row View / Pagination Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Size / View:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b08d28]"
            >
              <option value={15}>15 rows per page</option>
              <option value={30}>30 rows per page</option>
              <option value={50}>50 rows per page</option>
              <option value={100}>100 rows per page</option>
              <option value={99999}>All Rows (No Pagination)</option>
            </select>
          </div>
        </div>

        {/* Input Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Bill No, Customer, Product Tag..."
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
            <label className="text-xs font-semibold text-slate-500 mb-1 block">From Date</label>
            <DateInput
              value={fromDate || ""}
              onValueChange={(val) => {
                setFromDate(val);
                setPage(1);
              }}
              placeholder="Start Date"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">To Date</label>
            <DateInput
              value={toDate || ""}
              onValueChange={(val) => {
                setToDate(val);
                setPage(1);
              }}
              placeholder="End Date"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Metal Filter</label>
            <select
              value={selectedMetal}
              onChange={(e) => {
                setSelectedMetal(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#b08d28]"
            >
              <option value="ALL">All Metals</option>
              <option value="GOLD">Gold</option>
              <option value="DIAMOND">Diamond</option>
              <option value="SILVER">Silver</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>
        </div>

        {/* Active Filter Info & Reset Button */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>{currentActiveData.length}</strong> records match your active filters (Ready for Download)
            </span>
          </div>

          {(searchTerm || fromDate || toDate || selectedMetal !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 h-8 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Tables */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <RefreshCw className="w-8 h-8 text-[#b08d28] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Fetching Sales Report Data...</p>
        </div>
      ) : activeTab === "sale-billwise" ? (
        /* FORMAT 2: Sale Report Billwise & Metalwise */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="bg-emerald-700 text-white px-5 py-3.5 flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FileText className="w-5 h-5" /> Sale Report Billwise & Metalwise
            </h3>
            <span className="text-xs bg-emerald-800 text-emerald-100 px-2.5 py-1 rounded-full font-medium">
              {pageSize >= 9999 ? `Showing All ${billwiseData.length} Records` : `${billwiseData.length} Total Invoices`}
            </span>
          </div>

          <CommonTable
            columns={[
              { key: "sNo", label: "S. No." },
              {
                key: "billNo",
                label: "Bill No.",
                render: (r: any) => <span className="font-semibold font-mono text-slate-800">{r.billNo}</span>,
              },
              { key: "date", label: "Date" },
              { key: "customerName", label: "Customer Name" },
              { key: "gstNo", label: "GST No." },
              {
                key: "goldWt",
                label: "Gold Wt. (g)",
                render: (r: any) => <span className="font-medium text-amber-700">{formatWeight(r.goldWt)}</span>,
              },
              {
                key: "diamondWt",
                label: "Diamond Wt. (ct)",
                render: (r: any) => <span className="font-medium text-blue-600">{formatWeight(r.diamondWt)}</span>,
              },
              {
                key: "silverWt",
                label: "Silver Wt. (g)",
                render: (r: any) => <span>{formatWeight(r.silverWt)}</span>,
              },
              {
                key: "makingCharges",
                label: "Making Charges",
                render: (r: any) => <span>₹{r.makingCharges.toLocaleString("en-IN")}</span>,
              },
              {
                key: "metalCost",
                label: "Metal Cost",
                render: (r: any) => <span>₹{r.metalCost.toLocaleString("en-IN")}</span>,
              },
              {
                key: "taxableAmt",
                label: "Taxable Amt.",
                render: (r: any) => <span className="font-medium">₹{r.taxableAmt.toLocaleString("en-IN")}</span>,
              },
              {
                key: "cgst",
                label: "CGST",
                render: (r: any) => <span>₹{r.cgst.toLocaleString("en-IN")}</span>,
              },
              {
                key: "sgst",
                label: "SGST",
                render: (r: any) => <span>₹{r.sgst.toLocaleString("en-IN")}</span>,
              },
              {
                key: "igst",
                label: "IGST",
                render: (r: any) => <span>₹{r.igst.toLocaleString("en-IN")}</span>,
              },
              {
                key: "discountAmt",
                label: "Discount Amt.",
                render: (r: any) => <span>₹{r.discountAmt.toLocaleString("en-IN")}</span>,
              },
              {
                key: "roundOff",
                label: "Round Off",
                render: (r: any) => <span>{r.roundOff.toFixed(2)}</span>,
              },
              {
                key: "totalSaleValue",
                label: "Total Sale Value",
                render: (r: any) => (
                  <span className="font-bold text-emerald-700">₹{r.totalSaleValue.toLocaleString("en-IN")}</span>
                ),
              },
            ]}
            data={displayedData}
            pagination={
              pageSize >= 9999
                ? undefined
                : {
                    page,
                    pageSize,
                    total: billwiseData.length,
                    totalPages: Math.ceil(billwiseData.length / pageSize) || 1,
                    onPageChange: (p) => setPage(p),
                    onPageSizeChange: (s) => setPageSize(s),
                  }
            }
          />
        </div>
      ) : activeTab === "sale-itemwise" ? (
        /* FORMAT 1: Sale Report Itemwise */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="bg-rose-700 text-white px-5 py-3.5 flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Boxes className="w-5 h-5" /> Sale Report Format (Amount & Gms, Itemwise)
            </h3>
            <span className="text-xs bg-rose-800 text-rose-100 px-2.5 py-1 rounded-full font-medium">
              {pageSize >= 9999 ? `Showing All ${itemwiseData.length} Items` : `${itemwiseData.length} Items Listed`}
            </span>
          </div>

          <CommonTable
            columns={[
              { key: "sNo", label: "S. No." },
              {
                key: "billNo",
                label: "Bill No.",
                render: (r: any) => <span className="font-semibold font-mono text-slate-800">{r.billNo}</span>,
              },
              { key: "billDate", label: "Bill Date" },
              {
                key: "productCode",
                label: "Product Code",
                render: (r: any) => <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{r.productCode}</span>,
              },
              { key: "productName", label: "Product Name" },
              { key: "metal", label: "Metal" },
              { key: "purity", label: "Purity / Kt" },
              {
                key: "grossWeight",
                label: "Gross Wt. (g)",
                render: (r: any) => <span>{formatWeight(r.grossWeight)}</span>,
              },
              {
                key: "netWeight",
                label: "Net Wt. (g)",
                render: (r: any) => <span className="font-medium">{formatWeight(r.netWeight)}</span>,
              },
              {
                key: "stoneWeight",
                label: "Stone Wt.",
                render: (r: any) => <span>{formatWeight(r.stoneWeight)}</span>,
              },
              {
                key: "diamondWeight",
                label: "Diamond Wt.",
                render: (r: any) => <span>{formatWeight(r.diamondWeight)}</span>,
              },
              {
                key: "diamondCarat",
                label: "Carat",
                render: (r: any) => <span>{r.diamondCarat ? r.diamondCarat.toFixed(2) : "0.00"}</span>,
              },
              {
                key: "taxableAmt",
                label: "Taxable Amt.",
                render: (r: any) => <span>₹{r.taxableAmt.toLocaleString("en-IN")}</span>,
              },
              {
                key: "totalPrice",
                label: "Total Price",
                render: (r: any) => (
                  <span className="font-bold text-[#b08d28]">₹{r.totalPrice.toLocaleString("en-IN")}</span>
                ),
              },
            ]}
            data={displayedData}
            pagination={
              pageSize >= 9999
                ? undefined
                : {
                    page,
                    pageSize,
                    total: itemwiseData.length,
                    totalPages: Math.ceil(itemwiseData.length / pageSize) || 1,
                    onPageChange: (p) => setPage(p),
                    onPageSizeChange: (s) => setPageSize(s),
                  }
            }
          />
        </div>
      ) : (
        /* FORMAT 3 & 4: Other Store Reports */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
            {[
              { id: "PURCHASE", name: "Purchase Report" },
              { id: "IN_TRANSIT", name: "Total In Transit Report" },
              { id: "RECEIVED", name: "Total Received Report" },
              { id: "TRANSFER", name: "Total Transfer Report" },
              { id: "AVAILABLE", name: "Available Stock Report" },
              { id: "RETURN", name: "Return Report" },
            ].map((rep) => (
              <Button
                key={rep.id}
                size="sm"
                variant={subReportType === rep.id ? "default" : "outline"}
                onClick={() => setSubReportType(rep.id)}
                className={cn(
                  subReportType === rep.id
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "border-slate-200 text-slate-700"
                )}
              >
                {rep.name}
              </Button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="bg-amber-700 text-white px-5 py-3.5 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-5 h-5" />
                {subReportType.replace("_", " ")} Report Format
              </h3>
              <span className="text-xs bg-amber-800 text-amber-100 px-2.5 py-1 rounded-full font-medium">
                Standard Itemwise Fields
              </span>
            </div>

            <CommonTable
              columns={[
                { key: "sNo", label: "S. No." },
                {
                  key: "productCode",
                  label: "Product Code",
                  render: (r: any) => <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{r.productCode}</span>,
                },
                { key: "productName", label: "Product Name" },
                { key: "metal", label: "Metal" },
                { key: "purity", label: "Kt. (Purity)" },
                {
                  key: "grossWeight",
                  label: "Gross Wt. (g)",
                  render: (r: any) => <span>{formatWeight(r.grossWeight)}</span>,
                },
                {
                  key: "netWeight",
                  label: "Net Wt. (g)",
                  render: (r: any) => <span className="font-medium">{formatWeight(r.netWeight)}</span>,
                },
                {
                  key: "stoneWeight",
                  label: "Stone Wt.",
                  render: (r: any) => <span>{formatWeight(r.stoneWeight)}</span>,
                },
                {
                  key: "diamondWeight",
                  label: "Diamond Wt.",
                  render: (r: any) => <span>{formatWeight(r.diamondWeight)}</span>,
                },
                ...(subReportType === "RETURN"
                  ? [
                      {
                        key: "totalPrice",
                        label: "Return Value",
                        render: (r: any) => (
                          <span className="font-bold text-cyan-700">₹{r.totalPrice.toLocaleString("en-IN")}</span>
                        ),
                      },
                    ]
                  : []),
              ]}
              data={displayedData}
              pagination={
                pageSize >= 9999
                  ? undefined
                  : {
                      page,
                      pageSize,
                      total: itemwiseData.length,
                      totalPages: Math.ceil(itemwiseData.length / pageSize) || 1,
                      onPageChange: (p) => setPage(p),
                      onPageSizeChange: (s) => setPageSize(s),
                    }
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleReport;
