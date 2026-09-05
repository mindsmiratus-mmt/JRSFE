import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

interface LoginPayload {
  username: string;
  password: string;
}

interface SwitchShopPayload {
  shopId: number;
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (data: LoginPayload) => {
      const res = await api.post('/Auth/login', data);
      return res.data;
    },
  });
};

export const useSwitchShop = () => {
  return useMutation({
    mutationFn: async (data: SwitchShopPayload) => {
      const res = await api.post('/Auth/switch-shop', data);
      return res.data;
    },
  });
};