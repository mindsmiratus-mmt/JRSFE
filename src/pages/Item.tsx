// pages/item/ItemList.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";

import { useItems, useDeleteItem } from "@/hooks/useItem";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import Barcode from "react-barcode";

export const Item = () => {
  const navigate = useNavigate();

  // ======================== 
  // State (same as Category)
  // ========================
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { permissions, user } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Item');

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  // ========================
  // Debounce search
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
  // API
  // ========================
  const { data, isLoading, isFetching } = useItems({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const items = data?.data || [];
  const totalCount = data?.totalCount || 0;
  // 2. Extract totalPages from the response
  const totalPages = data?.totalPages || 1;

  const deleteMutation = useDeleteItem();

  // ========================
  // Delete handlers
  // ========================
  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Item deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);

        // 3. Prevent empty page bug by stepping back if we delete the last item
        if (items.length === 1 && page > 1) {
          setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete item");
      },
    });
  };

  // ========================
  // UI
  // ========================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-[#b08d28]" />
          Items
        </h1>
        {
          hasCreate && (
            <Button onClick={() => navigate("/admin/item/new")} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add New Item
            </Button>
          )
        }

      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <SearchInput
            placeholder="Search"
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

      {/* Table */}
      <CommonTable
        columns={[
          {
            key: "barcode",
            label: "Barcode",
            render: (r) => (
              <div className="space-y-1">
                {r.barcode && (
                  <Barcode
                    value={r.barcode}
                    width={1.5}
                    height={40}
                    fontSize={10}
                  />
                )}
              </div>
            ),
          },
          {
            key: "name",
            label: "Item Name",
            render: (r) => (
              <div
                className="font-semibold"
              >
                {r.name}
              </div>
            ),
          },
          {
            key: "category",
            label: "Category",
            render: (r) => r.category?.categoryName || "-",
          },
          { key: "goldKT", label: "KT" },
          {
            key: "grossWt",
            label: "Gross Wt",
            render: (r) => `${r.grossWt}g`,
          },
          {
            key: "netWt",
            label: "Net Wt",
            render: (r) => `${r.netWt}g`,
          },
          {
            key: "making",
            label: "Making/g",
            render: (r) => `₹${r.making.toLocaleString("en-IN")}`,
          },
          {
            key: "quantity",
            label: "Qty",
            render: (r) => (
              <span
                className={
                  r.quantity > 0 ? "text-green-600" : "text-red-600"
                }
              >
                {r.quantity}
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${r.status === "Available"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
                  }`}
              >
                {r.status}
              </span>
            ),
          },
        ]}
        data={items}
        loading={isLoading || isFetching}
        emptyMessage="No items found"

        // 4. Using the unified pagination object
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
                label: "Edit",
                onClick: (row: any) =>
                  navigate(`/admin/item/edit/${row.id}`),
              },
            ]
            : []),
          ...(hasDelete
            ? [
              {
                icon: <Trash2 className="h-4 w-4" />,
                label: "Delete",
                onClick: (row: any) => handleDeleteClick(row.id),
              },
            ]
            : []),
        ]}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Item?"
        message="This item will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Item"
        variant="destructive"
      />
    </div>
  );
};