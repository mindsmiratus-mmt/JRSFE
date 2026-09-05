// src/pages/returns/ReturnItemAvailability.tsx
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle,
  CheckSquare,
  Square,
  Filter,
  RotateCcw,
  Grid3x3,
  Table as TableIcon,
  User,
  Store,
  IndianRupee,
  Tag,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommonTable } from "@/components/ui/table";
import { DateInput } from "@/components/ui/DatePicker";
import { toast } from "@/components/ui/toast";
import {
  usePendingApprovalList,
  useApproveReturn,
  useRepairReturn, 
} from "@/hooks/useReturn";
import { useAuth } from "@/contexts/AuthContext";

// Using any for now based on your previous file, upgrade to proper type when available
type ReturnRow = any;

export const ReturnItemAvailability = () => {
  // view mode
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Fetch pending approval list
  const { data, isLoading } = usePendingApprovalList();
  const approveReturn = useApproveReturn();
  const repairReturn = useRepairReturn();

  // Auth & Permissions
  const { permissions, user } = useAuth();
  
  // Checking for "Sale Item Avaliablity" as per your database module list
  const actionPermissions = permissions.find(
    (item: any) => item?.Module === 'Sale Item Avaliablity' || item?.Module === 'Return Item Availability'
  );
  
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  // Boolean flags for cleaner conditional rendering
  const hasRead = actionPermissions?.Read || isAdmin;
  const hasUpdate = actionPermissions?.Update || isAdmin;

  // Adapt to API response shape
  const allPendingReturns: ReturnRow[] = data?.items ?? data?.data ?? data ?? [];

  // filters (input)
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [shopIdInput, setShopIdInput] = useState<string>("");

  // filters actually applied to list
  const [appliedFilters, setAppliedFilters] = useState<{
    keyword: string;
    fromDate: string | null;
    toDate: string | null;
    shopId: number | null;
  }>({
    keyword: "",
    fromDate: null,
    toDate: null,
    shopId: null,
  });

  // Apply frontend filtering on the pending returns list
  const returns = useMemo(() => {
    return allPendingReturns.filter((r: ReturnRow) => {
      // Shop Filter
      if (appliedFilters.shopId !== null && r.shopId !== appliedFilters.shopId) {
        return false;
      }
      
      // Keyword Filter
      if (appliedFilters.keyword) {
        const kw = appliedFilters.keyword.toLowerCase();
        const matchesKeyword =
          r.returnNo?.toLowerCase().includes(kw) ||
          String(r.invoiceId).includes(kw) ||
          r.customer?.name?.toLowerCase().includes(kw);
        
        if (!matchesKeyword) return false;
      }

      // Date Filters
      if (appliedFilters.fromDate) {
        const rowDate = new Date(r.returnDate);
        const from = new Date(appliedFilters.fromDate);
        if (rowDate < from) return false;
      }
      
      if (appliedFilters.toDate) {
        const rowDate = new Date(r.returnDate);
        const to = new Date(appliedFilters.toDate);
        to.setHours(23, 59, 59, 999);
        if (rowDate > to) return false;
      }

      return true;
    });
  }, [allPendingReturns, appliedFilters]);

  // Client-side pagination variables
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const total = returns.length;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Added safety effect: if you approve all items on the last page, step back
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Sliced returns for the current page
  const currentReturns = returns.slice((page - 1) * pageSize, page * pageSize);

  // selection
  const [selectedReturns, setSelectedReturns] = useState<ReturnRow[]>([]);

  const allSelected =
    currentReturns.length > 0 &&
    currentReturns.every((r: any) =>
      selectedReturns.some((s) => s.id === r.id),
    );

  const hasActiveFilters =
    !!appliedFilters.keyword ||
    !!appliedFilters.fromDate ||
    !!appliedFilters.toDate ||
    !!appliedFilters.shopId;

  const handleApplyFilters = () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date cannot be after To date");
      return;
    }

    const parsedShopId = shopIdInput.trim() === "" ? null : Number(shopIdInput);

    if (parsedShopId !== null && Number.isNaN(parsedShopId)) {
      toast.error("Shop ID must be a number");
      return;
    }

    setAppliedFilters({
      keyword: keyword.trim(),
      fromDate,
      toDate,
      shopId: parsedShopId,
    });
    setSelectedReturns([]);
    setPage(1);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    setKeyword("");
    setFromDate(null);
    setToDate(null);
    setShopIdInput("");
    setAppliedFilters({
      keyword: "",
      fromDate: null,
      toDate: null,
      shopId: null,
    });
    setSelectedReturns([]);
    setPage(1);
    toast.success("Filters reset");
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedReturns([]);
    } else {
      setSelectedReturns(currentReturns);
    }
  };

  const toggleReturn = (row: ReturnRow) => {
    if (!hasUpdate) return; // Prevent selection if user lacks update permission
    const isSelected = selectedReturns.some((r) => r.id === row.id);
    if (isSelected) {
      setSelectedReturns((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      setSelectedReturns((prev) => [...prev, row]);
    }
  };

  // simple totals over currently loaded page 
  const pageTotals = useMemo(() => {
    return currentReturns.reduce(
      (acc, r: any) => {
        acc.count += 1;
        acc.totalAmount += r.totalReturnAmount || 0;
        return acc;
      },
      { count: 0, totalAmount: 0 },
    );
  }, [currentReturns]);

  // Loading states for both actions
  const [approving, setApproving] = useState(false);
  const [repairing, setRepairing] = useState(false);

  // --- APPROVE HANDLER ---
  const handleApproveSelected = async () => {
    if (selectedReturns.length === 0) {
      toast.error("Please select at least one return");
      return;
    }

    try {
      setApproving(true);
      const returnsToApprove = selectedReturns.filter((r) => r.id != null);

      if (returnsToApprove.length === 0) {
        toast.error("No valid returns to approve");
        return;
      }

      await Promise.all(
        returnsToApprove.map((returnObj) => {
          const itemIds = returnObj.items?.map((i: any) => i.id) || [];
          return approveReturn.mutateAsync({ 
            id: returnObj.id, 
            itemIds: itemIds 
          });
        }),
      );

      toast.success(`${returnsToApprove.length} returns approved successfully (Stock Ready)`);
      setSelectedReturns([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to approve returns";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  // --- REPAIR HANDLER ---
  const handleRepairSelected = async () => {
    if (selectedReturns.length === 0) {
      toast.error("Please select at least one return");
      return;
    }

    try {
      setRepairing(true);
      const returnsToRepair = selectedReturns.filter((r) => r.id != null);

      if (returnsToRepair.length === 0) {
        toast.error("No valid returns to send to repair");
        return;
      }

      await Promise.all(
        returnsToRepair.map((returnObj) => {
          const itemIds = returnObj.items?.map((i: any) => i.id) || [];
          return repairReturn.mutateAsync({ 
            id: returnObj.id, 
            payload: itemIds 
          });
        }),
      );

      toast.success(`${returnsToRepair.length} returns sent for repair`);
      setSelectedReturns([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send returns for repair";
      toast.error(msg);
    } finally {
      setRepairing(false);
    }
  };

  const isProcessing = approving || repairing;

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view item availability.</p>
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
          Pending Returns
        </h1>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* View toggle */}
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

          {/* Conditional rendering of action buttons based on Update permission */}
          {hasUpdate && (
            <>
              {/* Select all */}
              <Button
                onClick={handleSelectAll}
                variant="outline"
                disabled={currentReturns.length === 0 || isProcessing}
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

              {/* Repair Button */}
              <Button
                onClick={handleRepairSelected}
                disabled={selectedReturns.length === 0 || isProcessing}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {repairing ? "Sending..." : "Repair"}
                {selectedReturns.length > 0 &&
                  !isProcessing &&
                  ` (${selectedReturns.length})`}
              </Button>

              {/* Approve Button */}
              <Button
                onClick={handleApproveSelected}
                disabled={selectedReturns.length === 0 || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {approving ? "Approving..." : "Approve (Stock)"}
                {selectedReturns.length > 0 &&
                  !isProcessing &&
                  ` (${selectedReturns.length})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>

        <div className="flex flex-wrap items-end gap-2 w-full">
          {/* Keyword */}
          <div className="space-y-1 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-600">Keyword</label>
            <input
              className="h-9 w-full border rounded px-2 text-sm"
              placeholder="Search by return no / invoice / customer"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Shop ID */}
          <div className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-600">Shop ID</label>
            <input
              className="h-9 w-full border rounded px-2 text-sm"
              placeholder="All"
              value={shopIdInput}
              onChange={(e) => setShopIdInput(e.target.value)}
            />
          </div>

          {/* From date */}
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

          {/* To date */}
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

          {/* Buttons */}
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleApplyFilters}
              size="sm"
              className="h-9 px-4 bg-yellow-400 hover:bg-yellow-500 text-black border-none"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Apply
            </Button>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              className="h-9 px-4"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Active filters chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 text-xs pt-3 border-t mt-3">
            <span className="text-gray-600 font-medium self-center">
              Active:
            </span>
            {appliedFilters.keyword && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                {appliedFilters.keyword}
              </span>
            )}
            {appliedFilters.shopId && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                Shop #{appliedFilters.shopId}
              </span>
            )}
            {appliedFilters.fromDate && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                From {format(new Date(appliedFilters.fromDate), "dd MMM")}
              </span>
            )}
            {appliedFilters.toDate && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                To {format(new Date(appliedFilters.toDate), "dd MMM")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Totals for current page */}
      {currentReturns.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Page Summary
                </p>
                <p className="text-xs text-gray-600">
                  Showing {currentReturns.length} returns on this page
                  {selectedReturns.length > 0 &&
                    ` • ${selectedReturns.length} selected`}
                </p>
              </div>
            </div>
            {selectedReturns.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReturns([])}
                className="text-blue-700 hover:text-blue-900"
              >
                Clear Selection
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Returns</p>
              <p className="text-xl font-bold text-gray-900">
                {pageTotals.count}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">
                Total Return Amount
              </p>
              <p className="text-xl font-bold text-green-600">
                ₹{pageTotals.totalAmount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main list: table or grid */}
      {viewMode === "table" ? (
        <CommonTable
          columns={[
            {
              key: "returnNo",
              label: "Return No",
              render: (r: any) => (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="font-mono font-semibold">
                    {r.returnNo || `RET-${r.id}`}
                  </span>
                </div>
              ),
            },
            {
              key: "invoice",
              label: "Invoice",
              render: (r: any) => (
                <span className="text-sm text-gray-700">#{r.invoiceId}</span>
              ),
            },
            {
              key: "customer",
              label: "Customer",
              render: (r: any) => (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <div>
                    <p className="font-semibold">
                      {r.customer?.name ?? "Customer"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.customer?.phone ?? ""}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "shop",
              label: "Shop",
              render: (r: any) => (
                <div className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-700">
                    {r.shop?.name ?? r.shopId ?? ""}
                  </span>
                </div>
              ),
            },
            {
              key: "date",
              label: "Return Date",
              render: (r: any) =>
                r.returnDate
                  ? format(new Date(r.returnDate), "dd MMM yyyy HH:mm")
                  : "—",
            },
            {
              key: "amount",
              label: "Amount",
              render: (r: any) => (
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                  <span className="font-semibold text-green-700">
                    {r.totalReturnAmount?.toLocaleString("en-IN") ?? 0}
                  </span>
                </div>
              ),
            },
            {
              key: "items",
              label: "Items",
              render: (r: any) => (
                <span className="text-sm font-medium">
                  {r.items?.length ?? 0}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r: any) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    r.status === "Completed"
                      ? "bg-green-100 text-green-800"
                      : r.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r.status || "—"}
                </span>
              ),
            },
            // Select column rendered conditionally if user has update permission
            ...(hasUpdate ? [{
              key: "select",
              label: "Select",
              render: (r: any) => {
                const isSelected = selectedReturns.some((s) => s.id === r.id);
                return (
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReturn(r);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? "bg-green-500 border-green-500 shadow-md"
                          : "bg-white border-gray-300 hover:border-green-400 hover:shadow-sm"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </button>
                  </div>
                );
              },
            }] : []),
          ]}
          data={currentReturns}
          loading={isLoading}
          actions={[]}
          emptyMessage="No returns match the selected filters"
          
          pagination={{
              page: page,
              pageSize: pageSize,
              total: total, 
              totalPages: totalPages,
              onPageChange: (newPage: number) => setPage(newPage),
              onPageSizeChange: (newPageSize: number) => {
                  setPageSize(newPageSize);
                  setPage(1); 
              }
          }}
        />
      ) : (
        // GRID VIEW
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
              </div>
            ) : currentReturns.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No returns match the selected filters
              </div>
            ) : (
              currentReturns.map((r: any) => {
                const isSelected = selectedReturns.some((s) => s.id === r.id);
                return (
                  <div
                    key={r.id}
                    className={`bg-white rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                      hasUpdate ? 'cursor-pointer hover:shadow-lg' : ''
                    } ${
                      isSelected
                        ? "border-green-500 shadow-md ring-1 ring-green-500"
                        : "border-gray-200"
                    }`}
                    onClick={() => toggleReturn(r)}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">
                              Return:
                            </span>
                            <span className="font-mono text-sm font-semibold">
                              {r.returnNo || `RET-${r.id}`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {r.returnDate
                              ? format(
                                  new Date(r.returnDate),
                                  "dd MMM yyyy, HH:mm",
                                )
                              : ""}
                          </p>
                          <p className="text-xs text-gray-500">
                            Invoice #{r.invoiceId}
                          </p>
                        </div>

                        {/* selection badge */}
                        {hasUpdate && (
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? "border-green-500 bg-green-500 shadow-md"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 bg-white rounded-full" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">
                            {r.customer?.name ?? "Customer"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">
                            {r.shop?.name ?? r.shopId ?? ""}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p className="font-semibold">
                            {r.items?.length ?? 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount:</span>
                          <p className="font-semibold text-green-600">
                            ₹
                            {r.totalReturnAmount?.toLocaleString(
                              "en-IN",
                            ) ?? 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p
                            className={`font-semibold ${
                              r.status === "Completed"
                                ? "text-green-700"
                                : r.status === "Pending"
                                ? "text-yellow-700"
                                : "text-gray-700"
                            }`}
                          >
                            {r.status || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Grid pagination */}
          {total > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-white border rounded-lg">
              <p className="text-sm text-gray-600">
                Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
                {Math.min(page * pageSize, total)} of {total} results
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
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