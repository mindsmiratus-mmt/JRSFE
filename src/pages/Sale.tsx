import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Plus,
  ShoppingCart,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  User,
  FileText,
  CreditCard,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSignature,
  Receipt,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommonTable } from "@/components/ui/table";
import {ConfirmDialog} from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import {OrderItemsHoverCard} from "@/components/ui/hover-card";
import {Badge} from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import { useInvoicePdf } from "@/hooks/useInvoice";
import {
  useOrderList,
  useCancelOrder,
  useAdvanceReceiptPdf,
} from "@/hooks/useOrder";

type ItemCostDetails = {
  goldCost?: number;
  diamondCost?: number;
  stoneCost?: number;
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  otherCharges?: number;
  totalSalePrice?: number;
};

type CartItem = {
  id?: string;
  itemId?: number;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;
  gPurityId?: string;
  purityPercent?: string;
  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  netWeight?: number;
  huid?: string;
  itemCostDetails?: ItemCostDetails;
};

type CartData = {
  id?: string;
  status?: number;
  shopId?: number;
  userId?: number;
  paymentMethod?: string;
  items?: CartItem[];
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  grandTotal?: number;
  currency?: string;
};

type SaleOrder = {
  id: number;
  orderNo?: string;
  cartData?: CartData | string | null;
  userId?: number;
  shopId?: number;
  customerId?: number;
  customer?: {
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    isActive?: boolean;
    referralId?: number;
  };
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
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  isAdvanceOrder?: boolean;
  advanceAmount?: number;
  balanceAmount?: number;
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseCartData = (raw: unknown): CartData | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as CartData;
    } catch {
      return null;
    }
  }
  return raw as CartData;
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

