import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UserPlus, Users, Wallet, LayoutGrid, Table as TableIcon } from "lucide-react"; 
import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { toast } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import {
  useAllCustomer,
  useCustomers,
  useDeleteCustomer,
} from "@/hooks/useCustomer";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";

// --- Helper: Format Date to DD-MMM-YYYY hh:mm AM/PM ---
const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours || 12; // convert '0' to '12'
  const strHours = String(hours).padStart(2, "0");

  return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
};

export const Customer = () => {
  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination 
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { permissions, user } = useAuth();
  const navigate = useNavigate();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Customer');

  /* ---------------- Debounce Search ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /* ---------------- Fetch Customers with Filters ---------------- */
  const { data, isLoading, isFetching } = useCustomers({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const { data: allCustomer = [] } = useAllCustomer();
  const referralMap = new Map<number, string>();

  // Referrer shown as "Name — ReferralCode" so it is clear which customer's code it is.
  allCustomer?.forEach((c: any) => {
    referralMap.set(c.id, c.referralCode ? `${c.name} — ${c.referralCode}` : c.name);
  });
  
  const customers = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const deleteMutation = useDeleteCustomer();

  /* ---------------- Helpers ---------------- */
  const isBefore = (a: string | null, b: string | null) =>
    a && b ? new Date(a) < new Date(b) : false;

  const isAfter = (a: string | null, b: string | null) =>
    a && b ? new Date(a) > new Date(b) : false;

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Customer removed");
        setConfirmOpen(false);
        setDeleteId(null);
        
        // Safety check to step back if we delete the last item on this page
        if (customers.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
    });
  };

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view customers.</p>
        </div>
      </div>
    );
  }

  /* ============================== UI ============================== */
  return (
    <div className="space-y-4 px-2 py-4 sm:px-4 sm:py-6 w-full max-w-full overflow-x-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#b08d28]" />
          Customers
        </h1>
        
        <div className="flex gap-2 w-full sm:w-auto items-center">
          
          {/* UPDATED Toggle View Switch */}
          <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 px-2",
                viewMode === "table" &&
                  "bg-white text-black shadow-sm hover:bg-white"
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
                viewMode === "grid" &&
                  "bg-white text-black shadow-sm hover:bg-white"
              )}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
            </Button>
          </div>

          {hasCreate && (
            <Button onClick={() => navigate("/admin/customer/new")} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* ================= Filters ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="lg:col-span-2">
          <SearchInput
            placeholder="Search name, phone or email"
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
            setPage(1);
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
            setPage(1);
          }}
        />
      </div>

      {/* Clear Filters Button */}
      {(searchTerm || fromDate || toDate) && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setFromDate(null);
              setToDate(null);
              setPage(1);
            }}
            className="text-gray-500 hover:text-gray-800"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* ================= Content Views ================= */}
      {isLoading || isFetching ? (
        <div className="flex justify-center py-8"><p className="text-gray-500">Loading customers...</p></div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
           <p className="text-gray-500">No customers found.</p>
        </div>
      ) : viewMode === "table" ? (
        /* --- TABLE VIEW --- */
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <CommonTable
            columns={[
              {
                key: "wallet",
                label: "",
                render: (r) => (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                    onClick={() => navigate(`/admin/ledger/${r.id}`)}
                    title="View Ledger & Wallet"
                  >
                    <Wallet className="h-4 w-4" />
                  </Button>
                )
              },
              { key: "name", label: "Name", render: (r) => <strong className="whitespace-nowrap">{r.name}</strong> },
              {
                key: "referralCode",
                label: "Referral Code",
                render: (r) => <span className="whitespace-nowrap font-mono">{r.referralCode || "-"}</span>,
              },
              { key: "phone", label: "Phone", render: (r) => <span className="whitespace-nowrap">{r.phone}</span> },
              { key: "email", label: "Email" },
              {
                key: "dateOfBirth",
                label: "DOB",
                render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.dateOfBirth)}</span>,
              },
              { key: "gender", label: "Gender" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "pinCode", label: "Pincode" },
              { key: "gstin", label: "GSTIN", render: (r) => r.gstin || "-" },
              { key: "pan", label: "PAN", render: (r) => r.pan || "-" },
              { key: "adharNo", label: "Aadhaar", render: (r) => r.adharNo || "-" },
              // No Address column: addresses are CustomerAddress records managed per customer (Saved
              // Addresses on the edit page), and fetching them per row here would be N+1 requests.
              {
                key: "referralId",
                label: "Referred By",
                render: (r) => {
                  if (!r.referralId) return "-";
                  return <span className="whitespace-nowrap">{referralMap.get(r.referralId) ?? "Unknown"}</span>;
                },
              },
              {
                key: "isActive",
                label: "Status",
                render: (r) => (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${r.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}
                  >
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                ),
              },
            ]}
            data={customers}
            loading={isLoading || isFetching}
            emptyMessage="No customers found"
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
                ? [{ icon: <Edit className="h-4 w-4" />, label: "Edit", onClick: (r: any) => navigate(`/admin/customer/edit/${r.id}`) }]
                : []),
              ...(hasDelete
                ? [{ icon: <Trash2 className="h-4 w-4" />, label: "Delete", onClick: (r: any) => { setDeleteId(r.id); setConfirmOpen(true); } }]
                : []),
            ]}
          />
        </div>
      ) : (
        /* --- GRID VIEW --- */
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customers.map((c: any) => (
                <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 mt-1 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full shrink-0"
                                onClick={() => navigate(`/admin/ledger/${c.id}`)}
                                title="View Ledger & Wallet"
                            >
                                <Wallet className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col">
                                <h3 className="font-bold text-base leading-tight text-gray-900 line-clamp-1" title={c.name}>{c.name}</h3>
                                <span className={`mt-1 w-max px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                    {c.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex gap-1 shrink-0">
                            {hasUpdate && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/customer/edit/${c.id}`)}>
                                    <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                </Button>
                            )}
                            {hasDelete && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleteId(c.id); setConfirmOpen(true); }}>
                                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Card Details */}
                    <div className="text-sm text-gray-600 grid grid-cols-1 gap-1.5">
                        <div className="flex justify-between"><span className="text-gray-400">Referral Code</span> <span className="font-mono">{c.referralCode || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Phone</span> <span>{c.phone}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Email</span> <span className="truncate ml-2" title={c.email}>{c.email || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">DOB</span> <span>{formatDateTime(c.dateOfBirth)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Gender</span> <span>{c.gender || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Location</span> <span className="text-right">{c.city || "-"}, {c.state || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Pincode</span> <span>{c.pinCode || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">GSTIN</span> <span>{c.gstin || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">PAN</span> <span>{c.pan || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Aadhaar</span> <span>{c.adharNo || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Referred</span> <span className="truncate ml-2" title={c.referralId ? referralMap.get(c.referralId) : ""}>{c.referralId ? (referralMap.get(c.referralId) ?? "Unknown") : "-"}</span></div>
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

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Customer?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};