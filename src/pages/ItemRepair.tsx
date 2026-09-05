import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Search,
  Wrench,
  User,
  ChevronLeft,
  ChevronRight,
  Scale,
  Store,
  Package,
} from "lucide-react";
import { CommonTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/DatePicker";
import { toast } from "@/components/ui/toast";
import { useRepairedItemsList, type RepairedItem } from "@/hooks/useReturn";

// ==========================================
// Debounce Hook
// ==========================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ==========================================
// UI-safe row type for table/grid
// ==========================================
type RepairRow = RepairedItem & {
  id: number;
};

// ==========================================
// Helpers
// ==========================================
const safeText = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.title === "string") return obj.title;
    if (typeof obj.value === "string" || typeof obj.value === "number") {
      return String(obj.value);
    }
  }

  return fallback;
};

const formatCustomDate = (dateString?: string) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (dateString?: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isBefore = (a: string | null, b: string | null) => {
  if (!a || !b) return false;
  return new Date(a) < new Date(b);
};

const isAfter = (a: string | null, b: string | null) => {
  if (!a || !b) return false;
  return new Date(a) > new Date(b);
};

const getMetalBadgeClass = (metal?: unknown) => {
  const metalText = safeText(metal, "").toLowerCase();

  switch (metalText) {
    case "gold":
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    case "diamond":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "silver":
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
};

const getRepairRowId = (r: RepairedItem, index: number): number => {
  if (typeof r.id === "number") return r.id;
  if (typeof r.itemId === "number" && typeof r.returnId === "number") {
    return Number(`${r.returnId}${r.itemId}`);
  }
  if (typeof r.itemId === "number") return r.itemId;
  return index + 1;
};

// ==========================================
// Main Component
// ==========================================
export const ItemRepair = () => {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [filterMetal, setFilterMetal] = useState("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const { data, isLoading } = useRepairedItemsList({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    metal: filterMetal !== "all" ? filterMetal : undefined,
  });

  const repairs: RepairRow[] = useMemo(
    () => (data?.data ?? []).map((item, index) => ({ ...item, id: getRepairRowId(item, index) })),
    [data]
  );

  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize) || 1;

  const summary = useMemo(
    () => ({
      totalRepairs: total,
      totalItems: repairs.reduce((sum, r) => sum + (r.quantity || 0), 0),
      totalAmount: repairs.reduce((sum, r) => sum + (r.totalReturnPrice || 0), 0),
      totalWeight: repairs.reduce((sum, r) => sum + (r.netWeight || 0), 0),
    }),
    [repairs, total]
  );

  const hasActiveFilters = !!(searchTerm || filterMetal !== "all" || fromDate || toDate);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterMetal("all");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        key: "returnInfo",
        label: "Return Details",
        render: (r: RepairRow) => (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-gray-700 text-sm">
                {safeText(r.returnNo)}
              </span>
            </div>
            <div className="text-xs text-gray-500 pl-6">
              Return Item ID: {r.id}
            </div>
          </div>
        ),
      },
      {
        key: "itemInfo",
        label: "Item",
        render: (r: RepairRow) => (
          <div className="flex flex-col space-y-1">
            <div className="font-medium text-sm text-gray-900">
              {safeText(r.itemName)}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <span>Tag: {safeText(r.tagNumber)}</span>
              <span>•</span>
              <span>ID: {r.itemId ?? "—"}</span>
            </div>
          </div>
        ),
      },
      {
        key: "metalCategory",
        label: "Metal / Category",
        render: (r: RepairRow) => (
          <div className="flex flex-col gap-1">
            <Badge className={getMetalBadgeClass(r.metal)}>
              {safeText(r.metal, "N/A")}
            </Badge>
            <span className="text-xs text-gray-500">{safeText(r.category)}</span>
          </div>
        ),
      },
      {
        key: "weights",
        label: "Weight",
        render: (r: RepairRow) => (
          <div className="flex flex-col text-sm">
            <span className="font-medium">Gross: {r.grossWeight ?? 0} g</span>
            <span className="text-xs text-gray-500">Net: {r.netWeight ?? 0} g</span>
          </div>
        ),
      },
      {
        key: "shop",
        label: "Shop",
        render: (r: RepairRow) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{safeText(r.shopName)}</span>
            <span className="text-xs text-gray-500">Shop ID: {r.shopId ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "returnDate",
        label: "Return Date",
        render: (r: RepairRow) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formatCustomDate(r.returnDate)}</span>
            <span className="text-xs text-gray-400">{formatTime(r.returnDate)}</span>
          </div>
        ),
      },
      {
        key: "updatedInfo",
        label: "Updated",
        render: (r: RepairRow) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {safeText(r.updatedBy ?? r.createdBy)}
            </span>
            <span className="text-xs text-gray-400">
              {formatCustomDate(r.updateDate ?? r.createDate)}
            </span>
          </div>
        ),
      },
      {
        key: "amount",
        label: "Repair Value",
        render: (r: RepairRow) => (
          <span className="font-bold text-red-600 text-base">
            ₹
            {(r.totalReturnPrice || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Wrench className="w-8 h-8 text-blue-600" />
          Item Repair
        </h1>

        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 px-2",
                viewMode === "table" && "bg-white text-black shadow-sm hover:bg-white"
              )}
            >
              <TableIcon className="w-4 h-4 mr-1.5" /> Table
            </Button>

            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 px-2",
                viewMode === "grid" && "bg-white text-black shadow-sm hover:bg-white"
              )}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Repaired Items</p>
          <p className="text-xl font-bold">{summary.totalRepairs}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Qty (This Page)</p>
          <p className="text-xl font-bold">{summary.totalItems}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Net Weight (This Page)</p>
          <p className="text-xl font-bold">{summary.totalWeight.toFixed(2)} g</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Repair Value (This Page)</p>
          <p className="text-xl font-bold text-red-600">
            ₹
            {summary.totalAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-gray-700">Filter Options</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-gray-500 hover:text-gray-900"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">Search</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Return No, Tag No, Item Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 h-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">Metal</label>
            <Select
              value={filterMetal}
              onValueChange={(val) => {
                setFilterMetal(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Metals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metals</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Diamond">Diamond</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">From Date</label>
            <DateInput
              value={fromDate || ""}
              onValueChange={(val) => {
                if (val && toDate && isAfter(val, toDate)) {
                  toast.error("From date cannot be after To date");
                  return;
                }
                setFromDate(val);
                setPage(1);
              }}
              placeholder="Start Date"
              max={toDate || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">To Date</label>
            <DateInput
              value={toDate || ""}
              onValueChange={(val) => {
                if (val && fromDate && isBefore(val, fromDate)) {
                  toast.error("To date cannot be before From date");
                  return;
                }
                setToDate(val);
                setPage(1);
              }}
              placeholder="End Date"
              min={fromDate || undefined}
            />
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <CommonTable
            columns={columns}
            data={repairs}
            loading={isLoading}
            emptyMessage={
              hasActiveFilters
                ? "No matching repaired items found"
                : "No repaired items found"
            }
            pagination={{
              page,
              pageSize,
              total,
              totalPages,
              onPageChange: (newPage: number) => setPage(newPage),
              onPageSizeChange: (newPageSize: number) => {
                setPageSize(newPageSize);
                setPage(1);
              },
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-56 bg-gray-100 animate-pulse rounded-lg"
                />
              ))
            ) : repairs.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                {hasActiveFilters
                  ? "No matching repaired items found."
                  : "No repaired items found."}
              </div>
            ) : (
              repairs.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="p-4 border-b rounded-t-xl bg-gray-50/50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">
                            Return
                          </span>
                          <Badge variant="outline" className="bg-white font-mono text-xs">
                            {safeText(r.returnNo)}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-sm text-gray-900 truncate">
                          {safeText(r.itemName)}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                          Tag: {safeText(r.tagNumber)} | Item ID: {r.itemId ?? "—"}
                        </p>
                      </div>

                      <Badge className={getMetalBadgeClass(r.metal)}>
                        {safeText(r.metal, "N/A")}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Category
                      </span>
                      <span className="font-medium">{safeText(r.category)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" /> Weight
                      </span>
                      <div className="text-right">
                        <div className="font-medium">G: {r.grossWeight ?? 0} g</div>
                        <div className="text-xs text-gray-400">N: {r.netWeight ?? 0} g</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> Shop
                      </span>
                      <span className="font-medium text-right line-clamp-2 max-w-[60%]">
                        {safeText(r.shopName)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Return Date
                      </span>
                      <div className="text-right">
                        <div className="font-medium">{formatCustomDate(r.returnDate)}</div>
                        <div className="text-xs text-gray-400">{formatTime(r.returnDate)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Updated By
                      </span>
                      <span className="font-medium">
                        {safeText(r.updatedBy ?? r.createdBy)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border-t rounded-b-xl flex justify-between items-center bg-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Repair Value
                      </span>
                      <span className="text-lg font-bold text-red-600 leading-tight">
                        ₹
                        {(r.totalReturnPrice || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="text-right text-xs text-gray-500">
                      <div>Qty: {r.quantity ?? 0}</div>
                      <div className="mt-1">Tag #{safeText(r.tagNumber)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>

                <div className="text-sm font-medium px-2">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};