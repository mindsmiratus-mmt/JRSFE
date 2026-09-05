// components/modules/Vendor.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Edit, Trash2, Store, UserPlus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModulePermissions } from "@/utils/permission";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CommonTable } from "@/components/ui/table";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor
} from "@/hooks/useVendor";

import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { SearchInput } from "@/components/ui/searchInput";

const VendorSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Vendor name is required")
    .min(2, "Minimum 2 characters required"),
  phone: Yup.string().trim().nullable(),
  email: Yup.string().email("Invalid email").trim().nullable(),
  gstin: Yup.string().trim().nullable(),
  pan: Yup.string().trim().nullable(),
  adharNo: Yup.string().trim().nullable(),
  address: Yup.string().trim().nullable(),
  state: Yup.string().trim().nullable(),
  city: Yup.string().trim().nullable(),
  pinCode: Yup.string().trim().nullable(),
  vendorType: Yup.string().trim().nullable(),
  isActive: Yup.boolean().required(),
});

export const Vendor = () => {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // React Query hooks
  const { data, isLoading, isFetching } = useVendors({ 
      page, 
      pageSize, 
      keyword: debouncedSearch || undefined 
  });
  
  const vendors = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const { permissions, user } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Vendor');

  const handleSubmit = async (
    values: any,
    { resetForm }: any
  ) => {
    const payload = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      gstin: values.gstin?.trim() || undefined,
      pan: values.pan?.trim() || undefined,
      adharNo: values.adharNo?.trim() || undefined,
      address: values.address?.trim() || undefined,
      state: values.state?.trim() || undefined,
      city: values.city?.trim() || undefined,
      pinCode: values.pinCode?.trim() || undefined,
      vendorType: values.vendorType?.trim() || undefined,
      isActive: values.isActive,
    };

    if (editId) {
      updateMutation.mutate(
        { id: editId, data: { ...payload, id: editId } },
        {
          onSuccess: () => {
            toast.success("Vendor updated successfully");
            setOpen(false);
            setEditId(null);
            resetForm();
          },
          onError: (error: any) => toast.error(error.response?.data?.details || "Failed to update vendor"),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor created successfully");
          setOpen(false);
          resetForm();
        },
        onError: () => toast.error("Failed to create vendor"),
      });
    }
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Vendor deleted successfully");
        setConfirmOpen(false);
        setDeletingId(null);

        // Shift back a page if we delete the last item on the page
        if (vendors.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete vendor");
        setConfirmOpen(false);
        setDeletingId(null);
      },
    });
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const handleEdit = (vendor: any) => {
    setEditId(vendor.id);
    setOpen(true);
  };

  // Find current editing vendor
  const editingVendor = editId
    ? vendors.find((v: any) => v.id === editId)
    : null;

  if (!hasRead) {
      return (
          <div className="flex h-[50vh] items-center justify-center p-6">
              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                  <p className="mt-2 text-gray-600">You do not have permission to view vendors.</p>
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
          Vendors
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

            <Dialog
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) {
                        setEditId(null);
                    }
                }}
            >
                {hasCreate && (
                    <DialogTrigger asChild>
                        <Button className="h-10"><UserPlus className="w-4 h-4 mr-2" /> Add Vendor</Button>
                    </DialogTrigger>
                )}

                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editId ? "Edit Vendor" : "Add New Vendor"}
                        </DialogTitle>
                    </DialogHeader>

                    <Formik
                        enableReinitialize
                        initialValues={{
                            name: editingVendor?.name || "",
                            phone: editingVendor?.phone || "",
                            email: editingVendor?.email || "",
                            gstin: editingVendor?.gstin || "",
                            pan: editingVendor?.pan || "",
                            adharNo: editingVendor?.adharNo || "",
                            address: editingVendor?.address || "",
                            state: editingVendor?.state || "",
                            city: editingVendor?.city || "",
                            pinCode: editingVendor?.pinCode || "",
                            vendorType: editingVendor?.vendorType || "",
                            isActive: editingVendor?.isActive ?? true,
                        }}
                        validationSchema={VendorSchema}
                        validateOnBlur={false}
                        validateOnChange={false}
                        onSubmit={handleSubmit}
                    >
                        {({ values, errors, touched, isSubmitting, submitForm, setFieldValue }) => (
                            <Form noValidate className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Vendor Name *</Label>
                                    <Field
                                        as={Input}
                                        id="name"
                                        name="name"
                                        placeholder="e.g. ABC Electronics Ltd"
                                        disabled={isSubmitting}
                                    />
                                    {touched.name && errors.name && (
                                        <p className="text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Field
                                            as={Input}
                                            id="phone"
                                            name="phone"
                                            placeholder="+1234567890"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Field
                                            as={Input}
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="vendor@example.com"
                                            disabled={isSubmitting}
                                        />
                                        {touched.email && errors.email && (
                                            <p className="text-sm text-red-500">{errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="gstin">GSTIN</Label>
                                        <Field
                                            as={Input}
                                            id="gstin"
                                            name="gstin"
                                            placeholder="e.g. 27AAECS9290R1Z5"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pan">PAN</Label>
                                        <Field
                                            as={Input}
                                            id="pan"
                                            name="pan"
                                            placeholder="e.g. AAECS9290R"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="adharNo">Aadhaar No</Label>
                                        <Field
                                            as={Input}
                                            id="adharNo"
                                            name="adharNo"
                                            placeholder="e.g. 1234 5678 9012"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="vendorType">Vendor Type</Label>
                                        <Field
                                            as={Input}
                                            id="vendorType"
                                            name="vendorType"
                                            placeholder="e.g. Supplier"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Field
                                            as={Input}
                                            id="state"
                                            name="state"
                                            placeholder="e.g. Maharashtra"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Field
                                            as={Input}
                                            id="city"
                                            name="city"
                                            placeholder="e.g. Mumbai"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pinCode">Pin Code</Label>
                                        <Field
                                            as={Input}
                                            id="pinCode"
                                            name="pinCode"
                                            placeholder="e.g. 400001"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Field
                                        as={Input}
                                        id="address"
                                        name="address"
                                        placeholder="123 Business St, City, Country"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="isActive"
                                        checked={values.isActive}
                                        onCheckedChange={(checked) => setFieldValue("isActive", checked)}
                                        disabled={isSubmitting}
                                    />
                                    <Label htmlFor="isActive" className="cursor-pointer">
                                        Is Active
                                    </Label>
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={submitForm}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {editId ? "Update" : "Create"}
                                    </Button>
                                </DialogFooter>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Vendor?"
        message="This action cannot be undone. This will permanently delete the vendor and all related data."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <div className="relative max-w-md">
              <SearchInput
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
              />
          </div>
      </div>

      {/* Content Views */}
      {isLoading || isFetching ? (
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading vendors...</p></div>
      ) : vendors.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No vendors found.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CommonTable
                columns={[
                  {
                    key: "name",
                    label: "Vendor Name",
                    sortable: true,
                    render: (row: any) => <span className="font-semibold text-gray-900">{row.name}</span>,
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    render: (row: any) => row.phone || "—",
                  },
                  {
                    key: "email",
                    label: "Email",
                    render: (row: any) => row.email || "—",
                  },
                  {
                    key: "gstin",
                    label: "GSTIN",
                    render: (row: any) => row.gstin || "—",
                  },
                  {
                    key: "pan",
                    label: "PAN",
                    render: (row: any) => row.pan || "—",
                  },
                  {
                    key: "address",
                    label: "Address",
                    render: (row: any) => (
                        <span className="line-clamp-1 min-w-[150px] max-w-[200px]" title={row.address}>
                            {row.address || "—"}
                        </span>
                    ),
                  },
                  {
                    key: "city",
                    label: "City",
                    render: (row: any) => row.city || "—",
                  },
                  {
                    key: "state",
                    label: "State",
                    render: (row: any) => row.state || "—",
                  },
                  {
                    key: "vendorType",
                    label: "Vendor Type",
                    render: (row: any) => row.vendorType || "—",
                  },
                  {
                    key: "isActive",
                    label: "Active",
                    render: (row: any) => (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${row.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                ]}
                data={vendors}
                loading={isLoading || isFetching}
                emptyMessage="No vendors found"
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
                        label: "Edit",
                        icon: <Edit className="h-4 w-4" />,
                        onClick: handleEdit,
                      },
                    ]
                    : []),
                  ...(hasDelete
                    ? [
                      {
                        label: "Delete",
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: (row: any) => handleDelete(row.id),
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
                  {vendors.map((r: any) => (
                      <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-900 line-clamp-1 text-lg" title={r.name}>
                                      {r.name}
                                  </div>
                                  <div className="flex gap-2 items-center mt-1">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${r.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                          {r.isActive ? "Active" : "Inactive"}
                                      </span>
                                      {r.vendorType && (
                                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                                              {r.vendorType}
                                          </span>
                                      )}
                                  </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1 shrink-0">
                                  {hasUpdate && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(r)} title="Edit Vendor">
                                          <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                      </Button>
                                  )}
                                  {hasDelete && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(r.id)} title="Delete Vendor">
                                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                      </Button>
                                  )}
                              </div>
                          </div>

                          <div className="text-sm text-gray-600 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3">
                              <div className="flex justify-between"><span className="text-gray-400">Phone</span> <span>{r.phone || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Email</span> <span className="truncate ml-2" title={r.email}>{r.email || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">GSTIN</span> <span>{r.gstin || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">PAN</span> <span>{r.pan || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Location</span> <span className="text-right">{r.city || "-"}, {r.state || "-"}</span></div>
                              
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
    </div>
  );
};