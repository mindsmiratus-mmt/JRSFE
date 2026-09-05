// pages/shop/Shop.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Store, LayoutGrid, DollarSign, Table as TableIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";

import {
  useShops,
  useDeleteShop,
  useShopLookup,
} from "@/hooks/useShop";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";

export const Shop = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();

  const { permissions, user } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Shop');

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  const { data, isLoading, isFetching } = useShops({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const shops = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;
  
  const { data: _shopOptions = [] } = useShopLookup();
  const deleteMutation = useDeleteShop();

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Shop deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
        
        // Shift back a page if we delete the last item on the page
        if (shops.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete shop");
      },
    });
  };

  if (!hasRead) {
      return (
          <div className="flex h-[50vh] items-center justify-center p-6">
              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                  <p className="mt-2 text-gray-600">You do not have permission to view shops.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Store className="w-8 h-8 text-[#b08d28]" />
          Shops
        </h1>
        
        <div className="flex gap-2 w-full sm:w-auto items-center">
            {/* View Toggle */}
            <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
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


{hasCreate && (
    <Button onClick={() => navigate("/admin/shop/new")} size="lg" className="h-10">
        <Plus className="w-5 h-5 mr-2" />
        Add Shop
    </Button>
)}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative">
          <SearchInput
            placeholder="Search shops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            className="max-w-md"
          />
        </div>

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

      {/* Clear Filters Button */}
      {(searchTerm || fromDate || toDate) && (
        <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setPage(1); }} className="text-gray-500 hover:text-gray-800">
                Clear Filters
            </Button>
        </div>
      )}

      {/* Content Views */}
      {isLoading || isFetching ? (
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading shops...</p></div>
      ) : shops.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No shops found.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CommonTable
                columns={[
                  {
                    key: "id",
                    label: "Shop ID",
                    render: (r: any) => (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                        #{r.id}
                      </span>
                    ),
                  },
                  {
                    key: "name",
                    label: "Shop Name",
                    render: (r: any) => <span className="font-semibold text-gray-900">{r.name}</span>,
                  },
                  {
                    key: "shopCode",
                    label: "Shop Code",
                    render: (r: any) => r.shopCode || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "address",
                    label: "Address",
                    render: (r: any) => (
                        <span className="line-clamp-1 min-w-[150px] max-w-[250px] block" title={r.address}>
                            {r.address || <span className="text-gray-400">No address</span>}
                        </span>
                    ),
                  },
                  {
                    key: "city",
                    label: "City",
                    render: (r: any) => r.city || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "state",
                    label: "State",
                    render: (r: any) => r.state || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "pinCode",
                    label: "Pin Code",
                    render: (r: any) => r.pinCode || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    render: (r: any) => r.phone || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "email",
                    label: "Email",
                    render: (r: any) => r.email || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "gstNo",
                    label: "GST No",
                    render: (r: any) => r.gstNo || <span className="text-gray-400">—</span>,
                  },
                  {
                    key: "isActive",
                    label: "Status",
                    render: (r: any) => (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${r.isActive !== false
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                      >
                        {r.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    ),
                  },
                ]}
                data={shops}
                loading={isLoading || isFetching}
                emptyMessage="No shops found"
                pagination={{
                    page: page,
                    pageSize: pageSize,
                    total: totalCount, 
                    totalPages: totalPages,
                    onPageChange: (newPage: number) => setPage(newPage),
                    onPageSizeChange: (newPageSize: number) => {
                        setPageSize(newPageSize);
                        setPage(1); 
                    }
                }}
                actions={[
                  ...(hasUpdate
                    ? [
                      {
                        icon: <Edit className="h-4 w-4" />,
                        onClick: (row: any) => navigate(`/admin/shop/edit/${row.id}`),
                        label: "Edit",
                      },
                    ]
                    : []),
                  ...(hasDelete
                    ? [
                      {
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: (row: any) => handleDeleteClick(row.id),
                        label: "Delete",
                      },
                    ]
                    : []),
                ]}
              />
          </div>
      ) : (
          /* --- GRID VIEW --- */
          <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {shops.map((r: any) => (
                      <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-900 line-clamp-1 text-lg" title={r.name}>
                                      {r.name}
                                  </div>
                                  <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${r.isActive !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                      {r.isActive !== false ? "Active" : "Inactive"}
                                  </span>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1 shrink-0">
                                  {hasUpdate && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/shop/edit/${r.id}`)} title="Edit Shop">
                                          <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                      </Button>
                                  )}
                                  {hasDelete && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(r.id)} title="Delete Shop">
                                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                      </Button>
                                  )}
                              </div>
                          </div>

                          <div className="text-sm text-gray-600 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3">
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-400">Shop ID</span> 
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 font-mono">#{r.id}</span>
                              </div>
                              <div className="flex justify-between"><span className="text-gray-400">Shop Code</span> <span className="font-medium">{r.shopCode || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Pin Code</span> <span>{r.pinCode || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">City / State</span> <span>{[r.city, r.state].filter(Boolean).join(", ") || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Phone</span> <span>{r.phone || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Email</span> <span className="truncate ml-2" title={r.email}>{r.email || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">GST No</span> <span>{r.gstNo || "-"}</span></div>
                              
                              <div className="mt-1 pt-2 border-t border-gray-100 text-xs line-clamp-2" title={r.address}>
                                  <span className="text-gray-400 mr-1">Address:</span>
                                  {r.address || <span className="italic text-gray-400">No address provided.</span>}
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
                                  {[10, 20, 30, 40, 50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Shop?"
        message="This shop and all associated data will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Shop"
        variant="destructive"
      />
    </div>
  );
};