import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, CheckSquare, Square, Filter, RotateCcw, Grid3x3, Table as TableIcon } from "lucide-react";
import { format } from "date-fns";
import { CommonTable } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { formatWeight } from "@/utils/number";
import { useAllBrand } from "@/hooks/useLookup";
import { useAllCategory } from "@/hooks/useCategory";
import { useAllVendors } from "@/hooks/useVendor";
import { DateInput } from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStockNotInAvailability,
  useApproveSaleItems,
} from "@/hooks/useSaleItemAvailability";
import { getImageBlobUrl, type StockImageMeta } from "@/hooks/useUploadImage";
import api from "@/lib/axios";
import logo from '@/assets/logo.webp';
import { useAuth } from "@/contexts/AuthContext";

export const SaleItemAvailability = () => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const token = localStorage.getItem("token");

  // Fetch brands, categories, and vendors
  const { data: brands = [] } = useAllBrand();
  const { data: categories = [] } = useAllCategory();
  const { data: vendorsResponse = [] } = useAllVendors();
  const vendors = Array.isArray(vendorsResponse) ? vendorsResponse : [];

  // View mode state
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  // Pagination state (Changed to use state for dynamic page size)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [filterVendor, setFilterVendor] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState({
    category: "",
    brand: "",
    vendorId: null as number | null,
    fromDate: null as string | null,
    toDate: null as string | null,
    sortOrder: "desc" as "asc" | "desc",
  });

  // API Calls
  const { data: stockItems = [], isLoading } = useStockNotInAvailability();
  const approveMutation = useApproveSaleItems();

  // Auth & Permissions
  const { permissions, user } = useAuth();
  const actionPermitions = permissions?.find((item: any) => item?.Module === 'Sale Approval' || item?.Module === 'Sales');
  
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  const hasRead = actionPermitions?.Read || isAdmin;
  const hasUpdate = actionPermitions?.Update || isAdmin;

  // Image Blobs State
  const [imageBlobs, setImageBlobs] = useState<Record<number, string>>({});

  // Filter and sort data
  const filteredAndSortedItems = useMemo(() => {
    return stockItems
      .filter((item: any) => {
        if (appliedFilters.category && item.category !== appliedFilters.category) {
          return false;
        }
        if (appliedFilters.brand && item.brand !== appliedFilters.brand) {
          return false;
        }
        if (appliedFilters.vendorId && item.vendorId !== appliedFilters.vendorId) {
          return false;
        }
        const itemDate = new Date(item.createDate);
        if (appliedFilters.fromDate) {
          const from = new Date(appliedFilters.fromDate);
          if (itemDate < from) return false;
        }
        if (appliedFilters.toDate) {
          const to = new Date(appliedFilters.toDate);
          to.setHours(23, 59, 59, 999);
          if (itemDate > to) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createDate).getTime();
        const dateB = new Date(b.createDate).getTime();
        return appliedFilters.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [stockItems, appliedFilters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    return filteredAndSortedItems.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
  }, [filteredAndSortedItems, page, pageSize]);

  // Safety check: if approving items removes them and empties the current page, step back a page
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Load images for current page items
  useEffect(() => {
    if (!token || paginatedItems.length === 0) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    const loadThumbnails = async () => {
      const next: Record<number, string> = {};

      for (const entry of paginatedItems as any[]) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedItems, token]);

  // Calculate totals for ALL filtered items
  const filteredTotals = {
    quantity: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
    grossWeight: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.grossWeight || 0), 0),
    diamondWeight: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.diamondWeight || 0), 0),
    stoneWeight: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.stoneWeight || 0), 0),
    netWeight: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.netWeight || 0), 0),
    pureWeight: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.pureWeight || 0), 0),
    salePrice: filteredAndSortedItems.reduce((sum: number, item: any) => sum + (item.salePrice || 0), 0),
  };

  // Check if any filters are applied
  const hasActiveFilters =
    appliedFilters.category ||
    appliedFilters.brand ||
    appliedFilters.vendorId ||
    appliedFilters.fromDate ||
    appliedFilters.toDate;

  // Apply filters
  const handleApplyFilters = () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date cannot be after To date");
      return;
    }
    setAppliedFilters({
      category: filterCategory,
      brand: filterBrand,
      vendorId: filterVendor,
      fromDate,
      toDate,
      sortOrder,
    });
    setSelectedItems([]);
    setPage(1);
    toast.success("Filters applied");
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterCategory("");
    setFilterBrand("");
    setFilterVendor(null);
    setFromDate(null);
    setToDate(null);
    setSortOrder("desc");
    setAppliedFilters({
      category: "",
      brand: "",
      vendorId: null,
      fromDate: null,
      toDate: null,
      sortOrder: "desc",
    });
    setSelectedItems([]);
    setPage(1);
    toast.success("Filters reset");
  };

  const allSelected = paginatedItems.length > 0 && paginatedItems.every(
    (item: any) => selectedItems.some((selected) => selected.id === item.id)
  );

  // Toggle Select All / Deselect All
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(
        selectedItems.filter(
          (selected) => !paginatedItems.some((item: any) => item.id === selected.id)
        )
      );
    } else {
      const newSelected = [...selectedItems];
      paginatedItems.forEach((item: any) => {
        if (!newSelected.some((s) => s.id === item.id)) {
          newSelected.push(item);
        }
      });
      setSelectedItems(newSelected);
    }
  };

  // Toggle item selection
  const toggleItem = (item: any) => {
    const isSelected = selectedItems.some((selected) => selected.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter((selected) => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Submit selected items
  const handleApprove = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const payload = selectedItems.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      tagNumber: item.tagNumber,
      quantity: item.quantity,
      status: "Approved",
    }));

    approveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`${selectedItems.length} items approved successfully`);
        setSelectedItems([]);
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || "Failed to approve items"
        );
      },
    });
  };

  if (!hasRead) {
      return (
          <div className="flex h-[50vh] items-center justify-center p-6">
              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                  <p className="mt-2 text-gray-600">You do not have permission to view sale approvals.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#b08d28]" />
          Sale Approval
        </h1>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* VIEW MODE TOGGLE */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("table");
                setPage(1);
              }}
              className="rounded-none"
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("grid");
                setPage(1);
              }}
              className="rounded-none"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
          </div>

          {/* SELECT ALL BUTTON */}
          {hasUpdate && (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              disabled={paginatedItems.length === 0}
            >
              {allSelected ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </>
              )}
            </Button>
          )}

          {/* APPROVE BUTTON */}
          {hasUpdate && (
            <Button
              onClick={handleApprove}
              disabled={selectedItems.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve {selectedItems.length > 0 && `(${selectedItems.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* FILTERS SECTION */}
      <div className="bg-white p-4 rounded-lg border">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>

        <div className="flex flex-wrap items-end gap-2 w-full">

          {/* Category Filter */}
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <Select
              value={filterCategory || "all"}
              onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {/* SAFE FILTER: Removes empty, null, or undefined category names */}
                {categories
                  .filter((cat) => cat && cat.categoryName && cat.categoryName.trim() !== "")
                  .map((cat) => (
                  <SelectItem key={cat.id} value={cat.categoryName}>
                    {cat.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Brand</label>
            <Select
              value={filterBrand || "all"}
              onValueChange={(v) => setFilterBrand(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {/* SAFE FILTER: Removes empty strings from the brands array */}
                {brands
                  .filter((brand) => brand && typeof brand === 'string' && brand.trim() !== "")
                  .map((brand, idx) => (
                  <SelectItem key={idx} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Filter */}
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Vendor</label>
            <Select
              value={filterVendor ? String(filterVendor) : "all"}
              onValueChange={(v) => setFilterVendor(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {/* SAFE FILTER: Ensures vendor ID isn't empty or invalid */}
                {vendors
                  .filter((vendor) => vendor && vendor.id != null && String(vendor.id).trim() !== "")
                  .map((vendor) => (
                  <SelectItem key={vendor.id} value={String(vendor.id)}>
                    {vendor.name || `Vendor ${vendor.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-600">From</label>
            <DateInput
              value={fromDate || ""}
              onValueChange={(val) => setFromDate(val)}
              placeholder="Start"
              max={toDate || undefined}
              className="h-9 w-full"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-600">To</label>
            <DateInput
              value={toDate || ""}
              onValueChange={(val) => setToDate(val)}
              placeholder="End"
              min={fromDate || undefined}
              className="h-9 w-full"
            />
          </div>

          {/* Sort Order */}
          <div className="space-y-1 flex-1 min-w-[110px]">
            <label className="text-xs font-medium text-gray-600">Sort By</label>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            <Button onClick={handleApplyFilters} size="sm" className="h-9 px-4 bg-yellow-400 hover:bg-yellow-500 text-black border-none">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Apply
            </Button>
            <Button onClick={handleResetFilters} variant="outline" size="sm" className="h-9 px-4">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
          </div>

        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 text-xs pt-3 border-t mt-3">
            <span className="text-gray-600 font-medium self-center">Active:</span>
            {appliedFilters.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {appliedFilters.category}
              </span>
            )}
            {appliedFilters.brand && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                {appliedFilters.brand}
              </span>
            )}
            {appliedFilters.vendorId && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                {vendors.find(v => v.id === appliedFilters.vendorId)?.name || "Vendor"}
              </span>
            )}
            {appliedFilters.fromDate && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {format(new Date(appliedFilters.fromDate), "dd MMM")}
              </span>
            )}
            {appliedFilters.toDate && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {format(new Date(appliedFilters.toDate), "dd MMM")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* FILTERED ITEMS TOTALS BOX */}
      {(hasActiveFilters || selectedItems.length > 0) && filteredAndSortedItems.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Filtered Results Summary
                </p>
                <p className="text-xs text-gray-600">
                  Showing totals for {filteredAndSortedItems.length} filtered items
                  {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
                </p>
              </div>
            </div>
            {selectedItems.length > 0 && hasUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItems([])}
                className="text-blue-700 hover:text-blue-900"
              >
                Clear Selection
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Qty</p>
              <p className="text-xl font-bold text-gray-900">{filteredTotals.quantity}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Gross Wt</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTotals.grossWeight.toFixed(3)} <span className="text-sm font-normal">g</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Diamond Wt</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTotals.diamondWeight.toFixed(3)} <span className="text-sm font-normal">g</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Stone Wt</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTotals.stoneWeight.toFixed(3)} <span className="text-sm font-normal">g</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Net Wt</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTotals.netWeight.toFixed(3)} <span className="text-sm font-normal">g</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Pure Wt</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTotals.pureWeight.toFixed(3)} <span className="text-sm font-normal">g</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Sale Price</p>
              <p className="text-xl font-bold text-green-600">
                ₹{filteredTotals.salePrice.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TABLE OR GRID VIEW */}
      {viewMode === "table" ? (
        <CommonTable
          columns={[
            ...(hasUpdate ? [{
              key: "select",
              label: "Select",
              render: (r: any) => (
                <div className="flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(r);
                    }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      selectedItems.some((item) => item.id === r.id)
                        ? "bg-green-500 border-green-500 shadow-md"
                        : "bg-white border-gray-300 hover:border-green-400 hover:shadow-sm"
                    }`}
                  >
                    {selectedItems.some((item) => item.id === r.id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                </div>
              ),
            }] : []),
            {
              key: "image",
              label: "Image",
              render: (r: any) => (
                <div className="w-24 h-24 rounded-md overflow-hidden bg-gray-50 border">
                  <img
                    src={imageBlobs[r.id] || logo}
                    alt={r.itemName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = logo; }}
                  />
                </div>
              ),
            },
            {
              key: "itemId",
              label: "Item ID",
              render: (r: any) => r.itemId,
            },
            {
              key: "tagNumber",
              label: "Tag Number",
              render: (r: any) => r.tagNumber || "—",
            },
            {
              key: "itemName",
              label: "Item Name",
              render: (r: any) => (
                <div>
                  <div className="font-medium">{r.itemName}</div>
                  <div className="text-sm text-gray-500">
                    {r.brand} - {r.category}
                  </div>
                </div>
              ),
            },
            {
              key: "metal",
              label: "Metal",
              render: (r: any) => (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {r.metal}
                </span>
              ),
            },
            {
              key: "caratOrKT",
              label: "Carat/KT",
              render: (r: any) => (
                <span>
                  {r.caratOrKT} ({r.purityPercent}%)
                </span>
              ),
            },
            {
              key: "quantity",
              label: "Qty",
              render: (r: any) => (
                <span className="font-semibold">{r.quantity}</span>
              ),
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
              key: "diamondWeightCt",
              label: "Diamond Wt (ct)",
              render: (r: any) => `${formatWeight(5 * r.diamondWeight)} ct`,
            },
            {
              key: "netWeight",
              label: "Net Wt (g)",
              render: (r: any) => formatWeight(r.netWeight),
            },
            {
              key: "pureWeight",
              label: "Pure Wt (g)",
              render: (r: any) => formatWeight(r.pureWeight),
            },
            {
              key: "salePrice",
              label: "Sale Price",
              render: (r: any) => (
                <span className="font-bold text-lg">
                  ₹{r.salePrice?.toLocaleString()}
                </span>
              ),
            },
            {
              key: "createDate",
              label: "Created",
              render: (r: any) => format(new Date(r.createDate), "dd MMM yyyy"),
            },
          ]}
          data={paginatedItems}
          loading={isLoading}
          actions={[]}
          emptyMessage="No items match the selected filters"
          
          // Replaced individual pagination props with the unified pagination object
          pagination={{
            page: page,
            pageSize: pageSize,
            total: filteredAndSortedItems.length,
            totalPages: totalPages,
            onPageChange: (newPage: number) => setPage(newPage),
            onPageSizeChange: (newPageSize: number) => {
              setPageSize(newPageSize);
              setPage(1); 
            }
          }}
        />
      ) : (
        /* GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No items match the selected filters
              </div>
            ) : (
              paginatedItems.map((item: any) => {
                const isSelected = selectedItems.some((selected) => selected.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg border-2 overflow-hidden transition-all duration-200 hover:shadow-lg ${
                      isSelected ? "border-green-500 shadow-md ring-1 ring-green-500" : "border-gray-200"
                    } ${hasUpdate ? "cursor-pointer" : "cursor-default"}`}
                    onClick={() => hasUpdate && toggleItem(item)}
                  >
                    {/* Image in Grid Card */}
                    <div className="w-full h-48 bg-gray-50 border-b relative">
                      <img
                        src={imageBlobs[item.id] || logo}
                        alt={item.itemName}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => { (e.target as HTMLImageElement).src = logo; }}
                      />
                      {/* Selection Badge - FIXED */}
                      {hasUpdate && (
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected ? "border-green-500 bg-green-500 shadow-md" : "border-gray-300 bg-white"
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">ID: {item.itemId}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800">
                              {item.metal}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg text-gray-900 leading-tight">{item.itemName}</h3>
                          <p className="text-sm text-gray-500">{item.brand} • {item.category}</p>
                        </div>
                      </div>

                      {item.tagNumber && (
                        <div className="bg-gray-50 rounded px-2 py-1 inline-block">
                          <span className="text-xs text-gray-600">Tag: </span>
                          <span className="text-xs font-semibold">{item.tagNumber}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div>
                          <span className="text-gray-500">Purity:</span>
                          <p className="font-medium">{item.caratOrKT} ({item.purityPercent}%)</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Qty:</span>
                          <p className="font-semibold">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross Wt:</span>
                          <p className="font-medium">{formatWeight(item.grossWeight)} g</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Net Wt:</span>
                          <p className="font-medium">{formatWeight(item.netWeight)} g</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Sale Price</span>
                          <span className="text-lg font-bold text-green-600">
                            ₹{item.salePrice?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* GRID PAGINATION */}
          {filteredAndSortedItems.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-white border rounded-lg">
              <p className="text-sm text-gray-600">
                Showing {Math.min((page - 1) * pageSize + 1, filteredAndSortedItems.length)} to {Math.min(page * pageSize, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} results
              </p>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                  First
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  Next
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};