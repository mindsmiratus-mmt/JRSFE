import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useMemo, useState, useEffect } from "react";
import {
  Loader2,
  FileText,
  Search,
  CheckSquare,
  Square,
  Grid3x3,
  Table as TableIcon,
  RotateCcw,
  XCircle,
  CheckCircle2,
  ThumbsDown,
  ListChecks,
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

// --- INTERFACES ---
export interface Shop {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  gstNo?: string;
  shopNumber?: string;
  shopCode?: string;
  isActive?: boolean;
}

export interface Porter {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  identityProof?: string;
  identityNumber?: string;
  isActive?: boolean;
  remarks?: string;
}

export interface Vendor {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  adharNo?: string;
  address?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  vendorType?: string;
  isActive?: boolean;
}

export interface StockEntry {
  id: string;
  itemId?: number;
  tagNumber?: string;
  huid?: string;
  metal?: string;
  category?: string;
  itemName?: string;
  modeOfStock?: string;
  caratOrKT?: string;
  purityPercent?: string;
  stoneName?: string;
  dPurityId?: string;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  quantity?: number;
  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;
  pureWeight?: number;
  remarks?: string;
  stockEntryType?: string;
  purchaseMakingCharge?: number;
  purchaseMakingChargeType?: string;
  pricingModel?: string;
  salePrice?: number;
  stonePrice?: number;
  hsnCode?: string;
  purchaseGoldRate?: number;
  purchaseDiamondRate?: number;
  purchaseStonePrice?: number;
  brand?: string;
  showOnWebsite?: boolean;
  shopId?: number;
  shop?: Shop;
  vendorId?: number;
  vendor?: Vendor;
}

export interface StockEntryPagedRequest {
  page: number;
  pageSize: number;
  keyword?: string;
  shopId?: number;
}

export interface StockEntryPagedResponse {
  data: StockEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface StockTransferItem {
  id: number;
  stockTransferId: number;
  stockTransfer?: string;
  stockEntryId: string;
  stockEntry?: StockEntry;
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
}

export interface StockTransfer {
  id: number;
  transferNumber?: string;
  challanNumber?: string;
  sourceShopId: number;
  sourceShop?: Shop;
  destinationShopId: number;
  destinationShop?: Shop;
  porterId?: number;
  porter?: Porter;
  status?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvalDate?: string;
  rejectionReason?: string;
  transferDate?: string;
  receivedDate?: string;
  remarks?: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  transferItems?: StockTransferItem[];
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
}

export interface StockTransferPagedRequest {
  page: number;
  pageSize: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  shopId?: number;
  invoiceNumber?: string;
  customerName?: string;
}

export interface StockTransferPagedResponse {
  data: StockTransfer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface InitiateStockTransferItem {
  stockEntryId: string;
  quantity?: number;
  grossWeight?: number;
}

export interface InitiateStockTransferPayload {
  sourceShopId: number;
  destinationShopId: number;
  porterId?: number;
  remarks?: string;
  stockEntryIds: string[];
  items?: InitiateStockTransferItem[];
}

export interface RejectStockTransferPayload {
  rejectionReason: string;
}

export interface ReceiveByBarcodePayload {
  barcode: string;
}

export interface RejectedTransferItemPayload {
  stockEntryId: string;
  rejectionReason: string;
}

export interface PartialApproveStockTransferPayload {
  approvedStockEntryIds: string[];
  rejectedItems: RejectedTransferItemPayload[];
}

export interface PartialReceiveStockTransferPayload {
  receivedStockEntryIds: string[];
  rejectedItems: RejectedTransferItemPayload[];
}

// --- QUERY KEYS ---
const stockTransferKeys = {
  all: ["stock-transfers"] as const,
  lists: () => [...stockTransferKeys.all, "list"] as const,
  list: (params?: unknown) => [...stockTransferKeys.lists(), params] as const,
  details: () => [...stockTransferKeys.all, "detail"] as const,
  detail: (id: number | string) => [...stockTransferKeys.details(), id] as const,
  byNumber: (transferNumber: string) =>
    [...stockTransferKeys.all, "by-number", transferNumber] as const,
  byShop: (shopId: number) => [...stockTransferKeys.all, "by-shop", shopId] as const,
  pending: (destinationShopId: number) =>
    [...stockTransferKeys.all, "pending", destinationShopId] as const,
  pendingApprovals: () => [...stockTransferKeys.all, "pending-approvals"] as const,
  challan: (id: number) => [...stockTransferKeys.all, "challan", id] as const,
};

// --- HOOKS ---
export const useStockEntryPaged = (payload: StockEntryPagedRequest) => {
  return useQuery({
    queryKey: ["stock-entries", payload],
    queryFn: async () => {
      const res = await api.post("/StockEntry/paged", payload);
      return res.data as StockEntryPagedResponse;
    },
    enabled: !!payload,
  });
};

export const useStockTransfers = () => {
  return useQuery({
    queryKey: stockTransferKeys.lists(),
    queryFn: async () => {
      const res = await api.get("/StockTransfer");
      return res.data as StockTransfer[];
    },
  });
};

export const useStockTransfersPaged = (payload: StockTransferPagedRequest) => {
  return useQuery({
    queryKey: stockTransferKeys.list(payload),
    queryFn: async () => {
      const res = await api.post("/StockTransfer/paged", payload);
      return res.data as StockTransferPagedResponse;
    },
    enabled: !!payload,
  });
};

export const useStockTransfer = (id: number | null) => {
  return useQuery({
    queryKey: stockTransferKeys.detail(id ?? 0),
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/StockTransfer/${id}`);
      return res.data as StockTransfer;
    },
    enabled: !!id,
  });
};

export const useStockTransferByNumber = (transferNumber: string) => {
  return useQuery({
    queryKey: stockTransferKeys.byNumber(transferNumber),
    queryFn: async () => {
      const res = await api.get(
        `/StockTransfer/by-number/${encodeURIComponent(transferNumber)}`
      );
      return res.data as StockTransfer;
    },
    enabled: !!transferNumber,
  });
};

export const useStockTransfersByShop = (shopId: number | null) => {
  return useQuery({
    queryKey: stockTransferKeys.byShop(shopId ?? 0),
    queryFn: async () => {
      if (!shopId) return [];
      const res = await api.get(`/StockTransfer/by-shop/${shopId}`);
      return res.data as StockTransfer[];
    },
    enabled: !!shopId,
  });
};

export const usePendingStockTransfers = (destinationShopId: number | null) => {
  return useQuery({
    queryKey: stockTransferKeys.pending(destinationShopId ?? 0),
    queryFn: async () => {
      if (!destinationShopId) return [];
      const res = await api.get(`/StockTransfer/pending/${destinationShopId}`);
      return res.data as StockTransfer[];
    },
    enabled: !!destinationShopId,
  });
};

export const usePendingApprovalStockTransfers = () => {
  return useQuery({
    queryKey: stockTransferKeys.pendingApprovals(),
    queryFn: async () => {
      const res = await api.get("/StockTransfer/pending-approvals");
      return res.data as StockTransfer[];
    },
  });
};

export const useInitiateStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InitiateStockTransferPayload) => {
      const res = await api.post("/StockTransfer/initiate", payload);
      return res.data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockTransferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
    },
  });
};

export const useApproveStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/StockTransfer/${id}/approve`);
      return res.data;
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const useRejectStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: RejectStockTransferPayload;
    }) => {
      const res = await api.post(`/StockTransfer/${id}/reject`, payload);
      return res.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({
          queryKey: stockTransferKeys.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const usePartialApproveStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: PartialApproveStockTransferPayload;
    }) => {
      const res = await api.post(`/StockTransfer/${id}/partial-approve`, payload);
      return res.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({
          queryKey: stockTransferKeys.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const useReceiveStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/StockTransfer/${id}/receive`);
      return res.data;
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const usePartialReceiveStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: PartialReceiveStockTransferPayload;
    }) => {
      const res = await api.post(`/StockTransfer/${id}/partial-receive`, payload);
      return res.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({
          queryKey: stockTransferKeys.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const useReceiveStockTransferByBarcode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: ReceiveByBarcodePayload;
    }) => {
      const res = await api.post(
        `/StockTransfer/${id}/receive-by-barcode`,
        payload
      );
      return res.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({
          queryKey: stockTransferKeys.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const useCancelStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/StockTransfer/${id}/cancel`);
      return res.data;
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.all }),
        queryClient.invalidateQueries({ queryKey: stockTransferKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      ]);
    },
  });
};

