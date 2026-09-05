import { useState } from "react";
import { Edit, Zap, Grid3x3, TableIcon, TrendingUp, Trash2, DollarSign } from "lucide-react"; 
import { useNavigate } from "react-router-dom";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

// Import your existing hooks and the new update hook
import { 
  useCurrentRates, 
  useDeleteCurrentRate,
  useUpdateGold24KRate 
} from "@/hooks/useCurruntrate"; 
import { useAuth } from "@/contexts/AuthContext";

export const CurrentRate = () => {
  const navigate = useNavigate();

  // ========================
  // State
  // ========================
  // 1. Converted PAGE_SIZE to state so users can adjust it
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); 

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // New State for View Mode Toggle
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // State for 24K Gold Rate Dialog
  const [isUpdateGoldOpen, setIsUpdateGoldOpen] = useState(false);
  const [newGoldRate, setNewGoldRate] = useState<number | "">("");

  const { permissions, user } = useAuth();
  const actionPermissions = permissions.find((item: any) => item?.Module === 'Current Rate');
  const isAdmin =
    (user as any)?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  // Boolean flags for cleaner conditional rendering
  const hasRead = actionPermissions?.Read || isAdmin;
  const hasCreate = actionPermissions?.Create || isAdmin; // Kept for future use if you add a "Create New Rate" button
  const hasUpdate = actionPermissions?.Update || isAdmin;
  const hasDelete = actionPermissions?.Delete || isAdmin;

  // ========================
  // API
  // ========================
  const { data: rates = [], isLoading } = useCurrentRates();
  const deleteMutation = useDeleteCurrentRate();
  const updateGold24KMutation = useUpdateGold24KRate();

  // ========================
  // Calculations for Client-Side Pagination
  // ========================
  // Since `rates` seems to return the full array, we calculate pagination properties here
  const totalCount = rates.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  
  // Slice the array to only show the current page's records!
  const paginatedRates = rates.slice((page - 1) * pageSize, page * pageSize);

  // ========================
  // Handlers
  // ========================

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast.success("Current rate deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
        
        // Safety check to step back if we delete the last item on this page
        if (paginatedRates.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete current rate");
        setConfirmOpen(false);
      },
    });
  };

  const handleUpdate24KGoldSubmit = () => {
    if (!newGoldRate || newGoldRate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    updateGold24KMutation.mutate(
      { data: { rate24K: Number(newGoldRate) } },
      {
        onSuccess: () => {
          toast.success("24K Gold Rate updated globally");
          setIsUpdateGoldOpen(false);
          setNewGoldRate(""); 
        },
        onError: () => {
          toast.error("Failed to update 24K Gold rate");
        },
      }
    );
  };

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view current rates.</p>
        </div>
      </div>
    );
  }

  // ========================
  // UI
  // ========================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-[#b08d28]" />
          Current Rates
        </h1>
        
        <div className="flex gap-3">
          {/* VIEW MODE TOGGLE */}
          <div className="flex border rounded-md overflow-hidden bg-white">
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
                      <Button
    variant="outline"
    onClick={() => navigate("/admin/shop/rates")}
    size="lg"
    className="h-10"
>
    <DollarSign className="w-5 h-5 mr-2" />
    Sale Channels
