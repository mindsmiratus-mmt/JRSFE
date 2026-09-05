import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

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
  sourceShopId?: number;
  destinationShopId?: number;
  status?: string;
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