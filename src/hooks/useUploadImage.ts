// hooks/useUploadImage.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';


export interface StockImageMeta {
  id: number;
  itemId: number;
  fileName: string;
  relativePath: string;
  extension: string;
  size: number;
  createdAt?: string;
  createdBy?: string;
}


// GET /api/Image
export const useAllImages = () => {
  return useQuery<string[]>({
    queryKey: ['images'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/Image');
      return data;
    },
  });
};


// GET /api/Image/item/{itemId}
export const useItemImages = (itemId: number | null | undefined) => {
  return useQuery<StockImageMeta[]>({
    queryKey: ['itemImages', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data } = await api.get<StockImageMeta[]>(`/Image/item/${itemId}`);
      return data;
    },
  });
};


export interface UploadImageResponse {
  id: number;
  itemId: number;
  fileName: string;
  relativePath: string;
  extension: string;
  size: number;
  createdAt: string;
  createdBy: string;
}


export interface StockImageUploadPayload {
  itemId: number;
  file: File;
}


// POST /api/Image/item/{itemId}
export const useUploadStockImage = () => {
  const queryClient = useQueryClient();
  return useMutation<UploadImageResponse, Error, StockImageUploadPayload>({
    mutationFn: async ({ itemId, file }) => {
      const formData = new FormData();
      formData.append('file', file);


      const { data } = await api.post<UploadImageResponse>(
        `/Image/item/${itemId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );


      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stockEntry', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['itemImages', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
};


// GET /api/Image/item/{itemId}/{fileName} -> blob for direct image src
export const useItemImageBlob = (
  itemId: number | null | undefined,
  fileName: string | null | undefined
) => {
  return useQuery<Blob>({
    queryKey: ['itemImageBlob', itemId, fileName],
    enabled: !!itemId && !!fileName,
    queryFn: async () => {
      const { data } = await api.get(
        `/Image/item/${itemId}/${encodeURIComponent(fileName!)}`,
        {
          responseType: 'blob',
        }
      );
      return data;
    },
  });
};


// client-side preview for a newly selected file
export const useImagePreview = (file: File | null) => {
  return useQuery<string | null>({
    queryKey: ['imagePreview', file?.name],
    queryFn: async () => {
      if (!file) return null;
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    enabled: !!file,
    staleTime: Infinity,
  });
};


export const getImageBlobUrl = async (
  itemId: number,
  fileName: string
): Promise<string> => {
  const { data } = await api.get(`/Image/item/${itemId}/${encodeURIComponent(fileName)}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
};
