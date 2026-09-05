import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getModulePermissions } from '@/utils/permission';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Layers,
  TrendingUp,
  UserCircle,
  FileText,
  Package,
  Store,
  Boxes,
  Tag,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  CheckCircle2,
  ShoppingCart,
  ChevronDown,
  Settings,
  RotateCcw,
  Wrench,
  FileSpreadsheet,
  ShoppingBag,
  PackageCheck,
  Coins,
  BarChart3,
} from 'lucide-react';

interface SubMenuItem {
  name: string;
  path: string;
  module: string;
  icon: React.ElementType;
}

interface MenuItem {
  name: string;
  path?: string;
  module?: string;
  icon: React.ElementType;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    module: 'Dashboard',
    icon: LayoutDashboard
  },
  { 
    name: 'Customer', 
    path: '/admin/customer', 
    module: 'Customer', 
    icon: UserCircle 
  },
  {
    name: 'Admin',
    icon: Settings,
    children: [
      { name: 'User Management', path: '/admin/user', module: 'User Management', icon: Users },
      { name: 'Role Management', path: '/admin/role', module: 'Role Management', icon: ShieldCheck },
      { name: 'Category', path: '/admin/category', module: 'Category', icon: Layers },
      { name: 'Current Rate', path: '/admin/currentrate', module: 'Current Rate', icon: TrendingUp },
      { name: 'Shop', path: '/admin/shop', module: 'Shop', icon: Store },
      { name: 'Vendor', path: '/admin/vendor', module: 'Vendor', icon: Truck },
    ]
  },
  {
    name: 'Stock',
    icon: Boxes,
    children: [
      { name: 'Stock', path: '/admin/stock', module: 'Stock', icon: Boxes },
      { name: 'Sale Approval', path: '/admin/sale-item-availability', module: 'Sale Item Availability', icon: CheckCircle2 },
      { name: 'Stock Available', path: '/admin/stock-available', module: 'Stock Available', icon: CheckCircle2 },
      // { name: 'Stock Movement', path: '/admin/stock-movement', module: 'Stock Movement', icon: ArrowLeftRight },
      { name: 'Stock Transfer', path: '/admin/stock-transfer', module: 'Stock Transfer', icon: ArrowLeftRight },
      { name: 'Stock Transfer Approval', path: '/admin/stock-transfer-approve', module: 'Stock Transfer', icon: CheckCircle2 },  
      { name: 'Stock Transfer Receive', path: '/admin/stock-transfer-receive', module: 'Stock Transfer', icon: CheckCircle2 },  
      // { name: 'Tag', path: '/admin/tag', module: 'Tag', icon: Tag },
      { name: 'Porter', path: '/admin/Porter', module: 'Porter', icon: Package }
      // { name: 'Item', path: '/admin/item', module: 'Item', icon: Package },
    ]
  },
  {
    name: 'Sale',
    icon: ShoppingCart,
    children: [
      { name: 'Sale', path: '/admin/sale', module: 'Sale', icon: ShoppingCart },
      { name: 'Advance Order', path: '/admin/advance-order', module: 'Advance Order', icon: ClipboardList },
      { name: 'Invoice', path: '/admin/invoice', module: 'Invoice', icon: FileText },
      { name: 'Sale Report', path: '/admin/sale-report', module: 'Sale Report', icon: FileSpreadsheet },
      { name: 'Returns', path: '/admin/return', module: 'Return', icon: RotateCcw },
      { name: 'Pending Returns', path: '/admin/return-item', module: 'Return', icon: CheckCircle2 },
      { name: 'Item Repair', path: '/admin/item-repair', module: 'Item Repair', icon: Wrench },
    ]
  },
  {
    name: 'Reports',
    icon: BarChart3,
    children: [
      { name: 'Sale Report (Itemwise)', path: '/admin/reports/sale-itemwise', module: 'Sale Report (Itemwise)', icon: Boxes },
      { name: 'Sale Report (Billwise)', path: '/admin/reports/sale-billwise', module: 'Sale Report (Billwise)', icon: FileText },
      { name: 'Purchase Report', path: '/admin/reports/purchase', module: 'Purchase Report', icon: ShoppingBag },
      { name: 'Received Report', path: '/admin/reports/received', module: 'Received Report', icon: CheckCircle2 },
      { name: 'Transfer Report', path: '/admin/reports/transfer', module: 'Transfer Report', icon: ArrowLeftRight },
      { name: 'Available Stock Report', path: '/admin/reports/available-stock', module: 'Available Stock Report', icon: PackageCheck },
      { name: 'Return Report', path: '/admin/reports/return', module: 'Return Report', icon: RotateCcw },
      { name: 'Metal Report', path: '/admin/reports/metal', module: 'Metal Report', icon: Coins },
    ]
  }
];

