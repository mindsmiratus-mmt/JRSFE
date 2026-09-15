// hooks/useShop.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';


// ========================
// Types
// ========================
export interface Shop {
    id: number;
    name: string;
    pinCode?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    gstNo?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    shopNumber?: string;
    shopCode?: string;
    secondaryLogoPath?: string;
    invoiceDisplayName?: string;
    isActive?: boolean;
    // Ecommerce-only: when true, the public storefront may accept orders for existing
    // items that currently have no sale-ready stock. Never affects POS. Defaults to
    // false on the backend, so treat a missing/undefined value as false, not true.
    allowEcommerceBackorder?: boolean;
    createdBy: string;
    createDate: string;
    updatedBy?: string;
    updateDate?: string;
}


export interface CreateShopData {
    name: string;
    pinCode: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    gstNo: string;
    salesChannel: string;
    latitude: number;
    longitude: number;
    invoiceDisplayName?: string;
    shopNumber?: string;
    shopCode?: string;
    secondaryLogoPath?: string;
    isActive?: boolean;
    allowEcommerceBackorder?: boolean;
    createdBy?: string
}


export interface UpdateShopData {
    name: string;
    pinCode?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    gstNo?: string;
    latitude?: number;
    salesChannel?: string;

    longitude?: number;
    invoiceDisplayName?: string;
    shopNumber?: string;
    shopCode?: string;
    secondaryLogoPath?: string;
    updatedBy?: string;
    isActive?: boolean;
    allowEcommerceBackorder?: boolean;
}


export interface ShopFilters {
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


// 1. Get All Shops (List)
export const useAllShops = () => {
    return useQuery<Shop[]>({
        queryKey: ['shops'],
        queryFn: async () => {
            const { data } = await api.get<Shop[]>('/Shop/all');
            return data;
        },
    });
};


export const useShops = (filters: ShopFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;


    return useQuery<PaginatedResponse<Shop>>({
        queryKey: ['shops', { page, pageSize, keyword, fromDate, toDate }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());
            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);


            const { data } = await api.get<PaginatedResponse<Shop>>(
                `/Shop?${params.toString()}`
            );
            return data;
        },
        staleTime: 1000 * 30,
    });
};


// 2. Get Single Shop by ID
export const useShop = (id: number | null) => {
    return useQuery<Shop>({
        queryKey: ['shop', id],
        queryFn: async () => {
            const { data } = await api.get<Shop>(`/Shop/${id}`);
            return data;
        },
        enabled: !!id,
    });
};


export const useUserShop = (userId: any) => {
    return useQuery({
        queryKey: ['user_shop', userId],
        queryFn: async () => {
            const { data } = await api.get(`/UserShop/user/${userId}`);
            return data || [];
        },
        enabled: !!userId,
    });
};


// 3. Get Shops for Current User (userShops) - no params
export const useUserShops = () => {
    return useQuery<Shop[]>({
        queryKey: ['userShops'],
        queryFn: async () => {
            const { data } = await api.get<Shop[]>('/Shop/userShops');
            return data;
        },
    });
};


// 4. Shop Lookup (e.g. for dropdowns) - lightweight list
export const useShopLookup = () => {
    return useQuery({
        queryKey: ['shopLookup'],
        queryFn: async () => {
            const { data } = await api.get('/Shop/lookup');
            return data;
        },
    });
};


// 5. Create Shop
export const useCreateShop = () => {
    const queryClient = useQueryClient();


    return useMutation<Shop, Error, CreateShopData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Shop>('/Shop', {
                ...payload,
                createdBy: payload.createdBy ?? 'Admin',
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            queryClient.invalidateQueries({ queryKey: ['all_shop'] });
            queryClient.invalidateQueries({ queryKey: ['userShops'] });
            queryClient.invalidateQueries({ queryKey: ['shopLookup'] });
        },
    });
};


// 6. Update Shop// 6. Update Shop
export const useUpdateShop = () => {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: number; data: UpdateShopData }
    >({
        mutationFn: async ({ id, data }) => {
            await api.put(`/Shop/${id}`, { ...data, id }); // ✅ id in URL AND body
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            queryClient.invalidateQueries({ queryKey: ['all_shop'] });
            queryClient.invalidateQueries({ queryKey: ['shop', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['userShops'] });
            queryClient.invalidateQueries({ queryKey: ['shopLookup'] });
        },
    });
};


// 7. Delete Shop
export const useDeleteShop = () => {
    const queryClient = useQueryClient();


    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Shop/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all_shop'] });
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            queryClient.invalidateQueries({ queryKey: ['userShops'] });
            queryClient.invalidateQueries({ queryKey: ['shopLookup'] });
        },
    });
};


// 8. Upload or replace shop logo
export const useUploadShopLogo = () => {
    const queryClient = useQueryClient();

    return useMutation<Shop, Error, { id: number; file: File }>({
        mutationFn: async ({ id, file }) => {
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await api.post<Shop>(`/Shop/${id}/logo`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            queryClient.invalidateQueries({ queryKey: ['all_shop'] });
            queryClient.invalidateQueries({ queryKey: ['shop', data.id] });
            queryClient.invalidateQueries({ queryKey: ['userShops'] });
            queryClient.invalidateQueries({ queryKey: ['shopLookup'] });
        },
    });
};


export const useAllShop = () => {
    return useQuery<Shop[]>({
        queryKey: ['all_shop'],
        queryFn: async () => {
            const { data } = await api.get<Shop[]>(`Shop/all`);
            return data;
        },
    });
};