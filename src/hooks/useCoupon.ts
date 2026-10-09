// hooks/useCoupon.ts — Coupon master (JRS api/admin/coupons, Admin only).
// A coupon discounts only eligible making charges (after the existing discount on making): either all lines of
// the cart or the selected items (ItemId = tag number). Redemptions are counted at checkout, not here.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================

export type CouponDiscountType = 'Percentage' | 'Fixed';
export type CouponEligibility = 'AllMakingCharges' | 'SelectedItems';
export type CouponState = 'Active' | 'Scheduled' | 'Expired' | 'Inactive';

export interface CouponItemSummary {
    itemId: number;
    itemName: string;
    category: string;
    metal: string;
}

export interface Coupon {
    id: number;
    shopId: number;
    code: string;
    description?: string | null;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minEligibleMakingCharge?: number | null;
    eligibility: CouponEligibility;
    itemIds: number[];
    /** Detail endpoint only. */
    items?: CouponItemSummary[] | null;
    /** IST wall-clock, e.g. "2026-10-09T10:00:00". */
    validFrom: string;
    validTo: string;
    maxRedemptions?: number | null;
    maxRedemptionsPerCustomer?: number | null;
    redemptionCount: number;
    isActive: boolean;
    state: CouponState;
    /** Redeemed at least once: code, shop and financial terms can no longer change. */
    locked: boolean;
    createDate: string;
    createdBy: string;
    updateDate?: string | null;
    updatedBy?: string | null;
}

/** Dates are IST wall-clock values from a datetime-local input ("2026-10-09T10:00"), sent as is. */
export interface SaveCouponData {
    shopId: number;
    code: string;
    description?: string;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minEligibleMakingCharge?: number | null;
    eligibility: CouponEligibility;
    itemIds?: number[];
    validFrom: string;
    validTo: string;
    maxRedemptions?: number | null;
    maxRedemptionsPerCustomer?: number | null;
    isActive: boolean;
}

export interface CouponFilters {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: '' | 'active' | 'scheduled' | 'expired' | 'inactive';
    shopId?: number | null;
}

export interface PagedCoupons {
    data: Coupon[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ========================
// Query Keys
// ========================
const KEYS = {
    list: (filters: CouponFilters) => ['coupons', filters] as const,
    detail: (id: number) => ['coupon', id] as const,
};

const BASE = '/admin/coupons';

// ========================
// Queries / mutations
// ========================
export const useCoupons = (filters: CouponFilters) =>
    useQuery<PagedCoupons>({
        queryKey: KEYS.list(filters),
        queryFn: async () => {
            const params: Record<string, string | number> = { page: filters.page, pageSize: filters.pageSize };
            if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();
            if (filters.status) params.status = filters.status;
            if (filters.shopId) params.shopId = filters.shopId;
            return (await api.get<PagedCoupons>(BASE, { params })).data;
        },
        placeholderData: keepPreviousData,
    });

export const useCoupon = (id: number | null) =>
    useQuery<Coupon>({
        queryKey: KEYS.detail(id ?? 0),
        queryFn: async () => (await api.get<Coupon>(`${BASE}/${id}`)).data,
        enabled: !!id,
    });

/** Looks up items by ItemId / tag number for the Selected Items list. */
export const lookupCouponItems = async (itemIds: number[]): Promise<CouponItemSummary[]> =>
    itemIds.length === 0
        ? []
        : (await api.get<CouponItemSummary[]>(`${BASE}/items`, { params: { ids: itemIds.join(',') } })).data;

const useInvalidateCoupons = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ['coupons'] });
        queryClient.invalidateQueries({ queryKey: ['coupon'] });
    };
};

export const useCreateCoupon = () => {
    const invalidate = useInvalidateCoupons();
    return useMutation<Coupon, unknown, SaveCouponData>({
        mutationFn: async (payload) => (await api.post<Coupon>(BASE, payload)).data,
        onSuccess: invalidate,
    });
};

export const useUpdateCoupon = () => {
    const invalidate = useInvalidateCoupons();
    return useMutation<Coupon, unknown, { id: number; data: SaveCouponData }>({
        mutationFn: async ({ id, data }) => (await api.put<Coupon>(`${BASE}/${id}`, data)).data,
        onSuccess: invalidate,
    });
};

export const useSetCouponStatus = () => {
    const invalidate = useInvalidateCoupons();
    return useMutation<Coupon, unknown, { id: number; isActive: boolean }>({
        mutationFn: async ({ id, isActive }) => (await api.put<Coupon>(`${BASE}/${id}/status`, { isActive })).data,
        onSuccess: invalidate,
    });
};
