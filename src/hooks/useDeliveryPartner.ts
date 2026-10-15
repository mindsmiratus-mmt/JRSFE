// hooks/useDeliveryPartner.ts — Delivery Partner (courier) master and advance order courier details.
// Admin master: JRS api/admin/delivery-partners (Admin only). Staff: api/delivery-partners/active and
// api/order/{id}/courier | mark-delivered (Admin, Sales, Sales Manager). No courier API is called.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================

/** As the admin API returns it — the API key itself is never returned, only whether one is stored. */
export interface DeliveryPartner {
    id: number;
    name: string;
    trackingUrl?: string | null;
    hasApiKey: boolean;
    isActive: boolean;
    createDate: string;
    createdBy: string;
    updateDate?: string | null;
    updatedBy?: string | null;
}

/** ApiKey is write-only: undefined keeps the stored key, "" clears it. */
export interface SaveDeliveryPartnerData {
    name: string;
    trackingUrl?: string;
    apiKey?: string;
    isActive: boolean;
}

export interface ActiveDeliveryPartner {
    id: number;
    name: string;
}

export interface AdvanceOrderCourier {
    orderId: number;
    deliveryPartnerId?: number | null;
    deliveryPartnerName?: string | null;
    trackingNumber?: string | null;
    dispatchedOn?: string | null;
    deliveredOn?: string | null;
    canManageCourier: boolean;
}

export interface CourierSaveResponse {
    courier: AdvanceOrderCourier;
    notifications: { emailQueued: boolean; whatsAppQueued: boolean };
}

/** Dates are IST wall-clock values from a datetime-local input ("2026-10-07T15:45"), sent as is. */
export interface SaveCourierDetailsData {
    orderId: number;
    deliveryPartnerId: number;
    trackingNumber: string;
    dispatchedOn: string;
}

export interface MarkDeliveredData {
    orderId: number;
    deliveredOn: string;
}

// ========================
// Query Keys
// ========================
const KEYS = {
    all: ['deliveryPartners'] as const,
    active: ['deliveryPartnersActive'] as const,
};

const ADMIN_BASE = '/admin/delivery-partners';

// ========================
// Master (Admin)
// ========================
export const useDeliveryPartners = () =>
    useQuery<DeliveryPartner[]>({
        queryKey: KEYS.all,
        queryFn: async () => (await api.get<DeliveryPartner[]>(ADMIN_BASE)).data,
    });

export const useCreateDeliveryPartner = () => {
    const queryClient = useQueryClient();
    return useMutation<DeliveryPartner, unknown, SaveDeliveryPartnerData>({
        mutationFn: async (payload) => (await api.post<DeliveryPartner>(ADMIN_BASE, payload)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: KEYS.active });
        },
    });
};

export const useUpdateDeliveryPartner = () => {
    const queryClient = useQueryClient();
    return useMutation<DeliveryPartner, unknown, { id: number; data: SaveDeliveryPartnerData }>({
        mutationFn: async ({ id, data }) => (await api.put<DeliveryPartner>(`${ADMIN_BASE}/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: KEYS.active });
        },
    });
};

// ========================
// Advance order courier details (staff)
// ========================
export const useActiveDeliveryPartners = (enabled = true) =>
    useQuery<ActiveDeliveryPartner[]>({
        queryKey: KEYS.active,
        queryFn: async () => (await api.get<ActiveDeliveryPartner[]>('/delivery-partners/active')).data,
        enabled,
    });

export const useSaveCourierDetails = () => {
    const queryClient = useQueryClient();
    return useMutation<CourierSaveResponse, unknown, SaveCourierDetailsData>({
        mutationFn: async ({ orderId, ...body }) =>
            (await api.put<CourierSaveResponse>(`/order/${orderId}/courier`, body)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orderList'] }),
    });
};

export const useMarkDelivered = () => {
    const queryClient = useQueryClient();
    return useMutation<CourierSaveResponse, unknown, MarkDeliveredData>({
        mutationFn: async ({ orderId, deliveredOn }) =>
            (await api.post<CourierSaveResponse>(`/order/${orderId}/mark-delivered`, { deliveredOn })).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orderList'] }),
    });
};
