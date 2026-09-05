import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

const API_BASE = "/Order";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderListRequest {
  userId?: number;
  shopId?: number;
  page?: number;
  pageSize?: number;
}

export interface Payment {
  method: number;
  amount: number;
  machineOrBank?: string;
  reference?: string;
  note?: string;
}

export interface ExchangeItem {
  amount: number;
  note?: string;
}

export interface PaymentDetail {
  payments: Payment[];
  exchangeItems?: ExchangeItem[];
  adjustAmount?: number;
}

export interface FinalizePaymentPayload {
  walletRedeemAmount: number;
  paymentDetail: PaymentDetail;
}

export interface CheckoutAdvancePayload {
  cartId: string;
  customerId: number;
  deliveryDate: string;
  advanceAmount: number;
  paymentDetails: PaymentDetail;
  note?: string;
}

export interface CompleteAdvancePayload {
  walletRedeemAmount: number;
  paymentDetail: PaymentDetail;
}

export interface AdvanceOrderEditItem {
  goldMakingCharge?: number;
  goldMakingChargeType?: string;
  goldDiscount?: number;
  goldDiscountType?: string;
  diamondMakingCharge?: number;
  diamondMakingChargeType?: string;
  diamondDiscount?: number;
  diamondDiscountType?: string;
  stoneDiscount?: number;
  stoneDiscountType?: string;
  grossWeight?: number;
  netWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  stoneWeight?: number;
}

export interface EditAdvancePayload {
  orderId: number;
  edits: Record<string, AdvanceOrderEditItem>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useOrder = (id: number | null) => {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`${API_BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useOrderList = (body: OrderListRequest) => {
  return useQuery({
    queryKey: ["orderList", body],
    queryFn: async () => {
      const { data } = await api.post(`${API_BASE}/list`, body);
      return data;
    },
  });
};

export const useReprintInvoice = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.get(`${API_BASE}/${id}/reprint-invoice`);
      return data;
    },
  });
};

export const useFinalizePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: FinalizePaymentPayload;
    }) => {
      const { data } = await api.post(
        `${API_BASE}/${id}/finalize-payment`,
        payload
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["orderList"] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`${API_BASE}/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderList"] });
    },
  });
};

export const usePaymentWebhook = () => {
  return useMutation({
    mutationFn: async (payload: string) => {
      const { data } = await api.post(`${API_BASE}/webhook/payment`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return data;
    },
  });
};

export const useCheckoutAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckoutAdvancePayload) => {
      const { data } = await api.post(`${API_BASE}/checkout-advance`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderList"] });
    },
  });
};

export const useCompleteAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: CompleteAdvancePayload;
    }) => {
      const { data } = await api.post(
        `${API_BASE}/${id}/complete-advance`,
        payload
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["orderList"] });
    },
  });
};

export const useEditAdvanceOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: EditAdvancePayload;
    }) => {
      const { data } = await api.post(
        `${API_BASE}/${id}/edit-advance`,
        payload
      );
      return data;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", variables.id] }),
        queryClient.invalidateQueries({ queryKey: ["orderList"] }),
      ]);
    },
  });
};

export const useAdvanceReceiptPdf = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.get(`${API_BASE}/${id}/advance-receipt-pdf`, {
        responseType: "blob",
      });
      return response.data;
    },
  });
};