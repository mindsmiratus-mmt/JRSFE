// hooks/useInvoice.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Full Types (Exact match with your API JSON)
// ========================

// Customer (nested inside Invoice)
export interface CustomerInInvoice {
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
    createDate: string;
    createdBy: string;
    updateDate?: string;
    updatedBy?: string;
    passwordHash?: string; // Sometimes returned
}

export interface ShopInInvoice {
    id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    phone: string;
    email: string;
    gstNo: string;
    shopCode: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
}

// Invoice Line Item (Flattened pricing and item details)
export interface InvoiceItem {
    id: number;
    invoiceId: number;
    itemId: number;
    isReturn: boolean;
    
    // Item Details
    brand: string;
    tagNumber: string;
    itemName: string;
    metal: string;
    category: string;
    quantity: number;
    
    // Purity & Weight
    gPurityId: string;
    purityPercent: string;
    dPurityId: string;
    clarity: string;
    color: string;
    cut: string;
    shape: string;
    stoneName: string;
    grossWeight: number;
    stoneWeight: number;
    diamondWeight: number;
    diamondCarat: number;
    netWeight: number;
    
    // Pricing details
    pricingModel: string;
    hsnCode: string;
    remarks: string;
    tagePrice: number;
    imageUrl: string;
    huid: string;
    
    // Material Costs
    goldCost: number;
    diamondCost: number;
    stoneCost: number;
    makingCharges: number;
    discount: number;
    
    // Rates & Discounts specific to materials
    goldRate: number;
    goldMakingChargeRaw: number;
    goldMakingChargeType: string;
    goldMakingChargeApplied: number;
    goldDiscountRaw: number;
    goldDiscountType: string;
    discountOnMaking: number;
    
    diamondRate: number;
    diamondUnit: string;
    diamondMakingChargeRaw: number;
    diamondMakingChargeType: string;
    diamondDiscountRaw: number;
    diamondDiscountType: string;
    diamondDiscount: number;
    
    stoneRate: number;
    stoneDiscountRaw: number;
    stoneDiscountType: string;
    stoneDiscount: number;
    
    // Taxes & Totals
    igst: number;
    cgst: number;
    sgst: number;
    igstPercent: number;
    totalSalePriceBeforeTax: number;
    totalSalePrice: number;
    
    createDate: string;
    createdBy: string;
}

// Main Invoice Interface (Exact match with your JSON)
export interface Invoice {
    id: number;
    invoiceNo: string;
    invoiceDate: string; // ISO string
    customerId: number;
    customer: CustomerInInvoice;
    shopId: number;
    shop: ShopInInvoice;
    
    // Invoice Totals & Payments
    totalAmount: number;
    paidAmount: number;
    paymentMethod: string;
    orderPaymentId: number;
    walletRedeemedAmount: number;
    status: string;
    pdfPath: string;
    
    // Taxes at invoice level
    igst: number;
    cgst: number;
    sgst: number;
    
    items: InvoiceItem[];
    
    createDate: string;
    createdBy: string;
    updateDate?: string;
    updatedBy?: string;
}

// ========================
// Paginated Response Type
// ========================
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
// Filter Types
// ========================
export interface InvoiceFilters {
    page?: number;
    pageSize?: number;
    keyword?: string;
    fromDate?: string | null;
    toDate?: string | null;
    shopId?: number;
    invoiceNumber?: string;
    customerName?: string;
}

// ========================
// Payload Types (What you send to API)
// ========================

// Create Invoice — only fields you control
export interface CreateInvoiceData {
    invoiceDate: string;
    customerId: number;
    paidAmount?: number;
    totalAmount: number;
    status?: string;
    cgst?: number;
    sgst?: number;
    items: {
        itemId: number;
        weight: number;
        rate: number;
        makingCharge?: number;
    }[];
}

// Update Invoice — partial update
export interface UpdateInvoiceData {
    id: number;
    invoiceNo: string;
    invoiceDate?: string;
    customerId?: number;
    paidAmount?: number;
    totalAmount: number;
    status?: string;
    cgst?: number;
    sgst?: number;
    items?: {
        id?: number; // if updating existing line item
        itemId: number;
        weight: number;
        rate: number;
        makingCharge?: number;
    }[];
}

// ========================
// React Query Hooks
// ========================

// 1. Get Paginated Invoices
export const useInvoices = (filters: InvoiceFilters = {}) => {
    const {
        page = 1,
        pageSize = 10,
        keyword = "",
        fromDate = null,
        toDate = null,
        shopId,
        invoiceNumber,
        customerName
    } = filters;

    return useQuery<PaginatedResponse<Invoice>>({
        queryKey: ['invoices', { page, pageSize, keyword, fromDate, toDate, shopId, invoiceNumber, customerName }],
        queryFn: async () => {
            const params = new URLSearchParams();

            params.append('page', page.toString());
            params.append('pageSize', pageSize.toString());

            if (keyword.trim()) params.append('keyword', keyword.trim());
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);
            if (shopId) params.append('shopId', shopId.toString());
            if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
            if (customerName) params.append('customerName', customerName);

            const { data } = await api.get<PaginatedResponse<Invoice>>(
                `/Invoice?${params.toString()}`
            );

            return data;
        },
        staleTime: 1000 * 30, // 30 seconds
    });
};

// 2. Get Single Invoice by ID
export const useInvoice = (id: number | null) => {
    return useQuery<Invoice>({
        queryKey: ['invoice', id],
        queryFn: async () => {
            const { data } = await api.get<Invoice>(`/Invoice/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

// 3. Create Invoice
export const useCreateInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation<Invoice, Error, CreateInvoiceData>({
        mutationFn: async (payload) => {
            const { data } = await api.post<Invoice>('/Invoice', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
};

// 4. Update Invoice
export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation<
        Invoice,
        Error,
        { id: number; data: UpdateInvoiceData }
    >({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.put<Invoice>(`/Invoice/${id}`, data);
            return response;
        },
        onSuccess: (updatedInvoice, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.setQueryData(['invoice', id], updatedInvoice);
        },
    });
};

// 5. Delete Invoice
export const useDeleteInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            await api.delete(`/Invoice/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
};

// 6. Get All Invoices (Non-paginated)
export const useAllInvoice = () => {
    return useQuery<Invoice[]>({
        queryKey: ['all_invoice'],
        queryFn: async () => {
            const { data } = await api.get<Invoice[]>(`/Invoice/all`);
            return data;
        },
    });
};

// 7. Fetch Invoice PDF by ID
export const useInvoicePdf = () => {
    return useMutation<Blob, Error, number>({
        mutationFn: async (id: number) => {
            const { data } = await api.get<Blob>(`/Invoice/${id}/pdf`, {
                responseType: 'blob', 
            });
            return data;
        },
    });
};