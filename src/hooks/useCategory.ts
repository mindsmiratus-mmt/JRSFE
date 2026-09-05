// hooks/useCategory.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export interface Category {
    id: number;
    categoryName: string;
    description: string;
    createdBy: string;
    createDate: string;
    updatedBy?: string;
    updateDate?: string;
}

export interface CreateCategoryData {
    categoryName: string;
    description: string;
    createdBy?: string;
}

export interface UpdateCategoryData {
    id: any;
    categoryName: string;
    description: string;
    updatedBy?: string;
}

export interface CategoryFilters {
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

// 1. Get All Categories
export const useCategories = (filters: CategoryFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedResponse<Category>>({
        queryKey: ['categories', { page, pageSize, keyword, fromDate, toDate }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());
            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const { data } = await api.get<PaginatedResponse<Category>>(
                `/Category?${params.toString()}`
            );
            return data;
        },
        // placeholderData: "previous",// Essential for smooth pagination
        staleTime: 1000 * 30,   // 30 seconds
    });
};

// 2. Get Single Category by ID
export const useCategory = (id: number | null) => {
    return useQuery<Category>({
        queryKey: ['category', id],
        queryFn: async () => {
            const { data } = await api.get<Category>(`/Category/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Category
export const useCreateCategory = () => {
    return useMutation<Category, Error, CreateCategoryData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Category>('/Category', {
                categoryName: payload.categoryName,
                description: payload.description,
                createdBy: payload.createdBy ?? 'Admin',
            });
            return data;
        },
    });
};

// 4. Update Category
export const useUpdateCategory = () => {
    return useMutation<
        Category,
        Error,
        { id: number; data: UpdateCategoryData }
    >({
        mutationFn: async ({ id, data }) => {
            const updatePayload = {
                id,
                categoryName: data.categoryName,
                description: data.description,
                ...(data.updatedBy && { updatedBy: data.updatedBy }),
            };
            const { data: response } = await api.put<Category>(`/Category/${id}`, updatePayload);
            return response;
        },
    });
};

// 5. Delete Category
export const useDeleteCategory = () => {
    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Category/${id}`);
        },
    });
};

export const useAllCategory = () => {
    return useQuery<Category[]>({
        queryKey: ['all_category'],
        queryFn: async () => {
            const { data } = await api.get<Category[]>('/Category/all');
            return data || [];
        },
    });
};