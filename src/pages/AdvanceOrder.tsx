// pages/advance-order/AdvanceOrderList.tsx
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  Plus,
  Package,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  User,
  Printer,
  Loader2,
  Receipt,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { SearchInput } from "@/components/ui/searchInput";
import { DateInput } from "@/components/ui/DatePicker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useDeleteAdvanceOrder } from "@/hooks/useAdvanceOrder";
import { useOrderList, useAdvanceReceiptPdf } from "@/hooks/useOrder";
import { useInvoicePdf } from "@/hooks/useInvoice";
import { useAuth } from "@/contexts/AuthContext";

type AdvanceOrderRow = {
  id: number;
  orderNo?: string;
  orderDate?: string;
  deliveryDate?: string;
  createdAt?: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  status?: string;
  invoiceId?: number;
  invoice?: {
    id?: number;
    invoiceNo?: string;
    invoiceDate?: string;
    totalAmount?: number;
    paidAmount?: number;
    paymentMethod?: string;
    status?: string;
  };
  customer?: {
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
  };
  isAdvanceOrder?: boolean;
  cartData?: any;
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const downloadPdfBlob = (blobData: Blob, fallbackName: string) => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const newTab = window.open(url, "_blank");

  if (!newTab) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

const formatCurrency = (value: unknown) =>
  num(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatCustomDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "dd MMM yyyy");
};

const isBeforeDate = (a: string | null, b: string | null) => {
  if (!a || !b) return false;
  return new Date(a) < new Date(b);
};

const isAfterDate = (a: string | null, b: string | null) => {
  if (!a || !b) return false;
  return new Date(a) > new Date(b);
};

const isPendingAdvanceOrder = (order: AdvanceOrderRow) =>
  !!order.isAdvanceOrder && order.status === "PendingPayment";

const isPaidAdvanceOrder = (order: AdvanceOrderRow) =>
  !!order.isAdvanceOrder &&
  (order.status === "Closed" || order.status === "DELIVERED");

const shouldShowAdvanceReceipt = (order: AdvanceOrderRow) =>
  isPendingAdvanceOrder(order);

const shouldShowInvoice = (order: AdvanceOrderRow) =>
  isPaidAdvanceOrder(order) && !!order.invoiceId;

