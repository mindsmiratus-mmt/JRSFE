import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Edit, Trash2, FolderTree, LayoutGrid, Table as TableIcon } from "lucide-react";
import { format } from "date-fns";
import { useSafeDialog } from "@/hooks/useSafeDialog"
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
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirmDialog";

import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "@/hooks/useCategory";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { SearchInput } from "@/components/ui/searchInput";
import { DateInput } from "@/components/ui/DatePicker";
import { Textarea } from "@/components/ui/textarea";

const CategorySchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Category name is required")
    .min(3, "Minimum 3 characters required"),
  description: Yup.string()
    .trim()
    .min(10, "Minimum 10 characters required"),
});

export const Category = () => {
  const queryClient = useQueryClient();
  const { open, setOpen, close } = useSafeDialog()
  const [editId, setEditId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const { permissions, user } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Category');

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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  const { data, isLoading, isFetching } = useCategories({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const categories = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const handleSubmit = (values: any, { resetForm }: any) => {
    const trimmedName = values.name.trim();
    const trimmedDescription = values.description.trim();
    const updatePayload: UpdateCategoryData = {
      id: editId,
      categoryName: trimmedName,
      description: trimmedDescription,
      updatedBy: user?.username,
    };

    const createPayload: CreateCategoryData = {
      categoryName: trimmedName,
      description: trimmedDescription,
      createdBy: user?.username,
    };

    const onSuccess = () => {
      toast.success(`Category ${editId ? "updated" : "created"} successfully`);
      close();
      setEditId(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    };

    const onError = () => {
      toast.error(`Failed to ${editId ? "update" : "create"} category`);
    };

    if (editId) {
      updateMutation.mutate({ id: editId, data: updatePayload }, { onSuccess, onError });
    } else {
      createMutation.mutate(createPayload, { onSuccess, onError });
    }
  };

  const handleEdit = (row: any) => {
    setEditId(Number(row?.id));
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Category deleted successfully");
        setConfirmOpen(false);
        setDeletingId(null);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        
        if (categories.length === 1 && page > 1) {
            setPage(page - 1);
        }
      },
      onError: () => {
        toast.error("Failed to delete category");
        setConfirmOpen(false);
      },
    });
  };

  const editingCategory = editId
    ? categories.find((c: any) => c.id === editId)
    : null;

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view categories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <FolderTree className="w-8 h-8 text-[#b08d28]" />
          Categories
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

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}>
                {hasCreate && (
                    <DialogTrigger asChild>
                        <Button className="h-10">Add Category</Button>
                    </DialogTrigger>
                )}

                <DialogContent size="2xl" onEscapeKeyDown={close} onPointerDownOutside={close}>
                    <DialogHeader>
                        <DialogTitle>{editId ? "Edit" : "Add New"} Category</DialogTitle>
                    </DialogHeader>
                    <Formik
                        enableReinitialize
                        initialValues={{
                            name: editingCategory?.categoryName || "",
                            description: editingCategory?.description || "",
                        }}
                        validationSchema={CategorySchema}
                        onSubmit={handleSubmit}
                        validateOnBlur={false}
                        validateOnChange={true}
                    >
                        {({ errors, touched, isSubmitting, submitForm, resetForm }) => {
                            const handleClose = () => {
                                resetForm();
                                close();
                            };

                            return (
                                <Form noValidate>
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Category Name *</Label>
                                            <Field as={Input} name="name" placeholder="Enter name" disabled={isSubmitting} />
                                            {touched.name && errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Field as={Textarea} name="description" placeholder="Enter description" disabled={isSubmitting} />
                                            {touched.description && errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                            Cancel
                                        </Button>
                                        <Button type="button" onClick={submitForm} disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {editId ? "Update" : "Create"}
                                        </Button>
                                    </DialogFooter>
                                </Form>
                            )
                        }}
                    </Formik>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Category?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null); }}
        variant="destructive"
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative">
          <SearchInput
            placeholder="Search categories..."
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

      {/* Clear Filters */}
      {(searchTerm || fromDate || toDate) && (
        <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); }} className="text-gray-500 hover:text-gray-800">
                Clear Filters
            </Button>
        </div>
      )}

      {/* Content Views */}
      {isLoading || isFetching ? (
          <div className="flex justify-center py-8"><p className="text-gray-500">Loading categories...</p></div>
      ) : categories.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No categories found.</p>
          </div>
      ) : viewMode === "table" ? (
          /* --- TABLE VIEW --- */
          <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CommonTable
                columns={[
                  { key: "categoryName", label: "Name", sortable: true, render: (r: any) => <span className="font-medium text-gray-900">{r.categoryName}</span> },
                  { key: "description", label: "Description", render: (r: any) => <span className="text-gray-600">{r.description || "-"}</span> },
                  { key: "createDate", label: "Created On", render: (r: any) => <span className="whitespace-nowrap">{format(new Date(r.createDate), "dd-MMM-yyyy hh:mm a")}</span> },
                ]}
                data={categories}
                loading={isLoading || isFetching}
                emptyMessage="No categories found"
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
                    ? [{ label: "Edit", icon: <Edit className="h-4 w-4" />, onClick: handleEdit }]
                    : []),
                  ...(hasDelete
                    ? [{ label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: (r: any) => handleDelete(r.id) }]
                    : []),
                ]}
              />
          </div>
      ) : (
          /* --- GRID VIEW --- */
          <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categories.map((r: any) => (
                      <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-900 line-clamp-1 text-lg" title={r.categoryName}>
                                      {r.categoryName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                      {format(new Date(r.createDate), "dd-MMM-yyyy hh:mm a")}
                                  </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1 shrink-0">
                                  {hasUpdate && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(r)} title="Edit Category">
                                          <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                      </Button>
                                  )}
                                  {hasDelete && (
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(r.id)} title="Delete Category">
                                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                      </Button>
                                  )}
                              </div>
                          </div>

                          <div className="text-sm text-gray-600 border-t border-gray-100 pt-3 line-clamp-3" title={r.description}>
                              {r.description || <span className="italic text-gray-400">No description provided.</span>}
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