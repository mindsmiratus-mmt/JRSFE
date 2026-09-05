// hooks/useSaleItemAvailability.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext'; // Adjust path if needed

// ========================
// Types
// ========================
export interface SaleItemAvailability {
  id: string;
  itemId: number;
  tagNumber: string;
  metal: string;
  category: string;
  itemName: string;
  modeOfStock: string;
  caratOrKT: string;
  purityPercent: string;
  stoneName: string;
  dPurityId: string;
  clarity: string;
  color: string;
  cut: string;
  shape: string;
  quantity: number;
  grossWeight: number;
  stoneWeight: number;
  diamondWeight: number;
  netWeight: number;
  pureWeight: number;
  totalWeight?: number;
  remainingWeight?: number;
  remarks: string;
  stockEntryType: string;
  purchaseMakingCharge: number;
  purchaseMakingChargeType: string;
  pricingModel: string;
  salePrice: number;
  hsnCode: string;
  isBulkItem: boolean;
  purchaseGoldRate: number;
  purchaseDiamondRate: number;
  purchaseStonePrice: number;
  brand: string;
  shopId: number;
  vendorId: number;
  status?: string;
  createDate: string;
  createdBy: string;
  updateDate?: string;
  updatedBy?: string;
}

export interface ApproveSaleItemData {
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
  id: string;
  itemId: number;
  tagNumber: string;
  quantity: number;
  status: string;
}

export interface UpdateSaleItemData {
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
  id: string;
  itemId: number;
  tagNumber: string;
  quantity: number;
  status: string;
}

// ========================
// Hooks
// ========================

// 1. Get Stock Items Not In Availability
export const useStockNotInAvailability = (overrideShopId?: number | string | null) => {
  const { selectedShop } = useAuth();
  const shopId = overrideShopId !== undefined
    ? (overrideShopId ? String(overrideShopId) : undefined)
    : (selectedShop?.id ? String(selectedShop.id) : undefined);

  return useQuery<SaleItemAvailability[]>({
    queryKey: ['stockNotInAvailability', shopId],
    queryFn: async () => {
      const { data } = await api.get<SaleItemAvailability[]>(
        '/SaleItemAvailability/stock/not-in-availability',
        {
          params: { shopId },
        }
      );
      return data;
    },
  });
};

// 2. Get Sale Items by Status
// Automatically fetches using the selectedShop ID or passed overrideShopId
export const useSaleItemsByStatus = (status: string, overrideShopId?: number | string | null) => {
  const { selectedShop } = useAuth();
  const shopId = overrideShopId !== undefined
    ? (overrideShopId ? String(overrideShopId) : undefined)
    : (selectedShop?.id ? String(selectedShop.id) : undefined);

  return useQuery<SaleItemAvailability[]>({
    queryKey: ['saleItems', status, shopId],
    queryFn: async () => {
      const { data } = await api.get<SaleItemAvailability[]>(
        `/SaleItemAvailability/status/${status}`,
        {
          params: { shopId }, // Passed as query parameter ?shopId=...
        }
      );
      return data;
    },
    enabled: !!status, 
  });
};

// 3. Approve Multiple Sale Items (POST)
export const useApproveSaleItems = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApproveSaleItemData[]>({
    mutationFn: async (items) => {
      await api.post('/SaleItemAvailability/approve', items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockNotInAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['saleItems'] });
    },
  });
};

// 4. Update Single Sale Item (PUT)
export const useUpdateSaleItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SaleItemAvailability,
    Error,
    { id: string; data: UpdateSaleItemData }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.put<SaleItemAvailability>(
        `/SaleItemAvailability/${id}`,
        data
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stockNotInAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['saleItems'] });
      queryClient.invalidateQueries({ queryKey: ['saleItem', data.id] });
    },
  });
};