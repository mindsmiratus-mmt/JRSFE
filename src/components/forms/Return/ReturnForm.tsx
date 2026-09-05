// src/pages/returns/ReturnForm.tsx
import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Tag, User, Store, IndianRupee } from "lucide-react";
import { useAllLookUp } from "@/hooks/useLookup"; // <-- Lookup Hook
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 

import { useInvoice, useAllInvoice } from "@/hooks/useInvoice";
import {
  useCreateReturn,
  type ReturnItemPayload,
  type CreateReturnPayload,
} from "@/hooks/useReturn";
import { SearchableSelect, type OptionType } from "@/components/ui/SearchableSelect";

// This mirrors the rich item shape you get from the Invoice API (return invoice).
interface RichInvoiceItem {
  id: number;
  invoiceId: number;
  itemId: number;
  brand?: string;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;
  gPurityId?: string;
  purityPercent?: number | string;
  dPurityId?: string;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  stoneName?: string;
  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;
  goldCost?: number;
  diamondCost?: number;
  stoneCost?: number;
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalSalePrice?: number;
  totalSalePriceBeforeTax?: number;
  goldRate?: number;
  goldMakingChargeRaw?: number;
  goldMakingChargeType?: string | null;
  goldDiscountRaw?: number;
  goldDiscountType?: string | null;
  diamondRate?: number;
  diamondUnit?: string | null;
  diamondMakingChargeRaw?: number;
  diamondMakingChargeType?: string | null;
  diamondDiscountRaw?: number;
  diamondDiscountType?: string | null;
  stoneRate?: number;
  stoneDiscountRaw?: number;
  stoneDiscountType?: string | null;
  igstPercent?: number;
  isReturn?: boolean;
}

// Local type for editing (subset of ReturnItemPayload)
type EditableFields = Pick<
  ReturnItemPayload,
  | "grossWeight"
  | "stoneWeight"
  | "diamondWeight"
  | "diamondCarat"
  | "netWeight"
  | "goldRate"
  | "goldMakingChargeRaw"
  | "goldMakingChargeType"
  | "goldDiscountRaw"
  | "goldDiscountType"
  | "diamondRate"
  | "diamondUnit"
  | "diamondMakingChargeRaw"
  | "diamondMakingChargeType"
  | "diamondDiscountRaw"
  | "diamondDiscountType"
  | "stoneRate"
  | "stoneCost"
  | "stoneDiscountRaw"
  | "stoneDiscountType"
  | "totalReturnPrice"
  | "igstPercent" 
  | "igst"        
  | "cgst"        
  | "sgst"        
>;

// We extend ReturnItemPayload with UI flags for selection and alreadyReturned
type ReturnItemWithFlags = ReturnItemPayload & {
  selected: boolean;        // whether this item is selected to be returned now
  alreadyReturned: boolean; // whether invoice says this item was already returned
};

// Popup dialog for editing one return item
interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: {
    tagNumber?: string;
    itemName?: string;
    metal?: string;
    purity?: string;
    igstPercent?: number;
  };
  values: EditableFields;
  onChange: (vals: EditableFields) => void;
  onSave: () => void;
  saving?: boolean;
}

