import { createContext, useContext, useState, type ReactNode } from 'react';
import api from '@/lib/axios';
import { useLogin, useSwitchShop } from '@/hooks/useLogin';

interface Permission {
  Module: string;
  Read: boolean;
  Create: boolean;
  Update: boolean;
  Delete: boolean;
}

interface Role {
  id: number;
  name: string;
  permissions: string;
}

// FIX: Added `shop?: Shop;` so TypeScript knows roles have assigned shops
interface UserRole {
  id: number;
  role: Role;
  shop?: Shop; 
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  gstNo: string;
  isActive: boolean;
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
}

interface User {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  phone?: string;
  employeeId?: string;
  isActive?: boolean;
  userRoles: UserRole[];
  shop?: Shop;
}

interface LoginResponse {
  token: string;
  user: User;
  assignedShops?: Shop[];
}

interface SwitchShopResponse {
  token: string;
  selectedShopId: number;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  activeRoleId: number | null;
  selectedShop?: Shop | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  setShop: (shop: Shop) => void;
  login: (username: string, password: string) => Promise<LoginResponse>;
  switchShop: (shop: Shop) => Promise<SwitchShopResponse>;
  logout: () => void;
  switchRole: (roleId: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const loginMutation = useLogin();
  const switchShopMutation = useSwitchShop();

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeRoleId, setActiveRoleId] = useState<number | null>(() => {
    const stored = localStorage.getItem('activeRoleId');
    return stored ? Number(stored) : null;
  });

  const [selectedShop, setSelectedShop] = useState<Shop | null>(() => {
    const stored = localStorage.getItem('selectedShop');
    return stored ? JSON.parse(stored) : null;
  });

  const [permissions, setPermissions] = useState<Permission[]>(() => {
    const stored = localStorage.getItem('permissions');
    return stored ? JSON.parse(stored) : [];
  });

  const extractPermissions = (user: User, roleId: number) => {
    const roleEntry = user.userRoles.find((r) => r.role.id === roleId);

    if (!roleEntry?.role?.permissions) {
      return [];
    }

    try {
      return JSON.parse(roleEntry.role.permissions);
    } catch (err) {
      console.error('Invalid permissions JSON:', roleEntry.role.permissions);
      return [];
    }
  };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await loginMutation.mutateAsync({ username, password });
    const { token, user } = response as LoginResponse;

    const defaultRoleId = user.userRoles[0]?.role?.id ?? null;
    const perms = defaultRoleId ? extractPermissions(user, defaultRoleId) : [];

    setUser(user);
    setActiveRoleId(defaultRoleId);
    setPermissions(perms);
    setSelectedShop(null);

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('permissions', JSON.stringify(perms));

    if (defaultRoleId !== null) {
      localStorage.setItem('activeRoleId', String(defaultRoleId));
    } else {
      localStorage.removeItem('activeRoleId');
    }

    localStorage.removeItem('selectedShop');
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    return response as LoginResponse;
  };

  const setShop = (shop: Shop) => {
    setSelectedShop(shop);
    localStorage.setItem('selectedShop', JSON.stringify(shop));
  };

  const switchShop = async (shop: Shop): Promise<SwitchShopResponse> => {
    const currentToken = localStorage.getItem('token');

    if (!currentToken) {
      throw new Error('No active session found. Please login again.');
    }

    const response = await switchShopMutation.mutateAsync({ shopId: shop.id });

    localStorage.setItem('token', response.token);
    localStorage.setItem('selectedShop', JSON.stringify(shop));
    api.defaults.headers.common.Authorization = `Bearer ${response.token}`;
    setSelectedShop(shop);

    return response as SwitchShopResponse;
  };

  const switchRole = (roleId: number) => {
    if (!user) return;

    const perms = extractPermissions(user, roleId);

    setActiveRoleId(roleId);
    setPermissions(perms);

    localStorage.setItem('activeRoleId', String(roleId));
    localStorage.setItem('permissions', JSON.stringify(perms));
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    setActiveRoleId(null);
    setSelectedShop(null);
    delete api.defaults.headers.common.Authorization;
    localStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRoleId,
        permissions,
        selectedShop,
        isAuthenticated: !!user,
        login,
        logout,
        setShop,
        switchShop,
        switchRole,
        isLoading: loginMutation.isPending || switchShopMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};