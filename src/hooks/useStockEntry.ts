// hooks/useStockEntry.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Full Types (Based on API payload)
// ========================

// Vendor (nested inside StockEntry)
export interface Vendor {
    id: number;
    name: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    adharNo: string;
    address: string;
    state: string;
    city: string;
    pinCode: string;
    vendorType: string;
    isActive: boolean;
}

// Shop (nested inside StockEntry)
export interface Shop {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    phone: string;
    email: string;
    gstNo: string;
    isActive: boolean;
}

// Paginated Response Type
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

// Main StockEntry Interface
export interface StockEntry {
    id: number;
    itemId: number;
    tagNumber: string;
    metal: string;
    category: string;
    huid?: string;
    showOnWebsite: boolean;
    isBulkItem: boolean;
    itemName: string;
    brand: string;
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
    diamondCarat: number;
    netWeight: number;
    pureWeight: number;
    purchaseStonePrice: number;
    purchaseDiamondRate: number;
    purchaseGoldRate: number;
    remarks: string;
    salePrice: number;
    stockEntryType: string;
    pricingModel: string;
    goldPurity: string;
    silverPurity: string;
    purchaseMakingCharge: number;
    purchaseMakingChargeType: string;
    // ✅ New sale fields
    saleMakingCharge?: number;
    saleMakingChargeType?: string;
    saleDiamondDiscount?: number;
    saleDiamondDiscountType?: string;
    saleDiscountOnMaking?: number;
    saleDiscountType?: string;
    shopId: number;
    shop: Shop;
    vendorId: number;
    vendor: Vendor;
    createdBy: string;
    createDate: string;
    updatedBy: string;
    updateDate: string;
    stonePrice: number;
}

// ========================
// Payload Types
// ========================

export interface CreateStockEntryData {
    itemId: number;
    tagNumber: string;
    hsnCode?: string;
    huid?: string;
    showOnWebsite: boolean;
    isBulkItem: boolean;
    metal: string;
    brand: string;
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
    diamondCarat: number;
    netWeight: number;
    pureWeight: number;
    remarks?: string;
    pricingModel: string;
    stockEntryType: string;
    goldPurity?: string;
    silverPurity?: string;
    purchaseMakingCharge: number;
    purchaseMakingChargeType: string;
    // ✅ New sale fields
    saleMakingCharge?: number;
    saleMakingChargeType?: string;
    saleDiamondDiscount?: number;
    saleDiamondDiscountType?: string;
    saleDiscountOnMaking?: number;
    saleDiscountType?: string;
    shopId: number;
    vendorId: number;
    purchaseGoldRate: number;
    purchaseDiamondRate: number;
    purchaseStonePrice?: number;
    stonePrice: number;
    salePrice?: number;
}

export interface UpdateStockEntryData extends Partial<CreateStockEntryData> {
    id?: number;
}

// Filter params for list
export interface StockEntriesFilter {
    shopId?: number;
    metal?: string;
    fromDate?: string;
    toDate?: string;
    showOnWebsite?: boolean;
    isBulkItem?: boolean;
}

// ========================
// Batch Purchase Types
// ========================

// POST /api/StockEntry/{itemId}/batch
export interface AddBatchStockEntryData {
    itemId?: number;
    tagNumber?: string;
    huid?: string;
    hsnCode?: string;
    metal?: string;
    category?: string;
    itemName?: string;
    brand?: string;
    modeOfStock: string;
    caratOrKT?: string;
    purityPercent?: string;
    stoneName?: string;
    dPurityId?: string;
    clarity?: string;
    color?: string;
    cut?: string;
    shape?: string;
    quantity: number;
    grossWeight: number;
    stoneWeight: number;
    diamondWeight: number;
    diamondCarat: number;
    netWeight: number;
    pureWeight: number;
    remarks?: string;
    stockEntryType: string;
    pricingModel?: string;
    purchaseMakingCharge?: number;
    purchaseMakingChargeType?: string;
    purchaseGoldRate?: number;
    purchaseDiamondRate?: number;
    purchaseStonePrice?: number;
    stonePrice?: number;
    salePrice?: number;
    // ✅ New sale fields
    saleMakingCharge?: number;
    saleMakingChargeType?: string;
    saleDiscountOnMaking?: number;
    saleDiscountType?: string;
    isBulkItem?: boolean;
    showOnWebsite?: boolean;
    shopId: number;
    vendorId?: number | null;
}

