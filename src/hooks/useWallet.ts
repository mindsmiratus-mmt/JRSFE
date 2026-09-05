import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import api from "@/lib/axios"; // <-- your configured axios instance

const WALLET_API_BASE = "/Wallet"; // Adjusted base to match swagger definition

// ================================
// 1. Types Definitions
// ================================

export interface WalletDetails {
  id: number;
  customerId: number;
  phone: string;
  balance: number;
  rewardBalance: number;
  returnBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustWalletPayload {
  phone: string;
  amount: number;
  source: string;
}

export interface RewardQueryParams {
  level?: number;
  isRolledBack?: boolean;
  fromDate?: string; // ISO string format
  toDate?: string;   // ISO string format
}

// Derived from /api/Wallet/ledger/{customerId} response
export interface WalletLedgerEntry {
  id: number;
  walletId: number;
  customerId: number;
  transactionType: "Credit" | "Debit" | string;
  source: string;
  referenceId: number;
  referenceNo: string;
  amount: number;
  balanceAfter: number;
  rewardBalanceAfter: number;
  returnBalanceAfter: number;
  note: string;
  createdAt: string;
}

// Derived from /api/Wallet/rewards/{customerId} response
export interface WalletRewardEntry {
  id: number;
  invoiceId: number;
  invoiceNo: string;
  customerId: number;
  customerName: string;
  level: number;
  percentage: number;
  rewardAmount: number;
  note: string;
  isRolledBack: boolean;
  createdAt: string;
  rolledBackAt?: string; // Optional since it might not exist if not rolled back
}

// Derived from /api/Wallet/old-metal-purchases/{customerId} response
export interface OldMetalPurchaseEntry {
  id: number;
  purchaseNo: string;
  customerId: number;
  metalType: string;
  grossWeight: number;
  netWeight: number;
  rate: number;
  totalCost: number;
  purity: string;
  purityPercent: number;
  remarks: string;
  shopId: number;
  purchaseDate: string;
  createDate: string;
  createdBy: string;
}

export interface OldMetalPurchasePayload {
  id?: number;
  purchaseNo?: string;
  customerId: number;
  metalType: string;
  grossWeight: number;
  netWeight: number;
  rate: number;
  totalCost: number;
  purity: string;
  purityPercent?: number; 
  remarks?: string;
  shopId: number;
  purchaseDate?: string;
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
}

export interface PayoutEntry {
  id?: number;
  walletPayoutId?: number;
  method: string;
  amount: number;
  reference?: string;
  note?: string;
}

export interface PayoutPayload {
  id?: number;
  payoutNo?: string;
  customerId: number;
  amount: number;
  note?: string;
  shopId: number;
  payoutDate?: string;
  entries: PayoutEntry[];
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
}

// ================================
// 2. Wallet Hooks
// ================================

// ---- Fetch Wallet by Phone ----
export const useWalletByPhone = (phone: string | null) => {
  return useQuery<WalletDetails>({
    queryKey: ["wallet", "phone", phone],
    queryFn: async () => {
      const { data } = await api.get<WalletDetails>(`${WALLET_API_BASE}/by-phone/${phone}`);
      return data;
    },
    enabled: !!phone && phone.length >= 10,
  });
};

// ---- Fetch Wallet by Customer ID ----
export const useWalletByCustomerId = (customerId: number | null) => {
  return useQuery<WalletDetails>({
    queryKey: ["wallet", "customer", customerId],
    queryFn: async () => {
      const { data } = await api.get<WalletDetails>(`${WALLET_API_BASE}/by-customer/${customerId}`);
      return data;
    },
    enabled: !!customerId,
  });
};

// ---- Fetch Wallet Ledger ----
export const useWalletLedger = (customerId: number | null) => {
  return useQuery<WalletLedgerEntry[]>({
    queryKey: ["wallet", "ledger", customerId],
    queryFn: async () => {
      const { data } = await api.get<WalletLedgerEntry[]>(`${WALLET_API_BASE}/ledger/${customerId}`);
      return data;
    },
    enabled: !!customerId,
  });
};

// ---- Fetch Wallet Rewards ----
export const useWalletRewards = (customerId: number | null, params?: RewardQueryParams) => {
  return useQuery<WalletRewardEntry[]>({
    queryKey: ["wallet", "rewards", customerId, params],
    queryFn: async () => {
      const { data } = await api.get<WalletRewardEntry[]>(`${WALLET_API_BASE}/rewards/${customerId}`, { params });
      return data;
    },
    enabled: !!customerId,
  });
};

// ---- Fetch Old Metal Purchases ----
export const useOldMetalPurchases = (customerId: number | null) => {
  return useQuery<OldMetalPurchaseEntry[]>({
    queryKey: ["wallet", "old-metal-purchases", customerId],
    queryFn: async () => {
      const { data } = await api.get<OldMetalPurchaseEntry[]>(`${WALLET_API_BASE}/old-metal-purchases/${customerId}`);
      return data;
    },
    enabled: !!customerId,
  });
};

// ================================
// 3. Mutation Hooks
// ================================

// ---- Adjust Wallet Balance ----
export const useAdjustWallet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ phone, amount, source }: AdjustWalletPayload) => {
      const { data } = await api.post(`${WALLET_API_BASE}/adjust/${phone}`, { amount, source });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", "phone", variables.phone] });
      // Invalidate customer and ledger too, if you want balance changes reflected everywhere
      toast.success("Wallet updated successfully!");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error.message || "Failed to adjust wallet";
      toast.error(errorMsg);
    }
  });
};

// ---- Old Metal Purchase ----
export const useOldMetalPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OldMetalPurchasePayload) => {
      const { data } = await api.post(`${WALLET_API_BASE}/old-metal-purchase`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific customer's wallet, ledger, and old purchases to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["wallet", "customer", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "ledger", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "old-metal-purchases", variables.customerId] });
      toast.success("Old metal purchase recorded successfully!");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error.message || "Failed to record purchase";
      toast.error(errorMsg);
    }
  });
};

// ---- Payout ----
export const usePayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PayoutPayload) => {
      const { data } = await api.post(`${WALLET_API_BASE}/payout`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific customer's wallet and ledger data
      queryClient.invalidateQueries({ queryKey: ["wallet", "customer", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "ledger", variables.customerId] });
      toast.success("Payout processed successfully!");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error.message || "Failed to process payout";
      toast.error(errorMsg);
    }
  });
};