// pages/stockTransfer/StockTransferForm.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Store,
  Package,
  Search,
  Trash2,
  ArrowRightLeft,
  FileText,
  Layers,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  SearchableSelect,
  type OptionType,
} from "@/components/ui/SearchableSelect";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useAllShop } from "@/hooks/useShop";
import { usePorters } from "@/hooks/usePorter";
import { useStockEntries } from "@/hooks/useStockEntry";
import { useInitiateStockTransfer } from "@/hooks/useStockTransfer";

type StockTransferFormProps = {
  stockTransfer?: any;
  isEditMode?: boolean;
  isViewMode?: boolean; // Added view mode prop
  onSuccess: (msg: string) => void;
  onCancel: () => void;
};

type SelectedStockItem = {
  id: string;
  itemId?: number;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;
  grossWeight?: number;
  netWeight?: number;
  pureWeight?: number;
  isReceived?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  isBulkItem?: boolean;
};

export const StockTransferForm = ({
  stockTransfer,
  isEditMode = false,
  isViewMode = false, // Default to false
  onSuccess,
  onCancel,
}: StockTransferFormProps) => {
  const { selectedShop } = useAuth();

  const [sourceShopId, setSourceShopId] = useState<string>("");
  const [destinationShopId, setDestinationShopId] = useState<string>("");
  const [porterId, setPorterId] = useState<string>("");
  const [remarks, setRemarks] = useState("");

  const [stockSearch, setStockSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedStockItem[]>([]);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [pendingBulkEntry, setPendingBulkEntry] = useState<any>(null);
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [bulkGrossWeight, setBulkGrossWeight] = useState("");

  // Treat as "not editable" if we are in view mode
  const isEditable = !isViewMode;

  useEffect(() => {
    if (selectedShop?.id && !isEditMode && !isViewMode) {
      setSourceShopId(String(selectedShop.id));
    }
  }, [selectedShop, isEditMode, isViewMode]);

  useEffect(() => {
    if (stockTransfer && (isEditMode || isViewMode)) {
      setSourceShopId(String(stockTransfer.sourceShopId ?? ""));
      setDestinationShopId(String(stockTransfer.destinationShopId ?? ""));
      setPorterId(String(stockTransfer.porterId ?? ""));
      setRemarks(stockTransfer.remarks ?? "");

      const mappedItems: SelectedStockItem[] = (
        stockTransfer.stockTransferItems || stockTransfer.transferItems || []
      ).map((item: any) => ({
        id: String(item.stockEntryId ?? item.id),
        itemId: item.itemId,
        tagNumber: item.tagNumber,
        itemName: item.itemName,
        metal: item.metal,
        category: item.category,
        quantity: item.quantity,
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        pureWeight: item.pureWeight,
        isReceived: item.isReceived,
        isRejected: item.isRejected,
        rejectionReason: item.rejectionReason,
        isBulkItem: item.stockEntry?.isBulkItem ?? item.isBulkItem ?? false,
      }));

      setSelectedItems(mappedItems);
    }
  }, [stockTransfer, isEditMode, isViewMode]);

  const { data: shops = [], isLoading: shopsLoading } = useAllShop();

  const { data: portersResponse, isLoading: portersLoading } = usePorters();

  const porters = useMemo(() => {
    if (Array.isArray(portersResponse)) return portersResponse;
    if (Array.isArray((portersResponse as any)?.data)) {
      return (portersResponse as any).data;
    }
    return [];
  }, [portersResponse]);

  const sourceShopNumber = sourceShopId ? Number(sourceShopId) : undefined;

  const {
    data: stockEntries = [],
    isLoading: stockLoading,
    isFetching: stockFetching,
  } = useStockEntries(
    sourceShopNumber && isEditable
      ? {
          shopId: sourceShopNumber,
        }
      : undefined
  );

  const initiateTransferMutation = useInitiateStockTransfer();

  const shopOptions: OptionType[] = useMemo(() => {
    return (shops ?? [])
      .filter((shop: any) => shop?.isActive !== false)
      .map((shop: any) => ({
        label: shop.name,
        value: String(shop.id),
      }));
  }, [shops]);

  const destinationShopOptions: OptionType[] = useMemo(() => {
    return (shops ?? [])
      .filter(
        (shop: any) =>
          shop?.isActive !== false && String(shop.id) !== String(sourceShopId)
      )
      .map((shop: any) => ({
        label: shop.name,
        value: String(shop.id),
      }));
  }, [shops, sourceShopId]);

  const porterOptions: OptionType[] = useMemo(() => {
    return (porters ?? [])
      .filter((porter: any) => porter?.isActive !== false)
      .map((porter: any) => ({
        label: porter.name,
        value: String(porter.id),
      }));
  }, [porters]);

  const availableStockEntries = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((item) => String(item.id)));
    const search = stockSearch.trim().toLowerCase();

    return (stockEntries ?? []).filter((entry: any) => {
      const notSelected = !selectedIds.has(String(entry.id));
      if (!notSelected) return false;

      if (!search) return true;

      return (
        String(entry?.tagNumber ?? "").toLowerCase().includes(search) ||
        String(entry?.itemName ?? "").toLowerCase().includes(search) ||
        String(entry?.metal ?? "").toLowerCase().includes(search) ||
        String(entry?.category ?? "").toLowerCase().includes(search) ||
        String(entry?.itemId ?? "").toLowerCase().includes(search)
      );
    });
  }, [stockEntries, selectedItems, stockSearch]);

  const handleSourceShopChange = (value: string | number | undefined) => {
    if (isViewMode) return;
    const nextSourceShopId = value ? String(value) : "";

    setSourceShopId(nextSourceShopId);
    setStockSearch("");

    if (String(destinationShopId) === nextSourceShopId) {
      setDestinationShopId("");
    }

    if (!isEditMode) {
      setSelectedItems([]);
    }
  };

  const handleDestinationShopChange = (
    value: string | number | undefined
  ) => {
    if (isViewMode) return;
    setDestinationShopId(value ? String(value) : "");
  };

  const handlePorterChange = (value: string | number | undefined) => {
    if (isViewMode) return;
    setPorterId(value ? String(value) : "");
  };

  const handleAddItem = (entry: any) => {
    if (isViewMode) return;

    const alreadyExists = selectedItems.some(
      (item) => String(item.id) === String(entry.id)
    );

    if (alreadyExists) {
      toast.error("This item is already selected");
      return;
    }

    if (entry.isBulkItem) {
      setPendingBulkEntry(entry);
      setBulkQuantity(String(entry.quantity ?? 1));
      setBulkGrossWeight(String(entry.grossWeight ?? 0));
      setIsBulkModalOpen(true);
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          id: String(entry.id),
          itemId: entry.itemId,
          tagNumber: entry.tagNumber,
          itemName: entry.itemName,
          metal: entry.metal,
          category: entry.category,
          quantity: entry.quantity,
          grossWeight: entry.grossWeight,
          netWeight: entry.netWeight,
          pureWeight: entry.pureWeight,
          isBulkItem: false,
        },
      ]);
    }
  };

  const handleEditBulkItem = (item: SelectedStockItem) => {
    if (isViewMode) return;

    const entry = stockEntries.find((e: any) => String(e.id) === String(item.id));

    const maxQty = entry 
      ? (entry.quantity ?? 0) + (isEditMode ? (item.quantity ?? 0) : 0)
      : (item.quantity ?? 0);

    const maxWeight = entry 
      ? (entry.grossWeight ?? 0) + (isEditMode ? (item.grossWeight ?? 0) : 0)
      : (item.grossWeight ?? 0);

    setPendingBulkEntry({
      id: item.id,
      itemId: item.itemId,
      tagNumber: item.tagNumber,
      itemName: item.itemName,
      metal: item.metal,
      category: item.category,
      quantity: maxQty,
      grossWeight: maxWeight,
      netWeight: entry?.netWeight ?? item.netWeight,
      pureWeight: entry?.pureWeight ?? item.pureWeight,
      isBulkItem: true,
    });

    setBulkQuantity(String(item.quantity ?? 1));
    setBulkGrossWeight(String(item.grossWeight ?? 0));
    setIsBulkModalOpen(true);
  };

  const handleConfirmBulkAdd = () => {
    if (!pendingBulkEntry) return;

    const qty = Number(bulkQuantity);
    const weight = Number(bulkGrossWeight);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }
    if (pendingBulkEntry.quantity !== undefined && qty > pendingBulkEntry.quantity) {
      toast.error(`Quantity cannot exceed available stock (${pendingBulkEntry.quantity})`);
      return;
    }

    if (isNaN(weight) || weight <= 0) {
      toast.error("Please enter a valid gross weight greater than 0");
      return;
    }
    if (pendingBulkEntry.grossWeight !== undefined && weight > pendingBulkEntry.grossWeight) {
      toast.error(`Gross weight cannot exceed available stock (${pendingBulkEntry.grossWeight}g)`);
      return;
    }

    const ratio = pendingBulkEntry.grossWeight ? weight / pendingBulkEntry.grossWeight : 1;
    const netWeight = pendingBulkEntry.netWeight ? pendingBulkEntry.netWeight * ratio : weight;
    const pureWeight = pendingBulkEntry.pureWeight ? pendingBulkEntry.pureWeight * ratio : 0;

    setSelectedItems((prev) => {
      const exists = prev.some((x) => String(x.id) === String(pendingBulkEntry.id));
      const newItem = {
        id: String(pendingBulkEntry.id),
        itemId: pendingBulkEntry.itemId,
        tagNumber: pendingBulkEntry.tagNumber,
        itemName: pendingBulkEntry.itemName,
        metal: pendingBulkEntry.metal,
        category: pendingBulkEntry.category,
        quantity: qty,
        grossWeight: weight,
        netWeight: netWeight,
        pureWeight: pureWeight,
        isBulkItem: true,
      };

      if (exists) {
        return prev.map((x) => (String(x.id) === String(pendingBulkEntry.id) ? newItem : x));
      } else {
        return [...prev, newItem];
      }
    });

    setIsBulkModalOpen(false);
    setPendingBulkEntry(null);
  };

  const handleRemoveItem = (id: string) => {
    if (isViewMode) return;
    setSelectedItems((prev) => prev.filter((item) => String(item.id) !== id));
  };

  const totalSelectedQty = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0
    );
  }, [selectedItems]);

  const totalGrossWeight = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.grossWeight ?? 0),
      0
    );
  }, [selectedItems]);

  const totalNetWeight = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.netWeight ?? 0),
      0
    );
  }, [selectedItems]);

  const totalPureWeight = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.pureWeight ?? 0),
      0
    );
  }, [selectedItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isViewMode) return;

    if (!sourceShopId) {
      toast.error("Please select source shop");
      return;
    }

    if (!destinationShopId) {
      toast.error("Please select destination shop");
      return;
    }

    if (sourceShopId === destinationShopId) {
      toast.error("Source and destination shop cannot be the same");
      return;
    }

    if (!porterId) {
      toast.error("Please select porter");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please select at least one stock item");
      return;
    }

    const payload = {
      sourceShopId: Number(sourceShopId),
      destinationShopId: Number(destinationShopId),
      porterId: Number(porterId),
      remarks,
      stockEntryIds: selectedItems.filter((item) => !item.isBulkItem).map((item) => item.id),
      items: selectedItems
        .filter((item) => item.isBulkItem)
        .map((item) => ({
          stockEntryId: item.id,
          quantity: item.quantity,
          grossWeight: item.grossWeight,
        })),
    };

    initiateTransferMutation.mutate(payload as any, {
      onSuccess: () => {
        onSuccess(
          isEditMode
            ? "Stock transfer updated successfully"
            : "Stock transfer created successfully"
        );
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to save stock transfer"
        );
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Transfer Details Panel */}
        <div className="bg-white border rounded-xl p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Transfer Details</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Source Shop</Label>
              <SearchableSelect
                options={shopOptions}
                value={sourceShopId}
                onChange={handleSourceShopChange}
                placeholder={shopsLoading ? "Loading shops..." : "Select source shop"}
                disabled={true} // <-- WE WILL INJECT TRUE HERE
              />
            </div>

            <div className="space-y-1.5">
              <Label>Destination Shop</Label>
              <SearchableSelect
                options={destinationShopOptions}
                value={destinationShopId}
                onChange={handleDestinationShopChange}
                placeholder={shopsLoading ? "Loading shops..." : "Select destination shop"}
                
              />
            </div>

            <div className="space-y-1.5">
              <Label>Porter</Label>
              <SearchableSelect
                options={porterOptions}
                value={porterId}
                onChange={handlePorterChange}
                placeholder={portersLoading ? "Loading porters..." : "Select porter"}
                disabled={portersLoading || isViewMode}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks"
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>

        {/* Stock Search Panel */}
        {!isViewMode && (
          <div className="bg-white border rounded-xl p-4 md:p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Search Stock Items</h3>
            </div>

            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search tag number, name, metal, category..."
                className="pl-9"
                disabled={!sourceShopId}
              />
            </div>

            {!sourceShopId ? (
              <div className="border rounded-lg p-6 text-sm text-muted-foreground text-center bg-gray-50/50">
                Select a source shop to search stock items.
              </div>
            ) : stockLoading || stockFetching ? (
              <div className="border rounded-lg p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground bg-gray-50/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading stock entries...
              </div>
            ) : !stockSearch.trim() ? (
              <div className="border rounded-lg p-6 text-sm text-muted-foreground text-center bg-gray-50/50">
                Start typing to search stock items.
              </div>
            ) : availableStockEntries.length === 0 ? (
              <div className="border rounded-lg p-6 text-sm text-muted-foreground text-center bg-gray-50/50">
                No stock items found.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {availableStockEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">
                          {entry.tagNumber || "-"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-muted-foreground">
                          ID: {entry.itemId ?? "-"}
                        </span>
                        {entry.isBulkItem && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Bulk
                          </span>
                        )}
                      </div>

                      <div className="font-medium text-sm truncate">
                        {entry.itemName || "-"}
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span><span className="font-medium text-gray-500">Metal:</span> {entry.metal || "-"}</span>
                        <span><span className="font-medium text-gray-500">Cat:</span> {entry.category || "-"}</span>
                        <span><span className="font-medium text-gray-500">Gross:</span> {Number(entry.grossWeight ?? 0).toFixed(3)}g</span>
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        onClick={() => handleAddItem(entry)}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Items Panel */}
        <div className={`bg-white border rounded-xl p-4 md:p-5 space-y-4 ${isViewMode ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Selected Items</h3>
            </div>

            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border w-fit">
              {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'} Selected
            </span>
          </div>

          {selectedItems.length === 0 ? (
            <div className="border rounded-lg p-6 sm:p-10 text-sm text-muted-foreground text-center bg-gray-50/50">
              No stock items selected yet.
            </div>
          ) : (
            <>
              {/* UNIVERSAL RESPONSIVE CARDS (Shows on ALL screen sizes instead of table) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 max-h-[600px] overflow-y-auto pr-1 pb-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 relative bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-3 group">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 pr-16">
                      <div className="font-bold text-sm text-gray-900 leading-tight">
                        {item.itemName || "-"}
                      </div>

                      {/* Edit bulk item button (Edit Mode) */}
                      {!isViewMode && item.isBulkItem && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-10 h-8 w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditBulkItem(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete button (Edit Mode) */}
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Status Badge (View Mode) */}
                    {isViewMode && (
                      <div className="absolute top-2 right-2">
                        {item.isRejected ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                            Rejected
                          </span>
                        ) : item.isReceived ? (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                            Received
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700 border border-gray-200">Tag: {item.tagNumber || "-"}</span>
                      <span className="font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-600">ID: {item.itemId ?? "-"}</span>
                      {item.isBulkItem && (
                        <span className="font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-700 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Bulk
                        </span>
                      )}
                    </div>

                    {/* Show rejection reason below title in view mode if applicable */}
                    {isViewMode && item.isRejected && item.rejectionReason && (
                       <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                         <span className="font-semibold">Reason:</span> {item.rejectionReason}
                       </div>
                    )}

                    {/* Grid for Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs mt-1 pt-3 border-t">
                      <div className="flex flex-col">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-0.5">Metal / Cat</span>
                        <span className="font-medium truncate text-gray-900">{item.metal || "-"} / {item.category || "-"}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-0.5">Qty / Gross</span>
                        <span className="font-medium text-gray-900">{item.quantity ?? 0} / {Number(item.grossWeight ?? 0).toFixed(3)}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-0.5">Net Wt</span>
                        <span className="font-bold text-blue-700">{Number(item.netWeight ?? 0).toFixed(3)}g</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-0.5">Pure Wt</span>
                        <span className="font-medium text-gray-900">{Number(item.pureWeight ?? 0).toFixed(3)}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 mt-2 border-t border-dashed">
                <div className="bg-white border rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-center items-center text-center sm:items-start sm:text-left">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold mb-1 tracking-wider">Total Qty</div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900">{totalSelectedQty}</div>
                </div>
                <div className="bg-white border rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-center items-center text-center sm:items-start sm:text-left">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold mb-1 tracking-wider">Total Gross</div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900">{totalGrossWeight.toFixed(3)}<span className="text-sm font-semibold text-gray-400 ml-1">g</span></div>
                </div>
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-center items-center text-center sm:items-start sm:text-left">
                  <div className="text-[10px] sm:text-xs text-blue-600 uppercase font-bold mb-1 tracking-wider">Total Net Wt</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-800">{totalNetWeight.toFixed(3)}<span className="text-sm font-semibold text-blue-500 ml-1">g</span></div>
                </div>
                <div className="bg-white border rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-center items-center text-center sm:items-start sm:text-left">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold mb-1 tracking-wider">Total Pure Wt</div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900">{totalPureWeight.toFixed(3)}<span className="text-sm font-semibold text-gray-400 ml-1">g</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Actions Footer */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t mt-6 sticky bottom-0 bg-gray-50/90 backdrop-blur-md p-4 -mx-4 sm:mx-0 sm:bg-transparent sm:p-0 z-10">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="w-full sm:w-auto bg-white shadow-sm h-10"
        >
          {isViewMode ? "Close" : "Cancel"}
        </Button>

        {!isViewMode && (
          <Button
            type="submit"
            disabled={initiateTransferMutation.isPending}
            className="w-full sm:w-auto min-w-[140px] bg-primary text-white shadow-sm h-10"
          >
            {initiateTransferMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {isEditMode ? "Update Transfer" : "Create Transfer"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Dialog for entering quantity and weight for bulk items */}
      <Dialog
        open={isBulkModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsBulkModalOpen(false);
            setPendingBulkEntry(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Enter Bulk Transfer Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900 space-y-1">
              <div>
                <span className="font-semibold text-gray-700">Item:</span> {pendingBulkEntry?.itemName || "-"}
              </div>
              <div className="flex gap-x-6">
                <div>
                  <span className="font-semibold text-gray-700">Available Qty:</span> {pendingBulkEntry?.quantity ?? 0}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Available Weight:</span> {Number(pendingBulkEntry?.grossWeight ?? 0).toFixed(3)}g
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Transfer Qty <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={pendingBulkEntry?.quantity}
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Transfer Gross Weight (g) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  max={pendingBulkEntry?.grossWeight}
                  value={bulkGrossWeight}
                  onChange={(e) => setBulkGrossWeight(e.target.value)}
                  placeholder="Enter weight in grams"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkModalOpen(false);
                setPendingBulkEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBulkAdd}
              className="bg-primary text-white"
            >
              Confirm & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};
