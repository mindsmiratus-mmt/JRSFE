// hooks/useCustomer.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types (matches your real API)
// ========================
export interface Customer {
    id: number;
    name: string;
    phone: string;
    email: string;
    dateOfBirth: string; // ISO string
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

export interface CustomerFilters {
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

export interface CreateCustomerData
    extends Omit<Customer, 'id'> {
    // id is auto-generated, so we omit it when creating
}

export interface UpdateCustomerData
    extends Partial<Customer> {
    id: number;
}

// ========================
// Hooks
// ========================

// 1. Get All Customers

export const useCustomers = (filters: CustomerFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedResponse<Customer>>({
        queryKey: ['customers', { page, pageSize, keyword, fromDate, toDate }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());
            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);

            const { data } = await api.get<PaginatedResponse<Customer>>(
                `/Customer?${params.toString()}`
            );
            return data;
        },
        // placeholderData: "previous",// Essential for smooth pagination
        staleTime: 1000 * 30,   // 30 seconds
    });
};

// 2. Get Single Customer by ID
export const useCustomer = (id: number | null) => {
    return useQuery<Customer>({
        queryKey: ['customer', id],
        queryFn: async () => {
            const { data } = await api.get<Customer>(`/Customer/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Customer
export const useCreateCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation<Customer, Error, CreateCustomerData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Customer>('/Customer', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

// 4. Update Customer
export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation<
        Customer,
        Error,
        { id: number; data: UpdateCustomerData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Customer>(`/Customer/${id}`, data);
            return response;
        },
        onSuccess: (updatedCustomer, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
            // Optional: optimistically update single customer
            queryClient.setQueryData(['customer', variables.id], updatedCustomer);
        },
    });
};

// 5. Delete Customer
export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Customer/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

export const useAllCustomer = () => {
    return useQuery<Customer[]>({
        queryKey: ['all_customer'],
        queryFn: async () => {
            const { data } = await api.get<Customer[]>('/Customer/all');
            return data;
        },
    });
};