// ========================
// Calculate Sale Price Types
// ========================

export interface CalculateSalePricePayload {
    gPurityId: string;
    netWeight: number;
    dPurityId: string;
    diamondWeight: number;
    diamondCarat: number;
    stoneName: string;
    grossWeight: number;
}

export interface CalculateSalePriceResponse {
    goldCost: number;
    diamondCost: number;
    stoneCost: number;
    makingCharges: number;
    discount: number;
    igst: number;
    cgst: number;
    sgst: number;
    otherCharges: number;
    totalSalePrice: number;
}

// ========================
// React Query Hooks
// ========================

// 1. Get All Stock Entries
export const useStockEntries = (filters?: StockEntriesFilter) => {
    return useQuery<StockEntry[]>({
        queryKey: ['stockEntries', filters],
        queryFn: async () => {
            const { data } = await api.get<StockEntry[]>('/StockEntry', {
                params: filters,
            });
            return data;
        },
    });
};

// 2. Get Single Stock Entry by ID
export const useStockEntry = (id: string | null) => {
  return useQuery<StockEntry>({
    queryKey: ['stockEntry', id],
    queryFn: async () => {
      const { data } = await api.get<StockEntry>(`/StockEntry/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// 3. Create Stock Entry
export const useCreateStockEntry = () => {
    const queryClient = useQueryClient();

    return useMutation<StockEntry, Error, CreateStockEntryData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<StockEntry>('/StockEntry', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockEntries'] });
        },
    });
};

// 4. Update Stock Entry
export const useUpdateStockEntry = () => {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: number; data: UpdateStockEntryData }
    >({
        mutationFn: async ({ id, data }) => {
            await api.put(`/StockEntry/${id}`, { ...data, id });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stockEntries'] });
            queryClient.invalidateQueries({ queryKey: ['stockEntry', variables.id] });
        },
    });
};

// 5. Delete Stock Entry
export const useDeleteStockEntry = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/StockEntry/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockEntries'] });
        },
    });
};

// 6. Import with Summary
export const useStockEntryImport = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, FormData>({
        mutationFn: async (formData) => {
            await api.post('/StockEntry/import-with-summary', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockEntries'] });
        },
    });
};

// 7. Export (returns blob URL)
export const useStockEntryExport = () => {
    return useMutation<string, Error, void>({
        mutationFn: async () => {
            const { data } = await api.get('/StockEntry/export', { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            return url;
        },
    });
};

// 8. Template (returns blob URL)
export const useStockEntryTemplate = () => {
    return useMutation<string, Error, void>({
        mutationFn: async () => {
            const { data } = await api.get('/StockEntry/template', { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            return url;
        },
    });
};

// 9. Calculate Sale Price
export const useCalculateSalePrice = () => {
    return useMutation<
        CalculateSalePriceResponse,
        Error,
        CalculateSalePricePayload
    >({
        mutationFn: async (payload) => {
            const { data } = await api.post<CalculateSalePriceResponse>(
                '/CalculateSalePrice',
                payload
            );
            return data;
        },
    });
};

// 10. Add Batch to Existing Bulk Item
export const useAddBatchStockEntry = () => {
    const queryClient = useQueryClient();

    return useMutation<
        StockEntry,
        Error,
        { itemId: number; payload: AddBatchStockEntryData }
    >({
        mutationFn: async ({ itemId, payload }) => {
            const { data } = await api.post<StockEntry>(
                `/StockEntry/${itemId}/batch`,
                payload
            );
            return data;
        },
        onSuccess: (_data, { itemId }) => {
            queryClient.invalidateQueries({ queryKey: ['stockEntries'] });
            queryClient.invalidateQueries({ queryKey: ['stockEntry', itemId] });
        },
    });
};

// 11. Get only bulk stock entries
export const useBulkStockEntries = () => {
    return useQuery<StockEntry[]>({
        queryKey: ['stockEntries', 'bulk-only'],
        queryFn: async () => {
            const { data } = await api.get<StockEntry[]>('/StockEntry', {
                params: { isBulkItem: true },
            });
            return data;
        },
    });
};