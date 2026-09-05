// hooks/useVendor.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export interface Vendor {
    id: number;
    name: string;
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
    isActive: boolean;
    createdBy?: string;
    createDate?: string;
    updatedBy?: string;
    updateDate?: string;
}

export interface VendorFilters {
    page?: number;
    pageSize?: number;
    keyword?: string;
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

export interface CreateVendorData {
    name: string;
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
    createdBy?: string;
}

export interface UpdateVendorData {
    id: number;
    name: string;
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

// ========================
// Hooks
// ========================

// 1. Get All Vendors with optional pagination/filters
export const useVendors = (filters: VendorFilters = {}) => {
    const { page = 1, pageSize = 10, keyword = '' } = filters;

    return useQuery<PaginatedResponse<Vendor>>({
        queryKey: ['vendors', { page, pageSize, keyword }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());
            if (keyword.trim()) params.append('keyword', keyword.trim());

            const { data } = await api.get<PaginatedResponse<Vendor>>(`/Vendor?${params.toString()}`);
            return data;
        },
        staleTime: 1000 * 30,
    });
};

// 2. Get Single Vendor by ID
export const useVendor = (id: number | null) => {
    return useQuery<Vendor>({
        queryKey: ['vendor', id],
        queryFn: async () => {
            const { data } = await api.get<Vendor>(`/Vendor/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Vendor
export const useCreateVendor = () => {
    const queryClient = useQueryClient();

    return useMutation<Vendor, Error, CreateVendorData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Vendor>('/Vendor', {
                ...payload,
                isActive: payload.isActive ?? true,
                createdBy: payload.createdBy ?? 'Admin',
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
        },
    });
};

// 4. Update Vendor
export const useUpdateVendor = () => {
    const queryClient = useQueryClient();

    return useMutation<Vendor, Error, { id: number; data: UpdateVendorData }>({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Vendor>(`/Vendor/${id}`, data);
            return response;
        },
        onSuccess: (updatedVendor, variables) => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
            queryClient.setQueryData(['vendor', variables.id], updatedVendor);
        },
    });
};

// 5. Delete Vendor
export const useDeleteVendor = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Vendor/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
        },
    });
};

// 6. Get All Vendors (non-paginated)
export const useAllVendors = () => {
    return useQuery<Vendor[]>({
        queryKey: ['all_vendor'],
        queryFn: async () => {
            const { data } = await api.get<Vendor[]>('/Vendor/all');
            return data;
        },
    });
};