</Button>


          {/* Update 24K Gold Rate */}
          {hasUpdate && (
            <Button 
              onClick={() => setIsUpdateGoldOpen(true)} 
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-black border-none"
            >
              <Zap className="w-4 h-4 mr-2" />
              Update 24K Gold Rate
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        /* Table View */
        <CommonTable
          columns={[
            {
              key: "id",
              label: "ID (Code)",
              render: (r: any) => r.id || "-",
            },
            {
              key: "metalType",
              label: "Metal Type",
              render: (r: any) => r.metalType || "-",
            },
            {
              key: "description",
              label: "Description",
              render: (r: any) => (
                <div className="font-semibold">
                  {r.description}
                </div>
              ),
            },
            {
              key: "purity",
              label: "Purity",
              render: (r: any) => r.purity || "-",
            },
            {
              key: "sPurity", 
              label: "SPurity",
              render: (r: any) => r.sPurity || "-",
            },
            {
              key: "rate",
              label: "Rate",
              render: (r: any) => r.rate || "-",
            },
            {
              key: "unit",
              label: "Unit",
              render: (r: any) => r.unit || "-",
            },
            {
              key: "makingCharge",
              label: "Making Charge",
              render: (r: any) => r.makingCharge || "-",
            },
            {
              key: "makingChargeType",
              label: "Making Charge Type",
              render: (r: any) => r.makingChargeType || "-",
            },
            {
              key: "discountOnMaking",
              label: "Discount on Making",
              render: (r: any) => r.discountOnMaking || "-",
            },
            {
              key: "discountType",
              label: "Discount Type",
              render: (r: any) => r.discountType || "-",
            },
          ]}
          
          // 2. Passed paginatedRates instead of the full raw array
          data={paginatedRates}
          loading={isLoading}
          emptyMessage="No current rates found"
          
          // 3. Updated unified pagination prop structure
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
                  onClick: (row: any) => navigate(`/admin/currentrate/edit/${row.id}`),
                },
              ]
              : []),
            ...(hasDelete
              ? [
                {
                  icon: <Trash2 className="h-4 w-4" />,
                  label: "Delete",
                  onClick: (row: any) => { setDeleteId(row.id); setConfirmOpen(true); },
                },
              ]
              : []),
          ]}
        />
      ) : (
        /* Grid View */
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8 text-gray-500">Loading rates...</div>
          ) : rates.length === 0 ? (
            <div className="flex justify-center p-8 bg-gray-50 rounded-lg text-gray-500 border border-dashed">
              No current rates found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Also use paginatedRates for the Grid view so it doesn't dump 100 cards at once */}
              {paginatedRates.map((r: any) => (
                <div key={r.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">ID: {r.id || "-"}</div>
                      <h3 className="text-xl font-bold text-gray-900">{r.metalType || "-"}</h3>
                      <p className="font-medium text-gray-700">{r.description || "-"}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {hasUpdate && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/admin/currentrate/edit/${r.id}`)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasDelete && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setDeleteId(r.id); setConfirmOpen(true); }}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Card Body Information Grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-1">Purity</span>
                      <span className="font-medium text-gray-900">{r.purity || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Rate / Unit</span>
                      <span className="font-medium text-gray-900">₹{r.rate || "-"} / {r.unit || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Making Charge</span>
                      <span className="font-medium text-gray-900">{r.makingCharge || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Charge Type</span>
                      <span className="font-medium text-gray-900">{r.makingChargeType || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Discount on Making</span>
                      <span className="font-medium text-gray-900">{r.discountOnMaking || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Discount Type</span>
                      <span className="font-medium text-gray-900">{r.discountType || "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Simple Pagination for Grid View */}
          {!isLoading && rates.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages} 
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Current Rate?"
        message="This current rate will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Current Rate"
        variant="destructive"
      />

      {/* Update 24K Gold Rate Dialog Overlay */}
      {isUpdateGoldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-[400px] p-6">
            <h2 className="text-xl font-bold mb-2">Update 24K Gold Rate</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter the new base rate for 24K Gold. This will automatically update calculations globally.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Rate (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newGoldRate}
                onChange={(e) => setNewGoldRate(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 72000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsUpdateGoldOpen(false);
                  setNewGoldRate("");
                }}
                disabled={updateGold24KMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate24KGoldSubmit}
                disabled={updateGold24KMutation.isPending || !newGoldRate}
                className="bg-yellow-500 hover:bg-yellow-600 text-black border-none"
              >
                {updateGold24KMutation.isPending ? "Updating..." : "Update Rate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};