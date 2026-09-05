import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================

export interface ShopCurrentRate {
  id: number;
  currentRateId: string;
  shopId: number;
  salesChannel: string;
  rate: number;
  makingCharge: number;
  makingChargeType: string;
  discountOnMaking: number;
  discountType: string;
  isActive: boolean;
  shopName: string;
  currentRateDescription: string;
}

export interface CreateShopCurrentRateData {
  currentRateId: string;
  shopId: number;
  salesChannel?: string;
  rate: number;
  makingCharge?: number;
  makingChargeType?: string;
  discountOnMaking?: number;
  discountType?: string;
  isActive?: boolean;
  shopName?: string;
  currentRateDescription?: string;
}

export interface UpdateShopCurrentRateData {
  currentRateId?: string;
  shopId?: number;
  salesChannel?: string;
  rate?: number;
  makingCharge?: number;
  makingChargeType?: string;
  discountOnMaking?: number;
  discountType?: string;
  isActive?: boolean;
  shopName?: string;
  currentRateDescription?: string;
}

export interface EffectiveShopCurrentRate {
  rate: number;
  makingCharge: number;
  makingChargeType: string;
  discountOnMaking: number;
  discountType: string;
}

export interface EffectiveRateParams {
  currentRateId?: string;
  shopId?: number;
}

export interface UpdateShopGoldRatesData {
  shopId?: number;
  salesChannel?: string;
  rate24K: number;
}

// ========================
// Query Keys
// ========================

const KEYS = {
  all: ['shopCurrentRates'] as const,
  single: (id: number) => ['shopCurrentRate', id] as const,
  byRate: (currentRateId: string) =>
    ['shopCurrentRates', 'byRate', currentRateId] as const,
  effective: (params: EffectiveRateParams) =>
    ['shopCurrentRate', 'effective', params] as const,
};

// ========================
// Hooks
// ========================

// 1. Get All Shop Current Rate Overrides
export const useAllShopCurrentRates = () => {
  return useQuery<ShopCurrentRate[]>({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await api.get<ShopCurrentRate[]>('/ShopCurrentRate');
      return data;
    },
  });
};

// 2. Get Single Override by ID
export const useShopCurrentRate = (id: number | null) => {
  return useQuery<ShopCurrentRate>({
    queryKey: KEYS.single(id!),
    queryFn: async () => {
      const { data } = await api.get<ShopCurrentRate>(`/ShopCurrentRate/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

// 3. Get All Overrides for a Given CurrentRate ID (e.g. "Gold-22K")
export const useShopCurrentRatesByRate = (currentRateId: string | null) => {
  return useQuery<ShopCurrentRate[]>({
    queryKey: KEYS.byRate(currentRateId!),
    queryFn: async () => {
      const { data } = await api.get<ShopCurrentRate[]>(
        `/ShopCurrentRate/by-rate/${currentRateId}`
      );
      return data;
    },
    enabled: !!currentRateId,
  });
};

// 4. Get Effective Rate for a Shop
// Priority: Shop-specific > ShopType > Global
export const useEffectiveShopCurrentRate = (params: EffectiveRateParams) => {
  return useQuery<EffectiveShopCurrentRate>({
    queryKey: KEYS.effective(params),
    queryFn: async () => {
      const { data } = await api.get<EffectiveShopCurrentRate>(
        '/ShopCurrentRate/effective',
        { params }
      );
      return data;
    },
    enabled: !!(params.currentRateId && params.shopId),
  });
};

// 5. Create Shop Current Rate Override
export const useCreateShopCurrentRate = () => {
  const queryClient = useQueryClient();

  return useMutation<ShopCurrentRate, Error, CreateShopCurrentRateData>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ShopCurrentRate>('/ShopCurrentRate', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      if (data.currentRateId) {
        queryClient.invalidateQueries({
          queryKey: KEYS.byRate(data.currentRateId),
        });
      }
    },
  });
};

// 6. Update Shop Current Rate Override
export const useUpdateShopCurrentRate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: number; data: UpdateShopCurrentRateData }
  >({
    mutationFn: async ({ id, data }) => {
      await api.put(`/ShopCurrentRate/${id}`, { ...data, id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.single(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['shopCurrentRate', 'effective'] });
    },
  });
};

// 7. Delete Shop Current Rate Override
export const useDeleteShopCurrentRate = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/ShopCurrentRate/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['shopCurrentRate', 'effective'] });
    },
  });
};

// 8. Update 24K Gold Rate for Shop / Sales Channel
export const useUpdateShopGoldRates = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateShopGoldRatesData>({
    mutationFn: async (payload) => {
      await api.post('/ShopCurrentRate/update-gold-rates', payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['shopCurrentRates', 'byRate'] }),
        queryClient.invalidateQueries({ queryKey: ['shopCurrentRate', 'effective'] }),
      ]);
    },
  });
};