// hooks/useSalesChannelRegistry.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export interface SalesChannelRegistry {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
}

export interface CreateSalesChannelData {
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateSalesChannelData {
    name: string;
    description?: string;
    isActive?: boolean;
}

// ========================
// Query Keys
// ========================
const KEYS = {
    all: ['salesChannels'] as const,
    single: (id: number) => ['salesChannel', id] as const,
};

// ========================
// Hooks
// ========================

// 1. Get All Sales Channels
export const useAllSalesChannels = () => {
    return useQuery<SalesChannelRegistry[]>({
        queryKey: KEYS.all,
        queryFn: async () => {
            const { data } = await api.get<SalesChannelRegistry[]>('/SalesChannelRegistry');
            return data;
        },
    });
};

// 2. Get Single Sales Channel by ID
export const useSalesChannel = (id: number | null) => {
    return useQuery<SalesChannelRegistry>({
        queryKey: KEYS.single(id!),
        queryFn: async () => {
            const { data } = await api.get<SalesChannelRegistry>(`/SalesChannelRegistry/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Sales Channel
export const useCreateSalesChannel = () => {
    const queryClient = useQueryClient();

    return useMutation<SalesChannelRegistry, Error, CreateSalesChannelData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<SalesChannelRegistry>('/SalesChannelRegistry', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};

// 4. Update Sales Channel
export const useUpdateSalesChannel = () => {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: number; data: UpdateSalesChannelData }
    >({
        mutationFn: async ({ id, data }) => {
            await api.put(`/SalesChannelRegistry/${id}`, { ...data, id });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: KEYS.single(variables.id) });
        },
    });
};

// 5. Delete Sales Channel
export const useDeleteSalesChannel = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/SalesChannelRegistry/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};