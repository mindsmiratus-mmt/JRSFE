import React from "react";
import { Store } from "lucide-react";
import { useAllShops, type Shop } from "@/hooks/useShop";

interface ShopSelectProps {
  value: number | string | null | undefined;
  onChange: (shopId: number | null) => void;
  showAllOption?: boolean;
  className?: string;
}

export const ShopSelect: React.FC<ShopSelectProps> = ({
  value,
  onChange,
  showAllOption = true,
  className = "",
}) => {
  const { data: shops = [], isLoading } = useAllShops();

  const selectedShopObj = shops.find((s) => s.id === Number(value));
  const currentTitle =
    value === "ALL" || value === null || value === undefined
      ? "All Shops (Global View)"
      : selectedShopObj
      ? `${selectedShopObj.name}${selectedShopObj.city ? ` (${selectedShopObj.city})` : ""}`
      : "Select Shop";

  return (
    <div
      className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs font-medium w-full max-w-full min-w-0 overflow-hidden ${className}`}
    >
      <Store className="w-4 h-4 text-[#b08d28] shrink-0" />
      <span className="text-slate-600 font-semibold shrink-0">Shop:</span>
      <select
        value={value === null || value === undefined ? "ALL" : value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === "ALL" ? null : Number(val));
        }}
        disabled={isLoading}
        title={currentTitle}
        className="flex-1 min-w-0 w-full bg-transparent border-none text-slate-800 font-medium focus:ring-0 focus:outline-none cursor-pointer pr-2 text-xs truncate overflow-hidden text-ellipsis"
      >
        {showAllOption && <option value="ALL">All Shops (Global View)</option>}
        {shops.map((shop: Shop) => {
          const label = `${shop.name}${shop.city ? ` (${shop.city})` : ""}`;
          return (
            <option key={shop.id} value={shop.id} title={label}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default ShopSelect;
