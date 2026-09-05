// hooks/useCurrentRate.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export interface CurrentRate {
    id: string;
    description: string;
    rate: number;
    unit: string;
    purity: string;
    metalType: string;
    makingCharge: number;
    makingChargeType: string;
    discountOnMaking: number;
    discountType: string;
}

export interface CreateCurrentRateData {
    description: string;
    rate: number;
    unit: string;
    purity: string;
    metalType: string;
    makingCharge: number;
    makingChargeType: string;
    discountOnMaking: number;
    discountType: string;
}

export interface UpdateCurrentRateData {
    id?: number;
    description?: string;
    rate?: number;
    unit?: string;
    purity?: string;
    metalType?: string;
    makingCharge?: number;
    makingChargeType?: string;
    discountOnMaking?: number;
    discountType?: string;
}

export interface CurrentRatePurities {
    goldPurity: string[];
    diamondPurity?: string[];
}

// New type for 24K Gold Rate Update
export interface UpdateGold24KData {
    rate24K: number;
}

// ========================
// Hooks
// ========================

// 1. Get All Current Rates
export const useCurrentRates = () => {
    return useQuery<CurrentRate[]>({
        queryKey: ['currentRates'],
        queryFn: async () => {
            const { data } = await api.get<CurrentRate[]>('/CurrentRate');
            return data;
        },
    });
};

// 2. Get Single Current Rate by ID
export const useCurrentRate = (id: string | null) => {
    return useQuery<CurrentRate>({
        queryKey: ['currentRate', id],
        queryFn: async () => {
            const { data } = await api.get<CurrentRate>(`/CurrentRate/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Update Current Rate
export const useUpdateCurrentRate = () => {
    const queryClient = useQueryClient();

    return useMutation<
        CurrentRate,
        Error,
        { data: UpdateCurrentRateData }
    >({
        mutationFn: async ({ data }) => {
            const { data: response } = await api.put<CurrentRate>(
                `/CurrentRate`,
                data
            );
            return response;
        },
        onSuccess: () => {
            // Invalidate both list and detail queries
            queryClient.invalidateQueries({ queryKey: ['currentRates'] });
            queryClient.invalidateQueries({ queryKey: ['currentRate'] });
            queryClient.invalidateQueries({ queryKey: ['activeCurrentRate'] });
        },
    });
};

// 4. Get Current Rate Purities
export const useCurrentRatePurities = () => {
    return useQuery<CurrentRatePurities>({
        queryKey: ['purities'],
        queryFn: async () => {
            const { data } = await api.get<CurrentRatePurities>(
                '/CurrentRate/purities'
            );
            return data;
        },
    });
};

// 5. Create Current Rate
export const useCreateCurrentRate = () => {
    const queryClient = useQueryClient();

    return useMutation<
        CurrentRate,
        Error,
        { data: CreateCurrentRateData }
    >({
        mutationFn: async ({ data }) => {
            const { data: response } = await api.post<CurrentRate>(
                '/CurrentRate',
                data
            );
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentRates'] });
            queryClient.invalidateQueries({ queryKey: ['activeCurrentRate'] });
        },
    });
};

// 6. Delete Current Rate
export const useDeleteCurrentRate = () => {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: string }
    >({
        mutationFn: async ({ id }) => {
            await api.delete(`/CurrentRate/${id}`);
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['currentRates'] });
            queryClient.invalidateQueries({ queryKey: ['activeCurrentRate'] });
            queryClient.removeQueries({ queryKey: ['currentRate', id] });
        },
    });
};

// 7. Get Active Current Rate
export const useActiveCurrentRate = (
    metalType: string,
    purity: string
) => {
    return useQuery<CurrentRate>({
        queryKey: ['activeCurrentRate', metalType, purity],
        queryFn: async () => {
            const { data } = await api.get<CurrentRate>(
                `/CurrentRate/current`,
                {
                    params: { metalType, purity },
                }
            );
            return data;
        },
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: false,
    });
};

// 8. Update Gold 24K Rate
export const useUpdateGold24KRate = () => {
    const queryClient = useQueryClient();

    return useMutation<
        any,
        Error,
        { data: UpdateGold24KData }
    >({
        mutationFn: async ({ data }) => {
            // Note: Uses '/CurrentRate/update-gold-24k' assuming your Axios instance appends '/api'
            const { data: response } = await api.post(
                '/CurrentRate/update-gold-24k',
                data
            );
            return response;
        },
        onSuccess: () => {
            // Refetch current rates and active rates after a global 24k update
            queryClient.invalidateQueries({ queryKey: ['currentRates'] });
            queryClient.invalidateQueries({ queryKey: ['currentRate'] });
            queryClient.invalidateQueries({ queryKey: ['activeCurrentRate'] });
        },
    });
};
