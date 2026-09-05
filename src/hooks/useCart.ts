import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

// ================================
// 1. Types Definitions
// ================================

export interface CartItem {
  id: number; // cartItemId
  itemId: number;
  quantity: number;
  itemName?: string;
  price?: number;
}

export interface Cart {
  id: number | string;
  userId: number;
  shopId: number;
  customerId?: number | null;
  items: CartItem[];
  totalAmount?: number;
}

// -- Payloads --

export interface CreateCartPayload {
  userId: number;
  shopId: number;
  customerId?: number;
}

export interface AddItemPayload {
  itemId: number;
  quantity: number;
  // ✅ NEW: Optional bulk parameters
  bulkGrossWeight?: number;
  bulkNetWeight?: number;
  bulkDiamondCarat?: number;
  bulkStoneWeight?: number;
}

export interface CheckoutPayload {
  customerId: number;
  walletRedeemAmount: number;
  paymentMethod: string;
}

export interface UpdateItemCostPayload {
  goldMakingCharge: number;
  goldMakingChargeType: string;
  goldDiscount: number;
  goldDiscountType: string;
  diamondMakingCharge: number;
  diamondMakingChargeType: string;
  diamondDiscount: number;
  diamondDiscountType: string;
  stoneDiscount: number;
  stoneDiscountType: string;
}

// ================================
// 2. Standalone Hooks (Correct Approach)
// ================================

export const useGetCart = (cartId: string | number | null) => {
  return useQuery<Cart>({
    queryKey: ["cart", cartId],
    queryFn: async () => {
      const { data } = await api.get<Cart>(`/Cart/${cartId}`);
      return data;
    },
    enabled: !!cartId,
  });
};

// ================================
// 3. Main Hook for Actions
// ================================

export const useCart = () => {
  const queryClient = useQueryClient();

  // ------------------------------------
  // B. Create New Cart
  // ------------------------------------
  const createCartMutation = useMutation({
    mutationFn: async (payload: CreateCartPayload) => {
      const body = {
        userId: payload.userId,
        shopId: payload.shopId,
        customerId: payload.customerId ?? 0,
      };

      const { data } = await api.post<Cart>("/Cart", body);
      return data;
    },
    onSuccess: () => {
      // ✅ FIXED: Removed unused `newCart` parameter
    },
  });

  // ------------------------------------
  // C. Add Item to Cart
  // ------------------------------------
  const addItemMutation = useMutation({
    mutationFn: async ({
      cartId,
      item,
    }: {
      cartId: string | number;
      item: AddItemPayload;
    }) => {
      // Because item now matches AddItemPayload (which has optional bulk fields),
      // Axios will only send the bulk fields to the API if you actually provide them in the component.
      const { data } = await api.post(`/Cart/${cartId}/items`, item);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart", variables.cartId] });
    },
  });

  // ------------------------------------
  // D. Remove Single Item
  // ------------------------------------
  const removeItemMutation = useMutation({
    mutationFn: async ({
      cartId,
      cartItemId,
    }: {
      cartId: string | number;
      cartItemId: string | number;
    }) => {
      await api.delete(`/Cart/${cartId}/items/${cartItemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart", variables.cartId] });
    },
  });

  // ------------------------------------
  // E. Clear All Items (Empty Cart)
  // ------------------------------------
  const clearCartMutation = useMutation({
    mutationFn: async (cartId: string | number) => {
      await api.delete(`/Cart/${cartId}/items`);
    },
    onSuccess: (_, cartId) => {
      queryClient.invalidateQueries({ queryKey: ["cart", cartId] });
    },
  });

  // ------------------------------------
  // F. Checkout
  // ------------------------------------
  const checkoutMutation = useMutation({
    mutationFn: async ({
      cartId,
      details,
    }: {
      cartId: string | number;
      details: CheckoutPayload;
    }) => {
      const { data } = await api.post(`/Cart/${cartId}/checkout`, details);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart", variables.cartId] });
    },
  });

  // ------------------------------------
  // G. Update Item Cost
  // ------------------------------------
  const updateItemCostMutation = useMutation({
    mutationFn: async ({
      cartId,
      cartItemId,
      costDetails,
    }: {
      cartId: string | number;
      cartItemId: string | number;
      costDetails: UpdateItemCostPayload;
    }) => {
      const { data } = await api.put(
        `/Cart/${cartId}/items/${cartItemId}/cost`,
        costDetails
      );
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the cart query so the updated costs reflect immediately in the UI
      queryClient.invalidateQueries({ queryKey: ["cart", variables.cartId] });
    },
  });

  return {
    createCart: createCartMutation,
    addItem: addItemMutation,
    removeItem: removeItemMutation,
    clearCart: clearCartMutation,
    checkout: checkoutMutation,
    updateItemCost: updateItemCostMutation,
  };
};