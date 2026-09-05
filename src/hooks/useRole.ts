// hooks/useRole.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/* ============================================================
   ROLE INTERFACES (Full API Structure)
============================================================ */

// Shop (from API)
export interface Shop {
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

// User inside UserRole
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
    shop: Shop | null;
    userRoles: string[];
}

// UserRole
export interface UserRole {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    userId: number;
    user: RoleUser;
    roleId: number;
    role: string;
    shopId: number;
    shop: Shop | null;
}

export interface RolePermission {
    module: string;
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}


// Main Role Type
export interface Role {
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    id: number;
    name: string;
    parentRole: string;
    userRoles?: RolePermission[];
    permissions?: RolePermission[];
}

/* ============================================================
   PAYLOAD TYPES
============================================================ */

export interface CreateRoleData {
    name: string;
    parentRole?: string | null;
    userRoles: RolePermission[];
}

export interface UpdateRoleData extends CreateRoleData {
    id: number;
}

/* ============================================================
   REACT QUERY HOOKS
============================================================ */

// 1️⃣ Get All Roles
export const useRoles = () => {
    return useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await api.get<Role[]>('/Role');
            return data;
        },
        staleTime: 30_000,
    });
};

// 2️⃣ Get Role By ID
export const useRole = (id: number | null) => {
    return useQuery<any>({
        queryKey: ['role', id],
        queryFn: async () => {
            const { data } = await api.get<any>(`/Role/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3️⃣ Get Role By Name  → /Role/name/admin
export const useRoleByName = (roleName: string | null) => {
    return useQuery<Role>({
        queryKey: ['roleByName', roleName],
        queryFn: async () => {
            const { data } = await api.get<Role>(`/Role/name/${roleName}`);
            return data;
        },
        enabled: !!roleName,
    });
};

// 4️⃣ Create Role
export const useCreateRole = () => {
    const queryClient = useQueryClient();

    return useMutation<Role, Error, CreateRoleData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Role>('/Role', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};

// 5️⃣ Update Role
export const useUpdateRole = () => {
    const queryClient = useQueryClient();

    return useMutation<Role, Error, { id: number; data: UpdateRoleData }>({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Role>(`/Role/${id}`, data);
            return response;
        },
        onSuccess: (updatedRole, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role', id] });
            queryClient.setQueryData(['role', id], updatedRole);
        },
    });
};

// 6️⃣ Delete Role
export const useDeleteRole = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Role/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};
