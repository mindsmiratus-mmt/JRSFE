import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  RotateCcw,
  Search,
  X,
  Info,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useReturnList } from "@/hooks/useReturn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/DatePicker";


// ==========================================
// Custom Hook for Debouncing API Calls
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
// Item Breakdown Helper
// ==========================================
interface BreakdownDetail {
  label: string;
  weight?: number | string;
  purity?: string | number;
  rate?: number;
  cost?: number;
  making?: number;
  discount?: number;
}

const getItemBreakdown = (item: any): BreakdownDetail[] => {
  const breakdown: BreakdownDetail[] = [];

  if (item.metal?.toLowerCase().includes("gold") || (item.goldCost && item.goldCost > 0)) {
    breakdown.push({
      label: "Gold",
      weight: item.netWeight ?? item.grossWeight,
      purity: item.gPurityId || item.purityPercent,
      rate: item.goldRate,
      cost: item.goldCost,
      making: item.goldMakingChargeApplied,
      discount: item.discountOnMaking,
    });
  }

  if ((item.diamondWeight && item.diamondWeight > 0) || (item.diamondCost && item.diamondCost > 0)) {
    breakdown.push({
      label: "Diamond",
      weight: item.diamondCarat || Number((5 * (item.diamondWeight || 0)).toFixed(3)),
      purity: item.dPurityId || item.clarity,
      rate: item.diamondRate,
      cost: item.diamondCost,
      making: item.diamondMakingChargeRaw,
      discount: item.diamondDiscount,
    });
  }

  if ((item.stoneWeight && item.stoneWeight > 0) || (item.stoneCost && item.stoneCost > 0)) {
    breakdown.push({
      label: item.stoneName || "Stone",
      weight: item.stoneWeight,
      purity: "",
      rate: item.stoneRate,
      cost: item.stoneCost,
      making: 0,
      discount: item.stoneDiscount,
    });
  }

  if (item.metal?.toLowerCase().includes("silver") || (item.silverCost && item.silverCost > 0)) {
    breakdown.push({
      label: "Silver",
      weight: item.netWeight ?? item.grossWeight,
      purity: item.gPurityId || item.purityPercent,
      rate: item.silverRate,
      cost: item.silverCost,
      making: 0,
      discount: 0,
    });
  }

  return breakdown;
};


// ==========================================
// Item Status Badge Helper
// ==========================================
const getItemStatusStyle = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "approved":
      return "bg-green-100 text-green-700 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "pendingapproval":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "completed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
};


