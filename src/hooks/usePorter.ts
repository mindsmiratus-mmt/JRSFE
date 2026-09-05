// hooks/usePorter.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export interface Porter {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    identityProof?: string;
    identityNumber?: string;
    isActive?: boolean;
    remarks?: string;
    createdBy?: string;
    createDate?: string;
    updatedBy?: string;
    updateDate?: string;
}

// Omit auto-generated fields for the creation payload
export type CreatePorterData = Omit<Porter, 'id' | 'createDate' | 'updateDate' | 'updatedBy'>;

// Partial payload for updates
export type UpdatePorterData = Partial<Omit<Porter, 'id' | 'createDate' | 'updateDate'>>;

// ========================
// Hooks
// ========================

// 1. Get All Porters
export const usePorters = () => {
    return useQuery<Porter[]>({
        queryKey: ['porters', 'all'],
        queryFn: async () => {
            // Note: Assuming your axios instance baseURL already includes '/api'
            // If not, change this to '/api/Porter'
            const { data } = await api.get<Porter[]>('/Porter');
            return data;
        },
    });
};

// 2. Get All Active Porters
export const useActivePorters = () => {
    return useQuery<Porter[]>({
        queryKey: ['porters', 'active'],
        queryFn: async () => {
            const { data } = await api.get<Porter[]>('/Porter/active');
            return data;
        },
    });
};

// 3. Get Single Porter by ID
export const usePorter = (id: number | null) => {
    return useQuery<Porter>({
        queryKey: ['porter', id],
        queryFn: async () => {
            const { data } = await api.get<Porter>(`/Porter/${id}`);
            return data;
        },
        enabled: !!id, // Only run the query if an ID is provided
    });
};

// 4. Create Porter
export const useCreatePorter = () => {
    const queryClient = useQueryClient();

    return useMutation<number, Error, CreatePorterData>({
        mutationFn: async (payload) => {
            // Swagger shows this returns an integer (likely the newly created ID)
            const { data } = await api.post<number>('/Porter', payload);
            return data;
        },
        onSuccess: () => {
            // Invalidate the lists so the UI updates with the new data
            queryClient.invalidateQueries({ queryKey: ['porters'] });
        },
    });
};

// 5. Update Porter
export const useUpdatePorter = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: number; data: UpdatePorterData }>({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put(`/Porter/${id}`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            // Invalidate lists and the specific entity cache
            queryClient.invalidateQueries({ queryKey: ['porters'] });
            queryClient.invalidateQueries({ queryKey: ['porter', variables.id] });
        },
    });
};

// 6. Delete Porter
export const useDeletePorter = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Porter/${id}`);
        },
        onSuccess: () => {
            // Invalidate the lists so the deleted item disappears
            queryClient.invalidateQueries({ queryKey: ['porters'] });
        },
    });
};