interface SideNavbarProps {
  open: boolean;
  onClose: () => void;
}

export const SideNavbar = ({ open, onClose }: SideNavbarProps) => {
  const { permissions, user } = useAuth();
  const location = useLocation();

  const [openDropdowns, setOpenDropdowns] = useState<string[]>(['Admin', 'Stock', 'Sale', 'Reports']);

  const isAdmin = user?.userRoles?.some((ur: any) => ur.role?.name === 'Admin') ?? false;

  const hasReadPermission = (moduleName?: string) => {
    if (!moduleName) return true;
    const perms = getModulePermissions(permissions, user, moduleName);
    return perms.hasRead;
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <>
      {/* BACKDROP (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[#2b463f] text-[#e6f2ef] border-[#3d5f55]",
          "transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
          // Mobile state: slide in/out (covers full screen height)
          open ? "translate-x-0 w-64 border-r" : "-translate-x-full w-64 border-r-0",
          // Desktop state: relative to flex container, sits under TopNavbar
          "lg:static lg:translate-x-0 lg:h-full",
          open ? "lg:w-64" : "lg:w-0 lg:border-r-0"
        )}
      >
        <div className="w-64 flex flex-col h-full py-4">
          {/* Hide scrollbar but keep functionality */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) => {
              // Handle items with children (Dropdown menus)
              if (item.children) {
                const authorizedChildren = item.children.filter(
                  child => hasReadPermission(child.module)
                );

                if (authorizedChildren.length === 0) return null;

                const isOpen = openDropdowns.includes(item.name);
                const isChildActive = authorizedChildren.some(child => location.pathname === child.path);

                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(
                        "w-full group flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                        isChildActive && !isOpen ? "bg-[#3d5f55] text-white" : "text-[#b7d1ca] hover:bg-[#3d5f55] hover:text-[#dff5ef]"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-[#8fa39e] group-hover:text-[#dff5ef]" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200 text-[#8fa39e]",
                          isOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="pl-6 space-y-1 mt-1">
                        {authorizedChildren.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => {
                              if (window.innerWidth < 1024) onClose();
                            }}
                            className={({ isActive }) =>
                              cn(
                                "group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                isActive
                                  ? "bg-[#9fd3c7] text-[#1e2f2a] shadow-sm"
                                  : "text-[#b7d1ca] hover:bg-[#3d5f55] hover:text-[#dff5ef]"
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <child.icon
                                  className={cn(
                                    "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
                                    isActive
                                      ? "text-[#1e2f2a]"
                                      : "text-[#8fa39e] group-hover:text-[#dff5ef]"
                                  )}
                                />
                                <span>{child.name}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Handle single level items
              if (!item.path || !hasReadPermission(item.module)) {
                return null;
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                      isActive
                        ? "bg-[#9fd3c7] text-[#1e2f2a] shadow-sm"
                        : "text-[#b7d1ca] hover:bg-[#3d5f55] hover:text-[#dff5ef]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                          isActive
                            ? "text-[#1e2f2a]"
                            : "text-[#8fa39e] group-hover:text-[#dff5ef]"
                        )}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};