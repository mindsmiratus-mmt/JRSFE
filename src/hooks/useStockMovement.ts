// hooks/useStockMovement.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Full Types (Exact match with your API)
// ========================

// Category (nested inside Item)
export interface Category {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    categoryName: string;
}

// Full Item Master (as returned inside stock movement item)
export interface Item {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    name: string;
    categoryId: number;
    description: string;
    goldKT: string;
    metal: string;
    grossWt: number;
    netWt: number;
    firmId: string;
    barcode: string;
    making: number;
    discountOnMaking: number;
    discountOnMakingType: string;
    discountOnDiamond: number;
    discountOnStone: number;
    discountOnStoneType: string;
    natureOfStock: string;
    quantity: number;
    sold: number;
    status: string;
    category: Category;
}

// Main StockMovement Interface (Exact match with your JSON)
export interface StockMovement {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    itemId: number;
    item: Item;
    shopId: number;
    type: string;
    quantity: number;
    grossWeight: number;
    netWeight: number;
    referenceNo: string;
    remarks: string;
}

// Paginated Response
export interface StockMovementsResponse {
    data: StockMovement[];
    total?: number;
    page: number;
    pageSize: number;
}

// ========================
// Params
// ========================
export interface StockMovementParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    fromDate?: string;
    toDate?: string;
}

// ========================
// Payload Types (What you send to API)
// ========================

// Create StockMovement — only fields you control
export interface CreateStockMovementData {
    itemId: number;
    shopId: number;
    type: string;
    quantity: number;
    grossWeight: number;
    netWeight: number;
    referenceNo: string;
    remarks?: string;
}

// Update StockMovement — partial update
export interface UpdateStockMovementData {
    itemId?: number;
    shopId?: number;
    type?: string;
    quantity?: number;
    grossWeight?: number;
    netWeight?: number;
    referenceNo?: string;
    remarks?: string;
}

// ========================
// React Query Hooks
// ========================

// 1. Get StockMovements with pagination and filters
export const useStockMovements = (params: StockMovementParams = {}) => {
    return useQuery<StockMovementsResponse>({
        queryKey: ['stockMovements', params],
        queryFn: async () => {
            const queryString = new URLSearchParams({
                ...(params.page && { page: params.page.toString() }),
                ...(params.pageSize && { pageSize: params.pageSize.toString() }),
                ...(params.keyword && { keyword: params.keyword }),
                ...(params.fromDate && { fromDate: params.fromDate }),
                ...(params.toDate && { toDate: params.toDate }),
            }).toString();
            const { data } = await api.get<StockMovementsResponse>(`/StockMovement${queryString ? `?${queryString}` : ''}`);
            return data;
        },
    });
};

// 2. Get Single StockMovement by ID
export const useStockMovement = (id: number | null) => {
    return useQuery<StockMovement>({
        queryKey: ['stockMovement', id],
        queryFn: async () => {
            const { data } = await api.get<StockMovement>(`/StockMovement/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create StockMovement
export const useCreateStockMovement = () => {
    const queryClient = useQueryClient();

    return useMutation<StockMovement, Error, CreateStockMovementData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<StockMovement>('/StockMovement', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
        },
    });
};

// 4. Update StockMovement
export const useUpdateStockMovement = () => {
    const queryClient = useQueryClient();

    return useMutation<
        StockMovement,
        Error,
        { id: number; data: UpdateStockMovementData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<StockMovement>(`/StockMovement/${id}`, data);
            return response;
        },
        onSuccess: (updatedStockMovement, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
            queryClient.invalidateQueries({ queryKey: ['stockMovement', id] });
            queryClient.setQueryData(['stockMovement', id], updatedStockMovement);
        },
    });
};

// 5. Delete StockMovement
export const useDeleteStockMovement = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/StockMovement/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
        },
    });
};

export const useItems = () => {
    return useQuery<Item[]>({
        queryKey: ['items'],
        queryFn: async () => {
            const { data } = await api.get<Item[]>('/Item');
            return data;
        },
    });
};