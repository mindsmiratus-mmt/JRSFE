// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Full Types (Exact match with your API)
// ========================

export interface Shop {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    name: string;
    address: string;
}

export interface User {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    employeeId: string;
    designation: string;
    dateOfJoining: string;
    shopId: number | null;
    shop: Shop | null;
    isActive: boolean;
}

// 🚨 FIXED: Updated to match your exact API JSON response 🚨
export interface PaginatedUsers {
    data: User[];
    totalCount: number;     // Changed from `total` to `totalCount`
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean; // Added
    hasNextPage: boolean;     // Added
}

// ========================
// Query Params Type
// ========================
export interface UsersQueryParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    fromDate?: string | null;
    toDate?: string | null;
}

// ========================
// Payload Types (What you send to API)
// ========================

export interface CreateUserData {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone: string;
    employeeId: string;
    designation: string;
    dateOfJoining: string;
    shopId: number;
    isActive?: boolean;
}

export interface UpdateUserData {
    id: number; 
    username?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    employeeId?: string;
    designation?: string;
    dateOfJoining?: string;
    shopId?: number;
    isActive?: boolean;
}

export interface AssignShopsData {
    userId: number;
    shopIds: number[];
}

export interface ChangePasswordData {
    userId: number;
    currentPassword: string;
    newPassword: string;
}

export interface ResetPasswordData {
    newPassword: string;
}

// ========================
// Query Key Factory
// ========================
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: UsersQueryParams) => [...userKeys.lists(), filters] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: number) => [...userKeys.details(), id] as const,
    byShops: () => [...userKeys.all, 'shop'] as const,
    byShop: (shopId: number) => [...userKeys.byShops(), shopId] as const,
    allWithoutPagination: () => [...userKeys.all, 'all-unpaginated'] as const,
};

// ========================
// React Query Hooks
// ========================

// 1. Get All Users (with pagination & filters)
export const useUsers = (filters: UsersQueryParams = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
    } = filters;

    return useQuery<PaginatedUsers>({
        queryKey: userKeys.list({ page, pageSize, keyword, fromDate, toDate }),
        queryFn: async () => {
            const params = {
                page,
                pageSize,
                ...(keyword.trim() && { keyword: keyword.trim() }),
                ...(fromDate && { fromDate }),
                ...(toDate && { toDate }),
            };

            const { data } = await api.get<PaginatedUsers>('/User', { params });
            return data;
        },
        staleTime: 1000 * 30, // 30 sec cache
    });
};

// 2. Get Single User by ID
export const useUser = (id: number | null) => {
    return useQuery<User>({
        queryKey: userKeys.detail(id!), 
        queryFn: async () => {
            const { data } = await api.get<User>(`/User/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Get Users by Shop ID
export const useUsersByShopId = (shopId: number | null) => {
    return useQuery<User[]>({
        queryKey: userKeys.byShop(shopId!),
        queryFn: async () => {
            const { data } = await api.get<User[]>(`/User/shop/${shopId}`);
            return data;
        },
        enabled: !!shopId,
    });
};

// 4. Create User
export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation<User, Error, CreateUserData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<User>('/User', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: userKeys.allWithoutPagination() });
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};

// 5. Update User
export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation<
        User,
        Error,
        { id: number; data: UpdateUserData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<User>(`/User/${id}`, data);
            return response;
        },
        onSuccess: (updatedUser, { id }) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: userKeys.allWithoutPagination() });
            queryClient.setQueryData(userKeys.detail(id), updatedUser);
        },
    });
};

// 6. Delete User
export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/User/${id}`);
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: userKeys.allWithoutPagination() });
            queryClient.removeQueries({ queryKey: userKeys.detail(id) });
        },
    });
};

// 7. Assign Shop to User
export const useAssignShop = () => {
    const queryClient = useQueryClient();

    return useMutation<User, Error, AssignShopsData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<User>('/UserShop/assign', payload);
            return data;
        },
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
        },
    });
};

// 8. Change User Password
export const useChangePassword = () => {
    const queryClient = useQueryClient();

    return useMutation<
        User,
        Error,
        { id: number; data: ChangePasswordData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<User>(`/User/${id}/change-password`, data);
            return response;
        },
        onSuccess: (updatedUser, { id }) => {
            queryClient.setQueryData(userKeys.detail(id), updatedUser);
        },
    });
};

// 9. Reset User Password (Admin)
export const useResetPassword = () => {
    const queryClient = useQueryClient();

    return useMutation<
        User,
        Error,
        { id: number; data: ResetPasswordData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<User>(`/User/${id}/reset-password`, data);
            return response;
        },
        onSuccess: (updatedUser, { id }) => {
            queryClient.setQueryData(userKeys.detail(id), updatedUser);
        },
    });
};

// 10. Get all user (Unpaginated)
export const useAllUser = () => {
    return useQuery<User[]>({
        queryKey: userKeys.allWithoutPagination(),
        queryFn: async () => {
            const { data } = await api.get<User[]>(`/User/all`);
            return data;
        },
    });
};