export const Sale = () => {
  const navigate = useNavigate();
  const { user, selectedShop, permissions } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, ['Sale', 'Sales']);

  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [advanceFilter, setAdvanceFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const userId = user?.id ?? 0;
  const shopId = selectedShop?.id ?? 0;

  const { data, isLoading } = useOrderList({
    userId,
    shopId,
    page,
    pageSize,
  });

  const { mutate: cancelOrder, isPending: isCanceling } = useCancelOrder();
  const { mutate: fetchInvoicePdf, isPending: isInvoicePdfLoading } = useInvoicePdf();
  const { mutate: fetchAdvanceReceiptPdf, isPending: isAdvanceReceiptLoading } =
    useAdvanceReceiptPdf();

  const rawOrders: SaleOrder[] = data?.data ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize) || 1;

  const normalizedOrders = useMemo(() => {
    return rawOrders.map((order: SaleOrder) => {
      const cart = parseCartData(order.cartData);
      const items = cart?.items ?? [];
      const grandTotal = num(cart?.grandTotal);
      const makingCharges = num(cart?.makingCharges);
      const discount = num(cart?.discount);
      const igst = num(cart?.igst);
      const cgst = num(cart?.cgst);
      const sgst = num(cart?.sgst);
      const advanceAmount = num(order.advanceAmount);
      const balanceAmount = num(order.balanceAmount);

      return {
        ...order,
        parsedCart: cart,
        cartItems: items,
        itemsCount: items.reduce((sum, item) => sum + num(item.quantity || 1), 0),
        grandTotal,
        makingCharges,
        discount,
        igst,
        cgst,
        sgst,
        isAdvanceOrder: !!order.isAdvanceOrder,
        advanceAmount,
        balanceAmount,
      };
    });
  }, [rawOrders]);

  const filteredOrders = useMemo(() => {
    return normalizedOrders.filter((order: any) => {
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      if (orderDate) orderDate.setHours(0, 0, 0, 0);

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);

      const matchesStartDate = start && orderDate ? orderDate >= start : true;
      const matchesEndDate = end && orderDate ? orderDate <= end : true;
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      const matchesAdvance =
        advanceFilter === "All"
          ? true
          : advanceFilter === "Advance"
          ? order.isAdvanceOrder
          : !order.isAdvanceOrder;

      const query = searchTerm.toLowerCase().trim();

      const itemSearch = order.cartItems
        .some((item: CartItem) =>
          [item.itemName, item.tagNumber, item.metal, item.category, item.huid]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        );

      const matchesSearch =
        !query ||
        order.orderNo?.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.customer?.phone?.toLowerCase().includes(query) ||
        order.invoice?.invoiceNo?.toLowerCase().includes(query) ||
        itemSearch;

      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesStatus &&
        matchesAdvance &&
        matchesSearch
      );
    });
  }, [
    normalizedOrders,
    startDate,
    endDate,
    statusFilter,
    advanceFilter,
    searchTerm,
  ]);

  const summary = useMemo(
    () => ({
      totalOrders: filteredOrders.length,
      totalItems: filteredOrders.reduce((sum: number, o: any) => sum + num(o.itemsCount), 0),
      totalAmount: filteredOrders.reduce((sum: number, o: any) => sum + num(o.grandTotal), 0),
      totalAdvanceOrders: filteredOrders.filter((o: any) => o.isAdvanceOrder).length,
      totalAdvanceAmount: filteredOrders.reduce(
        (sum: number, o: any) => sum + num(o.advanceAmount),
        0
      ),
      totalBalanceAmount: filteredOrders.reduce(
        (sum: number, o: any) => sum + num(o.balanceAmount),
        0
      ),
    }),
    [filteredOrders]
  );

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setAdvanceFilter("All");
    setStartDate("");
    setEndDate("");
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent";

  const formatCurrency = (value: unknown) =>
    num(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const formatCustomDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isPendingAdvanceOrder = (order: any) =>
    !!order.isAdvanceOrder && order.status === "PendingPayment";

  const isPaidAdvanceOrder = (order: any) =>
    !!order.isAdvanceOrder && order.status === "Closed";

  const shouldShowAdvanceReceipt = (order: any) => isPendingAdvanceOrder(order);

  const shouldShowInvoice = (order: any) => {
    if (order.isAdvanceOrder) {
      return isPaidAdvanceOrder(order) && !!order.invoiceId;
    }
    return !!order.invoiceId;
  };

  const handlePayClick = (order: any) => {
    if (order.isAdvanceOrder && order.status === "PendingPayment") {
      navigate(`/admin/sale/advance/${order.id}`);
      return;
    }

    navigate(`/admin/sale/edit/${order.id}`);
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

  const confirmDelete = () => {
    if (!deleteOrderId) return;

    cancelOrder(deleteOrderId, {
      onSuccess: () => {
        toast.success("Order removed successfully.");
        setConfirmOpen(false);
        setDeleteOrderId(null);

        if (rawOrders.length === 1 && page > 1) {
          setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to remove order.");
        setConfirmOpen(false);
      },
    });
  };

  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">
            You do not have permission to view sales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-[#b08d28]" />
          Sales History
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

          {hasCreate && (
            <Button
              onClick={() => navigate("/admin/sale/new")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Sale
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Order, Invoice, Customer, Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Statuses</option>
              <option value="PendingPayment">Pending Payment</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Order Type</label>
            <select
              value={advanceFilter}
              onChange={(e) => setAdvanceFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Orders</option>
              <option value="Advance">Advance Orders</option>
              <option value="Regular">Regular Orders</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            {(startDate || endDate || statusFilter !== "All" || advanceFilter !== "All" || searchTerm) && (
              <button
                onClick={clearFilters}
                className="w-full px-3 py-1.5 h-[34px] text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Filtered Orders</p>
          <p className="text-xl font-bold">{summary.totalOrders}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Filtered Items Sold</p>
          <p className="text-xl font-bold">{summary.totalItems}</p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Filtered Revenue</p>
          <p className="text-xl font-bold text-green-600">
            ₹{formatCurrency(summary.totalAmount)}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Advance Orders</p>
          <p className="text-xl font-bold text-amber-700">
            {summary.totalAdvanceOrders}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Advance Collected</p>
          <p className="text-xl font-bold text-blue-700">
            ₹{formatCurrency(summary.totalAdvanceAmount)}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Balance Pending</p>
          <p className="text-xl font-bold text-orange-700">
            ₹{formatCurrency(summary.totalBalanceAmount)}
          </p>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <CommonTable
            columns={[
              {
                key: "orderInfo",
                label: "Order Details",
                render: (r: any) => (
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-700 text-sm">
                        {r.orderNo}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 pl-6">ID: {r.id}</div>
                  </div>
                ),
              },
              {
                key: "type",
                label: "Order Type",
                render: (r: any) => (
                  <Badge
                    variant="outline"
                    className={
                      r.isAdvanceOrder
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }
                  >
                    {r.isAdvanceOrder ? "Advance" : "Regular"}
                  </Badge>
                ),
              },
              {
                key: "invoiceInfo",
                label: "Invoice Info",
                render: (r: any) => (
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-6 h-4 text-blue-500" />
                      <span className="font-medium text-gray-700 text-sm">
                        {shouldShowInvoice(r)
                          ? r.invoice?.invoiceNo || "Invoice Available"
                          : shouldShowAdvanceReceipt(r)
                          ? "Advance Receipt Available"
                          : "Not Generated"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-2">
                      {shouldShowInvoice(r) && r.invoiceId ? (
                        <>
                          <div className="text-xs text-gray-500">ID: {r.invoiceId}</div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={isInvoicePdfLoading}
                            onClick={() => handlePrintInvoice(r.invoiceId)}
                          >
                            {isInvoicePdfLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Printer className="w-3 h-3 mr-1" />
                            )}
                            Invoice
                          </Button>
                        </>
                      ) : null}

                      {shouldShowAdvanceReceipt(r) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={isAdvanceReceiptLoading}
                          onClick={() => handlePrintAdvanceReceipt(r.id, r.isAdvanceOrder)}
                        >
                          {isAdvanceReceiptLoading ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Receipt className="w-3 h-3 mr-1" />
                          )}
                          Advance Receipt
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ),
              },
              {
                key: "createdAt",
                label: "Date",
                render: (r: any) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {formatCustomDate(r.createdAt)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </div>
                ),
              },
              {
                key: "customer",
                label: "Customer",
                render: (r: any) => (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-gray-600 font-bold text-xs">
                      {r.customer?.name?.[0] || "G"}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{r.customer?.name || "Guest"}</div>
                      <div className="text-xs text-gray-500">{r.customer?.phone}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: "itemsCount",
                label: "Items",
                render: (r: any) => (
                  <OrderItemsHoverCard
                    items={r.cartItems}
                    orderNo={r.orderNo}
                    grandTotal={r.grandTotal || 0}
                  />
                ),
              },
              {
                key: "advanceAmount",
                label: "Advance Amt",
                render: (r: any) => (
                  <span className="text-sm font-medium text-blue-700">
                    ₹{formatCurrency(r.advanceAmount)}
                  </span>
                ),
              },
              {
                key: "balanceAmount",
                label: "Balance Amt",
                render: (r: any) => (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      num(r.balanceAmount) > 0 ? "text-orange-700" : "text-gray-600"
                    )}
                  >
                    ₹{formatCurrency(r.balanceAmount)}
                  </span>
                ),
              },
              {
                key: "makingCharges",
                label: "Making",
                render: (r: any) => (
                  <span className="text-sm">₹{formatCurrency(r.makingCharges)}</span>
                ),
              },
              {
                key: "discount",
                label: "Discount",
                render: (r: any) => (
                  <span className="text-sm text-red-600">
                    -₹{formatCurrency(r.discount)}
                  </span>
                ),
              },
              {
                key: "igst",
                label: "IGST",
                render: (r: any) => (
                  <span className="text-sm text-gray-600">₹{formatCurrency(r.igst)}</span>
                ),
              },
              {
                key: "cgst",
                label: "CGST",
                render: (r: any) => (
                  <span className="text-sm text-gray-600">₹{formatCurrency(r.cgst)}</span>
                ),
              },
              {
                key: "sgst",
                label: "SGST",
                render: (r: any) => (
                  <span className="text-sm text-gray-600">₹{formatCurrency(r.sgst)}</span>
                ),
              },
              {
                key: "grandTotal",
                label: "Total Amount",
                render: (r: any) => (
                  <span className="font-bold text-green-700 text-base">
                    ₹{formatCurrency(r.grandTotal)}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (r: any) => (
                  <Badge
                    variant={r.status === "PendingPayment" ? "secondary" : "default"}
                    className={
                      r.status === "PendingPayment"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        : "bg-green-100 text-green-700 hover:bg-green-100"
                    }
                  >
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "Action",
                render: (r: any) => (
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status !== "Closed" &&r.status !== "Cancelled" && hasUpdate ? (
                      <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePayClick(r)}
                        className={cn(
                          "h-8",
                          r.isAdvanceOrder
                            ? "bg-amber-600 hover:bg-amber-700"
                            : ""
                        )}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {r.isAdvanceOrder ? "Pay Balance" : "Pay Now"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        onClick={() => {
                          setDeleteOrderId(r.id);
                          setConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                    ) : null}

                    {shouldShowInvoice(r) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={isInvoicePdfLoading}
                        onClick={() => handlePrintInvoice(r.invoiceId)}
                      >
                        {isInvoicePdfLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-2" />
                        )}
                        Print Invoice
                      </Button>
                    ) : null}

                    {shouldShowAdvanceReceipt(r) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={isAdvanceReceiptLoading}
                        onClick={() => handlePrintAdvanceReceipt(r.id, r.isAdvanceOrder)}
                      >
                        {isAdvanceReceiptLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4 mr-2" />
                        )}
                        Receipt
                      </Button>
                    ) : null}

                    
                  </div>
                ),
              },
            ]}
            data={filteredOrders}
            loading={isLoading}
            emptyMessage={
              rawOrders.length === 0
                ? "No sales found."
                : "No sales match your filters."
            }
            pagination={{
              page,
              pageSize,
              total,
              totalPages,
              onPageChange: (newPage: number) => setPage(newPage),
              onPageSizeChange: (newPageSize: number) => {
                setPageSize(newPageSize);
                setPage(1);
              },
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-lg" />
                ))
            ) : filteredOrders.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                {rawOrders.length === 0
                  ? "No sales found. Start a new sale!"
                  : "No sales match your current filters."}
              </div>
            ) : (
              filteredOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="p-4 border-b rounded-t-xl bg-gray-50/50">
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">
                            Order
                          </span>
                          <Badge variant="outline" className="bg-white font-mono text-xs">
                            {order.orderNo}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-blue-500 uppercase font-semibold">
                            Invoice
                          </span>
                          <span className="font-mono text-xs font-medium text-gray-700">
                            {shouldShowInvoice(order)
                              ? order.invoice?.invoiceNo || "Available"
                              : shouldShowAdvanceReceipt(order)
                              ? "Advance Receipt"
                              : "Not Generated"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <Badge
                            variant="outline"
                            className={
                              order.isAdvanceOrder
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }
                          >
                            {order.isAdvanceOrder ? "Advance Order" : "Regular Order"}
                          </Badge>
                        </div>
                      </div>

                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 mt-1",
                          order.status === "PendingPayment"
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                            : "bg-green-100 text-green-700 hover:bg-green-100"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 shadow-sm">
                        {order.customer?.name?.[0] || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 leading-tight">
                          {order.customer?.name || "Guest Customer"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.customer?.phone || "No Contact Info"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Date
                      </span>
                      <div className="flex flex-col text-right">
                        <span className="font-medium">
                          {formatCustomDate(order.createdAt)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Items
                      </span>
                      <OrderItemsHoverCard
                        items={order.cartItems}
                        orderNo={order.orderNo}
                        grandTotal={order.grandTotal || 0}
                      />
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
                          ₹{formatCurrency(order.grandTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 mt-2 border">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Making Charges</span>
                        <span className="font-medium">₹{formatCurrency(order.makingCharges)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-medium text-red-600">
                          -₹{formatCurrency(order.discount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t mt-1">
                        <div>
                          <span className="block text-gray-400 text-[10px] uppercase">
                            IGST
                          </span>
                          <span className="font-medium text-gray-700">
                            ₹{formatCurrency(order.igst)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-gray-400 text-[10px] uppercase">
                            CGST
                          </span>
                          <span className="font-medium text-gray-700">
                            ₹{formatCurrency(order.cgst)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-gray-400 text-[10px] uppercase">
                            SGST
                          </span>
                          <span className="font-medium text-gray-700">
                            ₹{formatCurrency(order.sgst)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t rounded-b-xl flex justify-between items-center gap-2 bg-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Total Amount
                      </span>
                      <span className="text-lg font-bold text-green-700 leading-tight">
                        ₹{formatCurrency(order.grandTotal)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {order.status !== "Closed" && order.status !== "Cancelled" && hasUpdate ? (
                        <>
                        <Button
                          size="sm"
                          variant="default"
                          className={cn(
                            "shadow-sm h-9",
                            order.isAdvanceOrder ? "bg-amber-600 hover:bg-amber-700" : ""
                          )}
                          onClick={() => handlePayClick(order)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          {order.isAdvanceOrder ? "Pay Balance" : "Pay"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-sm"
                          onClick={() => {
                            setDeleteOrderId(order.id);
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                      ) : null}

                      {shouldShowInvoice(order) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shadow-sm border-gray-300 text-gray-700 hover:bg-gray-100 h-9"
                          disabled={isInvoicePdfLoading}
                          onClick={() => handlePrintInvoice(order.invoiceId)}
                        >
                          {isInvoicePdfLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4 mr-2 text-blue-600" />
                          )}
                          Invoice
                        </Button>
                      ) : null}

                      {shouldShowAdvanceReceipt(order) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shadow-sm h-9"
                          disabled={isAdvanceReceiptLoading}
                          onClick={() =>
                            handlePrintAdvanceReceipt(order.id, order.isAdvanceOrder)
                          }
                        >
                          {isAdvanceReceiptLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Receipt className="w-4 h-4 mr-2 text-amber-600" />
                          )}
                          Receipt
                        </Button>
                      ) : null}

                      
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of{" "}
                {total} entries
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
        title="Remove Order?"
        message="Are you sure you want to remove this order? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText={isCanceling ? "Removing..." : "Remove Order"}
        variant="destructive"
      />
    </div>
  );
};