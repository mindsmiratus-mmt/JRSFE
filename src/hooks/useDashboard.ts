import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

/* ========================
   Helpers
======================== */

const getShopId = (): string | number | null => {
  const storedShop = localStorage.getItem("selectedShop");

  if (!storedShop) return null;

  try {
    const shopData: any = JSON.parse(storedShop);
    return shopData?.id ?? null;
  } catch {
    return null;
  }
};

/* ========================
   Types
======================== */

export interface DashboardCountsResponse {
  totalSell: number;
  totalCustomers: number;
  totalItems: number;
}

export interface TotalSellResponse {
  totalSell: number;
}

export interface TotalCustomersResponse {
  totalCustomers: number;
}

export interface TotalItemsResponse {
  totalItems: number;
}

export interface OldMetalPurchaseByMetalType {
  metalType: string;
  totalPurchases: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalCost: number;
}

export interface OldMetalPurchaseByShop {
  shopId: number;
  totalPurchases: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalCost: number;
  byMetalType: OldMetalPurchaseByMetalType[];
}

export interface OldMetalPurchaseSummaryResponse {
  filters: {
    shopId?: number;
    fromDate?: string;
    toDate?: string;
  };
  totalPurchases: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalCost: number;
  byMetalType: OldMetalPurchaseByMetalType[];
  byShop: OldMetalPurchaseByShop[];
}

/* ========================
   Hooks
======================== */

// 1️⃣ Combined dashboard counts
export const useDashboardCounts = () => {
  const shopId = getShopId();

  return useQuery<DashboardCountsResponse>({
    queryKey: ["dashboard", "counts", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await api.get<DashboardCountsResponse>(
        `/Dashboard/counts`,
        {
          params: { shopId },
        }
      );

      return data;
    },
    staleTime: 1000 * 60,
  });
};

// 2️⃣ Total Sell (with date filters)
export const useTotalSell = (
  fromDate?: string | null,
  toDate?: string | null
) => {
  const shopId = getShopId();

  return useQuery<TotalSellResponse>({
    queryKey: ["dashboard", "total-sell", shopId, fromDate, toDate],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await api.get<TotalSellResponse>(
        `/Dashboard/total-sell`,
        {
          params: {
            shopId,
            ...(fromDate ? { fromDate } : {}),
            ...(toDate ? { toDate } : {}),
          },
        }
      );

      return data;
    },
    staleTime: 1000 * 30,
  });
};

// 3️⃣ Total Customers
export const useTotalCustomers = () => {
  const shopId = getShopId();

  return useQuery<TotalCustomersResponse>({
    queryKey: ["dashboard", "total-customers", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await api.get<TotalCustomersResponse>(
        `/Dashboard/total-customers`,
        {
          params: { shopId },
        }
      );

      return data;
    },
    staleTime: 1000 * 60,
  });
};

// 4️⃣ Total Items
export const useTotalItems = () => {
  const shopId = getShopId();

  return useQuery<TotalItemsResponse>({
    queryKey: ["dashboard", "total-items", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await api.get<TotalItemsResponse>(
        `/Dashboard/total-items`,
        {
          params: { shopId },
        }
      );

      return data;
    },
    staleTime: 1000 * 60,
  });
};

// 5️⃣ Old Metal Purchase Summary
export const useOldMetalPurchaseSummary = (
  fromDate?: string | null,
  toDate?: string | null
) => {
  const shopId = getShopId();

  return useQuery<OldMetalPurchaseSummaryResponse>({
    queryKey: ["dashboard", "old-metal-purchase-summary", shopId, fromDate, toDate],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await api.get<OldMetalPurchaseSummaryResponse>(
        `/Dashboard/old-metal-purchase-summary`,
        {
          params: {
            shopId,
            ...(fromDate ? { fromDate } : {}),
            ...(toDate ? { toDate } : {}),
          },
        }
      );

      return data;
    },
    staleTime: 1000 * 30,
  });
};