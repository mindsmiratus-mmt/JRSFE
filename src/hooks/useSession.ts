// hooks/useSession.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import api from "@/lib/axios"; // Adjust this import path based on where your axios/api instance is

// ==========================================
// TYPES
// ==========================================

export interface CreateSessionPayload {
  userId: number;
  shopId: number;
  timeoutMinutes: number;
}

export interface SessionResponse {
  sessionId: string;
  cartId: string;
  userId: number;
  shopId: number;
  createdAt: string;
  expiresAt?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

const createSession = async (data: CreateSessionPayload): Promise<SessionResponse> => {
  const response = await api.post("/Session/create", data);
  return response.data;
};

const closeSession = async (sessionId: string): Promise<any> => {
  const response = await api.post(`/Session/${sessionId}/close`);
  return response.data;
};

// ==========================================
// HOOKS
// ==========================================

export const useCreateSession = () => {
  return useMutation({
    mutationFn: createSession,
    onError: (error: any) => {
      console.error("Failed to create session:", error);
      toast.error(error?.response?.data?.message || "Failed to start a new session");
    },
  });
};

export const useCloseSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: closeSession,
    onSuccess: () => {
      // Invalidate relevant queries when a session is closed
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: any) => {
      console.error("Failed to close session:", error);
      toast.error(error?.response?.data?.message || "Failed to close the session");
    },
  });
};
