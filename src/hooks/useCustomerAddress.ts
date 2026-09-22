// hooks/useCustomerAddress.ts
//
// Internal POS API for a customer's saved addresses — nested under CustomerController
// (api/Customer/{customerId}/addresses...). Distinct from the public storefront's
// /api/public/customer/addresses, which a POS staff session never calls: staff act on
// behalf of a selected customer, so customerId is always supplied explicitly here rather
// than derived from a token.
//
// Mutation hooks take customerId as part of the mutate() variables rather than as a hook
// argument (unlike the query hook) — this lets the Customer create flow call these hooks
// before a customerId exists, then supply the freshly-created id at call time once the
// customer record itself has been saved.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface CustomerAddress {
    id: number;
    customerId: number;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    addressType: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt?: string | null;
}

export interface CustomerAddressInput {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country?: string;
    addressType?: string;
}

const addressesKey = (customerId: number) => ["customer", customerId, "addresses"] as const;

export const useCustomerAddresses = (customerId: number | null) => {
    return useQuery<CustomerAddress[]>({
        queryKey: customerId ? addressesKey(customerId) : ["customer", "addresses", "disabled"],
        queryFn: async () => {
            const { data } = await api.get<CustomerAddress[]>(`/Customer/${customerId}/addresses`);
            return data;
        },
        enabled: !!customerId,
    });
};

export const useCreateCustomerAddress = () => {
    const queryClient = useQueryClient();

    return useMutation<CustomerAddress, Error, { customerId: number; data: CustomerAddressInput }>({
        mutationFn: async ({ customerId, data }) => {
            const { data: response } = await api.post<CustomerAddress>(`/Customer/${customerId}/addresses`, data);
            return response;
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: addressesKey(variables.customerId) });
        },
    });
};

export const useUpdateCustomerAddress = () => {
    const queryClient = useQueryClient();

    return useMutation<CustomerAddress, Error, { customerId: number; addressId: number; data: CustomerAddressInput }>({
        mutationFn: async ({ customerId, addressId, data }) => {
            const { data: response } = await api.put<CustomerAddress>(
                `/Customer/${customerId}/addresses/${addressId}`,
                data
            );
            return response;
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: addressesKey(variables.customerId) });
        },
    });
};

export const useDeleteCustomerAddress = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { customerId: number; addressId: number }>({
        mutationFn: async ({ customerId, addressId }) => {
            await api.delete(`/Customer/${customerId}/addresses/${addressId}`);
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: addressesKey(variables.customerId) });
        },
    });
};

export const useSetDefaultCustomerAddress = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { customerId: number; addressId: number }>({
        mutationFn: async ({ customerId, addressId }) => {
            await api.put(`/Customer/${customerId}/addresses/${addressId}/default`);
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: addressesKey(variables.customerId) });
        },
    });
};
