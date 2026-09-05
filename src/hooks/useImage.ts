import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios"; // Assuming you have a configured axios instance

// ==========================================
// 1. TYPES
// ==========================================

export interface ImageItem {
  id: number;
  fileName: string;
  itemId: number;
  // Add other fields returned by your GET list API if any
  contentType?: string;
  size?: number;
}

// ==========================================
// 2. API FUNCTIONS
// ==========================================

// Upload Image
const uploadImage = async ({ itemId, file }: { itemId: number; file: File }) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const { data } = await api.post<ImageItem>(`/Image/item/${itemId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

// Get List of Images for an Item
const getImagesByItem = async (itemId: number) => {
  const { data } = await api.get<ImageItem[]>(`/Image/item/${itemId}`);
  return data;
};

// Get Single Image (Blob)
// Returns a Blob URL that can be used in <img src={...} />
const getImageFile = async (itemId: number, fileName: string): Promise<string> => {
  const response = await api.get(`/Image/item/${itemId}/${fileName}`, {
    responseType: "blob", // Important for binary data
  });
  
  // Create a local URL for the blob
  return URL.createObjectURL(response.data);
};

// Delete Image
const deleteImage = async ({ itemId, id }: { itemId: number; id: number }) => {
  await api.delete(`/Image/item/${itemId}/imageId/${id}`);
};

// ==========================================
// 3. HOOKS
// ==========================================

export const useImage = () => {
  const queryClient = useQueryClient();

  // --- A. GET ALL IMAGES FOR AN ITEM ---
  const useGetItemImages = (itemId: number | null | undefined) => {
    return useQuery({
      queryKey: ["images", itemId],
      queryFn: () => getImagesByItem(itemId!),
      enabled: !!itemId, // Only fetch if itemId is present
    });
  };

  // --- B. GET SINGLE IMAGE BLOB URL ---
  // Helper hook if you need to fetch a specific image for display
  const useGetImageBlob = (itemId: number | null, fileName: string | null) => {
    return useQuery({
      queryKey: ["image-blob", itemId, fileName],
      queryFn: () => getImageFile(itemId!, fileName!),
      enabled: !!itemId && !!fileName,
      staleTime: 1000 * 60 * 5, // Cache blob URL for 5 mins
    });
  };

  // --- C. UPLOAD IMAGE ---
  const uploadImageMutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: (_, variables) => {
      // Refresh the list of images for this item
      queryClient.invalidateQueries({ queryKey: ["images", variables.itemId] });
    },
  });

  // --- D. DELETE IMAGE ---
  const deleteImageMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: (_, variables) => {
      // Refresh the list of images for this item
      queryClient.invalidateQueries({ queryKey: ["images", variables.itemId] });
    },
  });

  // --- EXPORT Helper for direct usage ---
  // You can use this function directly in useEffects if you need to load multiple blobs manually
  const fetchImageBlobUrl = async (itemId: number, fileName: string) => {
    try {
      return await getImageFile(itemId, fileName);
    } catch (error) {
      console.error("Failed to fetch image blob", error);
      return null;
    }
  };

  return {
    useGetItemImages,
    useGetImageBlob,
    uploadImage: uploadImageMutation,
    deleteImage: deleteImageMutation,
    fetchImageBlobUrl, // Export helper for manual use
  };
};
