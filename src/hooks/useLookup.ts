import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

export type LookupResponse = {
  metalTypes: string[];
  makingChargeTypes: string[];
  discountTypes: string[];
  units: string[];
  goldPurity: string[];
  diamondPurity: string[];
  silverPurity: string[];
  stoneTypes: string[];
  pricingModel: string[];
  paymentUiLabels: {
    cash: {
      amountLabel: string;
    };
    card: {
      amountLabel: string;
      machineOrBankLabel: string;
      referenceLabel: string;
      noteLabel: string;
    };
    upi: {
      amountLabel: string;
      machineOrBankLabel: string;
      referenceLabel: string;
      noteLabel: string;
    };
    onlineBanking: {
      amountLabel: string;
      machineOrBankLabel: string;
      referenceLabel: string;
      noteLabel: string;
    };
    exchange: {
      amountLabel: string;
      itemNameLabel: string;
      metalTypeLabel: string;
      externalIdLabel: string;
    };
  };
  gst: {
    igst: number;
    cgst: number;
    sgst: number;
  };
  bankNames: string[]; // <-- Added the new bankNames array here
  advanceOrderSettings:{
    minAdvancePercent: number;
  }
};

export const useAllLookUp = () => {
  return useQuery<LookupResponse>({
    queryKey: ["lookup"],          // non-empty, unique key
    queryFn: async () => {
      const { data } = await api.get<LookupResponse>("/Lookup");
      return data;
    },
  });
};

export const useAllBrand = () => {
    return useQuery<any[]>({
        queryKey: ['brand'],
        queryFn: async () => {
            const { data } = await api.get<any[]>(`StockEntry/brands`);
            return data;
        },
    });
};

export const useAllSockItems = () => {
    return useQuery<any[]>({
        queryKey: ['stock-items'],
        queryFn: async () => {
            const { data } = await api.get<any[]>(`StockEntry/items`);
            return data;
        },
    });
};
