import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PackageCheck, Printer, FileSpreadsheet, Download, RefreshCw, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { CommonTable } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { SearchInput } from "@/components/ui/searchInput";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCSV, exportToExcel, printReportTable, type ExportColumn } from "@/utils/exportUtils";
import { getModulePermissions } from "@/utils/permission";
import { useSaleItemsByStatus, useStockNotInAvailability } from "@/hooks/useSaleItemAvailability";
import { ShopSelect } from "@/components/ui/ShopSelect";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const AvailableStockReport = () => {
  const { selectedShop, user, permissions } = useAuth();
  const { hasRead, canExport } = getModulePermissions(permissions, user, 'Available Stock Report');

  const [searchTerm, setSearchTerm] = useState("");
  const [filterShopId, setFilterShopId] = useState<number | null>(selectedShop?.id || null);
  const [statusFilter, setStatusFilter] = useState<string>("Available");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Fetch real available stock items by status
  const { data: statusItems = [], isLoading: isLoadingStatus } = useSaleItemsByStatus(statusFilter, filterShopId);
  const { data: pendingApprovalItems = [], isLoading: isLoadingPending } = useStockNotInAvailability(filterShopId);

  const rawData = useMemo(() => {
    if (statusFilter === "PendingApproval") {
      return pendingApprovalItems;
    }
    return statusItems;
  }, [statusFilter, pendingApprovalItems, statusItems]);

  const isLoading = isLoadingStatus || isLoadingPending;

  const filteredData = useMemo(() => {
    let counter = 1;
    return (rawData || []).filter((item: any) => {
      if (filterShopId && item.shopId && item.shopId !== filterShopId) return false;

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchesTag = item.tagNumber?.toLowerCase().includes(kw);
        const matchesName = item.itemName?.toLowerCase().includes(kw);
        const matchesId = String(item.itemId || item.id).includes(kw);
        const matchesCategory = item.category?.toLowerCase().includes(kw);
        if (!matchesTag && !matchesName && !matchesId && !matchesCategory) return false;
      }

      return true;
    }).map((item: any) => ({
      ...item,
      sNo: counter++,
    }));
  }, [rawData, filterShopId, searchTerm]);

  const summary = useMemo(() => {
    return {
      totalItems: filteredData.length,
      totalQty: filteredData.reduce((sum: number, it: any) => sum + num(it.quantity || 1), 0),
      totalBulk: filteredData.filter((it: any) => it.isBulkItem).length,
    };
  }, [filteredData]);

  const displayedData = useMemo(() => {
    if (pageSize >= 9999) return filteredData;
    const startIndex = (page - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, page, pageSize]);

  const columns: ExportColumn[] = [
    { header: "S. No.", key: "sNo" },
    { header: "Item ID", key: "itemId" },
    { header: "Tag / Product Code", key: "tagNumber", formatter: (v, row: any) => v || `TAG-${row.itemId}` },
    { header: "Product Name", key: "itemName" },
    { header: "Category", key: "category" },
    { header: "Qty", key: "quantity" },
    { header: "Bulk Item", key: "isBulkItem", formatter: (v) => v ? "Yes" : "No" },
    { header: "Total Wt. (g)", key: "totalWeight", formatter: (v) => v != null ? num(v).toFixed(3) : "-" },
    { header: "Remaining Wt. (g)", key: "remainingWeight", formatter: (v) => v != null ? num(v).toFixed(3) : "-" },
    { header: "Status", key: "status" },
  ];

  const handleExportCSV = () => {
    exportToCSV(`Available_Stock_Report_${format(new Date(), "yyyyMMdd")}`, columns, filteredData);
    toast.success(`Exported ${filteredData.length} stock items to CSV!`);
  };

  const handleExportExcel = () => {
    exportToExcel(`Available_Stock_Report_${format(new Date(), "yyyyMMdd")}`, columns, filteredData);
    toast.success(`Exported ${filteredData.length} stock items to Excel!`);
  };

  const handlePrintPDF = () => {
    const subTitle = `Shop: ${selectedShop?.name || "All"} | Status: ${statusFilter}`;
    printReportTable("Available Stock Report (Itemwise)", subTitle, columns, filteredData);
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
            <PackageCheck className="w-8 h-8 text-teal-600" /> Available Stock Report (Itemwise)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time stock availability breakdown, item weights, metal purity, pricing, and exports
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

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Items</p>
          <p className="text-xl font-bold text-slate-800">{summary.totalItems}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Qty</p>
          <p className="text-xl font-bold text-slate-800">{summary.totalQty}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Bulk Items</p>
          <p className="text-xl font-bold text-teal-700">{summary.totalBulk}</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <PackageCheck className="w-4 h-4 text-teal-600" /> Filters & Options
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-800"
            >
              <option value={15}>15 rows per page</option>
              <option value={30}>30 rows per page</option>
              <option value={50}>50 rows per page</option>
              <option value={100}>100 rows per page</option>
              <option value={99999}>All Rows (No Pagination)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search Filter</label>
            <SearchInput
              placeholder="Search Tag, Item Name, ID, Category..."
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
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm"
            >
              <option value="Available">Available</option>
              <option value="PendingApproval">Pending Approval</option>
              <option value="Sold">Sold</option>
              <option value="Reserved">Reserved</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-teal-600" />
            Showing <strong>{filteredData.length}</strong> stock items matching filters
          </span>
          {(searchTerm || statusFilter !== "Available") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("Available"); setPage(1); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Styled Data Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-x-auto">
        <CommonTable
          loading={isLoading}
          columns={[
            { key: "sNo", label: "S. No." },
            { key: "itemId", label: "Item ID", render: (r: any) => <span className="font-mono text-xs text-slate-500">#{r.itemId || r.id}</span> },
            {
              key: "tagNumber",
              label: "Tag / Product Code",
              render: (r: any) => (
                <span className="font-bold font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {r.tagNumber || `TAG-${r.itemId}`}
                </span>
              ),
            },
            { key: "itemName", label: "Product Name", render: (r: any) => <span className="font-semibold text-slate-800">{r.itemName || "Jewelry Item"}</span> },
            { key: "category", label: "Category", render: (r: any) => <span className="text-slate-600 text-xs">{r.category || "-"}</span> },
            { key: "quantity", label: "Qty", render: (r: any) => <span className="font-bold text-slate-800">{r.quantity ?? 1}</span> },
            {
              key: "isBulkItem",
              label: "Type",
              render: (r: any) => r.isBulkItem
                ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Bulk</span>
                : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Single</span>,
            },
            {
              key: "totalWeight",
              label: "Total Wt. (g)",
              render: (r: any) => r.totalWeight != null
                ? <span className="text-slate-700">{num(r.totalWeight).toFixed(3)}</span>
                : <span className="text-slate-300">—</span>,
            },
            {
              key: "remainingWeight",
              label: "Remaining Wt. (g)",
              render: (r: any) => r.remainingWeight != null
                ? <span className="font-semibold text-teal-700">{num(r.remainingWeight).toFixed(3)}</span>
                : <span className="text-slate-300">—</span>,
            },
            {
              key: "status",
              label: "Status",
              render: (r: any) => {
                const s = r.status || "Available";
                const map: Record<string, string> = {
                  Available: "bg-emerald-100 text-emerald-800 border-emerald-200",
                  Sold: "bg-red-100 text-red-800 border-red-200",
                  Reserved: "bg-amber-100 text-amber-800 border-amber-200",
                  Pending: "bg-orange-100 text-orange-800 border-orange-200",
                  PendingApproval: "bg-purple-100 text-purple-800 border-purple-200",
                };
                return (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${map[s] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {s}
                  </span>
                );
              },
            },
          ]}
          data={displayedData}
          pagination={pageSize >= 9999 ? undefined : { page, pageSize, total: filteredData.length, totalPages: Math.ceil(filteredData.length / pageSize) || 1, onPageChange: setPage, onPageSizeChange: setPageSize }}
        />
      </div>
    </div>
  );
};

export default AvailableStockReport;
