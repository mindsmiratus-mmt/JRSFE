import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Printer, Loader2, LayoutGrid, Table as TableIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";

import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import {
  useInvoices,
  useDeleteInvoice,
  useInvoicePdf,
} from "@/hooks/useInvoice";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import Barcode from "react-barcode";

export const Invoice = () => {
  const navigate = useNavigate();

  // ========================
  // State
  // ========================
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Use Auth Context to grab the active shop and permissions
  const { permissions, user, selectedShop } = useAuth();
  
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Invoice');

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
  }, [debouncedSearch, fromDate, toDate, selectedShop]); // Added selectedShop as dependency

  // ========================
  // API Fetching
  // ========================
  // Pass the selectedShop.id to the useInvoices hook
  const { data, isLoading, isFetching } = useInvoices({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    shopId: selectedShop?.id, // Fetches data specifically for the current shop
  });

  const responseData = data as any;
  const invoices = responseData?.data || [];
  
  const totalCount = responseData?.totalCount || invoices.length;
  const totalPages = responseData?.totalPages || Math.ceil(totalCount / pageSize) || 1;

  const deleteMutation = useDeleteInvoice();

  // --- PDF Mutation ---
  const { mutate: fetchPdf, isPending: isPdfLoading } = useInvoicePdf();

  // ========================
  // Handlers
  // ========================
  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Invoice deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
        
        // Safety check to go to previous page if the last item is deleted
        if (invoices.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete invoice");
      },
    });
  };

  // --- Print Handler ---
  const handlePrintClick = (invoiceId: number) => {
    if (!invoiceId) return;

    toast.success("Generating PDF, please wait...");

    fetchPdf(invoiceId, {
      onSuccess: (blobData) => {
        const url = window.URL.createObjectURL(
          new Blob([blobData], { type: "application/pdf" })
        );
        window.open(url, "_blank");
      },
      onError: () => {
        toast.error("Failed to generate PDF. Please try again.");
      },
    });
  };

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view invoices.</p>
        </div>
      </div>
    );
  }

  // ========================
  // UI
  // ========================
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#b08d28]" />
          Invoices 
          {/* {selectedShop?.name && <span className="text-lg text-gray-500 ml-2 font-normal hidden md:inline">({selectedShop.name})</span>} */}
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

            {/* {hasCreate && (
              <Button onClick={() => navigate("/admin/invoice/new")} size="lg" className="h-10 shrink-0 whitespace-nowrap">
                <Plus className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Create Invoice</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )} */}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative">
          <SearchInput
            placeholder="Search by invoice no, customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
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
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading invoices...</p></div>
      ) : invoices.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No invoices found for this shop.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CommonTable
                columns={[
                  {
                    key: "invoiceNo",
                    label: "Invoice No",
                    render: (r: any) => (
                      <div className="flex items-center justify-between w-full min-w-[200px] pr-4">
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium mr-1">Invoice ID:</span>
                              <span className="text-gray-700">{r.id}</span>
                            </p>                            
                          </div>
                          <div className="font-semibold font-mono text-gray-800">
                            {r.invoiceNo}
                          </div>
                          {r.invoiceNo && (
                            <div className="bg-white p-0.5 rounded overflow-hidden">
                              <Barcode
                                value={r.invoiceNo}
                                width={1.2}
                                height={25}
                                fontSize={10}
                                margin={0}
                                displayValue={false}
                              />
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintClick(r.id);
                          }}
                          disabled={isPdfLoading}
                          title="Print Invoice"
                        >
                          {isPdfLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ),
                  },
                  {
                    key: "invoiceDate",
                    label: "Date",
                    render: (r: any) => (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground whitespace-nowrap">
                            <span className="text-foreground font-medium">{format(new Date(r.invoiceDate), "dd MMM yyyy")}</span>
                            <span>{format(new Date(r.invoiceDate), "hh:mm a")}</span>
                        </div>
                    ),
                  },
                  {
                    key: "customer",
                    label: "Customer",
                    render: (r: any) => (
                      <div className="min-w-[150px]">
                        <div className="font-medium text-gray-900 line-clamp-1" title={r.customer?.name}>{r.customer?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.customer?.phone || "—"}</div>
                      </div>
                    ),
                  },
                  {
                    key: "totalAmount",
                    label: "Total Amount",
                    render: (r: any) => (
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        ₹{r.totalAmount?.toLocaleString("en-IN") || 0}
                      </span>
                    ),
                  },
                  {
                    key: "paidAmount",
                    label: "Paid",
                    render: (r: any) => (
                      <span className={`whitespace-nowrap ${r.paidAmount >= r.totalAmount ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}`}>
                        ₹{r.paidAmount?.toLocaleString("en-IN") || 0}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r: any) => (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap ${
                            r.status === "PAID" ? "bg-green-100 text-green-800 border border-green-200"
                          : r.status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {r.status || "—"}
                      </span>
                    ),
                  },
                ]}
                data={invoices}
                loading={isLoading || isFetching}
                emptyMessage="No invoices found"
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
                // actions={[
                //   ...(hasDelete
                //     ? [
                //         {
                //           icon: <Trash2 className="h-4 w-4" />,
                //           label: "Delete",
                //           onClick: (row: any) => {
                //             setDeleteId(row.id);
                //             setConfirmOpen(true);
                //           },
                //         },
                //       ]
                //     : []),
                // ]}
              />
          </div>
      ) : (
          /* --- GRID VIEW --- */
          <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {invoices.map((r: any) => (
                      <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col relative hover:shadow-md transition-shadow">
                          {/* Header */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Invoice No</div>
                                  <div className="font-bold text-gray-900 text-base font-mono truncate" title={r.invoiceNo}>
                                      {r.invoiceNo || "—"}
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border
                                    ${r.status === "PAID" ? "bg-green-100 text-green-800 border-green-200" 
                                    : r.status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 border-yellow-200" 
                                    : "bg-red-100 text-red-800 border-red-200"}`}
                                >
                                    {r.status || "—"}
                                </span>
                                {/* {hasDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteId(r.id);
                                      setConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )} */}
                              </div>
                          </div>

                          {/* Barcode & Print area */}
                          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded p-2 mb-4">
                              <div className="bg-white px-2 py-1 rounded overflow-hidden max-w-[150px]">
                                  {r.invoiceNo ? (
                                      <Barcode value={r.invoiceNo} width={1.2} height={20} fontSize={10} margin={0} displayValue={false} />
                                  ) : (
                                      <span className="text-xs text-gray-400 italic">No Barcode</span>
                                  )}
                              </div>
                              <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-gray-200"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintClick(r.id);
                                  }}
                                  disabled={isPdfLoading}
                                  title="Print Invoice"
                              >
                                  {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Printer className="w-4 h-4 mr-1.5" />}
                                  Print
                              </Button>
                          </div>

                          {/* Customer Details */}
                          <div className="mb-4">
                              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Customer</div>
                              <div className="font-semibold text-gray-900 line-clamp-1" title={r.customer?.name}>{r.customer?.name || "Unknown"}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{r.customer?.phone || "—"}</div>
                          </div>

                          {/* Financials */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-50">
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total Amount</div>
                                  <div className="font-bold text-gray-900">₹{r.totalAmount?.toLocaleString("en-IN") || 0}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Paid Amount</div>
                                  <div className={`font-bold ${r.paidAmount >= r.totalAmount ? "text-green-600" : "text-orange-600"}`}>
                                      ₹{r.paidAmount?.toLocaleString("en-IN") || 0}
                                  </div>
                              </div>
                          </div>

                          {/* Footer Date */}
                          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                              <span>{r.invoiceDate ? format(new Date(r.invoiceDate), "dd MMM yyyy") : "—"}</span>
                              <span>{r.invoiceDate ? format(new Date(r.invoiceDate), "hh:mm a") : ""}</span>
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Invoice?"
        message="This invoice will be permanently deleted. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Invoice"
        variant="destructive"
      />
    </div>
  );
};