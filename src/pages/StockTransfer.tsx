import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  User,
  FileText,
  Truck,
  ChevronLeft,
  ChevronRight,
  Ban,
  Store,
  Eye,
  Package,
  CheckCircle2,
  XCircle,
  Clock3,
  Weight,
  Hash,
  ScanLine,
  Printer, // Added Printer icon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  useStockTransfersPaged,
  useCancelStockTransfer,
} from "@/hooks/useStockTransfer";

import api from "@/lib/axios"; // Added API import

type TransferItem = {
  id?: number;
  stockTransferId?: number;
  stockEntryId?: string;
  itemId?: number;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  grossWeight?: number;
  netWeight?: number;
  pureWeight?: number;
  quantity?: number;
  conditionNotes?: string;
  isReceived?: boolean;
  receivedDate?: string;
  isRejected?: boolean;
  rejectionReason?: string;
  rejectionDate?: string;
  rejectedByUserId?: string;
  rejectedByUserName?: string;
  rejectionPhase?: string;
  createdBy?: string;
  updatedBy?: string;
};

const formatCustomDate = (dateString?: string) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}/${month}/${year} ${time}`;
};

const formatWeight = (value?: number) => {
  return `${Number(value || 0).toFixed(3)} g`;
};

const getItemStatusMeta = (item: TransferItem) => {
  if (item.isRejected) {
    return {
      label: "Rejected",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  }

  if (item.isReceived) {
    return {
      label: "Received",
      className: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }

  return {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Clock3 className="w-3.5 h-3.5" />,
  };
};

const CustomTransferItemsHoverCard = ({
  items,
  orderNo,
}: {
  items: TransferItem[];
  orderNo: string;
}) => {
  const safeItems = items || [];

  const stats = useMemo(() => {
    const totalItems = safeItems.length;
    const receivedCount = safeItems.filter(
      (item) => item.isReceived && !item.isRejected
    ).length;
    const rejectedCount = safeItems.filter((item) => item.isRejected).length;
    const pendingCount = safeItems.filter(
      (item) => !item.isReceived && !item.isRejected
    ).length;

    return {
      totalItems,
      receivedCount,
      rejectedCount,
      pendingCount,
    };
  }, [safeItems]);

  const getItemStatus = (item: TransferItem) => {
    if (item.isRejected) {
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-700",
      };
    }

    if (item.isReceived) {
      return {
        label: "Received",
        className: "bg-green-100 text-green-700",
      };
    }

    return {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-700",
    };
  };

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Button variant="outline" size="sm" className="h-8 px-2.5">
          {stats.totalItems} Item{stats.totalItems !== 1 ? "s" : ""}
        </Button>
      </HoverCardTrigger>

      <HoverCardContent className="w-[480px] p-0">
        <div className="flex max-h-[300px] flex-col">
          <div className="border-b px-4 py-3 bg-gray-50 shrink-0">
            <div className="text-sm font-semibold">Transfer Items</div>
            <div className="text-xs text-gray-500">{orderNo || "—"}</div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline">Total: {stats.totalItems}</Badge>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                Received: {stats.receivedCount}
              </Badge>
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                Rejected: {stats.rejectedCount}
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                Pending: {stats.pendingCount}
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {safeItems.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                No items found.
              </div>
            ) : (
              <div className="divide-y">
                {safeItems.map((item, index) => {
                  const status = getItemStatus(item);

                  return (
                    <div
                      key={item.id || item.stockEntryId || index}
                      className="p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {item.itemName || "Unnamed Item"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Tag: {item.tagNumber || "—"} | Item ID: {item.itemId || "—"}
                          </div>
                        </div>

                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Category:</span>{" "}
                          <span className="font-medium">{item.category || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Metal:</span>{" "}
                          <span className="font-medium">{item.metal || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantity:</span>{" "}
                          <span className="font-medium">{item.quantity || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross:</span>{" "}
                          <span className="font-medium">{item.grossWeight ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Net:</span>{" "}
                          <span className="font-medium">{item.netWeight ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Pure:</span>{" "}
                          <span className="font-medium">{item.pureWeight ?? 0}</span>
                        </div>
                      </div>

                      {item.conditionNotes && (
                        <div className="text-xs">
                          <span className="text-gray-500">Condition Notes:</span>{" "}
                          <span className="font-medium">{item.conditionNotes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const StockTransfer = () => {
  const navigate = useNavigate();
  const { selectedShop, permissions, user } = useAuth();

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Print popup state
  const [printChallanId, setPrintChallanId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const shopId = selectedShop?.id ?? undefined;

  // Permissions logic
  const actionPermissions = permissions?.find(
    (item: any) => item?.Module === 'Stock Transfer' || item?.Module === 'StockMovement'
  );
  
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  const hasRead = actionPermissions?.Read || isAdmin;
  const hasCreate = actionPermissions?.Create || isAdmin;
  const hasDelete = actionPermissions?.Delete || isAdmin;

  const { data, isLoading, isFetching } = useStockTransfersPaged({
    page,
    pageSize,
    keyword: searchTerm || undefined,
    fromDate: startDate || undefined,
    toDate: endDate || undefined,
    shopId,
  });

  const { mutate: cancelTransfer, isPending: isCanceling } =
    useCancelStockTransfer();

  const transfers = data?.data ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize) || 1;

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer: any) => {
      const matchesStatus =
        statusFilter === "All" || transfer.status === statusFilter;
      return matchesStatus;
    });
  }, [transfers, statusFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent";

  const summary = useMemo(
    () => ({
      totalTransfers: filteredTransfers.length,
      totalItems: filteredTransfers.reduce(
        (sum: number, t: any) => sum + (t.transferItems?.length || 0),
        0
      ),
      pendingTransfers: filteredTransfers.filter((t: any) =>
        (t.status || "").toLowerCase().includes("pending")
      ).length,
    }),
    [filteredTransfers]
  );

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status?: string) => {
    const value = (status || "").toLowerCase();

    if (value.includes("pending")) {
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    }
    if (value.includes("approved")) {
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    }
    if (value.includes("received")) {
      return "bg-green-100 text-green-700 hover:bg-green-100";
    }
    if (value.includes("reject")) {
      return "bg-red-100 text-red-700 hover:bg-red-100";
    }
    if (value.includes("cancel")) {
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }

    return "bg-slate-100 text-slate-700 hover:bg-slate-100";
  };

  const handleCreate = () => {
    navigate("/admin/stock-transfer/new");
  };

  const handleCancelConfirm = () => {
    if (!cancelId) return;

    cancelTransfer(cancelId, {
      onSuccess: () => {
        toast.success("Stock transfer cancelled successfully.");
        setCancelOpen(false);
        setCancelId(null);
      },
      onError: () => {
        toast.error("Failed to cancel stock transfer.");
        setCancelOpen(false);
      },
    });
  };

  // Helper to fetch and download/print the challan
  const handleConfirmPrint = async () => {
    if (!printChallanId) return;
    setIsPrinting(true);
    try {
      const res = await api.get(`/StockTransfer/${printChallanId}/challan`, {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      });
      
      const fileURL = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const newWindow = window.open(fileURL, "_blank");
      
      // Fallback for pop-up blockers
      if (!newWindow) {
        const link = document.createElement("a");
        link.href = fileURL;
        link.download = `Challan_${printChallanId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast.error("Failed to load Challan PDF");
    } finally {
      setIsPrinting(false);
      setPrintChallanId(null);
    }
  };

  const columns = [
    {
      key: "transferInfo",
      label: "Transfer Details",
      render: (r: any) => (
        <div className="flex flex-col space-y-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-700 text-sm">
              {r.transferNumber || "—"}
            </span>
          </div>
          <div className="text-xs text-gray-500 pl-6">
            Challan: {r.challanNumber || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Transfer Date",
      render: (r: any) => (
        <div className="flex flex-col min-w-[100px]">
          <span className="text-sm font-medium">
            {formatCustomDate(r.transferDate)}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(r.transferDate)}
          </span>
        </div>
      ),
    },
    {
      key: "sourceShop",
      label: "Source Shop",
      render: (r: any) => (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-gray-600">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-sm">
              {r.sourceShop?.name || "—"}
            </div>
            <div className="text-xs text-gray-500">
              ID: {r.sourceShopId || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "destinationShop",
      label: "Destination Shop",
      render: (r: any) => (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-gray-600">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-sm">
              {r.destinationShop?.name || "—"}
            </div>
            <div className="text-xs text-gray-500">
              ID: {r.destinationShopId || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "porter",
      label: "Porter",
      render: (r: any) => (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-gray-600 font-bold text-xs">
            {r.porter?.name?.[0] || <User className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-medium text-sm">{r.porter?.name || "—"}</div>
            <div className="text-xs text-gray-500">
              {r.porter?.phone || "No Contact"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (r: any) => (
        <CustomTransferItemsHoverCard
          items={r.transferItems || []}
          orderNo={r.transferNumber || "—"}
        />
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (r: any) => (
        <div
          className="max-w-[180px] line-clamp-2 text-sm text-gray-600"
          title={r.remarks}
        >
          {r.remarks || "—"}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r: any) => (
        <Badge className={getStatusClass(r.status)}>{r.status || "Unknown"}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Action",
      render: (r: any) => {
        const canCancel = !["received", "cancelled", "canceled"].includes(
          (r.status || "").toLowerCase()
        );

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 px-2"
              onClick={() => navigate(`/admin/stock-transfer/view/${r.id}`)}
            >
              <Eye className="w-4 h-4 mr-1" /> View
            </Button>

            {/* Print Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 px-2"
              onClick={() => setPrintChallanId(r.id)}
            >
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>

            {canCancel && hasDelete && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-2"
                onClick={() => {
                  setCancelId(r.id);
                  setCancelOpen(true);
                }}
              >
                <Ban className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view stock transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Truck className="w-8 h-8 text-[#b08d28]" />
          Stock Transfers
        </h1>

        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 px-2",
                viewMode === "table" &&
                  "bg-white text-black shadow-sm hover:bg-white"
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
                viewMode === "grid" &&
                  "bg-white text-black shadow-sm hover:bg-white"
              )}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
            </Button>
          </div>

          {hasCreate && (
            <Button
              onClick={handleCreate}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" /> New Transfer
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Transfer no, challan, shop, porter..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="PartiallyApproved">Partially Approved</option>
              <option value="Received">Received</option>
              <option value="PartiallyReceived">Partially Received</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 md:col-span-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              />
            </div>

            {(startDate || endDate || statusFilter !== "All" || searchTerm) && (
              <button
                onClick={clearFilters}
                className="mb-[1px] px-3 py-1.5 h-[34px] text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Filtered Transfers</p>
          <p className="text-xl font-bold">{summary.totalTransfers}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Filtered Items</p>
          <p className="text-xl font-bold">{summary.totalItems}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Pending Transfers</p>
          <p className="text-xl font-bold text-yellow-600">
            {summary.pendingTransfers}
          </p>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <CommonTable
            columns={columns}
            data={filteredTransfers}
            loading={isLoading || isFetching}
            emptyMessage={
              transfers.length === 0
                ? "No stock transfers found."
                : "No stock transfers match your filters."
            }
            pagination={{
              page: page,
              pageSize: pageSize,
              total: total,
              totalPages: totalPages,
              onPageChange: (newPage: number) => setPage(newPage),
              onPageSizeChange: (newPageSize: number) => {
                setPageSize(newPageSize);
                setPage(1);
              },
            }}
            actions={[]}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading || isFetching ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-gray-100 animate-pulse rounded-lg"
                  />
                ))
            ) : filteredTransfers.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                {transfers.length === 0
                  ? "No stock transfers found. Start a new transfer!"
                  : "No stock transfers match your current filters."}
              </div>
            ) : (
              filteredTransfers.map((transfer: any) => (
                <div
                  key={transfer.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="p-4 border-b rounded-t-xl bg-gray-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">
                            Transfer
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-white font-mono text-xs"
                          >
                            {transfer.transferNumber || "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-500 uppercase font-semibold">
                            Challan
                          </span>
                          <span className="font-mono text-xs font-medium text-gray-700">
                            {transfer.challanNumber || "—"}
                          </span>
                        </div>
                      </div>

                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 mt-1",
                          getStatusClass(transfer.status)
                        )}
                      >
                        {transfer.status || "Unknown"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 shadow-sm">
                        {transfer.porter?.name?.[0] || (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 leading-tight">
                          {transfer.porter?.name || "No Porter"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {transfer.porter?.phone || "No Contact Info"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Transfer Date
                      </span>
                      <div className="flex flex-col text-right">
                        <span className="font-medium">
                          {formatCustomDate(transfer.transferDate)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(transfer.transferDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> From
                      </span>
                      <span className="font-medium text-right max-w-[60%]">
                        {transfer.sourceShop?.name || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> To
                      </span>
                      <span className="font-medium text-right max-w-[60%]">
                        {transfer.destinationShop?.name || "—"}
                      </span>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 mt-2 border">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Items</span>
                        <CustomTransferItemsHoverCard
                          items={transfer.transferItems || []}
                          orderNo={transfer.transferNumber || "—"}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Received Date</span>
                        <span className="font-medium">
                          {formatCustomDate(transfer.receivedDate)}
                        </span>
                      </div>
                      <div className="pt-2 border-t mt-1">
                        <span className="block text-gray-400 text-[10px] uppercase mb-1">
                          Remarks
                        </span>
                        <span className="font-medium text-gray-700 line-clamp-2">
                          {transfer.remarks || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t rounded-b-xl flex justify-between items-center gap-2 bg-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Transfer ID
                      </span>
                      <span className="text-lg font-bold text-slate-700 leading-tight">
                        #{transfer.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 shadow-sm px-2"
                        onClick={() =>
                          navigate(`/admin/stock-transfer/view/${transfer.id}`)
                        }
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>

                      {/* Print Button - Grid View */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 shadow-sm px-2"
                        onClick={() => setPrintChallanId(transfer.id)}
                      >
                        <Printer className="w-4 h-4 mr-1" /> Print
                      </Button>

                      {!["received", "cancelled", "canceled"].includes(
                        (transfer.status || "").toLowerCase()
                      ) && hasDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-sm px-2"
                          onClick={() => {
                            setCancelId(transfer.id);
                            setCancelOpen(true);
                          }}
                        >
                          <Ban className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, total)} of {total} entries
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
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
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Cancel */}
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Transfer?"
        message="Are you sure you want to cancel this stock transfer?"
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          setCancelOpen(false);
          setCancelId(null);
        }}
        confirmText={isCanceling ? "Cancelling..." : "Cancel Transfer"}
        variant="destructive"
      />

      {/* Confirmation Dialog for Print */}
      <ConfirmDialog
        open={!!printChallanId}
        title="Print Challan?"
        message="Would you like to open and print the Challan PDF for this stock transfer?"
        onConfirm={handleConfirmPrint}
        onCancel={() => setPrintChallanId(null)}
        confirmText={isPrinting ? "Loading..." : "Yes, Print"}
        variant="default"
      />
    </div>
  );
};