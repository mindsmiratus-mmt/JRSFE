import { useMemo, useState, useEffect } from "react";
import {
  FileText,
  Search,
  CheckSquare,
  Square,
  Grid3x3,
  Table as TableIcon,
  RotateCcw,
  XCircle,
  Loader2,
  Ban,
  PackageCheck,
  Barcode,
  ListChecks,
  CheckCircle2,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Box,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { CommonTable } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useAuth } from "@/contexts/AuthContext";
import {
  usePendingStockTransfers,
  useCancelStockTransfer,
  useReceiveStockTransfer,
  useReceiveStockTransferByBarcode,
  usePartialReceiveStockTransfer,
} from "@/hooks/useStockTransfer";

// --- CUSTOM ITEM DETAIL TABLE ---
const TransferItemsTable = ({ items }: { items: any[] }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic p-2 border border-dashed rounded bg-gray-50">
        No active items in this transfer.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-xs text-left">
        <thead className="bg-gray-100 text-gray-600 uppercase">
          <tr>
            <th className="px-3 py-2 font-semibold">Item Tag</th>
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="px-3 py-2 font-semibold text-right">Gross Wt</th>
            <th className="px-3 py-2 font-semibold text-right">Net Wt</th>
            <th className="px-3 py-2 font-semibold text-right">Pure Wt</th>
            <th className="px-3 py-2 font-semibold text-center">Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <tr
              key={item.id || idx}
              className="hover:bg-gray-50 bg-white transition-colors"
            >
              <td className="px-3 py-2">
                <div className="font-semibold text-gray-900">
                  {item.itemName || "Unknown"}
                </div>
                <div className="text-gray-500 font-mono mt-0.5">
                  {item.tagNumber}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="font-medium text-gray-800">
                  {item.category}
                </div>
                <div className="text-gray-500">{item.metal}</div>
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {Number(item.grossWeight || 0).toFixed(3)}g
              </td>
              <td className="px-3 py-2 text-right font-medium text-blue-700">
                {Number(item.netWeight || 0).toFixed(3)}g
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {Number(item.pureWeight || 0).toFixed(3)}g
              </td>
              <td className="px-3 py-2 text-center">
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                  {item.quantity || 1}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- RESPONSIVE PARTIAL RECEIVE PANEL ---
const PartialReceivePanel = ({
  transfer,
  onComplete,
  onCancel,
}: {
  transfer: any;
  onComplete: (transferId: number) => void;
  onCancel: () => void;
}) => {
  const partialReceiveMutation = usePartialReceiveStockTransfer();

  // Track status as 'pending' | 'receive' | 'reject' for obvious visual feedback
  const [decisions, setDecisions] = useState<
    Record<string, { status: "pending" | "receive" | "reject"; reason: string }>
  >({});

  // Active items are already pre-filtered by the parent now!
  const activeItems = transfer?.transferItems || [];

  useEffect(() => {
    if (!transfer || activeItems.length === 0) return;

    const initial: Record<
      string,
      { status: "pending" | "receive" | "reject"; reason: string }
    > = {};
    activeItems.forEach((item: any) => {
      const entryId = String(item.stockEntryId || item.id);
      initial[entryId] = { status: "pending", reason: "" }; // Start as pending
    });
    setDecisions(initial);
  }, [transfer, activeItems]);

  const handleDecision = (
    id: string,
    status: "receive" | "reject"
  ) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        reason: status === "receive" ? "" : prev[id].reason,
      },
    }));
  };

  const handleReason = (id: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], reason },
    }));
  };

  const handleReceiveAllPending = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].status === "pending") {
          next[id] = { ...next[id], status: "receive", reason: "" };
        }
      });
      return next;
    });
  };

  const handleSubmit = () => {
    const receivedStockEntryIds: string[] = [];
    const rejectedItems: { stockEntryId: string; rejectionReason: string }[] = [];

    const pendingItems = Object.values(decisions).filter(
      (d) => d.status === "pending"
    );

    if (pendingItems.length > 0) {
      toast.error(
        `Please make a decision for all items. ${pendingItems.length} items still pending.`
      );
      return;
    }

    for (const [entryId, decision] of Object.entries(decisions)) {
      if (decision.status === "receive") {
        receivedStockEntryIds.push(entryId);
      } else if (decision.status === "reject") {
        if (!decision.reason.trim()) {
          toast.error("Please provide a rejection reason for all rejected items.");
          return;
        }
        rejectedItems.push({
          stockEntryId: entryId,
          rejectionReason: decision.reason.trim(),
        });
      }
    }

    partialReceiveMutation.mutate(
      {
        id: transfer.id,
        payload: { receivedStockEntryIds, rejectedItems },
      },
      {
        onSuccess: () => {
          toast.success("Transfer items reviewed and received successfully.");
          onComplete(transfer.id);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || "Failed to process partial receive"
          );
        },
      }
    );
  };

  const itemsList = Object.values(decisions);
  const receivedCount = itemsList.filter((d) => d.status === "receive").length;
  const rejectedCount = itemsList.filter((d) => d.status === "reject").length;
  const pendingCount = itemsList.filter((d) => d.status === "pending").length;

  if (activeItems.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 text-gray-500 rounded-xl border border-dashed m-4">
        <PackageCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-lg font-medium text-gray-700">No active items to receive</p>
        <p className="text-sm mt-1">All items in this transfer have already been received or rejected.</p>
        <Button variant="outline" className="mt-4" onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-5 bg-gray-50 border-t rounded-b-xl">
      {/* Visual Counters for the 3 Piles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${pendingCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>{pendingCount}</span>
            <span className={`text-[10px] uppercase font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Pending</span>
          </div>
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${receivedCount > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${receivedCount > 0 ? 'text-green-700' : 'text-gray-500'}`}>{receivedCount}</span>
            <span className={`text-[10px] uppercase font-bold ${receivedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>Received</span>
          </div>
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${rejectedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${rejectedCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>{rejectedCount}</span>
            <span className={`text-[10px] uppercase font-bold ${rejectedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>Rejected</span>
          </div>
        </div>

        {pendingCount > 0 && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full sm:w-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            onClick={handleReceiveAllPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Receive All Pending
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 md:pr-2 pb-2">
        {activeItems.map((item: any) => {
          const entryId = String(item.stockEntryId || item.id);
          const decision = decisions[entryId];
          const isReceived = decision?.status === "receive";
          const isRejected = decision?.status === "reject";

          return (
            <div
              key={entryId}
              className={`flex flex-col gap-3 p-3 sm:p-4 border rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden ${
                isRejected 
                  ? "border-red-400 bg-red-50/40 ring-2 ring-red-200" 
                  : isReceived 
                    ? "border-green-400 bg-green-50/40 ring-2 ring-green-200" 
                    : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {/* Visual Status Stamp inside Card */}
              {isReceived && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Received
                </div>
              )}
              {isRejected && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Rejected
                </div>
              )}

              {/* Responsive Item Details Grid */}
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 rounded-lg border ${
                isReceived ? 'bg-white/60 border-green-100' : isRejected ? 'bg-white/60 border-red-100' : 'bg-gray-50/50 border-gray-100'
              }`}>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Item Tag</span>
                  <span className="font-semibold text-gray-900 leading-tight block">{item.itemName || "Unknown"}</span>
                  <span className="text-xs text-gray-500 font-mono mt-0.5 block">{item.tagNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Category</span>
                  <span className="font-medium text-gray-800 block text-sm">{item.category}</span>
                  <span className="text-xs text-gray-500 block mt-0.5">{item.metal}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Weights</span>
                  <span className="font-medium text-blue-700 block text-sm">Net: {Number(item.netWeight || 0).toFixed(3)}g</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Gr: {Number(item.grossWeight || 0).toFixed(3)}g</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Qty</span>
                  <span className="inline-flex items-center justify-center bg-gray-200 text-gray-800 text-xs font-bold px-2 py-0.5 rounded-full">{item.quantity || 1}</span>
                </div>
              </div>

              {/* Action Buttons & Reason Input */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
                <span className="text-xs font-semibold text-gray-500 uppercase hidden md:block">Action</span>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isReceived ? "default" : "outline"}
                      className={`flex-1 sm:w-[120px] h-9 transition-colors ${
                        isReceived 
                          ? "bg-green-600 hover:bg-green-700 shadow-md ring-2 ring-green-600 ring-offset-1 text-white" 
                          : "text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                      }`}
                      onClick={() => handleDecision(entryId, "receive")}
                    >
                      <PackageCheck className={`w-4 h-4 mr-1.5 ${isReceived ? 'text-white' : 'text-green-600'}`} />
                      {isReceived ? "Received" : "Receive"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={isRejected ? "destructive" : "outline"}
                      className={`flex-1 sm:w-[120px] h-9 transition-colors ${
                        isRejected 
                          ? "bg-red-600 hover:bg-red-700 shadow-md ring-2 ring-red-600 ring-offset-1 text-white" 
                          : "text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      }`}
                      onClick={() => handleDecision(entryId, "reject")}
                    >
                      <ThumbsDown className={`w-4 h-4 mr-1.5 ${isRejected ? 'text-white' : 'text-red-600'}`} />
                      {isRejected ? "Rejected" : "Reject"}
                    </Button>
                  </div>

                  {/* Conditional Rejection Input */}
                  {isRejected && (
                    <div className="mt-1 animate-in fade-in slide-in-from-top-2 w-full">
                      <Label className="text-xs text-red-700 mb-1.5 flex items-center gap-1 font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Rejection Reason Required
                      </Label>
                      <Input
                        placeholder="E.g., Item missing, damaged in transit..."
                        className="border-red-300 focus-visible:ring-red-500 bg-white w-full h-10 shadow-inner"
                        value={decision.reason}
                        onChange={(e) => handleReason(entryId, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Footer */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t mt-4">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancel Review
        </Button>
        <Button
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
          onClick={handleSubmit}
          disabled={partialReceiveMutation.isPending}
        >
          {partialReceiveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 mr-2" />
              Submit Receive Actions
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export const StockTransferReceivePage = () => {
  const { selectedShop, user, permissions } = useAuth();
  
  const actionPermissions = permissions?.find(
    (item: any) => item?.Module === 'Stock Transfer' || item?.Module === 'StockMovement'
  );
  
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  const hasRead = actionPermissions?.Read || isAdmin;
  const hasUpdate = actionPermissions?.Update || isAdmin;
  const hasDelete = actionPermissions?.Delete || isAdmin;

  const destinationShopId = selectedShop?.id ?? null;

  // View & Pagination
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Multi-Select & Instant Hide (Processing State)
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [processedTransferIds, setProcessedTransferIds] = useState<Set<number>>(
    new Set()
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);

  // Receive Single Dialog
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [receiveConfirmId, setReceiveConfirmId] = useState<number | null>(null);

  // Partial Receive States
  const [expandedGridId, setExpandedGridId] = useState<number | null>(null);
  const [reviewTransfer, setReviewTransfer] = useState<any>(null);

  // Bulk State
  const [isBulkReceiving, setIsBulkReceiving] = useState(false);

  // Receive by barcode Popup Dialog
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [barcodeTransferId, setBarcodeTransferId] = useState<number | string>("");

  // Data Fetching
  const { data: transfers = [], isLoading, isFetching } = usePendingStockTransfers(destinationShopId);

  const cancelMutation = useCancelStockTransfer();
  const receiveMutation = useReceiveStockTransfer();
  const receiveByBarcodeMutation = useReceiveStockTransferByBarcode();

  // --- Filter Logic & Remove Rejected + Received Items globally ---
  const filteredTransfers = useMemo(() => {
    let result = (transfers ?? []).filter(
      (t: any) => !processedTransferIds.has(t.id)
    );

    // Filter out rejected and already received items early
    // so table, grid, panels, counts, and barcode dropdown all ignore them
    result = result
      .map((t: any) => ({
        ...t,
        transferItems: (t.transferItems || []).filter(
          (item: any) => !item.isRejected && !item.isReceived
        ),
      }))
      .filter((t: any) => (t.transferItems || []).length > 0);

    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      result = result.filter(
        (t: any) =>
          String(t.transferNumber || "").toLowerCase().includes(search) ||
          String(t.challanNumber || "").toLowerCase().includes(search) ||
          String(t.sourceShop?.name || "").toLowerCase().includes(search) ||
          String(t.porter?.name || "").toLowerCase().includes(search)
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t: any) => new Date(t.transferDate) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t: any) => new Date(t.transferDate) <= to);
    }

    return result;
  }, [transfers, searchTerm, fromDate, toDate, processedTransferIds]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const paginatedTransfers = useMemo(() => {
    return filteredTransfers.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredTransfers, page, pageSize]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Handlers
  const allSelected =
    paginatedTransfers.length > 0 &&
    paginatedTransfers.every((item: any) =>
      selectedItems.some((selected) => selected.id === item.id)
    );

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(
        selectedItems.filter(
          (selected) =>
            !paginatedTransfers.some((item: any) => item.id === selected.id)
        )
      );
    } else {
      const newSelected = [...selectedItems];
      paginatedTransfers.forEach((item: any) => {
        if (!newSelected.some((s) => s.id === item.id)) {
          newSelected.push(item);
        }
      });
      setSelectedItems(newSelected);
    }
  };

  const toggleItem = (item: any) => {
    if (!hasUpdate) return;
    const isSelected = selectedItems.some((selected) => selected.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter((selected) => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setSelectedItems([]);
  };

  const handleConfirmCancel = () => {
    if (!cancelId) return;
    cancelMutation.mutate(cancelId, {
      onSuccess: () => {
        toast.success("Stock transfer cancelled successfully.");
        setCancelOpen(false);
        setProcessedTransferIds((prev) => new Set(prev).add(cancelId));
        setCancelId(null);
        setSelectedItems(selectedItems.filter((i) => i.id !== cancelId));
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || "Failed to cancel stock transfer"
        );
        setCancelOpen(false);
      },
    });
  };

  const executeReceiveSingle = () => {
    if (!receiveConfirmId) return;
    receiveMutation.mutate(receiveConfirmId, {
      onSuccess: () => {
        toast.success("Stock transfer fully received!");
        setProcessedTransferIds((prev) => new Set(prev).add(receiveConfirmId));
        setSelectedItems(selectedItems.filter((i) => i.id !== receiveConfirmId));
        setReceiveConfirmOpen(false);
        setReceiveConfirmId(null);
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message || "Failed to receive stock transfer"
        );
        setReceiveConfirmOpen(false);
        setReceiveConfirmId(null);
      },
    });
  };

  const handleBulkReceive = async () => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;

    setIsBulkReceiving(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      await new Promise<void>((resolve) => {
        receiveMutation.mutate(id, {
          onSuccess: () => {
            successCount++;
            setProcessedTransferIds((prev) => new Set(prev).add(id));
            resolve();
          },
          onError: () => {
            failCount++;
            resolve();
          },
        });
      });
    }

    setIsBulkReceiving(false);
    setSelectedItems([]);

    if (successCount > 0) toast.success(`Received ${successCount} transfers successfully.`);
    if (failCount > 0) toast.error(`Failed to receive ${failCount} transfers.`);
  };

  const handleReceiveByBarcode = () => {
    if (!barcodeTransferId) {
      toast.error("Please select a transfer first to assign the barcode to.");
      return;
    }
    if (!barcode.trim()) {
      toast.error("Please enter a valid barcode.");
      return;
    }

    receiveByBarcodeMutation.mutate(
      {
        id: Number(barcodeTransferId),
        payload: { barcode: barcode.trim() },
      },
      {
        onSuccess: (res: any) => {
          toast.success(
            res?.message || "Stock transfer item received via barcode successfully."
          );
          setBarcode("");
          // Note: Keeping barcodeOpen true so they can scan multiple items easily
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message ||
              "Failed to receive stock transfer by barcode."
          );
        },
      }
    );
  };

  const columns = [
    ...(hasUpdate ? [{
      key: "select",
      label: "Select",
      render: (r: any) => (
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleItem(r);
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedItems.some((item) => item.id === r.id)
                ? "bg-green-500 border-green-500 shadow-md"
                : "bg-white border-gray-300 hover:border-green-400"
            }`}
          >
            {selectedItems.some((item) => item.id === r.id) && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </button>
        </div>
      ),
    }] : []),
    {
      key: "transferNumber",
      label: "Transfer",
      render: (r: any) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-gray-900">{r.transferNumber}</div>
          <div className="text-xs text-gray-500 mt-0.5">Challan: {r.challanNumber}</div>
        </div>
      ),
    },
    {
      key: "shops",
      label: "Route",
      render: (r: any) => (
        <div className="min-w-[200px]">
          <div className="text-sm text-gray-800">
            <span className="font-medium">{r.sourceShop?.name}</span>
            {" → "}
            <span className="font-medium">{r.destinationShop?.name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Porter: {r.porter?.name}</div>
        </div>
      ),
    },
    {
      key: "itemCount",
      label: "Total Wt",
      render: (r: any) => {
        const grossWeight = r.transferItems?.reduce(
          (sum: number, i: any) => sum + Number(i.grossWeight || 0),
          0
        );
        return (
          <div>
            <div className="font-medium text-gray-900">{grossWeight.toFixed(3)}g</div>
            <div className="text-xs text-gray-500">{r.transferItems?.length || 0} Items</div>
          </div>
        );
      },
    },
    {
      key: "transferDate",
      label: "Date",
      render: (r: any) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {r.transferDate ? format(new Date(r.transferDate), "dd MMM yy") : "—"}
        </span>
      ),
    },
    ...(hasUpdate || hasDelete ? [{
      key: "actions",
      label: "Actions",
      render: (r: any) => {
        const disabled = cancelMutation.isPending || receiveMutation.isPending;
        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {hasUpdate && (
              <>
                <Button
                  size="sm"
                  className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setReceiveConfirmId(r.id);
                    setReceiveConfirmOpen(true);
                  }}
                  disabled={disabled || r.transferItems?.length === 0}
                >
                  <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                  Receive All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                  onClick={() => setReviewTransfer(r)}
                  disabled={disabled || r.transferItems?.length === 0}
                >
                  <ListChecks className="w-3.5 h-3.5 mr-1.5" />
                  Review Items
                </Button>
              </>
            )}
            {hasDelete && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setCancelId(r.id);
                  setCancelOpen(true);
                }}
                disabled={disabled}
                title="Cancel Transfer"
              >
                <Ban className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        );
      },
    }] : []),
  ];

  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view stock transfer receipts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-6 bg-gray-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg hidden sm:block">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-[#b08d28]" />
          </div>
          Receive Stock Transfers
        </h1>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          {/* BARCODE SCANNER BUTTON */}
          {hasUpdate && (
            <Button
              onClick={() => setBarcodeOpen(true)}
              className="h-10 sm:h-9 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              <Barcode className="w-4 h-4 mr-2" />
              Receive via Barcode
            </Button>
          )}

          {/* VIEW MODE TOGGLE */}
          <div className="flex border rounded-md overflow-hidden bg-white w-full sm:w-auto">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("table");
                setPage(1);
              }}
              className={`rounded-none h-10 sm:h-9 flex-1 sm:flex-none ${viewMode === 'table' ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-inner' : ''}`}
            >
              <TableIcon className="w-4 h-4 mr-2" /> Table
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("grid");
                setPage(1);
              }}
              className={`rounded-none h-10 sm:h-9 flex-1 sm:flex-none ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-inner' : ''}`}
            >
              <Grid3x3 className="w-4 h-4 mr-2" /> Grid
            </Button>
          </div>

          {hasUpdate && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                className="h-10 sm:h-9 w-full sm:w-auto"
                disabled={paginatedTransfers.length === 0}
              >
                {allSelected ? (
                  <>
                    <Square className="w-4 h-4 mr-2 text-gray-500" />
                    Deselect
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2 text-green-600" />
                    Select All
                  </>
                )}
              </Button>

              <Button
                size="sm"
                className="h-10 sm:h-9 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white col-span-2 sm:col-span-1"
                onClick={handleBulkReceive}
                disabled={selectedItems.length === 0 || isBulkReceiving}
              >
                {isBulkReceiving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Receiving...
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4 mr-2" />
                    Receive Selected
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* DYNAMIC FILTERS AREA */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm space-y-4">
        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="w-full">
            <Label className="text-xs font-semibold mb-1.5 block text-gray-600">
              Search Transfers
            </Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search transfer no, shop..."
                className="pl-9 h-10 bg-gray-50 w-full"
              />
            </div>
          </div>
          <div className="w-full">
            <Label className="text-xs font-semibold mb-1.5 block text-gray-600">
              From Date
            </Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-10 bg-gray-50 w-full"
              max={toDate || undefined}
            />
          </div>
          <div className="w-full">
            <Label className="text-xs font-semibold mb-1.5 block text-gray-600">
              To Date
            </Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-10 bg-gray-50 w-full"
              min={fromDate || undefined}
            />
          </div>
          <div className="w-full">
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="h-10 w-full bg-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === "table" ? (
        <div className="bg-white border rounded-xl p-0 overflow-x-auto shadow-sm">
          <div className="min-w-[800px]">
            <CommonTable
              columns={columns}
              data={paginatedTransfers}
              loading={isLoading || isFetching}
              actions={[]}
              emptyMessage="No pending stock transfers for this shop match your filters."
              pagination={{
                page,
                pageSize,
                total: filteredTransfers.length,
                totalPages,
                onPageChange: setPage,
                onPageSizeChange: (s) => {
                  setPageSize(s);
                  setPage(1);
                },
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6">
            {isLoading || isFetching ? (
              <div className="col-span-full flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              </div>
            ) : paginatedTransfers.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-gray-500 bg-white border border-dashed rounded-xl">
                <Box className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-lg">No transfers ready to receive</p>
                <p className="text-sm">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              paginatedTransfers.map((transfer: any) => {
                const isSelected = selectedItems.some((s) => s.id === transfer.id);
                const isExpanded = expandedGridId === transfer.id;
                const disabled = cancelMutation.isPending || receiveMutation.isPending;

                const grossWeightTotal = transfer.transferItems?.reduce(
                  (sum: number, i: any) => sum + Number(i.grossWeight || 0),
                  0
                ) || 0;

                return (
                  <div
                    key={transfer.id}
                    className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                      isSelected
                        ? "border-green-500 shadow-md ring-2 ring-green-500/20 bg-green-50/10"
                        : "border-gray-200 hover:shadow-lg hover:border-gray-300"
                    }`}
                  >
                    {/* CARD HEADER & SUMMARY */}
                    <div
                      className="p-4 sm:p-5 relative cursor-pointer group"
                      onClick={() => toggleItem(transfer)}
                    >
                      {hasUpdate && (
                        <div
                          className={`absolute top-4 right-4 sm:top-5 sm:right-5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300 bg-white group-hover:border-green-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                          )}
                        </div>
                      )}

                      <div className="pr-10 sm:pr-12 space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs uppercase font-bold text-green-600 tracking-wider mb-1">
                            Incoming Transfer
                          </span>
                          <span className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight break-all">
                            {transfer.transferNumber}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5 break-all">
                            CH: {transfer.challanNumber}
                          </span>
                        </div>

                        {/* Responsive Route Block */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex-1 w-full">
                            <div className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Source</div>
                            <div className="font-medium text-sm text-gray-900 leading-snug">
                              {transfer.sourceShop?.name}
                            </div>
                          </div>
                          <div className="text-gray-400 hidden sm:block">→</div>
                          <div className="text-gray-400 sm:hidden pl-1">↓</div>
                          <div className="flex-1 w-full">
                            <div className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Destination</div>
                            <div className="font-medium text-sm text-gray-900 leading-snug">
                              {transfer.destinationShop?.name}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-1">
                          <div>
                            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Total Net Wt</div>
                            <div className="font-bold text-base sm:text-lg text-gray-800">
                              {grossWeightTotal.toFixed(3)}g
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Total Items</div>
                            <div className="font-bold text-base sm:text-lg text-gray-800">
                              {transfer.transferItems?.length || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD ACTIONS - Responsive Wrapping */}
                    {(hasUpdate || hasDelete) && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
                        {hasUpdate && (
                          <>
                            <div onClick={(e) => e.stopPropagation()} className="w-full sm:flex-1">
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm h-10"
                                onClick={() => {
                                  setReceiveConfirmId(transfer.id);
                                  setReceiveConfirmOpen(true);
                                }}
                                disabled={disabled || transfer.transferItems?.length === 0}
                              >
                                <PackageCheck className="w-4 h-4 mr-2" />
                                Receive Entire Transfer
                              </Button>
                            </div>

                            <div className="flex w-full sm:w-auto gap-2 sm:flex-1">
                              <Button
                                variant="outline"
                                className={`flex-1 h-10 text-blue-700 border-blue-200 hover:bg-blue-50 ${
                                  isExpanded ? "bg-blue-50/30" : ""
                                }`}
                                onClick={() => setExpandedGridId(isExpanded ? null : transfer.id)}
                                disabled={transfer.transferItems?.length === 0}
                              >
                                <ListChecks className="w-4 h-4 mr-1 sm:mr-2" />
                                <span className="truncate">
                                  {isExpanded ? "Close Review" : "Review Items"}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 ml-1" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 ml-1" />
                                )}
                              </Button>
                              {hasDelete && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="w-10 h-10 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setCancelId(transfer.id);
                                    setCancelOpen(true);
                                  }}
                                  disabled={disabled}
                                  title="Cancel Transfer"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                        {!hasUpdate && hasDelete && (
                          <div className="flex justify-end w-full">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-10 h-10 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setCancelId(transfer.id);
                                setCancelOpen(true);
                              }}
                              disabled={disabled}
                              title="Cancel Transfer"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* INLINE GRID ACCORDION */}
                    {isExpanded && hasUpdate && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="animate-in slide-in-from-top-4 fade-in duration-200"
                      >
                        <PartialReceivePanel
                          transfer={transfer}
                          onComplete={(id) => {
                            setExpandedGridId(null);
                            setProcessedTransferIds((prev) => new Set(prev).add(id));
                          }}
                          onCancel={() => setExpandedGridId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Grid Pagination - Mobile Friendly */}
          {filteredTransfers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-5 bg-white border rounded-xl shadow-sm mt-6">
              <span className="text-xs sm:text-sm font-medium text-gray-600 text-center sm:text-left">
                Showing {Math.min((page - 1) * pageSize + 1, filteredTransfers.length)} to{" "}
                {Math.min(page * pageSize, filteredTransfers.length)} of {filteredTransfers.length} entries
              </span>
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <div className="text-xs sm:text-sm font-bold bg-gray-100 px-3 py-2 rounded-md text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE MODE DIALOG (PARTIAL RECEIVE) */}
      <Dialog open={!!reviewTransfer} onOpenChange={(open) => !open && setReviewTransfer(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-gray-50 border-0 max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 bg-white border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2 break-all">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
                <span>Review Incoming:</span>
                <span className="font-mono text-gray-600 text-base sm:text-xl">
                  {reviewTransfer?.transferNumber}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs sm:text-sm text-gray-600 mt-2">
              Carefully accept or reject individual items from this transfer upon physical inspection. Rejected items will be returned to the source shop.
            </div>
          </div>
          <div className="overflow-y-auto">
            {reviewTransfer && (
              <PartialReceivePanel
                transfer={reviewTransfer}
                onComplete={(id) => {
                  setReviewTransfer(null);
                  setProcessedTransferIds((prev) => new Set(prev).add(id));
                }}
                onCancel={() => setReviewTransfer(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM RECEIVE SINGLE DIALOG */}
      <Dialog open={receiveConfirmOpen} onOpenChange={setReceiveConfirmOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Receive Transfer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700">
            Are you sure you want to receive all items in this transfer? 
            This indicates that you have physically verified all items are correct and present.
          </p>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setReceiveConfirmOpen(false);
                setReceiveConfirmId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              onClick={executeReceiveSingle}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                </>
              ) : (
                <PackageCheck className="w-4 h-4 mr-2" />
              )}
              Confirm Receive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL DIALOG */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Stock Transfer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700">
            Are you sure you want to cancel this stock transfer? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setCancelOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                </>
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BARCODE RECEIVE DIALOG */}
      <Dialog open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-800">
              <Barcode className="w-5 h-5" />
              Scan Barcode to Receive
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Select Incoming Transfer</Label>
              <select
                value={barcodeTransferId}
                onChange={(e) => setBarcodeTransferId(e.target.value)}
                className="w-full h-10 rounded-md border border-blue-300 px-3 bg-blue-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
              >
                <option value="">-- Select Incoming Transfer --</option>
                {filteredTransfers.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.transferNumber} {t.challanNumber ? `(CH: ${t.challanNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Enter or Scan Barcode</Label>
              <div className="relative">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter or scan barcode here..."
                  className="pl-9 h-10 w-full border-blue-300 focus-visible:ring-blue-500 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleReceiveByBarcode();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setBarcodeOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleReceiveByBarcode}
              disabled={receiveByBarcodeMutation.isPending}
            >
              {receiveByBarcodeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Receive Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};