import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, FileText, Download, Upload, ChevronLeft, ChevronRight, Printer, Loader2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import logo from '@/assets/logo.webp';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getImageBlobUrl, type StockImageMeta } from "@/hooks/useUploadImage";
import api from "@/lib/axios";

import {
  useStockEntries,
  useDeleteStockEntry,
  useStockEntryTemplate,
  useStockEntryExport,
  useStockEntryImport,
} from "@/hooks/useStockEntry";
import { useShops } from "@/hooks/useShop";
import { DateInput } from "@/components/ui/DatePicker";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeight } from "@/utils/number";
import { useAllVendors } from "@/hooks/useVendor";
import { useAllLookUp } from "@/hooks/useLookup";


type ModalImage = {
  id: number;
  fileName: string;
  url: string; // blob url
};

// Custom hook for persisting state to localStorage
function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (state === undefined || state === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export const Stock = () => {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = usePersistedState<"table" | "grid">("stock_viewMode", "table");

  // Use persisted state for filters and pagination
  const [filterShopId, setFilterShopId] = usePersistedState<number | undefined>("stock_filterShopId", undefined);
  const [filterMetal, setFilterMetal] = usePersistedState<string>("stock_filterMetal", "");

  const [filterEntryType, setFilterEntryType] = usePersistedState<string>("stock_filterEntryType", "");

  const [filterItemId, setFilterItemId] = usePersistedState<string>("stock_filterItemId", "");
  const [filterItemName, setFilterItemName] = usePersistedState<string>("stock_filterItemName", "");
  const [filterCategory, setFilterCategory] = usePersistedState<string>("stock_filterCategory", "");
  const [fromDate, setFromDate] = usePersistedState<string | null>("stock_fromDate", null);
  const [toDate, setToDate] = usePersistedState<string | null>("stock_toDate", null);
  const [page, setPage] = usePersistedState<number>("stock_page", 1);
  const [pageSize, setPageSize] = usePersistedState<number>("stock_pageSize", 10);

  // Row thumbnails (1 per stock entry id)
  const [imageBlobs, setImageBlobs] = useState<Record<number, string>>({});

  // Modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ itemId: number; itemName?: string } | null>(null);
  const [modalImages, setModalImages] = useState<ModalImage[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Printing state
  const [printingId, setPrintingId] = useState<number | null>(null);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { permissions, user } = useAuth();
  const actionPermitions = permissions.find((item) => item?.Module === "Stock");
  const isAdmin = user?.userRoles?.some((ur: any) => ur.role?.name === "Admin") ?? false;
  const token = localStorage.getItem("token");

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  const { data: allShopsResponse } = useShops();

  const { data: lookupData } = useAllLookUp();
  const metalTypes = lookupData?.metalTypes || [];

  const allShops = allShopsResponse?.data || [];

  const { data: stockEntries = [], isLoading } = useStockEntries({
    shopId: filterShopId,
    metal: filterMetal || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const deleteMutation = useDeleteStockEntry();
  const templateMutation = useStockEntryTemplate();
  const exportMutation = useStockEntryExport();
  const importMutation = useStockEntryImport();

  const { data: vendorsResponse = [] } = useAllVendors();
  const vendors = Array.isArray(vendorsResponse) ? vendorsResponse : [];

  const vendorMap = useMemo(() => {
    const map = new Map<number, any>();
    vendors.forEach((v: any) => map.set(v.id, v));
    return map;
  }, [vendors]);

  // Client-side filtering and sorting
  const filteredAndSortedData = useMemo(() => {
    let result = [...stockEntries];

    if (filterItemId.trim() !== "") {
      const query = filterItemId.toLowerCase().trim();
      result = result.filter(entry => String(entry.itemId).toLowerCase().includes(query));
    }

    if (filterItemName.trim() !== "") {
      const query = filterItemName.toLowerCase().trim();
      result = result.filter(entry =>
        String(entry.itemName ?? "").toLowerCase().includes(query)
      );
    }

    if (filterCategory.trim() !== "") {
      const query = filterCategory.toLowerCase().trim();
      result = result.filter(entry =>
        String(entry.category ?? "").toLowerCase().includes(query)
      );
    }

    if (filterEntryType.trim() !== "") {
      const query = filterEntryType.toLowerCase().trim();
      result = result.filter(entry => String(entry.stockEntryType ?? "").toLowerCase().includes(query));
    }


    return result.sort((a, b) => {
      return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
    });
}, [stockEntries, filterItemId, filterItemName, filterCategory, filterEntryType]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize) || 1;

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, page, pageSize]);

  // Load 1 thumbnail per row
  useEffect(() => {
    if (!token || paginatedData.length === 0) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    const loadThumbnails = async () => {
      const next: Record<number, string> = {};

      for (const entry of paginatedData as any[]) {
        if (imageBlobs[entry.id]) continue;

        try {
          const imagesResponse = await api.get<StockImageMeta[]>(`/Image/item/${entry.itemId}`);
          const images = imagesResponse.data || [];

          if (images.length > 0) {
            const first = images[0];
            const url = await getImageBlobUrl(entry.itemId, first.fileName);
            createdUrls.push(url);
            next[entry.id] = url;
          } else {
            next[entry.id] = logo;
          }
        } catch {
          next[entry.id] = logo;
        }
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setImageBlobs((prev) => ({ ...prev, ...next }));
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [paginatedData, token]);

  // Modal images
  useEffect(() => {
    if (!imageModalOpen || !selectedItem?.itemId || !token) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    const loadAllImagesForItem = async () => {
      setModalLoading(true);
      setModalImages([]);
      setModalIndex(0);

      try {
        const res = await api.get<StockImageMeta[]>(`/Image/item/${selectedItem.itemId}`);
        const list = res.data || [];

        if (list.length === 0) {
          setModalImages([]);
          return;
        }

        const urls = await Promise.all(
          list.map(async (img) => {
            const url = await getImageBlobUrl(selectedItem.itemId, img.fileName);
            createdUrls.push(url);
            return { id: img.id, fileName: img.fileName, url };
          })
        );

        if (!cancelled) setModalImages(urls);
      } catch {
        if (!cancelled) setModalImages([]);
      } finally {
        if (!cancelled) setModalLoading(false);
      }
    };

    loadAllImagesForItem();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imageModalOpen, selectedItem?.itemId, token]);

  const openImageModal = (row: any) => {
    setSelectedItem({ itemId: row.itemId, itemName: row.itemName });
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedItem(null);
    setModalImages([]);
    setModalIndex(0);
    setModalLoading(false);
  };

  const goPrev = () => {
    setModalIndex((i) => (modalImages.length ? (i - 1 + modalImages.length) % modalImages.length : 0));
  };

  const goNext = () => {
    setModalIndex((i) => (modalImages.length ? (i + 1) % modalImages.length : 0));
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Stock entry deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
      },
      onError: () => toast.error("Failed to delete stock entry"),
    });
  };

  const handleTemplateDownload = () => {
    templateMutation.mutate(undefined, {
      onSuccess: (url) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = "stock-entry-template.xlsx";
        link.click();
        toast.success("Template downloaded successfully");
      },
      onError: () => toast.error("Failed to download template"),
    });
  };

  const handleExport = () => {
    exportMutation.mutate(undefined, {
      onSuccess: (url) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = "stock-entries-export.xlsx";
        link.click();
        toast.success("Export downloaded successfully");
      },
      onError: () => toast.error("Failed to export data"),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    importMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Stock entries imported successfully");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: () => toast.error("Failed to import stock entries"),
    });
  };

  const handlePrintTag = async (itemId: number) => {
    try {
      setPrintingId(itemId);
      
      const response = await api.get(`/Tag/print/item/${itemId}`, {
        responseType: 'blob',
        headers: { 'accept': '*/*' },
      });

      const blob = response.data;
      if (!blob || blob.size === 0) {
        toast.error("Received empty tag image");
        return;
      }

      const url = URL.createObjectURL(blob);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups for this site.");
        URL.revokeObjectURL(url);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Print Tag</title>
            <style>
              @page {
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
              img {
                display: block;
                margin: 0;
                padding: 0;
              }
            </style>
          </head>
          <body>
            <img src="${url}" alt="Tag" onload="window.print(); setTimeout(function(){ window.close(); }, 500);" />
          </body>
        </html>
      `);
      printWindow.document.close();

      setTimeout(() => URL.revokeObjectURL(url), 60000);

    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to fetch print image");
    } finally {
      setPrintingId(null);
    }
  };

  const handleClearFilters = () => {
    setFilterShopId(undefined);
    setFilterMetal("");

    setFilterEntryType("");

    setFilterItemId("");
    setFilterItemName("");
    setFilterCategory("");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const hasActiveFilters =
    filterShopId !== undefined ||
    filterMetal !== "" ||
    filterEntryType !== "" ||

    filterItemId !== "" ||
    filterItemName !== "" ||
    filterCategory !== "" ||
    fromDate !== null ||
    toDate !== null;

  const currentModalUrl =
    modalImages.length > 0 ? modalImages[modalIndex]?.url : null;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 whitespace-nowrap">
          <FileText className="w-8 h-8 text-[#b08d28]" />
          Stock Entries
        </h1>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
          
          {/* View Toggle */}
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border shrink-0">
              <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                      "h-8 px-2",
                      viewMode === "table" && "bg-white text-black shadow-sm hover:bg-white"
                  )}
              >
                  <TableIcon className="w-4 h-4 mr-1.5" /> Table
              </Button>
              <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                      "h-8 px-2",
                      viewMode === "grid" && "bg-white text-black shadow-sm hover:bg-white"
                  )}
              >
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
              </Button>
          </div>

          {hasActiveFilters && (
            <Button variant="destructive" onClick={handleClearFilters} size="sm" className="shrink-0 h-10">
              Clear Filters
            </Button>
          )}

          <Button variant="outline" onClick={handleTemplateDownload} size="sm" className="shrink-0 h-10">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Template</span>
          </Button>

          <Button variant="outline" onClick={handleExport} size="sm" className="shrink-0 h-10">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          {(actionPermitions?.Create || isAdmin) && (
            <>
            <Button
                onClick={() => navigate("/admin/batch/add")}
                size="sm"
                className="whitespace-nowrap h-10 shrink-0"
              >
                <Plus className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Add Batch </span>
            </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-10"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>

              <Button
                onClick={() => navigate("/admin/stock/new")}
                size="sm"
                className="whitespace-nowrap h-10 shrink-0"
              >
                <Plus className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Create Stock</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        
        {/* Item ID Search */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Item ID</label>
          <input
            type="text"
            placeholder="Search Item ID..."
            value={filterItemId}
            onChange={(e) => {
              setFilterItemId(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Item Name Search */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Item Name</label>
          <input
            type="text"
            placeholder="Search item name..."
            value={filterItemName}
            onChange={(e) => {
              setFilterItemName(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <input
            type="text"
            placeholder="Search category..."
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Shop</label>
          <Select
            value={filterShopId !== undefined ? String(filterShopId) : "all"}
            onValueChange={(v) => setFilterShopId(v === "all" ? undefined : Number(v))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {allShops.map((shop: any) => (
                <SelectItem key={shop.id} value={String(shop.id)}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Metal</label>
          <Select
            value={filterMetal || "all"}
            onValueChange={(v) => setFilterMetal(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Metals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metals</SelectItem>
              {metalTypes.map((metal: string) => (
                <SelectItem key={metal} value={metal}>{metal}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Entry Type</label>
          <Select
            value={filterEntryType || "all"}
            onValueChange={(v) => {
                setFilterEntryType(v === "all" ? "" : v);
                setPage(1);
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stockin">Stock In</SelectItem>
              <SelectItem value="stockout">Stock Out</SelectItem>
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">From Date</label>
          <DateInput
            value={fromDate || ""}
            onValueChange={(val) => {
              if (val && toDate && isAfter(val, toDate)) {
                toast.error("From date cannot be after To date");
                return;
              }
              setFromDate(val);
              setPage(1);
            }}
            placeholder="From Date"
            max={toDate || undefined}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">To Date</label>
          <DateInput
            value={toDate || ""}
            onValueChange={(val) => {
              if (val && fromDate && isBefore(val, fromDate)) {
                toast.error("To date cannot be before From date");
                return;
              }
              setToDate(val);
              setPage(1);
            }}
            placeholder="To Date"
            min={fromDate || undefined}
          />
        </div>
      </div>

      {/* Content Views */}
      {isLoading ? (
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading stock entries...</p></div>
      ) : filteredAndSortedData.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No stock entries found.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <CommonTable
              columns={[
                {
                  key: "image",
                  label: "Item Image",
                  render: (r: any) => {
                    const imageUrl = imageBlobs[r.id];
                    const hasValidImage = imageUrl && imageUrl !== logo;
                    const containerClass = "w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-1 border border-gray-100";

                    if (hasValidImage) {
                      return (
                        <button
                          type="button"
                          onClick={() => openImageModal(r)}
                          className={`${containerClass} hover:ring-2 hover:ring-indigo-400 hover:border-indigo-300 transition cursor-pointer`}
                          title="View images"
                        >
                          <img
                            src={imageUrl}
                            alt={r.itemName}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = logo;
                              (e.target as HTMLElement).parentElement?.classList.add("pointer-events-none", "opacity-70");
                            }}
                          />
                        </button>
                      );
                    }
                    return (
                      <div className={`${containerClass} opacity-80 cursor-default`}>
                        <img
                          src={logo}
                          alt="No image"
                          className="w-full h-full object-contain rounded-md opacity-50"
                        />
                      </div>
                    );
                  },
                },
                {
                  key: "itemId",
                  label: "Item ID",
                  render: (r: any) => r.itemId,
                },
                {
                  key: "tagNumber",
                  label: "Tag Number",
                  render: (r: any) => (
                    <span className="font-semibold">{r.tagNumber || "—"}</span>
                  ),
                },
                {
                  key: "itemName",
                  label: "Item Name",
                  render: (r: any) => r.itemName,
                },
                {
                  key: "metal",
                  label: "Metal",
                  render: (r: any) => (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      {r.metal}
                    </span>
                  ),
                },
                {
                  key: "brand",
                  label: "Brand",
                  render: (r: any) => r.brand || "—",
                },
                {
                  key: "category",
                  label: "Category",
                  render: (r: any) => r.category || "—",
                },
                {
                  key: "modeOfStock",
                  label: "Mode of Stock",
                  render: (r: any) => (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium
                      ${r.modeOfStock?.toUpperCase().includes("PURCHASE")
                          ? "bg-green-100 text-green-800"
                          : r.modeOfStock?.toUpperCase().includes("TRANSFER")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {r.modeOfStock}
                    </span>
                  ),
                },
                {
                  key: "stockEntryType",
                  label: "Entry Type",
                  render: (r: any) => (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium
                      ${r.stockEntryType?.toUpperCase().includes("IN")
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {r.stockEntryType}
                    </span>
                  ),
                },
                {
                  key: "quantity",
                  label: "Qty",
                  render: (r: any) => <span className="font-semibold">{r.quantity}</span>,
                },
                {
                  key: "caratOrKT",
                  label: "KT",
                  render: (r: any) => r.caratOrKT || "—",
                },
                {
                  key: "purityPercent",
                  label: "Purity %",
                  render: (r: any) => (r.purityPercent ? `${r.purityPercent}%` : "—"),
                },
                {
                  key: "grossWeight",
                  label: "Gross Wt (g)",
                  render: (r: any) => formatWeight(r.grossWeight),
                },
                {
                  key: "stoneWeight",
                  label: "Stone Wt (g)",
                  render: (r: any) => formatWeight(r.stoneWeight),
                },
                {
                  key: "diamondWeight",
                  label: "Diamond Wt (g)",
                  render: (r: any) => formatWeight(r.diamondWeight),
                },
                {
                  key: "diamondWeightCarat",
                  label: "Diamond Wt (ct)",
                  render: (r: any) => `${formatWeight(r.diamondCarat)}  ct`,
                },
                {
                  key: "netWeight",
                  label: "Net Wt (g)",
                  render: (r: any) => formatWeight(r.netWeight),
                },
                {
                  key: "saleMakingCharge",
                  label: "S. Making Charge",
                  render: (r: any) => (
                    <span className="font-medium whitespace-nowrap">
                      {(r.saleMakingCharge && r.saleMakingCharge !== 0 && r.saleMakingCharge !== "0") ? r.saleMakingCharge : ""}
                    </span>
                  ),
                },
                {
                  key: "saleMakingChargeType",
                  label: "S. Charge Type",
                  render: (r: any) => (
                    <span className="whitespace-nowrap">
                      {r.saleMakingChargeType || ""}
                    </span>
                  ),
                },
                {
                  key: "saleDiscountOnMaking",
                  label: "S. Disc. On Making",
                  render: (r: any) => (
                    <span className="font-medium whitespace-nowrap">
                      {(r.saleDiscountOnMaking && r.saleDiscountOnMaking !== 0 && r.saleDiscountOnMaking !== "0") ? r.saleDiscountOnMaking : ""}
                    </span>
                  ),
                },
                {
                  key: "saleDiscountType",
                  label: "S. Discount Type",
                  render: (r: any) => (
                    <span className="whitespace-nowrap">
                      {r.saleDiscountType || ""}
                    </span>
                  ),
                },
                {
                  key: "saleDiamondDiscount",
                  label: "S. Diamond Disc.",
                  render: (r: any) => (
                    <span className="font-medium whitespace-nowrap">
                      {(r.saleDiamondDiscount && r.saleDiamondDiscount !== 0 && r.saleDiamondDiscount !== "0") ? r.saleDiamondDiscount : ""}
                    </span>
                  ),
                },
                {
                  key: "saleDiamondDiscountType",
                  label: "S. Dia Disc. Type",
                  render: (r: any) => (
                    <span className="whitespace-nowrap">
                      {r.saleDiamondDiscountType || ""}
                    </span>
                  ),
                },





                {
                  key: "pureWeight",
                  label: "Pure Wt (g)",
                  render: (r: any) => formatWeight(r.pureWeight),
                },
                {
                  key: "stoneName",
                  label: "Stone",
                  render: (r: any) => r.stoneName || "—",
                },
                {
                  key: "diamondDetails",
                  label: "Diamond",
                  render: (r: any) => (
                    <div className="text-[11px] leading-4 space-y-0.5 text-muted-foreground whitespace-nowrap">
                      <div><span className="font-medium text-foreground">Clarity:</span> {r.clarity || "—"}</div>
                      <div><span className="font-medium text-foreground">Color:</span> {r.color || "—"}</div>
                      <div><span className="font-medium text-foreground">Cut:</span> {r.cut || "—"}</div>
                      <div><span className="font-medium text-foreground">Shape:</span> {r.shape || "—"}</div>
                      <div><span className="font-medium text-foreground">Purity:</span> {r.dPurityId || "—"}</div>
                    </div>
                  ),
                },
                {
                  key: "purchaseRates",
                  label: "P.Rates",
                  render: (r: any) => (
                    <div className="flex flex-col gap-1 text-[11px] whitespace-nowrap">
                      {r.purchaseGoldRate !== 0 && (
                        <span className="flex justify-between gap-3 rounded bg-amber-50 px-2 py-0.5 text-amber-800 border border-amber-100">
                          Gold <b>₹{r.purchaseGoldRate ?? 0}</b>
                        </span>
                      )}
                      {r.purchaseDiamondRate !== 0 && (
                        <span className="flex justify-between gap-3 rounded bg-sky-50 px-2 py-0.5 text-sky-800 border border-sky-100">
                          Diamond <b>₹{r.purchaseDiamondRate ?? 0}</b>
                        </span>
                      )}
                      {r.purchaseStonePrice !== 0 && (
                        <span className="flex justify-between gap-3 rounded bg-gray-100 px-2 py-0.5 text-gray-700 border border-gray-200">
                          Stone <b>₹{r.purchaseStonePrice ?? 0}</b>
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "purchaseMakingCharge",
                  label: "P.Making Charge",
                  render: (r: any) => (
                    <span className="font-medium whitespace-nowrap">
                      {r.purchaseMakingCharge} ({r.purchaseMakingChargeType})
                    </span>
                  ),
                },
                {
                  key: "pricingModel",
                  label: "Pricing Model",
                  render: (r: any) => <span className="font-medium">{r.pricingModel}</span>,
                },
                {
                  key: "salePrice",
                  label: "Sale Price",
                  render: (r: any) => <span className="font-medium text-green-700">₹{r.salePrice}</span>,
                },
                {
                  key: "hsnCode",
                  label: "HSN",
                  render: (r: any) => <span className="font-medium">{r.hsnCode || "—"}</span>,
                },
                {
                  key: "HUID code",
                  label: "HUID",
                  render: (r: any) => <span className="font-medium">{r.huid || "—"}</span>,
                },
                {
                  key: "remarks",
                  label: "Remarks",
                  render: (r: any) => (
                      <span className="line-clamp-2 max-w-[200px]" title={r.remarks}>{r.remarks || "—"}</span>
                  ),
                },
                {
                  key: "vendor",
                  label: "Vendor",
                  render: (r: any) => {
                    const vendor = vendorMap.get(r.vendorId);
                    if (!vendor) return <span className="text-muted-foreground">—</span>;
                    return (
                      <div className="leading-tight whitespace-nowrap">
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-xs text-gray-500">{vendor.phone}</div>
                      </div>
                    );
                  },
                },
                {
                  key: "createdBy",
                  label: "Created By",
                  render: (r: any) => <span className="whitespace-nowrap">{r.createdBy || "—"}</span>,
                },
                {
                  key: "createDate",
                  label: "Created",
                  render: (r: any) => (
                    <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      <span className="text-foreground font-medium">
                        {format(new Date(r.createDate), "dd MMM yyyy")}
                      </span>
                      <span className="text-gray-500">
                        {format(new Date(r.createDate), "hh:mm a")}
                      </span>
                    </div>
                  ),
                },
              ]}
              data={paginatedData}
              loading={isLoading}
              actions={[
                {
                  icon: printingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />,
                  onClick: (row: any) => handlePrintTag(row.itemId),
                  label: printingId ? "Printing..." : "Print Tag",
                },
                ...(actionPermitions?.Update || isAdmin
                  ? [
                      {
                        icon: <Edit className="h-4 w-4" />,
                        onClick: (row: any) => navigate(`/admin/stock/edit/${row.id}`),
                        label: "Edit",
                      },
                    ]
                  : []),
                ...(actionPermitions?.Delete || isAdmin
                  ? [
                      {
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: (row: any) => handleDeleteClick(row.id),
                        label: "Delete",
                      },
                    ]
                  : []),
              ]}
              emptyMessage="No stock entries found"
              pagination={{
                  page: page,
                  pageSize: pageSize,
                  total: filteredAndSortedData.length,
                  totalPages: totalPages,
                  onPageChange: (newPage: number) => setPage(newPage),
                  onPageSizeChange: (newPageSize: number) => {
                      setPageSize(newPageSize);
                      setPage(1); 
                  }
              }}
            />
          </div>
      ) : (
          /* --- GRID VIEW --- */
                   /* --- GRID VIEW --- */
          <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedData.map((r: any) => {
                      const imageUrl = imageBlobs[r.id];
                      const hasValidImage = imageUrl && imageUrl !== logo;
                      
                      return (
                          <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col relative hover:shadow-md transition-shadow overflow-hidden">
                              {/* Card Header area */}
                              <div className="p-4 border-b border-gray-100 flex gap-3">
                                  {/* Image Thumbnail */}
                                  <div className="w-20 h-20 shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-1 flex items-center justify-center overflow-hidden relative">
                                      {hasValidImage ? (
                                          <button 
                                              onClick={() => openImageModal(r)}
                                              className="w-full h-full cursor-pointer hover:opacity-80 transition"
                                              title="View Images"
                                          >
                                              <img src={imageUrl} alt={r.itemName} className="w-full h-full object-cover rounded-md" />
                                          </button>
                                      ) : (
                                          <img src={logo} alt="No image" className="w-full h-full object-contain opacity-50 p-2" />
                                      )}
                                      <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 rounded-tl-md font-mono">
                                          ID:{r.itemId}
                                      </span>
                                  </div>
                                  
                                  {/* Main Info */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                      <div>
                                          <div className="font-bold text-gray-900 line-clamp-1 text-base leading-tight" title={r.itemName}>
                                              {r.itemName}
                                          </div>
                                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                                              Tag: <span className="text-gray-900 font-medium">{r.tagNumber || "—"}</span>
                                          </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                                              {r.metal}
                                          </span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                                              ${r.modeOfStock?.toUpperCase().includes("PURCHASE") ? "bg-green-100 text-green-800"
                                              : r.modeOfStock?.toUpperCase().includes("TRANSFER") ? "bg-blue-100 text-blue-800"
                                              : "bg-gray-100 text-gray-800"}`}>
                                              {r.modeOfStock}
                                          </span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                                              ${r.stockEntryType?.toUpperCase().includes("IN") ? "bg-emerald-100 text-emerald-800"
                                              : "bg-red-100 text-red-800"}`}>
                                              {r.stockEntryType}
                                          </span>
                                      </div>
                                  </div>
                              </div>

                              {/* Card Body details */}
                              <div className="p-4 text-[11px] sm:text-xs text-gray-600 bg-gray-50/40 flex flex-col gap-3">
                                  
                                  {/* Basic Info & Pricing */}
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                      <div className="flex justify-between col-span-2 mb-1">
                                          <span className="text-gray-500 font-medium">Sale Price</span>
                                          <span className="font-bold text-green-700 text-sm">₹{r.salePrice?.toLocaleString() || "0"}</span>
                                      </div>
                                      <div className="flex justify-between"><span className="text-gray-400">Brand</span><span className="font-medium line-clamp-1 text-right">{r.brand || "—"}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="font-medium line-clamp-1 text-right">{r.category || "—"}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-medium">{r.quantity}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">KT</span><span className="font-medium">{r.caratOrKT || "—"}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Purity</span><span className="font-medium">{r.purityPercent ? `${r.purityPercent}%` : "—"}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">HSN</span><span className="font-medium">{r.hsnCode || "—"}</span></div>
                                      <div className="flex justify-between col-span-2"><span className="text-gray-400">HUID</span><span className="font-medium font-mono">{r.huid || "—"}</span></div>
                                  </div>

                                  {/* Weights Area */}
                                  <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                      <div className="flex justify-between"><span className="text-gray-400">Gross Wt</span><span className="font-medium">{formatWeight(r.grossWeight)}g</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Net Wt</span><span className="font-medium">{formatWeight(r.netWeight)}g</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Pure Wt</span><span className="font-medium">{formatWeight(r.pureWeight)}g</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Stone Wt</span><span className="font-medium">{formatWeight(r.stoneWeight)}g</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Dia Wt (g)</span><span className="font-medium">{formatWeight(r.diamondWeight)}g</span></div>
                                      <div className="flex justify-between"><span className="text-gray-400">Dia Wt (ct)</span><span className="font-medium">{formatWeight(r.diamondCarat)}ct</span></div>
                                  </div>
                                  
                                  {/* Sale Pricing Data */}
                                  {(
                                      (r.saleMakingCharge && r.saleMakingCharge !== 0 && r.saleMakingCharge !== "0") ||
                                      r.saleMakingChargeType ||
                                      (r.saleDiscountOnMaking && r.saleDiscountOnMaking !== 0 && r.saleDiscountOnMaking !== "0") ||
                                      r.saleDiscountType ||
                                      (r.saleDiamondDiscount && r.saleDiamondDiscount !== 0 && r.saleDiamondDiscount !== "0") ||
                                      r.saleDiamondDiscountType
                                  ) ? (
                                      <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-1.5">
                                          {(r.saleMakingCharge && r.saleMakingCharge !== 0 && r.saleMakingCharge !== "0") ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Making Charge</span>
                                                  <span className="font-medium">
                                                      {r.saleMakingCharge}
                                                  </span>
                                              </div>
                                          ) : null}

                                          {r.saleMakingChargeType ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Charge Type</span>
                                                  <span className="font-medium">
                                                      {r.saleMakingChargeType}
                                                  </span>
                                              </div>
                                          ) : null}

                                          {(r.saleDiscountOnMaking && r.saleDiscountOnMaking !== 0 && r.saleDiscountOnMaking !== "0") ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Disc. on Making</span>
                                                  <span className="font-medium">
                                                      {r.saleDiscountOnMaking}
                                                  </span>
                                              </div>
                                          ) : null}

                                          {r.saleDiscountType ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Discount Type</span>
                                                  <span className="font-medium">
                                                      {r.saleDiscountType}
                                                  </span>
                                              </div>
                                          ) : null}

                                          {(r.saleDiamondDiscount && r.saleDiamondDiscount !== 0 && r.saleDiamondDiscount !== "0") ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Diamond Disc.</span>
                                                  <span className="font-medium">
                                                      {r.saleDiamondDiscount}
                                                  </span>
                                              </div>
                                          ) : null}

                                          {r.saleDiamondDiscountType ? (
                                              <div className="flex justify-between">
                                                  <span className="text-gray-400">S. Dia Disc. Type</span>
                                                  <span className="font-medium">
                                                      {r.saleDiamondDiscountType}
                                                  </span>
                                              </div>
                                          ) : null}
                                      </div>
                                  ) : null}

                                  {/* Diamonds & Stones */}
                                  <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                      <div className="flex justify-between col-span-2"><span className="text-gray-400">Stone Name</span><span className="font-medium">{r.stoneName || "—"}</span></div>
                                      <div className="col-span-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500 bg-white border border-gray-100 p-1.5 rounded">
                                          <span>Cla: <b className="text-gray-700">{r.clarity || "-"}</b></span>|
                                          <span>Col: <b className="text-gray-700">{r.color || "-"}</b></span>|
                                          <span>Cut: <b className="text-gray-700">{r.cut || "-"}</b></span>|
                                          <span>Sha: <b className="text-gray-700">{r.shape || "-"}</b></span>|
                                          <span>Pur: <b className="text-gray-700">{r.dPurityId || "-"}</b></span>
                                      </div>
                                  </div>

                                  {/* Purchase Data */}
                                  <div className="border-t border-gray-200 pt-2 flex flex-col gap-1.5">
                                      <div className="flex justify-between"><span className="text-gray-400">Pricing Model</span><span className="font-medium">{r.pricingModel || "—"}</span></div>
                                      <div className="flex justify-between items-start">
                                          <span className="text-gray-400">P. Rates</span>
                                          <div className="flex flex-col items-end gap-1 text-[10px]">
                                              {r.purchaseGoldRate !== 0 && <span className="bg-amber-50 text-amber-800 px-1.5 rounded border border-amber-100">Gold ₹{r.purchaseGoldRate ?? 0}</span>}
                                              {r.purchaseDiamondRate !== 0 && <span className="bg-sky-50 text-sky-800 px-1.5 rounded border border-sky-100">Dia ₹{r.purchaseDiamondRate ?? 0}</span>}
                                              {r.purchaseStonePrice !== 0 && <span className="bg-gray-100 text-gray-700 px-1.5 rounded border border-gray-200">Stone ₹{r.purchaseStonePrice ?? 0}</span>}
                                              {r.purchaseGoldRate === 0 && r.purchaseDiamondRate === 0 && r.purchaseStonePrice === 0 && <span className="font-medium">—</span>}
                                          </div>
                                      </div>
                                      <div className="flex justify-between"><span className="text-gray-400">Making Charge</span><span className="font-medium">{r.purchaseMakingCharge || "0"} ({r.purchaseMakingChargeType || "—"})</span></div>
                                  </div>

                                  {/* Meta Data */}
                                  <div className="border-t border-gray-200 pt-2 flex flex-col gap-1.5">
                                      <div className="flex justify-between">
                                          <span className="text-gray-400">Vendor</span>
                                          <span className="font-medium line-clamp-1 text-right max-w-[150px]">{vendorMap.get(r.vendorId)?.name || "—"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-gray-400">Created By</span>
                                          <span className="font-medium">{r.createdBy || "—"}</span>
                                      </div>
                                      {r.remarks && (
                                          <div className="mt-1 bg-white border border-gray-100 rounded p-1.5">
                                              <span className="text-gray-400 text-[10px] block mb-0.5">Remarks</span>
                                              <span className="text-gray-700 italic line-clamp-2 leading-tight">{r.remarks}</span>
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* Card Actions Footer */}
                              <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-white mt-auto">
                                  <div className="flex flex-col text-[10px] text-gray-400">
                                      <span>{format(new Date(r.createDate), "dd MMM yyyy")}</span>
                                      <span>{format(new Date(r.createDate), "hh:mm a")}</span>
                                  </div>
                                  <div className="flex gap-1">
                                      <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 p-0" 
                                          onClick={() => handlePrintTag(r.itemId)} 
                                          title="Print Tag"
                                          disabled={printingId === r.itemId}
                                      >
                                          {printingId === r.itemId ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Printer className="h-4 w-4 text-blue-600 hover:text-blue-800" />}
                                      </Button>
                                      {(actionPermitions?.Update || isAdmin) && (
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/stock/edit/${r.id}`)} title="Edit Stock">
                                              <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                          </Button>
                                      )}
                                      {(actionPermitions?.Delete || isAdmin) && (
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(r.id)} title="Delete Stock">
                                              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                          </Button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>

              {/* Grid Pagination Footer */}
              {totalPages > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-200 gap-4 mt-2 shadow-sm">
                      <div className="text-sm text-gray-500 font-medium">
                          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Rows per page:</span>
                              <select 
                                  className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={pageSize}
                                  onChange={(e) => {
                                      setPageSize(Number(e.target.value));
                                      setPage(1);
                                  }}
                              >
                                  {[10, 20, 30, 40, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                              </select>
                          </div>
                          <div className="flex gap-1">
                              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                              <div className="px-3 py-1 text-sm font-medium border border-transparent flex items-center justify-center">
                                  {page} / {totalPages}
                              </div>
                              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Image Carousel Modal */}
      <Dialog open={imageModalOpen} onOpenChange={(o) => (o ? setImageModalOpen(true) : closeImageModal())}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.itemName ? selectedItem.itemName : "Item Images"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main image area */}
            <div className="relative w-full h-[60vh] max-h-[500px] rounded-xl border bg-gray-50 overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                {modalLoading ? (
                  <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Loading images...
                  </div>
                ) : modalImages.length > 0 && currentModalUrl ? (
                  <img
                    src={currentModalUrl}
                    alt={modalImages[modalIndex]?.fileName || "Item image"}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-32 h-32 object-contain opacity-60"
                    draggable={false}
                  />
                )}
              </div>

              {/* Prev/Next Buttons */}
              {modalImages.length > 1 && !modalLoading && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 text-white p-2 hover:bg-black/90 transition shadow-lg"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 text-white p-2 hover:bg-black/90 transition shadow-lg"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {modalImages.length > 0 && !modalLoading && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/70 text-white text-xs px-3 py-1 shadow-lg">
                  {modalIndex + 1} / {modalImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {modalImages.length > 1 && !modalLoading && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {modalImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setModalIndex(idx)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      idx === modalIndex 
                        ? "border-indigo-500 ring-2 ring-indigo-300" 
                        : "border-gray-200 hover:border-indigo-400"
                    }`}
                    title={img.fileName}
                  >
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={closeImageModal}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Stock Entry?"
        message="This stock entry will be permanently deleted. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Stock Entry"
        variant="destructive"
      />
    </div>
  );
};