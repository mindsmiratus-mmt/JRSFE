// hooks/useTag.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types (Based on your real payload)
// ========================

export interface CategoryNested {
    createDate: string;
    createdBy: string;
    updateDate?: string;
    updatedBy?: string;
    id: number;
    categoryName: string;
}

export interface ItemNested {
    createDate: string;
    createdBy: string;
    updateDate?: string;
    updatedBy?: string;
    id: number;
    name: string;
    categoryId: number;
    description?: string;
    goldKT?: string;
    metal?: string;
    grossWt: number;
    netWt: number;
    firmId?: string;
    barcode?: string;
    making: number;
    discountOnMaking: number;
    discountOnMakingType?: string;
    discountOnDiamond: number;
    discountOnStone: number;
    discountOnStoneType?: string;
    natureOfStock?: string;
    quantity: number;
    sold: number;
    status: string;
    category: CategoryNested;
}

export interface Tag {
    createDate: string;
    createdBy: string;
    updateDate?: string;
    updatedBy?: string;
    id: number;
    tagNo: string;
    itemId: number;
    item: ItemNested;
    weight: number;
    purity: number;
    rate: number;
    makingCharge: number;
    tagDate: string;
    isPrinted: boolean;
}

// Payloads for mutations
export interface CreateTagPayload {
    tagNo: string;
    itemId: number;
    weight: number;
    purity: number;
    isPrinted?: boolean;
    rate: number;
    makingCharge: number;
    tagDate?: string;
    createdBy?: string;
}

export interface UpdateTagPayload {
    id: number;
    tagNo: string;
    itemId: number;
    weight?: number;
    purity?: number;
    rate?: number;
    makingCharge?: number;
    tagDate?: string;
    isPrinted?: boolean;
    updatedBy?: string;
}

export interface TagFilterParams {
    startDate?: string;     // ISO string
    endDate?: string;       // ISO string
    isPrinted?: boolean;
}

export interface TagFilters {
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
// Hooks
// ========================

const queryClient = () => useQueryClient();

// 1. Get All Tags (with full nested data)

export const useTags = (filters: TagFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedResponse<Tag>>({
        queryKey: ['tags', { page, pageSize, keyword, fromDate, toDate }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());
            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const { data } = await api.get<PaginatedResponse<Tag>>(
                `/Tag?${params.toString()}`
            );
            return data;
        },
        // placeholderData: "previous",// Essential for smooth pagination
        staleTime: 1000 * 30,   // 30 seconds
    });
};

// 2. Get Single Tag by ID
export const useTag = (id: number | null) => {
    return useQuery<Tag>({
        queryKey: ['tag', id],
        queryFn: async () => {
            const { data } = await api.get<Tag>(`/Tag/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Tag(s) – usually one or many based on itemId + quantity logic
export const useCreateTag = () => {
    const qc = queryClient();

    return useMutation<Tag, Error, CreateTagPayload>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Tag>('/Tag', {
                ...payload,
                createdBy: payload.createdBy ?? 'Admin',
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tags'] });
            qc.invalidateQueries({ queryKey: ['all_tag'] });
        },
    });
};

// 4. Bulk Create / Generate Tags by ItemId (common in jewelry systems)
export const useGenerateTags = () => {
    const qc = queryClient();
    return useMutation<Tag[], Error, { itemId: number }>({
        mutationFn: async ({ itemId }) => {
            const { data } = await api.post<Tag[]>('/Tag/generate/' + itemId);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tags'] });
            qc.invalidateQueries({ queryKey: ['all_tag'] });
        },
    });
};

// 5. Update Tag
export const useUpdateTag = () => {
    const qc = queryClient();

    return useMutation<Tag, Error, { id: number; data: UpdateTagPayload }>({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Tag>(`/Tag/${id}`, {
                ...data,
                updatedBy: data.updatedBy ?? 'Admin',
            });
            return response;
        },
        onSuccess: (updatedTag) => {
            qc.invalidateQueries({ queryKey: ['tags'] });
            qc.invalidateQueries({ queryKey: ['all_tag'] });
            qc.invalidateQueries({ queryKey: ['tag', updatedTag.id] });
        },
    });
};

// 6. Delete Tag
export const useDeleteTag = () => {
    const qc = queryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Tag/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tags'] });
            qc.invalidateQueries({ queryKey: ['all_tag'] });
        },
    });
};

// 7. Filter Tags (by date range and print status)
export const useTagFilter = (params: TagFilterParams) => {
    return useQuery<Tag[], Error>({
        queryKey: ['tags', 'filter', params],
        queryFn: async () => {
            const { data } = await api.get<Tag[]>('/Tag/filter', { params });
            return data;
        },
        enabled: Boolean(params.startDate || params.endDate || params.isPrinted !== undefined),
        // placeholderData: 'previous', // This now works perfectly
    });
};
// 8. Get Tag for Barcode Printing (by tagNo)
export const useTagByTagNo = (tagNo: string | null) => {
    return useQuery<Tag>({
        queryKey: ['tag', 'barcode', tagNo],
        queryFn: async () => {
            const { data } = await api.get<Tag>(`/Tag/barcode/${tagNo}`);
            return data;
        },
        enabled: !!tagNo,
    });
};

export const useAllTag = () => {
    return useQuery<Tag[]>({
        queryKey: ['all_tag'],
        queryFn: async () => {
            const { data } = await api.get<Tag[]>('/Tag/all');
            return data;
        },
    });
};

// 9. Get Tag Print Data for Item
export const useTagPrintItem = (itemId: number | null) => {
    return useQuery<Blob>({
        queryKey: ['tag', 'print', 'item', itemId],
        queryFn: async () => {
            const { data } = await api.get<Blob>(`/Tag/print/item/${itemId}`, {
                responseType: 'blob',
                headers: {
                    'accept': '*/*',
                },
            });
            return data;
        },
        enabled: !!itemId,
    });
};