export const useStockTransferChallan = (id: number | null) => {
  return useQuery({
    queryKey: stockTransferKeys.challan(id ?? 0),
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/StockTransfer/${id}/challan`, {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      });
      return res.data as Blob;
    },
    enabled: !!id,
  });
};

// --- HELPER TO DOWNLOAD/OPEN CHALLAN PDF ---
const handleDownloadChallan = async (transferId: number) => {
  try {
    const res = await api.get(`/StockTransfer/${transferId}/challan`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });
    
    const fileURL = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const newWindow = window.open(fileURL, "_blank");
    
    if (!newWindow) {
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `Challan_${transferId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    toast.error("Failed to load Challan PDF");
  }
};

// --- RESPONSIVE PARTIAL APPROVAL PANEL ---
const PartialApprovalPanel = ({
  transfer,
  onComplete,
  onPromptChallan,
  onCancel,
}: {
  transfer: any;
  onComplete: (transferId: number) => void;
  onPromptChallan: (transferId: number) => void;
  onCancel: () => void;
}) => {
  const partialApproveMutation = usePartialApproveStockTransfer();
  
  const [decisions, setDecisions] = useState<
    Record<string, { status: "pending" | "approve" | "reject"; reason: string }>
  >({});

  useEffect(() => {
    if (!transfer) return;
    const initial: Record<string, { status: "pending" | "approve" | "reject"; reason: string }> = {};
    transfer.transferItems?.forEach((item: any) => {
      const entryId = String(item.stockEntryId || item.id);
      initial[entryId] = { status: "pending", reason: "" }; 
    });
    setDecisions(initial);
  }, [transfer]);

  const handleDecision = (id: string, status: "approve" | "reject") => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], status, reason: status === "approve" ? "" : prev[id].reason },
    }));
  };

  const handleReason = (id: string, reason: string) => {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], reason } }));
  };

  const handleApproveAllPending = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].status === "pending") {
          next[id] = { ...next[id], status: "approve", reason: "" };
        }
      });
      return next;
    });
  };

  const handleSubmit = () => {
    const approvedStockEntryIds: string[] = [];
    const rejectedItems: { stockEntryId: string; rejectionReason: string }[] = [];

    const pendingItems = Object.values(decisions).filter(d => d.status === "pending");
    if (pendingItems.length > 0) {
      toast.error(`Please make a decision for all items. ${pendingItems.length} item(s) still pending.`);
      return;
    }

    for (const [entryId, decision] of Object.entries(decisions)) {
      if (decision.status === "approve") {
        approvedStockEntryIds.push(entryId);
      } else {
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

    partialApproveMutation.mutate(
      { id: transfer.id, payload: { approvedStockEntryIds, rejectedItems } },
      {
        onSuccess: () => {
          toast.success("Transfer items reviewed and processed successfully.");
          onPromptChallan(transfer.id); // Ask for challan
          onComplete(transfer.id);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to process partial approval");
        },
      }
    );
  };

  const itemsList = Object.values(decisions);
  const approvedCount = itemsList.filter(d => d.status === "approve").length;
  const rejectedCount = itemsList.filter(d => d.status === "reject").length;
  const pendingCount = itemsList.filter(d => d.status === "pending").length;

  return (
    <div className="space-y-4 p-3 sm:p-5 bg-gray-50 border-t rounded-b-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${pendingCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>{pendingCount}</span>
            <span className={`text-[10px] uppercase font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Pending</span>
          </div>
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${approvedCount > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${approvedCount > 0 ? 'text-green-700' : 'text-gray-500'}`}>{approvedCount}</span>
            <span className={`text-[10px] uppercase font-bold ${approvedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>Approved</span>
          </div>
          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border min-w-[70px] ${rejectedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-lg font-bold ${rejectedCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>{rejectedCount}</span>
            <span className={`text-[10px] uppercase font-bold ${rejectedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>Rejected</span>
          </div>
        </div>
        
        {pendingCount > 0 && (
          <Button size="sm" variant="outline" className="w-full sm:w-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={handleApproveAllPending}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All Pending
          </Button>
        )}
      </div>
      
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 md:pr-2 pb-2">
        {transfer.transferItems?.map((item: any) => {
          const entryId = String(item.stockEntryId || item.id);
          const decision = decisions[entryId];
          const isApproved = decision?.status === "approve";
          const isRejected = decision?.status === "reject";

          return (
            <div
              key={entryId}
              className={`flex flex-col gap-3 p-3 sm:p-4 border rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden ${
                isRejected ? "border-red-400 bg-red-50/40 ring-2 ring-red-200" 
                : isApproved ? "border-green-400 bg-green-50/40 ring-2 ring-green-200" 
                : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {isApproved && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Approved
                </div>
              )}
              {isRejected && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Rejected
                </div>
              )}
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 rounded-lg border ${isApproved ? 'bg-white/60 border-green-100' : isRejected ? 'bg-white/60 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Item & Tag</span>
                  <span className="font-semibold text-gray-900 leading-tight block">{item.itemName || "Unknown"}</span>
                  <span className="text-xs text-gray-500 font-mono mt-0.5 block">{item.tagNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Category</span>
                  <span className="font-medium text-gray-800 block text-sm">{item.category || "—"}</span>
                  <span className="text-xs text-gray-500 block mt-0.5">{item.metal || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Weights</span>
                  <span className="font-medium text-blue-700 block text-sm">Net: {Number(item.netWeight || 0).toFixed(3)}g</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Gr: {Number(item.grossWeight || 0).toFixed(3)}g</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Qty</span>
                  <span className="inline-flex items-center justify-center bg-gray-200 text-gray-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.quantity || 1}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
                <span className="text-xs font-semibold text-gray-500 uppercase hidden md:block">Action:</span>
                
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isApproved ? "default" : "outline"}
                      className={`flex-1 sm:w-[120px] h-9 transition-colors ${
                        isApproved 
                          ? "bg-green-600 hover:bg-green-700 shadow-md ring-2 ring-green-600 ring-offset-1 text-white" 
                          : "text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                      }`}
                      onClick={() => handleDecision(entryId, "approve")}
                    >
                      <CheckCircle2 className={`w-4 h-4 mr-1.5 ${isApproved ? "text-white" : "text-green-600"}`} /> 
                      {isApproved ? "Approved" : "Approve"}
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
                      <ThumbsDown className={`w-4 h-4 mr-1.5 ${isRejected ? "text-white" : "text-red-600"}`} /> 
                      {isRejected ? "Rejected" : "Reject"}
                    </Button>
                  </div>
                </div>
              </div>

              {isRejected && (
                <div className="mt-1 animate-in fade-in slide-in-from-top-2 w-full">
                  <Label className="text-xs text-red-700 mb-1.5 flex items-center gap-1 font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Rejection Reason Required *
                  </Label>
                  <Input
                    placeholder="E.g., Item damaged, incorrect weight..."
                    className="border-red-300 focus-visible:ring-red-500 bg-white w-full h-10 shadow-inner"
                    value={decision.reason}
                    onChange={(e) => handleReason(entryId, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t mt-4">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancel Review
        </Button>
        <Button
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
          onClick={handleSubmit}
          disabled={partialApproveMutation.isPending}
        >
          {partialApproveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckSquare className="w-4 h-4 mr-2" />
          )}
          Submit Actions
        </Button>
      </div>
    </div>
  );
};

export const StockTransferApproval = () => {
  const { user, permissions } = useAuth();
  const actionPermissions = permissions?.find(
    (item: any) => item?.Module === 'Stock Transfer' || item?.Module === 'StockMovement'
  );
  
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  const hasRead = actionPermissions?.Read || isAdmin;
  const hasUpdate = actionPermissions?.Update || isAdmin;

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [processedTransferIds, setProcessedTransferIds] = useState<Set<number>>(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectIds, setRejectIds] = useState<number[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  const [expandedGridId, setExpandedGridId] = useState<number | null>(null); 
  const [reviewTransfer, setReviewTransfer] = useState<any>(null); 

  // --- NEW CHALLAN DIALOG STATE ---
  const [challanPromptIds, setChallanPromptIds] = useState<number[]>([]);

  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  const { data: transfers = [], isLoading, isFetching } = usePendingApprovalStockTransfers();
  const cancelMutation = useCancelStockTransfer();
  const approveMutation = useApproveStockTransfer();
  const rejectMutation = useRejectStockTransfer();

  const filteredTransfers = useMemo(() => {
    let result = (transfers ?? []).filter((t: any) => !processedTransferIds.has(t.id));
    
    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      result = result.filter(
        (t: any) =>
          String(t.transferNumber || "").toLowerCase().includes(search) ||
          String(t.challanNumber || "").toLowerCase().includes(search) ||
          String(t.sourceShop?.name || "").toLowerCase().includes(search) ||
          String(t.destinationShop?.name || "").toLowerCase().includes(search) ||
          String(t.porter?.name || "").toLowerCase().includes(search)
      );
    }
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t: any) => t.transferDate && new Date(t.transferDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t: any) => t.transferDate && new Date(t.transferDate) <= to);
    }
    return result;
  }, [transfers, searchTerm, fromDate, toDate, processedTransferIds]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const paginatedTransfers = useMemo(
    () => filteredTransfers.slice((page - 1) * pageSize, page * pageSize),
    [filteredTransfers, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const allSelected = paginatedTransfers.length > 0 && paginatedTransfers.every((item: any) => selectedItems.some((selected) => selected.id === item.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(selectedItems.filter((selected) => !paginatedTransfers.some((item: any) => item.id === selected.id)));
    } else {
      const newSelected = [...selectedItems];
      paginatedTransfers.forEach((item: any) => {
        if (!newSelected.some((s) => s.id === item.id)) newSelected.push(item);
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
        setProcessedTransferIds(prev => new Set(prev).add(cancelId));
        setCancelId(null);
        setSelectedItems(selectedItems.filter((i) => i.id !== cancelId));
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || "Failed to cancel stock transfer");
        setCancelOpen(false);
      },
    });
  };

  const handleApproveAllItems = (id: number) => {
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Stock transfer fully approved.");
        setChallanPromptIds([id]); // Show challan popup
        setProcessedTransferIds(prev => new Set(prev).add(id));
        setSelectedItems(selectedItems.filter((i) => i.id !== id));
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || "Failed to approve stock transfer");
      },
    });
  };

  const handleBulkApprove = async () => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;
    setIsBulkApproving(true);
    let successCount = 0;
    let failCount = 0;
    const successfulIds: number[] = [];
    
    for (const id of ids) {
      await new Promise<void>((resolve) => {
        approveMutation.mutate(id, {
          onSuccess: () => { 
            successCount++; 
            setProcessedTransferIds(prev => new Set(prev).add(id));
            successfulIds.push(id);
            resolve(); 
          },
          onError: () => { failCount++; resolve(); },
        });
      });
    }
    setIsBulkApproving(false);
    setSelectedItems([]);
    if (successCount > 0) {
      toast.success(`Approved ${successCount} transfers successfully.`);
      setChallanPromptIds(successfulIds); // Show challan popup for all successful bulks
    }
    if (failCount > 0) toast.error(`Failed to approve ${failCount} transfers.`);
  };

  const handleOpenRejectSingle = (id: number) => {
    setRejectIds([id]);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleOpenRejectBulk = () => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;
    setRejectIds(ids);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (rejectIds.length === 0 || !rejectReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    setIsBulkRejecting(rejectIds.length > 1);
    let successCount = 0;
    let failCount = 0;
    for (const id of rejectIds) {
      await new Promise<void>((resolve) => {
        rejectMutation.mutate(
          { id, payload: { rejectionReason: rejectReason.trim() } },
          {
            onSuccess: () => { 
              successCount++; 
              setProcessedTransferIds(prev => new Set(prev).add(id));
              resolve(); 
            },
            onError: () => { failCount++; resolve(); },
          }
        );
      });
    }
    setIsBulkRejecting(false);
    setRejectOpen(false);
    setRejectIds([]);
    setRejectReason("");
    setSelectedItems(selectedItems.filter((i) => !rejectIds.includes(i.id)));
    if (successCount > 0) toast.success(`Rejected ${successCount} transfers successfully.`);
    if (failCount > 0) toast.error(`Failed to reject ${failCount} transfers.`);
  };

  const columns = [
    ...(hasUpdate ? [{
      key: "select",
      label: "Select",
      render: (r: any) => (
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); toggleItem(r); }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedItems.some((item) => item.id === r.id) ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300 hover:border-blue-400"
            }`}
          >
            {selectedItems.some((item) => item.id === r.id) && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
        </div>
      ),
    }] : []),
    {
      key: "transferNumber",
      label: "Transfer",
      render: (r: any) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-gray-900">{r.transferNumber || "—"}</div>
          <div className="text-xs text-gray-500 mt-0.5">Challan: {r.challanNumber || "—"}</div>
        </div>
      ),
    },
    {
      key: "shops",
      label: "Route",
      render: (r: any) => (
        <div className="min-w-[200px]">
          <div className="text-sm text-gray-800">
            <span className="font-medium">{r.sourceShop?.name || "—"}</span> →{" "}
            <span className="font-medium">{r.destinationShop?.name || "—"}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Porter: {r.porter?.name || "—"}</div>
        </div>
      ),
    },
    {
      key: "itemCount",
      label: "Total Wt",
      render: (r: any) => {
        const grossWeight = r.transferItems?.reduce((sum: number, i: any) => sum + Number(i.grossWeight || 0), 0) || 0;
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
    ...(hasUpdate ? [{
      key: "actions",
      label: "Actions",
      render: (r: any) => {
        const disabled = cancelMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveAllItems(r.id)} disabled={disabled}>
              Approve All
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap" onClick={() => setReviewTransfer(r)} disabled={disabled}>
              <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Review Items
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleOpenRejectSingle(r.id)} disabled={disabled} title="Reject Entire Transfer">
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
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
          <p className="mt-2 text-gray-600">You do not have permission to view stock transfer approvals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg hidden sm:block">
             <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-[#b08d28]" />
          </div>
          Stock Transfer Approval
        </h1>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          <div className="flex border rounded-md overflow-hidden bg-white w-full sm:w-auto">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" onClick={() => { setViewMode("table"); setPage(1); }} className="rounded-none h-10 sm:h-9 flex-1 sm:flex-none">
              <TableIcon className="w-4 h-4 mr-2" /> Table
            </Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => { setViewMode("grid"); setPage(1); }} className="rounded-none h-10 sm:h-9 flex-1 sm:flex-none">
              <Grid3x3 className="w-4 h-4 mr-2" /> Grid
            </Button>
          </div>

          {hasUpdate && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button onClick={handleSelectAll} variant="outline" className="h-10 sm:h-9 w-full sm:w-auto" disabled={paginatedTransfers.length === 0}>
                {allSelected ? <><Square className="w-4 h-4 mr-2 text-gray-500" /> Deselect</> : <><CheckSquare className="w-4 h-4 mr-2 text-blue-600" /> Select All</>}
              </Button>
              <Button size="sm" className="h-10 sm:h-9 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" onClick={handleBulkApprove} disabled={selectedItems.length === 0 || isBulkApproving}>
                {isBulkApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Approve
              </Button>
              <Button size="sm" variant="outline" className="h-10 sm:h-9 w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50 bg-white col-span-2" onClick={handleOpenRejectBulk} disabled={selectedItems.length === 0 || isBulkRejecting}>
                {isBulkRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />} Reject Selected
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="w-full">
          <Label className="text-xs font-semibold mb-1.5 block text-gray-600">Search Transfers</Label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Search transfer no, shop..." className="pl-9 h-10 bg-gray-50 w-full" />
          </div>
        </div>
        <div className="w-full">
          <Label className="text-xs font-semibold mb-1.5 block text-gray-600">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="h-10 bg-gray-50 w-full" max={toDate || undefined} />
        </div>
        <div className="w-full">
          <Label className="text-xs font-semibold mb-1.5 block text-gray-600">To Date</Label>
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="h-10 bg-gray-50 w-full" min={fromDate || undefined} />
        </div>
        <div className="w-full">
          <Button onClick={handleResetFilters} variant="outline" className="h-10 w-full bg-white">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="bg-white border rounded-xl p-0 overflow-x-auto shadow-sm">
          <div className="min-w-[800px]">
            <CommonTable
              columns={columns}
              data={paginatedTransfers}
              loading={isLoading || isFetching}
              actions={[]}
              emptyMessage="No pending stock transfers match your filters."
              pagination={{ page, pageSize, total: filteredTransfers.length, totalPages, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
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
                <p className="text-lg">No pending stock transfers</p>
                <p className="text-sm">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              paginatedTransfers.map((transfer: any) => {
                const isSelected = selectedItems.some((s) => s.id === transfer.id);
                const isExpanded = expandedGridId === transfer.id;
                const disabled = cancelMutation.isPending || approveMutation.isPending || rejectMutation.isPending;
                const grossWeightTotal = transfer.transferItems?.reduce((sum: number, i: any) => sum + Number(i.grossWeight || 0), 0) || 0;

                return (
                  <div
                    key={transfer.id}
                    className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                      isSelected ? "border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-blue-50/10" : "border-gray-200 hover:shadow-lg hover:border-gray-300"
                    }`}
                  >
                    <div className="p-4 sm:p-5 relative cursor-pointer group" onClick={() => toggleItem(transfer)}>
                      {hasUpdate && (
                        <div className={`absolute top-4 right-4 sm:top-5 sm:right-5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white group-hover:border-blue-300"
                          }`}>
                          {isSelected && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full" />}
                        </div>
                      )}
                      <div className="pr-10 sm:pr-12 space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs uppercase font-bold text-blue-600 tracking-wider mb-1">Transfer Request</span>
                          <span className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight break-all">{transfer.transferNumber || "—"}</span>
                          <span className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5 break-all">CH: {transfer.challanNumber || "—"}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                           <div className="flex-1 w-full">
                             <div className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Source</div>
                             <div className="font-medium text-sm text-gray-900 leading-snug">{transfer.sourceShop?.name}</div>
                           </div>
                           <div className="text-gray-400 hidden sm:block">→</div>
                           <div className="text-gray-400 sm:hidden pl-1">↓</div>
                           <div className="flex-1 w-full">
                             <div className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Destination</div>
                             <div className="font-medium text-sm text-gray-900 leading-snug">{transfer.destinationShop?.name}</div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-1">
                           <div>
                              <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Total Gross Wt</div>
                              <div className="font-bold text-base sm:text-lg text-gray-800">{grossWeightTotal.toFixed(3)}g</div>
                           </div>
                           <div className="text-right">
                              <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Total Items</div>
                              <div className="font-bold text-base sm:text-lg text-gray-800">{transfer.transferItems?.length || 0}</div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {hasUpdate && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center" onClick={(e) => e.stopPropagation()}>
                        <Button className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm h-10" onClick={() => handleApproveAllItems(transfer.id)} disabled={disabled}>
                           Approve Entire Transfer
                        </Button>
                        
                        <div className="flex w-full sm:w-auto gap-2 sm:flex-1">
                          <Button variant="outline" className="flex-1 h-10 text-blue-700 border-blue-200 hover:bg-blue-50 bg-blue-50/30" onClick={() => setExpandedGridId(isExpanded ? null : transfer.id)}>
                            <ListChecks className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="truncate">{isExpanded ? "Close Review" : "Review Items"}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                          </Button>
                          <Button size="icon" variant="outline" className="w-10 h-10 shrink-0 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleOpenRejectSingle(transfer.id)} disabled={disabled} title="Reject Entire Transfer">
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div onClick={(e) => e.stopPropagation()} className="animate-in slide-in-from-top-4 fade-in duration-200">
                        <PartialApprovalPanel 
                          transfer={transfer} 
                          onComplete={(id) => {
                            setExpandedGridId(null);
                            setProcessedTransferIds(prev => new Set(prev).add(id));
                          }} 
                          onPromptChallan={(id) => setChallanPromptIds([id])} // Prompt on partial approval success
                          onCancel={() => setExpandedGridId(null)} 
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {filteredTransfers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-5 bg-white border rounded-xl shadow-sm mt-6">
              <span className="text-xs sm:text-sm font-medium text-gray-600 text-center sm:text-left">
                Showing {Math.min((page - 1) * pageSize + 1, filteredTransfers.length)} to {Math.min(page * pageSize, filteredTransfers.length)} of {filteredTransfers.length} entries
              </span>
              <div className="flex items-center justify-center space-x-2">
                <Button variant="outline" className="h-9" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <div className="text-xs sm:text-sm font-bold bg-gray-100 px-3 py-2 rounded-md text-gray-700">Page {page} of {totalPages}</div>
                <Button variant="outline" className="h-9" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PARTIAL APPROVAL MODAL */}
      <Dialog open={!!reviewTransfer} onOpenChange={(open) => !open && setReviewTransfer(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-gray-50 border-0 max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 bg-white border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2 break-all">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
                <span>Review: <span className="font-mono text-gray-600 text-base sm:text-xl">{reviewTransfer?.transferNumber}</span></span>
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs sm:text-sm text-gray-600 mt-2">
               Carefully accept or reject individual items from this transfer. Rejected items will remain at the source shop and require a written reason.
            </div>
          </div>
          <div className="overflow-y-auto">
            {reviewTransfer && (
              <PartialApprovalPanel 
                 transfer={reviewTransfer} 
                 onComplete={(id) => {
                   setReviewTransfer(null);
                   setProcessedTransferIds(prev => new Set(prev).add(id));
                 }} 
                 onPromptChallan={(id) => setChallanPromptIds([id])} // Prompt on partial approval success
                 onCancel={() => setReviewTransfer(null)} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CHALLAN DOWNLOAD CONFIRMATION DIALOG */}
      <Dialog open={challanPromptIds.length > 0} onOpenChange={(open) => !open && setChallanPromptIds([])}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <FileText className="w-5 h-5" /> Download Challan
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 mb-2">
            The stock transfer{challanPromptIds.length > 1 ? 's' : ''} approved successfully. Would you like to download the Challan PDF{challanPromptIds.length > 1 ? 's' : ''}?
          </p>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setChallanPromptIds([])}>
              No, Thanks
            </Button>
            <Button 
              type="button" 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => {
                challanPromptIds.forEach(id => handleDownloadChallan(id));
                setChallanPromptIds([]); // Close dialog after downloading
              }}
            >
              Yes, Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
               <XCircle className="w-5 h-5" /> 
               {rejectIds.length > 1 ? `Reject ${rejectIds.length} Transfers` : "Reject Stock Transfer"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 mb-2">You are rejecting the entire transfer. Please provide a mandatory reason for this action.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30"
            placeholder="Enter rejection reason here..."
          />
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setRejectOpen(false); setRejectReason(""); setRejectIds([]); }}>Cancel</Button>
            <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={handleConfirmReject} disabled={rejectMutation.isPending || isBulkRejecting}>
              {(rejectMutation.isPending || isBulkRejecting) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* CANCEL DIALOG */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Cancel Stock Transfer</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700">Are you sure you want to cancel this stock transfer? This action cannot be undone.</p>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setCancelOpen(false)}>Close</Button>
            <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={handleConfirmCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};