// ==========================================
// Hover Card Component
// ==========================================
const FilteredOrderItemsHoverCard = ({
  items,
  orderNo,
  grandTotal,
}: {
  items: any[];
  orderNo: string;
  grandTotal: number;
}) => {
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

      <HoverCardContent className="p-0 w-[420px]">
        {/* Header */}
        <div className="bg-muted/50 p-3 border-b flex justify-between items-center rounded-t-xl">
          <h4 className="font-semibold text-sm">Return Item Details</h4>
          <Badge variant="outline">{orderNo}</Badge>
        </div>

        {/* Scrollable Items List */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-4">
            {items.map((item: any, idx: number) => {
              const breakdown = getItemBreakdown(item);
              const totalTax = (item.igst || 0) + (item.cgst || 0) + (item.sgst || 0);
              const itemStatus: string = item.status || "";

              return (
                <div key={idx} className="bg-card border rounded-md p-3 text-sm shadow-sm flex flex-col gap-3">

                  {/* Item Header */}
                  <div className="flex justify-between items-start border-b pb-2 border-gray-100">
                    <div className="flex-1 min-w-0">
                      {/* Item name + Status badge on same row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-blue-700 leading-none">{item.itemName}</p>
                        {itemStatus && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none ${getItemStatusStyle(itemStatus)}`}
                          >
                            {itemStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {item.metal} | {item.category} | Wt: {item.grossWeight}g
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Tag: {item.tagNumber} {item.huid ? ` | HUID: ${item.huid}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-mono font-bold text-base text-gray-900">
                        ₹{(item.totalReturnPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <p className="text-[9px] text-gray-500 uppercase">Incl. Taxes</p>
                    </div>
                  </div>

                  {/* Metal/Stone Breakdown Details */}
                  {breakdown.length > 0 && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-100 space-y-2">
                      {breakdown.map((b, i) => (
                        <div key={i} className="flex flex-col border-b border-gray-200 last:border-b-0 pb-1.5 last:pb-0">
                          <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                            <span>
                              {b.label}{" "}
                              {b.purity ? (
                                <span className="text-gray-500 font-normal">({b.purity})</span>
                              ) : ""}
                            </span>
                            <span>₹{(b.cost || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 mt-0.5">
                            <span>Wt: {b.weight}{b.label === "Diamond" ? "ct" : "g"} | Rate: ₹{b.rate}</span>
                            {(Number(b.making) > 0 || Number(b.discount) > 0) && (
                              <span className="text-right">
                                {b.making ? `MC: ₹${b.making}` : ""}
                                {b.making && b.discount ? " | " : ""}
                                {b.discount ? <span className="text-green-600">Disc: -₹{b.discount}</span> : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Totals & Taxes Summary */}
                  <div className="text-[11px] text-gray-600 space-y-1 bg-blue-50/50 p-2 rounded">
                    <div className="flex justify-between">
                      <span>Total Base Price</span>
                      <span className="font-medium">
                        ₹{(item.totalSalePriceBeforeTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {item.makingCharges > 0 && (
                      <div className="flex justify-between">
                        <span>Total Making Charges</span>
                        <span>₹{(item.makingCharges || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {item.discount > 0 && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Total Discount</span>
                        <span>- ₹{(item.discount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div className="flex justify-between items-center border-t border-blue-100 pt-1 mt-1">
                        <span>Taxes (IGST/CGST/SGST)</span>
                        <span>₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Total */}
        <div className="p-3 border-t bg-gray-50 flex justify-between items-center rounded-b-xl shadow-inner">
          <span className="text-sm font-medium text-gray-700">Total Return Refund</span>
          <span className="text-lg font-bold text-red-600">
            ₹{(grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};


// ==========================================
// Helper: Should the delete button be hidden?
// ==========================================
const isDeleteRestricted = (status: string) =>
  status === "Completed";


// ==========================================
// Main Returns List Component
// ==========================================
export const ReturnList = () => {
  const navigate = useNavigate();
  const { selectedShop, permissions, user } = useAuth();

  const [deleteReturnId, setDeleteReturnId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const shopId = selectedShop?.id ?? 0;

  const actionPermissions = permissions.find((item: any) => item?.Module === "Return");
  const isAdmin =
    (user as any)?.userRoles?.some((ur: any) => ur.role?.name === "Admin") ?? false;

  const hasRead = actionPermissions?.Read || isAdmin;
  const hasCreate = actionPermissions?.Create || isAdmin;
  const hasDelete = actionPermissions?.Delete || isAdmin;

  const { data, isLoading } = useReturnList({
    shopId,
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const returns = data?.data ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize) || 1;

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  const summary = useMemo(
    () => ({
      totalReturns: total,
      totalItems: returns.reduce((sum: number, r: any) => sum + (r.items?.length || 0), 0),
      totalAmount: returns.reduce((sum: number, r: any) => sum + (r.totalReturnAmount || 0), 0),
    }),
    [returns, total]
  );

  const confirmDelete = () => {
    if (!deleteReturnId) return;
    toast.success("Return record removed");
    setConfirmOpen(false);
    setDeleteReturnId(null);

    if (returns.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  const formatCustomDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const hasActiveFilters = searchTerm || filterStatus !== "all" || fromDate || toDate;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view returns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-blue-600" />
          Returns History
        </h1>

        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 px-2", viewMode === "table" && "bg-white text-black shadow-sm hover:bg-white")}
            >
              <TableIcon className="w-4 h-4 mr-1.5" /> Table
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 px-2", viewMode === "grid" && "bg-white text-black shadow-sm hover:bg-white")}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
            </Button>
          </div>

          {hasCreate && (
            <Button
              onClick={() => navigate("/admin/return/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" /> New Return
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Returns</p>
          <p className="text-xl font-bold">{summary.totalReturns}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Items (This Page)</p>
          <p className="text-xl font-bold">{summary.totalItems}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Refund Amount (This Page)</p>
          <p className="text-xl font-bold text-red-600">
            ₹{summary.totalAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-gray-700">Filter Options</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-gray-500 hover:text-gray-900">
              <X className="w-4 h-4 mr-1" /> Clear All
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
                placeholder="Return No, Invoice ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 h-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setPage(1); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
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

      {/* Content Area */}
      {viewMode === "table" ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <CommonTable
            columns={[
              {
                key: "returnInfo",
                label: "Return Details",
                render: (r: any) => (
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-700 text-sm">{r.returnNo || "—"}</span>
                    </div>
                    <div className="text-xs text-gray-500 pl-6">ID: {r.id || "—"}</div>
                  </div>
                ),
              },
              {
                key: "invoiceInfo",
                label: "Original Invoice",
                render: (r: any) => (
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-700 text-sm">
                        {r.invoiceId ? `INV ID: ${r.invoiceId}` : "N/A"}
                      </span>
                    </div>
                  </div>
                ),
              },
              {
                key: "returnDate",
                label: "Date",
                render: (r: any) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{formatCustomDate(r.returnDate || r.createDate)}</span>
                    <span className="text-xs text-gray-400">
                      {(r.returnDate || r.createDate)
                        ? new Date(r.returnDate || r.createDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </span>
                  </div>
                ),
              },
              {
                key: "customer",
                label: "Customer",
                render: (r: any) => (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-gray-600 font-bold text-xs">
                      {r.customer?.name?.[0] || "G"}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{r.customer?.name || "Guest"}</div>
                      <div className="text-xs text-gray-500">{r.customer?.phone || ""}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: "itemsCount",
                label: "Items",
                render: (r: any) => (
                  <FilteredOrderItemsHoverCard
                    items={r.items || []}
                    orderNo={r.returnNo}
                    grandTotal={r.totalReturnAmount || 0}
                  />
                ),
              },
              {
                key: "totalAmount",
                label: "Return Amount",
                render: (r: any) => (
                  <span className="font-bold text-red-600 text-base">
                    ₹{(r.totalReturnAmount || 0).toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (r: any) => (
                  <Badge
                    variant={r.status === "Pending" ? "secondary" : "default"}
                    className={
                      r.status === "Pending"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        : "bg-green-100 text-green-700 hover:bg-green-100"
                    }
                  >
                    {r.status || "Completed"}
                  </Badge>
                ),
              },
            ]}
            data={returns}
            loading={isLoading}
            emptyMessage={hasActiveFilters ? "No matching returns found" : "No returns found"}
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
            actions={[
              ...(hasDelete
                ? [
                    {
                      icon: <Trash2 className="h-4 w-4" />,
                      label: "Delete",
                      hidden: (row: any) => isDeleteRestricted(row.status),
                      onClick: (row: any) => {
                        setDeleteReturnId(row.id);
                        setConfirmOpen(true);
                      },
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : (
        /* GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
              ))
            ) : returns.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                {hasActiveFilters ? "No matching returns found." : "No returns found."}
              </div>
            ) : (
              returns.map((r: any) => (
                <div
                  key={r.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b rounded-t-xl bg-gray-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">Return</span>
                          <Badge variant="outline" className="bg-white font-mono text-xs">{r.returnNo}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-500 uppercase font-semibold">Invoice ID</span>
                          <span className="font-mono text-xs font-medium text-gray-700">{r.invoiceId || "N/A"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            r.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                              : "bg-green-100 text-green-700 hover:bg-green-100"
                          )}
                        >
                          {r.status || "Completed"}
                        </Badge>

                        {hasDelete && !isDeleteRestricted(r.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteReturnId(r.id);
                              setConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 shadow-sm">
                        {r.customer?.name?.[0] || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 leading-tight">
                          {r.customer?.name || "Guest Customer"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.customer?.phone || "No Contact Info"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Date
                      </span>
                      <div className="flex flex-col text-right">
                        <span className="font-medium">{formatCustomDate(r.returnDate || r.createDate)}</span>
                        <span className="text-[10px] text-gray-400">
                          {(r.returnDate || r.createDate)
                            ? new Date(r.returnDate || r.createDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Items
                      </span>
                      <FilteredOrderItemsHoverCard
                        items={r.items || []}
                        orderNo={r.returnNo}
                        grandTotal={r.totalReturnAmount || 0}
                      />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 border-t rounded-b-xl flex justify-between items-center bg-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Refund Amount</span>
                      <span className="text-lg font-bold text-red-600 leading-tight">
                        ₹{r.totalReturnAmount?.toLocaleString("en-IN") || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls for Grid View */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="text-sm font-medium px-2">Page {page} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Remove Return?"
        message="Are you sure you want to remove this return? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Remove Return"
        variant="destructive"
      />
    </div>
  );
};
