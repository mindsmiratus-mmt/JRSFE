// hooks/useItem.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================

export interface Category {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    categoryName: string;
}

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
    category: Category | null;
    itemImage?: string; // Added optional itemImage field
}

// ========================
// Filters & Pagination
// ========================

export interface ItemFilters {
    page?: number;
    pageSize?: number;
    keyword?: string;
    fromDate?: string | null;
    toDate?: string | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

// ========================
// Create / Update Types
// ========================

export interface CreateItemData
    extends Omit<
        Item,
        | 'id'
        | 'createDate'
        | 'createdBy'
        | 'updateDate'
        | 'updatedBy'
        | 'category'
    > { }

export interface UpdateItemData
    extends Partial<
        Omit<
            Item,
            | 'createDate'
            | 'createdBy'
            | 'updateDate'
            | 'updatedBy'
            | 'category'
        >
    > {
    // Optionally include id in payload (e.g., for backend requirements)
    id?: number;
}

// ========================
// API Base
// ========================

const API_BASE = '/Item';

// ========================
// Hooks
// ========================

// 1️⃣ Get All Items (Paginated & Filtered)
export const useItems = (filters: ItemFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedResponse<Item>>({
        queryKey: ['items', { page, pageSize, keyword, fromDate, toDate }],
        queryFn: async () => {
            const params = new URLSearchParams();

            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());

            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const { data } = await api.get<PaginatedResponse<Item>>(
                `/Item?${params.toString()}`
            );

            return data;
        },
        staleTime: 1000 * 30, // 30 seconds
    });
};

// 2️⃣ Get Single Item
export const useItem = (id: number | null) => {
    return useQuery<Item>({
        queryKey: ['item', id],
        queryFn: async () => {
            const { data } = await api.get<Item>(`${API_BASE}/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3️⃣ Create Item
export const useCreateItem = () => {
    const queryClient = useQueryClient();

    return useMutation<Item, Error, CreateItemData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Item>(API_BASE, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['all_items'] });
        },
    });
};

// 4️⃣ Update Item
export const useUpdateItem = () => {
    const queryClient = useQueryClient();

    return useMutation<
        Item,
        Error,
        { id: number; data: UpdateItemData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Item>(
                `${API_BASE}/${id}`,
                data
            );
            return response;
        },
        onSuccess: (updatedItem, variables) => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['all_items'] });
            queryClient.invalidateQueries({ queryKey: ['item', variables.id] });
            queryClient.setQueryData(['item', variables.id], updatedItem);
        },
    });
};

// 5️⃣ Delete Item
export const useDeleteItem = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`${API_BASE}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['all_items'] });
        },
    });
};

// 6️⃣ Upload Item Image
export const useUploadItemImage = () => {
    return useMutation<{ url: string }, Error, { itemId: number; formData: FormData }>({
        mutationFn: async ({ itemId, formData }) => {
            const { data } = await api.post<{ url: string }>(`/Item/${itemId}/upload-image`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return data;
        },
    });
};

export const useAllItems = () => {
    return useQuery<Item[]>({
        queryKey: ['all_items'],
        queryFn: async () => {
            const { data } = await api.get<Item[]>(`${API_BASE}/all`);
            return data;
        },
    });
};