export const AdvanceOrder = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("All");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { permissions, user, selectedShop } = useAuth();
  const actionPermitions = permissions.find(
    (item: any) => item?.Module === "Advance Order"
  );

  const isAdmin =
    (user as any)?.userRoles?.some((ur: any) => ur.role?.name === "Admin") ?? false;

  const hasCreate = actionPermitions?.Create || isAdmin;
  const hasUpdate = actionPermitions?.Update || isAdmin;
  const hasDelete = actionPermitions?.Delete || isAdmin;

  const userId = user?.id ?? 0;
  const shopId = selectedShop?.id ?? 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, statusFilter]);

  const { data, isLoading, isFetching } = useOrderList({
    userId,
    shopId,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteAdvanceOrder();
  const { mutate: fetchInvoicePdf, isPending: isInvoicePdfLoading } = useInvoicePdf();
  const { mutate: fetchAdvanceReceiptPdf, isPending: isAdvanceReceiptLoading } =
    useAdvanceReceiptPdf();

  const rawOrders: AdvanceOrderRow[] = data?.data || [];

  const advanceOrders = useMemo(() => {
    return rawOrders
      .map((order: any) => ({
        ...order,
        totalAmount:
          num(order.totalAmount) ||
          num(order?.invoice?.totalAmount) ||
          num(order?.cartData?.grandTotal),
        advanceAmount: num(order.advanceAmount),
        balanceAmount: num(order.balanceAmount),
      }))
      .filter((order) => !!order.isAdvanceOrder);
  }, [rawOrders]);

  const filteredOrders = useMemo(() => {
    return advanceOrders.filter((order) => {
      const actualDate = order.orderDate || order.createdAt;
      const orderDate = actualDate ? new Date(actualDate) : null;
      if (orderDate) orderDate.setHours(0, 0, 0, 0);

      const start = fromDate ? new Date(fromDate) : null;
      const end = toDate ? new Date(toDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);

      const matchesStartDate = start && orderDate ? orderDate >= start : true;
      const matchesEndDate = end && orderDate ? orderDate <= end : true;
      const matchesStatus =
        statusFilter === "All" ? true : String(order.status) === statusFilter;

      const query = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        String(order.orderNo || "").toLowerCase().includes(query) ||
        String(order.customer?.name || "").toLowerCase().includes(query) ||
        String(order.customer?.phone || "").toLowerCase().includes(query) ||
        String(order.invoice?.invoiceNo || "").toLowerCase().includes(query);

      return matchesStartDate && matchesEndDate && matchesStatus && matchesSearch;
    });
  }, [advanceOrders, fromDate, toDate, statusFilter, debouncedSearch]);

  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const summary = useMemo(
    () => ({
      totalOrders: filteredOrders.length,
      totalAmount: filteredOrders.reduce((sum, o) => sum + num(o.totalAmount), 0),
      totalAdvanceAmount: filteredOrders.reduce(
        (sum, o) => sum + num(o.advanceAmount),
        0
      ),
      totalBalanceAmount: filteredOrders.reduce(
        (sum, o) => sum + num(o.balanceAmount),
        0
      ),
      pendingCount: filteredOrders.filter((o) => o.status === "PendingPayment").length,
      closedCount: filteredOrders.filter(
        (o) => o.status === "Closed" || o.status === "DELIVERED"
      ).length,
    }),
    [filteredOrders]
  );

  const clearFilters = () => {
    setSearchTerm("");
    setFromDate(null);
    setToDate(null);
    setStatusFilter("All");
    setPage(1);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Advance order deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);

        if (paginatedOrders.length === 1 && page > 1) {
          setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete advance order");
      },
    });
  };

  const handlePrintInvoice = (invoiceId?: number) => {
    if (!invoiceId) {
      toast.error("No invoice generated for this order yet.");
      return;
    }

    toast.success("Generating invoice PDF, please wait...");
    fetchInvoicePdf(invoiceId, {
      onSuccess: (blobData) => {
        downloadPdfBlob(blobData, `invoice-${invoiceId}.pdf`);
      },
      onError: () => {
        toast.error("Failed to generate invoice PDF. Please try again.");
      },
    });
  };

  const handlePrintAdvanceReceipt = (orderId?: number, isAdvanceOrder?: boolean) => {
    if (!orderId || !isAdvanceOrder) {
      toast.error("Advance receipt is available only for advance orders.");
      return;
    }

    toast.success("Generating advance receipt PDF, please wait...");
    fetchAdvanceReceiptPdf(orderId, {
      onSuccess: (blobData) => {
        downloadPdfBlob(blobData, `advance-receipt-${orderId}.pdf`);
      },
      onError: () => {
        toast.error("Failed to generate advance receipt PDF. Please try again.");
      },
    });
  };

  const handlePayClick = (order: AdvanceOrderRow) => {
    if (order.isAdvanceOrder && order.status === "PendingPayment") {
      navigate(`/admin/sale/advance/${order.id}`);
      return;
    }

    navigate(`/admin/advance-order/edit/${order.id}`);
  };

  const statusClass = (status?: string) => {
    const statusMap: Record<string, string> = {
      DELIVERED: "bg-green-100 text-green-800",
      Closed: "bg-green-100 text-green-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      PENDING: "bg-[#fdf6e3] text-[#b08d28]",
      PendingPayment: "bg-[#fdf6e3] text-[#b08d28]",
      READY: "bg-purple-100 text-purple-800",
    };

    return statusMap[String(status)] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-[#b08d28]" />
          Advance Orders
        </h1>

        <div className="flex items-center gap-3">
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
              <TableIcon className="w-4 h-4 mr-1.5" />
              Table
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
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Grid
            </Button>
          </div>

          {/* {hasCreate && (
            <Button
              onClick={() => navigate("/admin/advance-order/new")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Advance Order
            </Button>
          )} */}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <SearchInput
            placeholder="Search order no, customer, phone, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="PendingPayment">Pending Payment</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY">Ready</option>
            <option value="Closed">Closed</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <DateInput
            value={fromDate || ""}
            placeholder="From Date"
            max={toDate || undefined}
            onValueChange={(val) => {
              if (val && toDate && isAfterDate(val, toDate)) {
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
              if (val && fromDate && isBeforeDate(val, fromDate)) {
                toast.error("To date cannot be before From date");
                return;
              }
              setToDate(val);
            }}
          />

          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Advance Orders</p>
          <p className="text-xl font-bold">{summary.totalOrders}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-[#3a2f1f]">₹{formatCurrency(summary.totalAmount)}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Advance Paid</p>
          <p className="text-xl font-bold text-green-700">
            ₹{formatCurrency(summary.totalAdvanceAmount)}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Balance Pending</p>
          <p className="text-xl font-bold text-orange-700">
            ₹{formatCurrency(summary.totalBalanceAmount)}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Closed / Delivered</p>
          <p className="text-xl font-bold text-blue-700">{summary.closedCount}</p>
        </div>
      </div>

      {viewMode === "table" ? (
        <CommonTable
          columns={[
            {
              key: "orderNo",
              label: "Order No",
              render: (r: AdvanceOrderRow) => (
                <span className="font-semibold">{r.orderNo}</span>
              ),
            },
            {
              key: "orderDate",
              label: "Order Date",
              render: (r: AdvanceOrderRow) =>
                formatCustomDate(r.orderDate || r.createdAt),
            },
            {
              key: "deliveryDate",
              label: "Delivery Date",
              render: (r: AdvanceOrderRow) => formatCustomDate(r.deliveryDate),
            },
            {
              key: "customer",
              label: "Customer",
              render: (r: AdvanceOrderRow) => (
                <div>
                  <div className="font-medium">{r.customer?.name || "Guest"}</div>
                  <div className="text-sm text-gray-500">{r.customer?.phone || "-"}</div>
                </div>
              ),
            },
            {
              key: "type",
              label: "Type",
              render: () => (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  Advance
                </Badge>
              ),
            },
            {
              key: "totalAmount",
              label: "Total Amount",
              render: (r: AdvanceOrderRow) => (
                <span className="font-semibold text-[#3a2f1f]">
                  ₹{formatCurrency(r.totalAmount)}
                </span>
              ),
            },
            {
              key: "advanceAmount",
              label: "Advance Paid",
              render: (r: AdvanceOrderRow) => (
                <span className="font-semibold text-green-700">
                  ₹{formatCurrency(r.advanceAmount)}
                </span>
              ),
            },
            {
              key: "balanceAmount",
              label: "Balance Amount",
              render: (r: AdvanceOrderRow) => (
                <span
                  className={cn(
                    "font-semibold",
                    num(r.balanceAmount) > 0 ? "text-orange-700" : "text-gray-600"
                  )}
                >
                  ₹{formatCurrency(r.balanceAmount)}
                </span>
              ),
            },
            {
              key: "invoice",
              label: "Receipt / Invoice",
              render: (r: AdvanceOrderRow) => (
                <div className="flex flex-wrap gap-2">
                  {shouldShowAdvanceReceipt(r) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintAdvanceReceipt(r.id, r.isAdvanceOrder)}
                      disabled={isAdvanceReceiptLoading}
                    >
                      {isAdvanceReceiptLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Receipt className="w-4 h-4 mr-1" />
                      )}
                      Receipt
                    </Button>
                  )}

                  {shouldShowInvoice(r) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintInvoice(r.invoiceId)}
                      disabled={isInvoicePdfLoading}
                    >
                      {isInvoicePdfLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4 mr-1" />
                      )}
                      Invoice
                    </Button>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r: AdvanceOrderRow) => (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${statusClass(
                    r.status
                  )}`}
                >
                  {r.status}
                </span>
              ),
            },
          ]}
          data={paginatedOrders}
          loading={isLoading || isFetching}
          emptyMessage="No advance orders found"
          pagination={{
            page,
            pageSize,
            total: totalCount,
            totalPages,
            onPageChange: (newPage: number) => setPage(newPage),
            onPageSizeChange: (newPageSize: number) => {
              setPageSize(newPageSize);
              setPage(1);
            },
          }}
          // actions={[
          //   ...(hasUpdate
          //     ? [
          //         {
          //           label: "Edit",
          //           icon: <Edit className="h-4 w-4" />,
          //           onClick: (r: AdvanceOrderRow) =>
          //             navigate(`/admin/advance-order/edit/${r.id}`),
          //         },
          //       ]
          //     : []),
          //   ...(hasUpdate
          //     ? [
          //         {
          //           label: "Pay Balance",
          //           icon: <CreditCard className="h-4 w-4" />,
          //           onClick: (r: AdvanceOrderRow) => handlePayClick(r),
          //         },
          //       ]
          //     : []),
          //   ...(hasDelete
          //     ? [
          //         {
          //           label: "Delete",
          //           icon: <Trash2 className="h-4 w-4" />,
          //           onClick: (r: AdvanceOrderRow) => handleDeleteClick(r.id),
          //         },
          //       ]
          //     : []),
          // ]}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(isLoading || isFetching) ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-lg" />
                ))
            ) : paginatedOrders.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                No advance orders found.
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-4 border-b bg-gray-50/50">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <Badge variant="outline" className="bg-white font-mono text-xs">
                          {order.orderNo}
                        </Badge>
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            Advance Order
                          </Badge>
                        </div>
                      </div>

                      <Badge className={cn("text-[10px] px-1.5 py-0", statusClass(order.status))}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 shadow-sm">
                        {order.customer?.name?.[0] || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {order.customer?.name || "Guest Customer"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customer?.phone || "No Contact"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Order Date
                      </span>
                      <span className="font-medium">
                        {formatCustomDate(order.orderDate || order.createdAt)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Date</span>
                      <span className="font-medium">{formatCustomDate(order.deliveryDate)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-blue-50 border-blue-100 p-3">
                        <span className="block text-[10px] uppercase font-semibold text-blue-500">
                          Advance
                        </span>
                        <span className="mt-1 block text-sm font-bold text-blue-800">
                          ₹{formatCurrency(order.advanceAmount)}
                        </span>
                      </div>

                      <div className="rounded-lg border bg-orange-50 border-orange-100 p-3">
                        <span className="block text-[10px] uppercase font-semibold text-orange-500">
                          Balance
                        </span>
                        <span className="mt-1 block text-sm font-bold text-orange-800">
                          ₹{formatCurrency(order.balanceAmount)}
                        </span>
                      </div>

                      <div className="rounded-lg border bg-emerald-50 border-emerald-100 p-3">
                        <span className="block text-[10px] uppercase font-semibold text-emerald-500">
                          Total
                        </span>
                        <span className="mt-1 block text-sm font-bold text-emerald-800">
                          ₹{formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t flex flex-wrap gap-2 justify-end">
                    {shouldShowAdvanceReceipt(order) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintAdvanceReceipt(order.id, order.isAdvanceOrder)}
                        disabled={isAdvanceReceiptLoading}
                      >
                        {isAdvanceReceiptLoading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4 mr-1" />
                        )}
                        Receipt
                      </Button>
                    )}

                    {shouldShowInvoice(order) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintInvoice(order.invoiceId)}
                        disabled={isInvoicePdfLoading}
                      >
                        {isInvoicePdfLoading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-1" />
                        )}
                        Invoice
                      </Button>
                    )}

                    {/* {hasUpdate && (
                      <Button size="sm" onClick={() => handlePayClick(order)}>
                        <CreditCard className="w-4 h-4 mr-1" />
                        Pay
                      </Button>
                    )}

                    {hasDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleDeleteClick(order.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )} */}
                  </div>
                </div>
              ))
            )}
          </div>

          {totalCount > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{" "}
                {totalCount} entries
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="text-sm font-medium px-2">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Advance Order?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete Order"}
        variant="destructive"
      />
    </div>
  );
};