// hooks/useAdvanceOrder.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';


// ========================
// Pagination & Filter Types
// ========================

export interface AdvanceOrderFilters {
    page?: number;
    pageSize?: number;
    keyword?: string;      // orderNo / customer name (API dependent)
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
// Shared Types (Category & Item - reused from invoice)
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
    category: Category;
}

// ========================
// Advance Order Specific Types
// ========================

export interface CustomerInOrder {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    name: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    gstin: string;
    pan: string;
    adharNo: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    isActive: boolean;
    referralId: number;
    referredBy: string;
}

export interface OrderItem {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    orderId: number;
    order: string;
    itemId: number;
    item: Item;
    weight: number;
    rate: number;
    makingCharge: number;
    totalAmount: number;
}

export interface AdvanceOrder {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    orderNo: string;
    customerId: number;
    customer: CustomerInOrder;
    orderDate: string;        // ISO string
    deliveryDate: string;     // ISO string
    advanceAmount: number;
    totalAmount: number;
    status: string;
    items: OrderItem[];
}

// ========================
// Payload Types (What you send to API)
// ========================

export interface CreateAdvanceOrderData {
    orderDate: string;
    deliveryDate: string;
    customerId: number;
    advanceAmount?: number;
    status?: string;
    items: {
        itemId: number;
        weight: number;
        rate: number;
        makingCharge?: number;
    }[];
}

export interface UpdateAdvanceOrderData {
    id: any;
    orderNo: any;
    orderDate?: string;
    deliveryDate?: string;
    customerId?: number;
    advanceAmount?: number;
    totalAmount?: number;
    status?: string;
    items?: {
        id?: number; // for updating existing line item
        itemId: number;
        weight: number;
        rate: number;
        makingCharge?: number;
    }[];
}

// ========================
// React Query Hooks for Advance Orders
// ========================

// 1. Get All Advance Orders
export const useAdvanceOrders = (
    filters: AdvanceOrderFilters = {}
) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedResponse<AdvanceOrder>>({
        queryKey: [
            'advance-orders',
            { page, pageSize, keyword, fromDate, toDate }
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());

            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const { data } = await api.get<
                PaginatedResponse<AdvanceOrder>
            >(`/AdvanceOrder?${params.toString()}`);

            return data;
        },
        staleTime: 1000 * 30
    });
};

// 2. Get Single Advance Order by ID
export const useAdvanceOrder = (id: number | null) => {
    return useQuery<AdvanceOrder>({
        queryKey: ['advance-order', id],
        queryFn: async () => {
            const { data } = await api.get<AdvanceOrder>(`/AdvanceOrder/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Advance Order
export const useCreateAdvanceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation<AdvanceOrder, Error, CreateAdvanceOrderData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<AdvanceOrder>('/AdvanceOrder', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advance-orders'] });
        },
    });
};

// 4. Update Advance Order
export const useUpdateAdvanceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation<
        AdvanceOrder,
        Error,
        { id: number; data: UpdateAdvanceOrderData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<AdvanceOrder>(`/AdvanceOrder/${id}`, data);
            return response;
        },
        onSuccess: (updatedOrder, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['advance-orders'] });
            queryClient.invalidateQueries({ queryKey: ['advance-order', id] });
            queryClient.setQueryData(['advance-order', id], updatedOrder);
        },
    });
};

// 5. Delete Advance Order
export const useDeleteAdvanceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/AdvanceOrder/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advance-orders'] });
        },
    });
};