const ItemEditDialog = ({
  open,
  onOpenChange,
  summary,
  values,
  onChange,
  onSave,
  saving = false,
}: ItemDialogProps) => {

  // Fetch the lookup data to populate the Select dropdowns
  const { data: lookupData, isLoading: isLookupLoading } = useAllLookUp();

  const updateNumber = (key: keyof EditableFields, raw: string) => {
    const n = Number(raw);
    onChange({ ...values, [key]: Number.isFinite(n) ? n : 0 });
  };

  const updateText = (key: keyof EditableFields, val: string) => {
    onChange({ ...values, [key]: val });
  };

  useEffect(() => {
    const v = values;
    
    // 1. Gold
    const netWeight = v.netWeight ?? 0;
    const goldRate = v.goldRate ?? 0;
    const goldCost = netWeight * goldRate;

    const goldMakingRaw = v.goldMakingChargeRaw ?? 0;
    const goldMakingApplied = v.goldMakingChargeType === "%" 
      ? (goldMakingRaw / 100) * goldCost 
      : goldMakingRaw;

    const goldDiscountRaw = v.goldDiscountRaw ?? 0;
    const discountOnMaking = v.goldDiscountType === "%"
      ? (goldDiscountRaw / 100) * goldMakingApplied
      : (goldCost > goldDiscountRaw ? goldDiscountRaw : 0);

    // 2. Diamond
    const diamondCarat = v.diamondCarat ?? 0;
    const diamondWeight = v.diamondWeight ?? 0;
    const diamondRate = v.diamondRate ?? 0;
    let diamondCost = 0;

    if (v.diamondUnit === "CT") {
      const ct = diamondCarat > 0 ? diamondCarat : diamondWeight * 5;
      diamondCost = ct * diamondRate;
    } else {
      const wt = diamondWeight > 0 ? diamondWeight : diamondCarat / 5;
      diamondCost = wt * diamondRate;
    }

    const diamondMakingRaw = v.diamondMakingChargeRaw ?? 0;
    const diamondMakingApplied = v.diamondMakingChargeType === "%"
      ? (diamondMakingRaw / 100) * diamondCost
      : diamondMakingRaw;

    const diamondDiscountRaw = v.diamondDiscountRaw ?? 0;
    const diamondCostWithMaking = diamondCost + diamondMakingApplied;
    const diamondDiscount = v.diamondDiscountType === "%"
      ? (diamondDiscountRaw / 100) * diamondCostWithMaking
      : (diamondCostWithMaking > diamondDiscountRaw ? diamondDiscountRaw : 0);

    // 3. Stone
    const stoneRate = v.stoneRate ?? 0;
    const stoneCost = stoneRate; // Assuming rate represents total cost

    const stoneDiscountRaw = v.stoneDiscountRaw ?? 0;
    const stoneDiscount = v.stoneDiscountType === "%"
      ? (stoneDiscountRaw / 100) * stoneCost
      : (stoneCost > stoneDiscountRaw ? stoneDiscountRaw : 0);

    // 4. Totals
    const totalDiscount = discountOnMaking + diamondDiscount + stoneDiscount;
    const totalBeforeTax = goldCost + diamondCostWithMaking + stoneCost + goldMakingApplied - totalDiscount;

    // 5. Tax 
    const currentGstPercent = v.igstPercent ?? 0;
    const igstValue = (currentGstPercent / 100) * totalBeforeTax;
    const cgstValue = igstValue / 2;
    const sgstValue = igstValue / 2;

    const newTotalReturnPrice = Number((totalBeforeTax + igstValue).toFixed(2));

    // Update state only if the calculated values changed (prevents infinite loop)
    if (
      newTotalReturnPrice !== v.totalReturnPrice || 
      stoneCost !== v.stoneCost ||
      igstValue !== v.igst ||
      cgstValue !== v.cgst ||
      sgstValue !== v.sgst
    ) {
      onChange({ 
        ...v, 
        totalReturnPrice: newTotalReturnPrice,
        stoneCost: stoneCost,
        igst: Number(igstValue.toFixed(2)),
        cgst: Number(cgstValue.toFixed(2)),
        sgst: Number(sgstValue.toFixed(2)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    values.grossWeight, values.netWeight, values.stoneWeight, values.diamondWeight, values.diamondCarat, // All weights
    values.goldRate, values.goldMakingChargeRaw, values.goldMakingChargeType, values.goldDiscountRaw, values.goldDiscountType, // Gold
    values.diamondRate, values.diamondUnit, values.diamondMakingChargeRaw, values.diamondMakingChargeType, values.diamondDiscountRaw, values.diamondDiscountType, // Diamond
    values.stoneRate, values.stoneDiscountRaw, values.stoneDiscountType, // Stone
    values.igstPercent // Tax
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex flex-col gap-1">
            Edit Return Values
            <span className="text-xs font-normal text-gray-500">
              {summary.tagNumber && `Tag: ${summary.tagNumber} · `}
              {summary.itemName}
              {summary.metal && ` · ${summary.metal}`}
              {summary.purity && ` · ${summary.purity}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto text-sm pr-1">
          {/* Weights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label>Gross Weight (g)</Label>
              <Input
                type="number"
                step="0.001"
                value={values.grossWeight ?? 0}
                onChange={(e) => updateNumber("grossWeight", e.target.value)}
              />
            </div>
            <div>
              <Label>Net Weight (g)</Label>
              <Input
                type="number"
                step="0.001"
                value={values.netWeight ?? 0}
                onChange={(e) => updateNumber("netWeight", e.target.value)}
              />
            </div>
            <div>
              <Label>Stone Weight (g)</Label>
              <Input
                type="number"
                step="0.001"
                value={values.stoneWeight ?? 0}
                onChange={(e) => updateNumber("stoneWeight", e.target.value)}
              />
            </div>
            <div>
              <Label>Diamond Weight (ct)</Label>
              <Input
                type="number"
                step="0.001"
                value={values.diamondWeight ?? 0}
                onChange={(e) => updateNumber("diamondWeight", e.target.value)}
              />
            </div>
            <div>
              <Label>Diamond Carat</Label>
              <Input
                type="number"
                step="0.001"
                value={values.diamondCarat ?? 0}
                onChange={(e) => updateNumber("diamondCarat", e.target.value)}
              />
            </div>
          </div>

          {/* Gold */}
          <div className="space-y-2 p-3 rounded-md border bg-yellow-50">
            <p className="text-xs font-semibold uppercase text-yellow-800">
              Gold
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Gold Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.goldRate ?? 0}
                  onChange={(e) => updateNumber("goldRate", e.target.value)}
                />
              </div>
              <div>
                <Label>Discount on Making</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.goldMakingChargeRaw ?? 0}
                  onChange={(e) =>
                    updateNumber("goldMakingChargeRaw", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Making Type</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.goldMakingChargeType || undefined}
                  onValueChange={(val) => updateText("goldMakingChargeType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.makingChargeTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gold Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.goldDiscountRaw ?? 0}
                  onChange={(e) =>
                    updateNumber("goldDiscountRaw", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.goldDiscountType || undefined}
                  onValueChange={(val) => updateText("goldDiscountType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.discountTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Diamond */}
          <div className="space-y-2 p-3 rounded-md border bg-blue-50">
            <p className="text-xs font-semibold uppercase text-blue-800">
              Diamond
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Diamond Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.diamondRate ?? 0}
                  onChange={(e) => updateNumber("diamondRate", e.target.value)}
                />
              </div>
              <div>
                <Label>Diamond Unit</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.diamondUnit || undefined}
                  onValueChange={(val) => updateText("diamondUnit", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.units?.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Diamond Making</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.diamondMakingChargeRaw ?? 0}
                  onChange={(e) =>
                    updateNumber("diamondMakingChargeRaw", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Making Type</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.diamondMakingChargeType || undefined}
                  onValueChange={(val) => updateText("diamondMakingChargeType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.makingChargeTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Diamond Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.diamondDiscountRaw ?? 0}
                  onChange={(e) =>
                    updateNumber("diamondDiscountRaw", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.diamondDiscountType || undefined}
                  onValueChange={(val) => updateText("diamondDiscountType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.discountTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stone */}
          <div className="space-y-2 p-3 rounded-md border bg-emerald-50">
            <p className="text-xs font-semibold uppercase text-emerald-800">
              Stone
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Stone Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.stoneRate ?? 0}
                  onChange={(e) => updateNumber("stoneRate", e.target.value)}
                />
              </div>
              <div>
                <Label>Stone Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.stoneCost ?? 0}
                  onChange={(e) => updateNumber("stoneCost", e.target.value)}
                />
              </div>
              <div>
                <Label>Stone Discount (raw)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={values.stoneDiscountRaw ?? 0}
                  onChange={(e) =>
                    updateNumber("stoneDiscountRaw", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  disabled={isLookupLoading}
                  value={values.stoneDiscountType || undefined}
                  onValueChange={(val) => updateText("stoneDiscountType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookupData?.discountTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Taxes Section - NEW */}
          <div className="space-y-2 p-3 rounded-md border bg-gray-50">
            <p className="text-xs font-semibold uppercase text-gray-800">
              Taxes
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>GST (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={values.igstPercent ?? 0}
                  onChange={(e) => updateNumber("igstPercent", e.target.value)}
                />
              </div>
              <div>
                <Label>IGST (₹)</Label>
                <Input
                  type="number"
                  value={values.igst ?? 0}
                  disabled // Calculated automatically
                />
              </div>
              <div>
                <Label>CGST (₹)</Label>
                <Input
                  type="number"
                  value={values.cgst ?? 0}
                  disabled // Calculated automatically
                />
              </div>
              <div>
                <Label>SGST (₹)</Label>
                <Input
                  type="number"
                  value={values.sgst ?? 0}
                  disabled // Calculated automatically
                />
              </div>
            </div>
          </div>

          {/* Total Return Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Total Return Price (for this item)</Label>
              <Input
                type="number"
                step="0.01"
                value={values.totalReturnPrice ?? 0}
                disabled // <-- This grays out the field and makes it uneditable
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-9 px-4"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-6 bg-blue-600 text-white hover:bg-blue-700"
            onClick={onSave}
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ReturnFormProps {
  onCancel: () => void;
}

export const ReturnForm = ({ onCancel }: ReturnFormProps) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: allInvoices, isLoading: isInvoiceListLoading } = useAllInvoice();
  const { data: invoice,  isError } = useInvoice(selectedInvoiceId);

  const [returnItems, setReturnItems] = useState<ReturnItemWithFlags[]>([]);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    index: number | null;
    values: EditableFields;
  }>({
    open: false,
    index: null,
    values: {
      grossWeight: 0,
      stoneWeight: 0,
      diamondWeight: 0,
      diamondCarat: 0,
      netWeight: 0,
      goldRate: 0,
      goldMakingChargeRaw: 0,
      goldMakingChargeType: "",
      goldDiscountRaw: 0,
      goldDiscountType: "",
      diamondRate: 0,
      diamondUnit: "",
      diamondMakingChargeRaw: 0,
      diamondMakingChargeType: "",
      diamondDiscountRaw: 0,
      diamondDiscountType: "", // Fixed the typescript warning here
      stoneRate: 0,
      stoneCost: 0,
      stoneDiscountRaw: 0,
      stoneDiscountType: "",
      totalReturnPrice: 0,
      igstPercent: 0, 
      igst: 0,        
      cgst: 0,        
      sgst: 0,        
    },
  });

  const createReturn = useCreateReturn();

  // Build invoice options for SearchableSelect
  const invoiceOptions: OptionType[] = useMemo(
    () =>
      (allInvoices ?? []).map((inv) => ({
        value: inv.id,
        label: `${inv.id}-${inv.invoiceNo}—${inv.customer?.name ?? "Customer"}`,
      })),
    [allInvoices]
  );

  // When invoice loads, initialise return items from invoice items.
  useEffect(() => {
    if (!invoice) return;

    const items = (invoice.items as unknown as RichInvoiceItem[]).map((it) => {
      const alreadyReturned = !!it.isReturn;

      const payload: ReturnItemWithFlags = {
        invoiceItemId: it.id,
        itemId: it.itemId,
        brand: it.brand,
        tagNumber: it.tagNumber,
        itemName: it.itemName,
        metal: it.metal,
        category: it.category,
        quantity: it.quantity,
        gPurityId: it.gPurityId,
        purityPercent:
          it.purityPercent != null
            ? String(it.purityPercent)
            : undefined,
        dPurityId: it.dPurityId,
        clarity: it.clarity,
        color: it.color,
        cut: it.cut,
        shape: it.shape,
        stoneName: it.stoneName,
        grossWeight: it.grossWeight,
        stoneWeight: it.stoneWeight,
        diamondWeight: it.diamondWeight,
        diamondCarat: it.diamondCarat,
        netWeight: it.netWeight,
        goldCost: it.goldCost,
        diamondCost: it.diamondCost,
        stoneCost: it.stoneCost,
        makingCharges: it.makingCharges,
        discount: it.discount,
        igst: it.igst,
        cgst: it.cgst,
        sgst: it.sgst,
        totalSalePrice: it.totalSalePrice,
        totalSalePriceBeforeTax: it.totalSalePriceBeforeTax,
        goldRate: it.goldRate,
        goldMakingChargeRaw: it.goldMakingChargeRaw,
        goldMakingChargeType: it.goldMakingChargeType ?? "",
        goldDiscountRaw: it.goldDiscountRaw,
        goldDiscountType: it.goldDiscountType ?? "",
        diamondRate: it.diamondRate,
        diamondUnit: it.diamondUnit ?? "",
        diamondMakingChargeRaw: it.diamondMakingChargeRaw,
        diamondMakingChargeType: it.diamondMakingChargeType ?? "",
        diamondDiscountRaw: it.diamondDiscountRaw,
        diamondDiscountType: it.diamondDiscountType ?? "",
        stoneRate: it.stoneRate,
        stoneDiscountRaw: it.stoneDiscountRaw,
        stoneDiscountType: it.stoneDiscountType ?? "",
        igstPercent: it.igstPercent,
        // By default, full sale price is returned for selectable items.
        totalReturnPrice: it.totalSalePrice,
        selected: !alreadyReturned,
        alreadyReturned,
      };
      return payload;
    });

    setReturnItems(items);
  }, [invoice]);

  const totalReturnAmount = useMemo(
    () =>
      returnItems
        .filter((it) => it.selected && !it.alreadyReturned)
        .reduce((sum, it) => sum + (it.totalReturnPrice ?? 0), 0),
    [returnItems]
  );

  const selectedCount = useMemo(
    () => returnItems.filter((it) => it.selected && !it.alreadyReturned).length,
    [returnItems]
  );

  const openEditDialog = (index: number) => {
    const item = returnItems[index];
    if (!item || item.alreadyReturned || !item.selected) return;

    const values: EditableFields = {
      grossWeight: item.grossWeight ?? 0,
      stoneWeight: item.stoneWeight ?? 0,
      diamondWeight: item.diamondWeight ?? 0,
      diamondCarat: item.diamondCarat ?? 0,
      netWeight: item.netWeight ?? 0,
      goldRate: item.goldRate ?? 0,
      goldMakingChargeRaw: item.goldMakingChargeRaw ?? 0,
      goldMakingChargeType: item.goldMakingChargeType ?? "",
      goldDiscountRaw: item.goldDiscountRaw ?? 0,
      goldDiscountType: item.goldDiscountType ?? "",
      diamondRate: item.diamondRate ?? 0,
      diamondUnit: item.diamondUnit ?? "",
      diamondMakingChargeRaw: item.diamondMakingChargeRaw ?? 0,
      diamondMakingChargeType: item.diamondMakingChargeType ?? "",
      diamondDiscountRaw: item.diamondDiscountRaw ?? 0,
      diamondDiscountType: item.diamondDiscountType ?? "",
      stoneRate: item.stoneRate ?? 0,
      stoneCost: item.stoneCost ?? 0,
      stoneDiscountRaw: item.stoneDiscountRaw ?? 0,
      stoneDiscountType: item.stoneDiscountType ?? "",
      totalReturnPrice: item.totalReturnPrice ?? item.totalSalePrice ?? 0,
      igstPercent: item.igstPercent ?? 3, 
      igst: item.igst ?? 0,               
      cgst: item.cgst ?? 0,
      sgst: item.sgst ?? 0,
    };

    setDialogState({
      open: true,
      index,
      values,
    });
  };

  const handleDialogChange = (vals: EditableFields) => {
    setDialogState((prev) => ({ ...prev, values: vals }));
  };

  const handleDialogSave = () => {
    if (dialogState.index == null) {
      setDialogState((prev) => ({ ...prev, open: false }));
      return;
    }

    setReturnItems((prev) =>
      prev.map((it, idx) =>
        idx === dialogState.index
          ? {
              ...it,
              ...dialogState.values,
            }
          : it
      )
    );

    setDialogState((prev) => ({ ...prev, open: false }));
  };

  // Toggle selection for an item (for items that are not already returned)
  const toggleItemSelected = (index: number) => {
    setReturnItems((prev) =>
      prev.map((it, idx) =>
        idx === index && !it.alreadyReturned
          ? { ...it, selected: !it.selected }
          : it
      )
    );

    // If we unselect the item that is being edited, close the dialog
    setDialogState((prev) =>
      prev.index === index && !returnItems[index].selected
        ? { ...prev, open: false, index: null }
        : prev
    );
  };

  const handleSubmit = () => {
    if (!invoice) {
      toast.error("Select an invoice before creating a return.");
      return;
    }

    const itemsToReturn = returnItems.filter(
      (it) => it.selected && !it.alreadyReturned
    );

    if (!itemsToReturn.length) {
      toast.error("No items selected for return.");
      return;
    }
    const payload: CreateReturnPayload = {
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      shopId: (invoice as any).shopId,
      returnDate: new Date().toISOString(),
      totalReturnAmount,
      status: "Completed",
      items: itemsToReturn.map((it) => ({
        ...it,
        isReturn: true,
        isItemRestorable: false, 
        purityPercent: it.purityPercent != null ? String(it.purityPercent) : undefined,
      })) as any,
    };

    createReturn.mutate(payload, {
      onSuccess: () => {
        toast.success("Return created successfully.");
        onCancel();
      },
      onError: () => {
        toast.error("Failed to create return.");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Invoice search with SearchableSelect */}
      <div className="bg-white p-4 md:p-5 rounded-xl border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Start Return from Invoice
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold text-gray-600">
              Invoice
            </Label>
            <SearchableSelect
              options={invoiceOptions}
              value={selectedInvoiceId ?? undefined}
              placeholder={
                isInvoiceListLoading ? "Loading invoices..." : "Select invoice"
              }
              disabled={isInvoiceListLoading}
              onChange={(val) => {
                if (val === undefined || val === null || val === "") {
                  setSelectedInvoiceId(null);
                  setReturnItems([]);
                  return;
                }
                const numeric =
                  typeof val === "string" ? Number(val) : (val as number);
                if (Number.isFinite(numeric)) {
                  setSelectedInvoiceId(numeric);
                } else {
                  toast.error("Invalid invoice selection.");
                }
              }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>

        {isError && (
          <p className="text-xs text-red-600 mt-1">
            Failed to load invoice. Please select again.
          </p>
        )}
      </div>

      {/* Invoice header */}
      {invoice && (
        <div className="bg-white p-4 md:p-5 rounded-xl border shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Invoice
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="font-mono font-semibold">
                  {invoice.invoiceNo}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(invoice.invoiceDate).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="font-semibold">
                    {invoice.customer?.name ?? "Customer"}
                  </p>
                  <p className="text-gray-500">
                    {invoice.customer?.phone ?? ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p className="font-semibold">Shop</p>
                  <p className="text-gray-500 text-[11px]">
                    {(invoice as any)?.shop?.name ??
                      (invoice as any)?.shopId ??
                      ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                <div>
                  <p className="text-[11px] text-gray-500 uppercase">
                    Invoice Total
                  </p>
                  <p className="font-semibold text-green-700">
                    ₹{invoice.totalAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 text-xs text-gray-600 flex flex-wrap gap-4 justify-between">
            <div>
              <span className="font-semibold mr-1">Paid:</span>
              ₹{invoice.paidAmount.toLocaleString("en-IN")}
            </div>
            <div>
              <span className="font-semibold mr-1">Status:</span>
              {invoice.status}
            </div>
          </div>
        </div>
      )}

      {/* Items table */}
      {invoice && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[960px] text-xs sm:text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b text-[11px] sm:text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Metal / Purity</th>
                  <th className="px-3 py-2">Weights</th>
                  <th className="px-3 py-2">Costs</th>
                  <th className="px-3 py-2 text-right">Sale Total</th>
                  <th className="px-3 py-2 text-right">Return Total</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {returnItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      No items found on this invoice.
                    </td>
                  </tr>
                )}
                {returnItems.map((it, idx) => {
                  const rowDisabled = it.alreadyReturned;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50/60 ${
                        rowDisabled
                          ? "bg-gray-100 opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={it.selected && !rowDisabled}
                          disabled={rowDisabled}
                          onChange={() => toggleItemSelected(idx)}
                        />
                        {rowDisabled && (
                          <p className="mt-1 text-[11px] text-red-600">
                            Already returned
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-gray-900">
                          {it.itemName}
                        </div>
                        <div className="text-[11px] text-gray-500 flex flex-wrap gap-1">
                          {it.tagNumber && (
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border">
                              #{it.tagNumber}
                            </span>
                          )}
                          <span>Qty: {it.quantity ?? 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-xs">
                        <div className="font-medium">{it.metal}</div>
                        <div className="text-gray-500">
                          {it.gPurityId} · {it.purityPercent}%
                        </div>
                        {it.dPurityId && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            Dia: {it.dPurityId} {it.clarity} {it.color}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Gross</span>
                          <span className="font-medium">
                            {it.grossWeight?.toFixed(3)} g
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Net</span>
                          <span className="font-medium">
                            {it.netWeight?.toFixed(3)} g
                          </span>
                        </div>
                        {it.diamondWeight ? (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Dia</span>
                            <span className="font-medium">
                              {it.diamondWeight?.toFixed(3)} ct
                            </span>
                          </div>
                        ) : null}
                        {it.stoneWeight ? (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Stone</span>
                            <span className="font-medium">
                              {it.stoneWeight?.toFixed(3)} g
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top text-xs space-y-1.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Gold</span>
                          <span className="font-medium">
                            ₹{it.goldCost?.toLocaleString("en-IN")}
                          </span>
                        </div>
                        {it.diamondCost ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Diamond</span>
                            <span className="font-medium">
                              ₹{it.diamondCost?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}
                        {it.stoneCost ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Stone</span>
                            <span className="font-medium">
                              ₹{it.stoneCost?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}
                        {it.makingCharges ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Making</span>
                            <span className="font-medium">
                              ₹{it.makingCharges?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}
                        {(it.igst ?? 0) + (it.cgst ?? 0) + (it.sgst ?? 0) > 0 && (
                          <div className="flex justify-between gap-4 border-t pt-1">
                            <span className="text-gray-400">Tax</span>
                            <span className="font-medium">
                              ₹
                              {(
                                (it.igst ?? 0) +
                                (it.cgst ?? 0) +
                                (it.sgst ?? 0)
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-right">
                        <div className="font-semibold text-gray-500 line-through">
                          ₹{it.totalSalePrice?.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-right">
  <div
    className={`font-semibold text-base ${
      it.selected && !rowDisabled
        ? "text-blue-600"
        : "text-gray-400"
    }`}
  >
    {rowDisabled ? (
      "—"
    ) : (
      `₹${it.totalReturnPrice?.toLocaleString("en-IN")}`
    )}
  </div>
</td>
                      <td className="px-3 py-3 align-top text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openEditDialog(idx)}
                          disabled={!it.selected || rowDisabled}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">
                {selectedCount}
              </span>{" "}
              <span className="text-gray-500">items selected</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase">
                  Total Return
                </p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{totalReturnAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={handleSubmit}
                disabled={selectedCount === 0 || createReturn.isPending}
              >
                {createReturn.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Process Return
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialogState.open && dialogState.index !== null && (
        <ItemEditDialog
          open={dialogState.open}
          onOpenChange={(op) => {
            if (!op) setDialogState((prev) => ({ ...prev, open: false }));
          }}
          summary={{
            tagNumber: returnItems[dialogState.index].tagNumber,
            itemName: returnItems[dialogState.index].itemName,
            metal: returnItems[dialogState.index].metal,
            purity: returnItems[dialogState.index].gPurityId,
            igstPercent: returnItems[dialogState.index].igstPercent,
          }}
          values={dialogState.values}
          onChange={handleDialogChange}
          onSave={handleDialogSave}
        />
      )}
    </div>
  );
};