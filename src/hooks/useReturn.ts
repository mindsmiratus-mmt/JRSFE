import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

const API_BASE = "/Return";

// =====================
// List / filter params
// =====================
export interface ReturnListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  shopId?: number;
  status?: string;
}

// =====================
// Repaired items filter params
// =====================
export interface RepairedItemsListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  metal?: string;
}

// =====================
// Return item payload
// =====================
export interface ReturnItemPayload {
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
  id?: number;
  returnId?: number;
  invoiceItemId?: number;
  itemId?: number;

  brand?: string;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;

  gPurityId?: string;
  purityPercent?: string | number;
  dPurityId?: string;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  stoneName?: string;
  hsnCode?: string;
  huid?: string;

  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;

  goldRate?: number;
  goldCost?: number;
  goldMakingChargeRaw?: number;
  goldMakingChargeType?: string | null;
  goldMakingChargeApplied?: number;
  goldDiscountRaw?: number;
  goldDiscountType?: string | null;
  discountOnMaking?: number;

  diamondRate?: number;
  diamondUnit?: string | null;
  diamondCost?: number;
  diamondMakingChargeRaw?: number;
  diamondMakingChargeType?: string | null;
  diamondDiscountRaw?: number;
  diamondDiscountType?: string | null;
  diamondDiscount?: number;

  stoneRate?: number;
  stoneCost?: number;
  stoneDiscountRaw?: number;
  stoneDiscountType?: string | null;
  stoneDiscount?: number;

  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalSalePriceBeforeTax?: number;
  igstPercent?: number;
  totalReturnPrice?: number;

  isItemRestorable?: boolean;
  status?: string;

  [key: string]: any;
}

// =====================
// Main Return payload
// =====================
export interface CreateReturnPayload {
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
  id?: number;
  returnNo?: string;
  returnDate?: string;
  invoiceId?: number;
  customerId?: number;
  shopId?: number;
  totalReturnAmount?: number;
  reason?: string;
  status?: string;

  items?: ReturnItemPayload[];

  customer?: any;
  shop?: any;
}

// =====================
// Repaired item payload
// =====================
export interface RepairedItem {
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;

  id?: number;
  returnId?: number;
  invoiceItemId?: number;
  itemId?: number;

  returnNo?: string;
  invoiceId?: number;
  returnDate?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  shopId?: number;
  shopName?: string;

  brand?: string;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;

  gPurityId?: string;
  purityPercent?: string | number;
  dPurityId?: string;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  stoneName?: string;
  hsnCode?: string;
  huid?: string;

  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;

  goldRate?: number;
  goldCost?: number;
  goldMakingChargeRaw?: number;
  goldMakingChargeType?: string | null;
  goldMakingChargeApplied?: number;
  goldDiscountRaw?: number;
  goldDiscountType?: string | null;
  discountOnMaking?: number;

  diamondRate?: number;
  diamondUnit?: string | null;
  diamondCost?: number;
  diamondMakingChargeRaw?: number;
  diamondMakingChargeType?: string | null;
  diamondDiscountRaw?: number;
  diamondDiscountType?: string | null;
  diamondDiscount?: number;

  stoneRate?: number;
  stoneCost?: number;
  stoneDiscountRaw?: number;
  stoneDiscountType?: string | null;
  stoneDiscount?: number;

  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalSalePriceBeforeTax?: number;
  igstPercent?: number;
  totalReturnPrice?: number;

  isItemRestorable?: boolean;
  status?: string;

  [key: string]: any;
}

// =====================
// Repaired items response
// =====================
export interface RepairedItemsResponse {
  data: RepairedItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

// =====================
// Hooks
// =====================

// ---- List returns (GET /Return) ----
export const useReturnList = (params: ReturnListParams) => {
  return useQuery({
    queryKey: ["returnList", params],
    queryFn: async () => {
      const { data } = await api.get(API_BASE, { params });
      return data;
    },
  });
};

// ---- Repaired items list (GET /Return/repaired-items) ----
export const useRepairedItemsList = (params: RepairedItemsListParams = {}) => {
  return useQuery<RepairedItemsResponse>({
    queryKey: ["returnRepairedItems", params],
    queryFn: async () => {
      const { data } = await api.get<RepairedItemsResponse>(
        `${API_BASE}/repaired-items`,
        { params }
      );
      return data;
    },
  });
};

// ---- Pending Approval list (GET /Return/pending-approval) ----
export const usePendingApprovalList = () => {
  return useQuery({
    queryKey: ["returnPendingApproval"],
    queryFn: async () => {
      const { data } = await api.get(`${API_BASE}/pending-approval`);
      return data;
    },
  });
};

// ---- Single return (GET /Return/{id}) ----
export const useReturn = (id: number | null) => {
  return useQuery({
    queryKey: ["return", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`${API_BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// ---- Get return by invoice ID (GET /Return/by-invoice/{invoiceId}) ----
export const useReturnByInvoice = (invoiceId: number | null) => {
  return useQuery({
    queryKey: ["returnByInvoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data } = await api.get(`${API_BASE}/by-invoice/${invoiceId}`);
      return data;
    },
    enabled: !!invoiceId,
  });
};

// ---- Create a new return (POST /Return) ----
export const useCreateReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReturnPayload) => {
      const { data } = await api.post(API_BASE, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["returnList"] });
      queryClient.invalidateQueries({ queryKey: ["returnPendingApproval"] });
      queryClient.invalidateQueries({ queryKey: ["returnRepairedItems"] });

      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["return", data.id] });
      }
    },
  });
};

// ---- Approve return (POST /Return/{id}/approve) ----
export const useApproveReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, itemIds }: { id: number; itemIds: number[] }) => {
      const { data } = await api.post(`${API_BASE}/${id}/approve`, itemIds);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["return", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["returnList"] });
      queryClient.invalidateQueries({ queryKey: ["returnPendingApproval"] });
      queryClient.invalidateQueries({ queryKey: ["returnRepairedItems"] });
    },
  });
};

// ---- Repair return (POST /Return/{id}/repair) ----
export const useRepairReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload?: any }) => {
      const { data } = await api.post(`${API_BASE}/${id}/repair`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["return", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["returnList"] });
      queryClient.invalidateQueries({ queryKey: ["returnRepairedItems"] });
    },
  });
};