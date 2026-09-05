// hooks/useUserRole.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

// ========================
// TYPES (EXACT API MATCH)
// ========================

// Shop
export interface RoleShop {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    phone: string;
    email: string;
    gstNo: string;
    isActive: boolean;
}

// Role
export interface Role {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    name: string;
    parentRole: string;
    userRoles: string[];
}

// User (partial – same as main User API)
export interface RoleUser {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    username: string;
    passwordHash: string;
    fullName: string;
    email: string;
    phone: string;
    employeeId: string;
    designation: string;
    dateOfJoining: string;
    isActive: boolean;
    shopId: number;
    shop: RoleShop;
    userRoles: string[];
}

// Main UserRole Interface (exact API)
export interface UserRole {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    userId: number;
    user: RoleUser;
    roleId: number;
    role: Role;
    shopId: number;
    shop: RoleShop;
}

// Assign UserRole
export interface AssignUserRoleData {
    userId: number;
    roleId: number;
    shopId: number;
}

// Update UserRole (full object)
export interface UpdateUserRoleData {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    userId: number;
    user: RoleUser;
    roleId: number;
    role: Role;
    shopId: number;
    shop: RoleShop;
}

// ========================
// QUERIES
// ========================

// 1. Get UserRole by userId  ➜ GET UserRole/user/{userId}
export const useUserRoleByUserId = (userId: number | null) => {
    return useQuery<UserRole[]>({
        queryKey: ["userRole", "user", userId],
        queryFn: async () => {
            const { data } = await api.get<UserRole[]>(`/UserRole/user/${userId}`);
            return data;
        },
        enabled: !!userId,
    });
};

// 2. Get UserRole by shopId ➜ GET UserRole/shop/{shopId}
export const useUserRoleShopByShopId = (shopId: number | null) => {
    return useQuery<UserRole[]>({
        queryKey: ["userRole", "shop", shopId],
        queryFn: async () => {
            const { data } = await api.get<UserRole[]>(`/UserRole/shop/${shopId}`);
            return data;
        },
        enabled: !!shopId,
    });
};

// 3. Get UserRole by Id ➜ GET UserRole/{id}
export const useUserRoleById = (id: number | null) => {
    return useQuery<UserRole>({
        queryKey: ["userRole", id],
        queryFn: async () => {
            const { data } = await api.get<UserRole>(`/UserRole/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 4. CHECK User Role  ➜ GET UserRole/check?userId=&roleName=&shopId=
export interface CheckUserRoleParams {
    userId: number;
    roleName: string;
    shopId: number;
}

export const useCheckUserRole = (params: CheckUserRoleParams | null) => {
    return useQuery<boolean>({
        queryKey: ["userRole", "check", params],
        queryFn: async () => {
            const query = new URLSearchParams();
            query.append("userId", params!.userId.toString());
            query.append("roleName", params!.roleName);
            query.append("shopId", params!.shopId.toString());

            const { data } = await api.get<boolean>(`/UserRole/check?${query.toString()}`);
            return data;
        },
        enabled: !!params,
    });
};

// ========================
// MUTATIONS
// ========================

// 5. Assign UserRole  ➜ POST UserRole
export const useAssignUserRole = () => {
    const queryClient = useQueryClient();

    return useMutation<UserRole, Error, AssignUserRoleData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<UserRole>("/UserRole/assign", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userRole"] });
        },
    });
};

// 6. Update UserRole ➜ PUT UserRole/{id}
export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();

    return useMutation<UserRole, Error, { id: number; data: UpdateUserRoleData }>({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<UserRole>(`/UserRole/${id}`, data);
            return response;
        },
        onSuccess: (updatedRole, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["userRole"] });
            queryClient.invalidateQueries({ queryKey: ["userRole", id] });
            queryClient.setQueryData(["userRole", id], updatedRole);
        },
    });
};

// 7. Delete UserRole by userId ➜ DELETE UserRole/user/{userId}
export const useDeleteUserRoleByUserId = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (userId) => {
            await api.delete(`/UserRole/user/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userRole"] });
        },
    });
};

// 8. Delete UserRole by id ➜ DELETE UserRole/{id}
export const useDeleteUserRole = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/UserRole/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userRole"] });
        },
    });
};
