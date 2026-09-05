// pages/tag/TagList.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Package, LayoutGrid, Table as TableIcon } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";

import {
  useTags,
  useDeleteTag,
} from "@/hooks/useTag";
import { useAuth } from "@/contexts/AuthContext";

export const Tag = () => {
  const navigate = useNavigate();

  // ========================
  // Filters
  // ========================
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { permissions, user } = useAuth();
  const actionPermitions = permissions.find((item) => item?.Module === "Tag");
  const isAdmin =
    user?.userRoles?.some(
      (ur: any) => ur.role?.name === "Admin"
    ) ?? false;

  // ========================
  // Debounced search
  // ========================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  // ========================
  // Fetch Tags
  // ========================
  const { data, isLoading, isFetching } = useTags({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  // Safely extract properties by casting to any to fix TypeScript errors
  const responseData = data as any;
  const tags = responseData?.data || [];
  
  // Fallback to array length if totalCount is missing from the API
  const totalCount = responseData?.totalCount || tags.length;
  const totalPages = responseData?.totalPages || Math.max(1, Math.ceil(totalCount / pageSize));

  const deleteMutation = useDeleteTag();

  // Keep page valid after delete / page size change / refetch
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ========================
  // Handlers
  // ========================
  const handleDelete = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Tag deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);

        if (tags.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete tag");
        setConfirmOpen(false);
      },
    });
  };

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const hasActiveFilters = !!searchTerm || !!fromDate || !!toDate;

  // ========================
  // UI
  // ========================
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-[#b08d28]" />
          Tags
        </h1>

        <div className="flex gap-2 w-full sm:w-auto items-center">
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

            {(actionPermitions?.Create || isAdmin) && (
              <Button size="lg" onClick={() => navigate("/admin/tag/new")} className="h-10 shrink-0 whitespace-nowrap">
                <Plus className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Create Tag</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative">
          <SearchInput
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
          />
        </div>

        <DateInput
          value={fromDate || ""}
          placeholder="From Date"
          max={toDate || undefined}
          onValueChange={(val) => {
            if (val && toDate && isAfter(val, toDate)) {
              toast.error("From date cannot be after To date");
              return;
            }
            setFromDate(val);
          }}
        />

        <DateInput
          value={toDate || ""}
          placeholder="To Date"
          min={fromDate || undefined}
          onValueChange={(val) => {
            if (val && fromDate && isBefore(val, fromDate)) {
              toast.error("To date cannot be before From date");
              return;
            }
            setToDate(val);
          }}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-800"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Content Views */}
      {isLoading || isFetching ? (
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading tags...</p></div>
      ) : tags.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No tags found.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CommonTable
                columns={[
                  {
                    key: "tagNo",
                    label: "Tag No",
                    render: (t: any) => (
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        {t.tagNo || "-"}
                      </span>
                    ),
                  },
                  {
                    key: "item",
                    label: "Item",
                    render: (t: any) => (
                      <div className="min-w-[150px]">
                        <div className="font-medium text-gray-900 line-clamp-1" title={t.item?.name}>{t.item?.name || "-"}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {t.item?.goldKT || "-"} •{" "}
                          {t.item?.category?.categoryName || "N/A"}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "weight",
                    label: "Weight",
                    render: (t: any) => (
                      <span className="whitespace-nowrap">
                        {t.weight !== undefined ? `${t.weight.toFixed(3)} g` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "purity",
                    label: "Purity",
                    render: (t: any) => (
                      <span className="whitespace-nowrap">
                        {t.purity !== undefined ? `${t.purity} %` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "rate",
                    label: "Rate / g",
                    render: (t: any) => (
                      <span className="whitespace-nowrap font-medium">
                        {t.rate !== undefined ? `₹${t.rate.toLocaleString("en-IN")}` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "makingCharge",
                    label: "Making",
                    render: (t: any) => (
                      <span className="whitespace-nowrap font-medium">
                        {t.makingCharge !== undefined ? `₹${t.makingCharge.toLocaleString("en-IN")}` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "tagDate",
                    label: "Tagged On",
                    render: (t: any) => (
                      <span className="whitespace-nowrap text-gray-600">
                        {t.tagDate ? format(new Date(t.tagDate), "dd MMM yyyy") : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "isPrinted",
                    label: "Printed",
                    render: (t: any) => (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          t.isPrinted
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {t.isPrinted ? "Yes" : "No"}
                      </span>
                    ),
                  },
                ]}
                data={tags}
                loading={isLoading || isFetching}
                emptyMessage="No tags found"
                actions={[
                  ...(actionPermitions?.Update || isAdmin
                    ? [
                        {
                          icon: <Edit className="h-4 w-4" />,
                          label: "Edit",
                          onClick: (r: any) => navigate(`/admin/tag/edit/${r.id}`),
                        },
                      ]
                    : []),
                  ...(actionPermitions?.Delete || isAdmin
                    ? [
                        {
                          icon: <Trash2 className="h-4 w-4" />,
                          label: "Delete",
                          onClick: (r: any) => handleDelete(r.id),
                        },
                      ]
                    : []),
                ]}
                pagination={{
                  page: page,
                  pageSize: pageSize,
                  total: totalCount,
                  totalPages: totalPages,
                  onPageChange: (newPage: number) => setPage(newPage),
                  onPageSizeChange: (newPageSize: number) => {
                    setPageSize(newPageSize);
                    setPage(1);
                  },
                }}
              />
          </div>
      ) : (
          /* --- GRID VIEW --- */
          <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tags.map((t: any) => (
                      <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col relative hover:shadow-md transition-shadow">
                          {/* Header */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Tag No</div>
                                  <div className="font-bold text-gray-900 text-sm font-mono truncate" title={t.tagNo}>
                                      {t.tagNo || "—"}
                                  </div>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 border
                                  ${t.isPrinted ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                              >
                                  {t.isPrinted ? "Printed" : "Not Printed"}
                              </span>
                          </div>

                          {/* Item Details */}
                          <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-3 mb-4">
                              <div className="font-semibold text-gray-900 line-clamp-1 text-base" title={t.item?.name}>
                                  {t.item?.name || "Unknown Item"}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500 font-mono mt-2">
                                  <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-medium">{t.item?.goldKT || "—"}</span>
                                  <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]">{t.item?.category?.categoryName || "—"}</span>
                              </div>
                          </div>

                          {/* Metrics */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 text-sm bg-gray-50/30 p-3 rounded-lg border border-gray-50">
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Weight</div>
                                  <div className="font-semibold text-gray-900">{t.weight !== undefined ? `${t.weight.toFixed(3)} g` : "—"}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Purity</div>
                                  <div className="font-semibold text-gray-900">{t.purity !== undefined ? `${t.purity} %` : "—"}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Rate / g</div>
                                  <div className="font-semibold text-gray-900">{t.rate !== undefined ? `₹${t.rate.toLocaleString("en-IN")}` : "—"}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Making</div>
                                  <div className="font-semibold text-gray-900">{t.makingCharge !== undefined ? `₹${t.makingCharge.toLocaleString("en-IN")}` : "—"}</div>
                              </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                              <div className="text-xs text-gray-500 flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Tagged On</span>
                                  <span className="font-medium text-gray-700">{t.tagDate ? format(new Date(t.tagDate), "dd MMM yyyy") : "—"}</span>
                              </div>
                              <div className="flex gap-1">
                                  {(actionPermitions?.Update || isAdmin) && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/tag/edit/${t.id}`)} title="Edit Tag">
                                          <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                      </Button>
                                  )}
                                  {(actionPermitions?.Delete || isAdmin) && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(t.id)} title="Delete Tag">
                                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                      </Button>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              {/* Grid Pagination Footer */}
              {totalPages > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-200 gap-4 mt-2 shadow-sm">
                      <div className="text-sm text-gray-500 font-medium">
                          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Tag?"
        message="This tag will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};