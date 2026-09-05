// pages/user/User.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Users, Key, UserCog, Store, ShieldAlert, LayoutGrid, Table as TableIcon } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getModulePermissions } from "@/utils/permission";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    useUsers,
    useDeleteUser,
    useAssignShop,
    useResetPassword,
} from "@/hooks/useUser";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useAllShops, useUserShop } from "@/hooks/useShop";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useUserRoleByUserId,
    useAssignUserRole,
    useDeleteUserRole
} from "@/hooks/useUserRole";
import { useRoles } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { DialogDescription } from "@radix-ui/react-dialog";
import { MultiSelect, MultiSelectContent, MultiSelectItem, MultiSelectTrigger } from "@/components/ui/multi-select";

const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!?._-])[A-Za-z\d@#$%^&*!?._-]{8,50}$/;

const ResetPasswordValidation = Yup.object().shape({
    newPassword: Yup.string()
        .required('New password is required')
        .matches(
            strongPasswordRegex,
            'Password must be 8–50 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character (@#$%^&*!?._-)'
        ),
});

const AssignRoleValidation = Yup.object().shape({
    roleId: Yup.string(),
});

export const User = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    
    // View Mode: 'table' or 'grid'
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    
    // PAGINATION STATES
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); 
    
    const [fromDate, setFromDate] = useState<string | null>(null);
    const [toDate, setToDate] = useState<string | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [assignShopOpen, setAssignShopOpen] = useState(false);
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const navigate = useNavigate();

    const assignShopMutation = useAssignShop();
    const resetPasswordMutation = useResetPassword();
    const { data: shopList } = useAllShops();
    const [assignRoleOpen, setAssignRoleOpen] = useState(false);
    const assignUserRoleMutation = useAssignUserRole();
    const { data: roleList } = useRoles();
    const { permissions, user } = useAuth();
    const { data: assignedShops = [] } = useUserShop(selectedUser?.id);

    const { hasRead, hasCreate, hasUpdate, hasDelete, isAdmin } = getModulePermissions(permissions, user, ['User Management', 'User']);

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
    }, [fromDate, toDate]);

    const { data, isLoading, isFetching } = useUsers({
        page,
        pageSize,
        keyword: debouncedSearch || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
    });

    const deleteMutation = useDeleteUser();
    const users = data?.data || [];
    const totalCount = data?.totalCount || 0;
    const totalPages = data?.totalPages || 1;

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast.success("User deleted successfully");
                setConfirmOpen(false);
                setDeleteId(null);
                
                // Automatically shift to the previous page if we delete the last item on the current page
                if (users.length === 1 && page > 1) {
                    setPage(page - 1);
                }
            },
            onError: () => {
                toast.error("Failed to delete user");
            },
        });
    };

    if (!hasRead) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                    <p className="mt-2 text-gray-600">You do not have permission to view users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Users className="w-8 h-8 text-[#b08d28]" />
                    Users
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
                        <Button
                            onClick={() => navigate("/admin/user/new")}
                            className="w-full sm:w-auto h-10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="relative">
                    <SearchInput
                        placeholder="Search users..."
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

            {/* Users Content View */}
            {isLoading || isFetching ? (
                <div className="flex justify-center py-8"><p className="text-gray-500">Loading users...</p></div>
            ) : users.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                   <p className="text-gray-500">No users found.</p>
                </div>
            ) : viewMode === "table" ? (
                <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <CommonTable
                        columns={[
                            {
                                key: "fullName",
                                label: "Name",
                                render: (r) => (
                                    <div>
                                        <div className="font-medium text-gray-900 whitespace-nowrap">{r.fullName}</div>
                                        <div className="text-xs text-gray-500 font-mono">@{r.username}</div>
                                    </div>
                                ),
                            },
                            {
                                key: "employeeId",
                                label: "Employee ID",
                            },
                            {
                                key: "shop",
                                label: "Assigned Shops",
                                render: (r) => {
                                    const shopNames = new Set<string>();
                                    if (r.shop?.name) shopNames.add(r.shop.name);
                                    if ((r as any).userRoles?.length) {
                                        (r as any).userRoles.forEach((ur: any) => {
                                            const sName = ur.shop?.name || shopList?.find((s: any) => s.id === ur.shopId)?.name;
                                            if (sName) shopNames.add(sName);
                                        });
                                    }
                                    const uniqueShops = Array.from(shopNames);

                                    if (uniqueShops.length === 0) {
                                        return <span className="text-gray-400 italic text-sm">Not Assigned</span>;
                                    }
                                    return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {uniqueShops.map((name, idx) => (
                                                <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                },
                            },
                            {
                                key: "isActive",
                                label: "Status",
                                render: (r) => (
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${r.isActive
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : "bg-red-100 text-red-700 border border-red-200"
                                            }`}
                                    >
                                        {r.isActive ? "Active" : "Inactive"}
                                    </span>
                                ),
                            },
                            {
                                key: "dateOfJoining",
                                label: "Joined On",
                                render: (r) =>
                                    r.dateOfJoining
                                        ? <span className="whitespace-nowrap">{format(new Date(r.dateOfJoining), "dd MMM yyyy")}</span>
                                        : "-",
                            },
                            {
                                key: "userRoles",
                                label: "Current Roles",
                                render: (r: any) => {
                                    return (
                                        <div className="flex flex-col gap-1.5 py-1 min-w-[200px]">
                                            {r?.userRoles?.length ? (
                                                r.userRoles.map((item: any, index: number) => {
                                                    const shopName = item?.shop?.name
                                                        || shopList?.find((s: any) => s.id === item.shopId)?.name
                                                        || "Unknown Shop";

                                                    return (
                                                        <div key={item.id} className="text-xs text-gray-700 flex items-start gap-1.5">
                                                            <span className="font-bold text-gray-900">{index + 1}.</span>
                                                            <span className="truncate">
                                                                <span className="font-semibold text-gray-800">{item?.role?.name}</span>
                                                                <span className="text-gray-400 mx-1">in</span>
                                                                <span className="text-gray-600">{shopName}</span>
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span className="font-medium text-xs text-gray-400 italic">No Roles Assigned</span>
                                            )}
                                        </div>
                                    );
                                },
                            },
                        ]}
                        data={users}
                        loading={isLoading || isFetching}
                        emptyMessage="No users found"
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
                                        onClick: (row: any) => navigate(`/admin/user/edit/${row.id}`),
                                        label: "Edit",
                                    },
                                ]
                                : []),
                            ...(hasDelete
                                ? [
                                    {
                                        icon: <Trash2 className="h-4 w-4" />,
                                        label: "Delete",
                                        hidden: (row: any) => Number(row.id) === Number(user?.id),
                                        onClick: (row: any) => handleDeleteClick(row.id),
                                    },
                                ]
                                : []),
                            ...(hasUpdate ? [
                                {
                                    icon: <UserCog className="h-4 w-4" />,
                                    label: "Manage Roles & Shops",
                                    onClick: (row: any) => {
                                        setSelectedUser(row);
                                        setAssignRoleOpen(true);
                                    },
                                },
                            ] : []),
                            ...(isAdmin
                                ? [
                                    {
                                        icon: <Key className="h-4 w-4" />,
                                        label: "Reset Password",
                                        onClick: (row: any) => {
                                            setSelectedUser(row);
                                            setResetPasswordOpen(true);
                                        },
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
                        {users.map((r: any) => {
                            // Compute unique shops
                            const shopNames = new Set<string>();
                            if (r.shop?.name) shopNames.add(r.shop.name);
                            if (r.userRoles?.length) {
                                r.userRoles.forEach((ur: any) => {
                                    const sName = ur.shop?.name || shopList?.find((s: any) => s.id === ur.shopId)?.name;
                                    if (sName) shopNames.add(sName);
                                });
                            }
                            const uniqueShops = Array.from(shopNames);

                            return (
                                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 line-clamp-1 text-lg" title={r.fullName}>{r.fullName}</div>
                                            <div className="text-xs text-gray-500 font-mono truncate">@{r.username}</div>
                                            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${r.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                                {r.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-1 flex-wrap justify-end max-w-[120px] shrink-0">
                                            {hasUpdate && (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/user/edit/${r.id}`)} title="Edit User">
                                                    <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                                </Button>
                                            )}
                                            {hasDelete && Number(r.id) !== Number(user?.id) && (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(r.id)} title="Delete User">
                                                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                                </Button>
                                            )}
                                            {hasUpdate && (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedUser(r); setAssignRoleOpen(true); }} title="Manage Roles & Shops">
                                                    <UserCog className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedUser(r); setResetPasswordOpen(true); }} title="Reset Password">
                                                    <Key className="h-4 w-4 text-amber-500 hover:text-amber-700" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-600 grid grid-cols-1 gap-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Employee ID</span> <span className="font-medium">{r.employeeId || "-"}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Joined On</span> <span>{r.dateOfJoining ? format(new Date(r.dateOfJoining), "dd MMM yyyy") : "-"}</span></div>
                                        
                                        {/* Assigned Shops */}
                                        <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
                                            <span className="text-gray-400 text-xs">Assigned Shops</span>
                                            {uniqueShops.length === 0 ? <span className="text-gray-400 italic text-xs">Not Assigned</span> : (
                                                <div className="flex flex-wrap gap-1">
                                                    {uniqueShops.map((name, idx) => (
                                                        <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Current Roles */}
                                        <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
                                            <span className="text-gray-400 text-xs">Current Roles</span>
                                            {r.userRoles?.length ? (
                                                <div className="flex flex-col gap-1">
                                                    {r.userRoles.map((item: any, index: number) => {
                                                        const shopName = item?.shop?.name || shopList?.find((s: any) => s.id === item.shopId)?.name || "Unknown Shop";
                                                        return (
                                                            <div key={item.id} className="text-[11px] text-gray-700 flex items-start gap-1">
                                                                <span className="font-bold text-gray-900">{index + 1}.</span>
                                                                <span>
                                                                    <span className="font-semibold text-gray-800">{item?.role?.name}</span>
                                                                    <span className="text-gray-400 mx-1">in</span>
                                                                    <span className="text-gray-600 truncate">{shopName}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="font-medium text-xs text-gray-400 italic">No Roles Assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                title="Delete User?"
                message="This user will be permanently deleted. This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
                confirmText="Delete User"
                variant="destructive"
            />

            {/* ---------- ASSIGN SHOP + ROLE MODAL ---------- */}
            <Dialog
                open={assignShopOpen || assignRoleOpen}
                onOpenChange={(open) => {
                    setAssignShopOpen(open);
                    setAssignRoleOpen(open);
                }}
            >
                <DialogContent className="max-w-5xl">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-indigo-600" />
                            Manage Access for <span className="text-indigo-700">{selectedUser?.fullName}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Review the current shops and roles assigned to this user, and make new assignments below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-2 space-y-5 bg-gray-50/50 p-5 rounded-xl border border-gray-100 h-fit">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Store className="w-4 h-4 text-gray-500" /> Current Shops
                                </h3>
                                {assignedShops.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {assignedShops.map((shop: any) => (
                                            <div key={shop.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="font-semibold text-gray-900 text-sm">{shop.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                    {shop.city}, {shop.state}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic bg-white p-3 rounded-lg border border-dashed">No shops currently assigned.</div>
                                )}
                            </div>

                            <div className="pt-2">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <UserCog className="w-4 h-4 text-gray-500" /> Current Roles
                                </h3>
                                <div className="max-h-56 overflow-y-auto pr-1">
                                    <AssignedRoles userId={selectedUser?.id} shopList={shopList} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-3">
                            <Formik
                                enableReinitialize
                                initialValues={{
                                    shopIds: assignedShops.map((s: any) => s.id.toString()),
                                    roleId: "",
                                    shopId: assignedShops.length === 1 ? assignedShops[0].id.toString() : "",
                                }}
                                validationSchema={AssignRoleValidation}
                                onSubmit={(values) => {
                                    if (values.roleId && !values.shopId) {
                                        toast.error("Please select a target shop for the role.");
                                        return;
                                    }

                                    if (values.shopIds.length > 0) {
                                        assignShopMutation.mutate(
                                            {
                                                userId: selectedUser!.id,
                                                shopIds: values.shopIds.map(Number),
                                            },
                                            {
                                                onSuccess: () => {
                                                    if (!values.roleId) {
                                                        toast.success("Shops updated successfully");
                                                        setAssignShopOpen(false);
                                                        setAssignRoleOpen(false);
                                                    }
                                                },
                                                onError: (error: any) =>
                                                    toast.error(error.response?.data?.details || "Failed to update shops"),
                                            }
                                        );
                                    }

                                    if (values.roleId && values.shopId) {
                                        assignUserRoleMutation.mutate(
                                            {
                                                userId: selectedUser!.id,
                                                roleId: Number(values.roleId),
                                                shopId: Number(values.shopId),
                                            },
                                            {
                                                onSuccess: () => {
                                                    toast.success("New Role assigned successfully");
                                                    setAssignShopOpen(false);
                                                    setAssignRoleOpen(false);
                                                },
                                                onError: (error: any) =>
                                                    toast.error(error.response?.data?.message || "Failed to assign role"),
                                            }
                                        );
                                    }
                                }}
                            >
                                {({ values, setFieldValue }) => {
                                    const selectedShopNames =
                                        shopList
                                            ?.filter((s: any) => values.shopIds.includes(s.id.toString()))
                                            .map((s: any) => s.name) || [];

                                    return (
                                        <Form className="space-y-8 pl-0 lg:pl-4">

                                            {/* STEP 1 */}
                                            <div className="space-y-3">
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-900">1. Modify Shop Access</Label>
                                                    <p className="text-xs text-gray-500 mb-2">Select all the branches this user is allowed to access and operate in.</p>
                                                </div>
                                                <MultiSelect
                                                    value={values.shopIds}
                                                    onValueChange={(val) => {
                                                        setFieldValue("shopIds", val);
                                                        if (val.length === 1) {
                                                            setFieldValue("shopId", val[0]);
                                                        } else if (!val.includes(values.shopId)) {
                                                            setFieldValue("shopId", "");
                                                        }
                                                    }}
                                                >
                                                    <MultiSelectTrigger className="h-11">
                                                        {selectedShopNames.length > 0
                                                            ? selectedShopNames.join(", ")
                                                            : "Select allowed shops..."}
                                                    </MultiSelectTrigger>
                                                    <MultiSelectContent>
                                                        {shopList?.map((s: any) => (
                                                            <MultiSelectItem key={s.id} value={s.id.toString()}>
                                                                {s.name}
                                                            </MultiSelectItem>
                                                        ))}
                                                    </MultiSelectContent>
                                                </MultiSelect>
                                            </div>

                                            <div className="border-t border-gray-100 pt-6"></div>

                                            {/* STEP 2 */}
                                            <div className="space-y-3">
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-900">2. Assign a New Role <span className="text-gray-400 font-normal">(Optional)</span></Label>
                                                    <p className="text-xs text-gray-500 mb-2">Choose a permission level for this user.</p>
                                                </div>
                                                <Select
                                                    value={values.roleId}
                                                    onValueChange={(v) => setFieldValue("roleId", v)}
                                                >
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Choose a role..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roleList
                                                            ?.filter((r: any) => isAdmin || r.name !== "Admin")
                                                            .map((r: any) => (
                                                                <SelectItem key={r.id} value={r.id.toString()}>
                                                                    {r.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* STEP 3 */}
                                            <div className={`space-y-3 transition-opacity duration-200 ${!values.roleId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-900">3. Select Target Shop for this Role</Label>
                                                    <p className="text-xs text-gray-500 mb-2">Which shop does this specific role apply to?</p>
                                                </div>
                                                <Select
                                                    value={values.shopId}
                                                    onValueChange={(v) => setFieldValue("shopId", v)}
                                                    disabled={!values.shopIds || values.shopIds.length === 0 || !values.roleId}
                                                >
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Select target shop..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {shopList
                                                            ?.filter((s: any) => values.shopIds.includes(s.id.toString()))
                                                            .map((s: any) => (
                                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                                    {s.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                {values.roleId && !values.shopId && (
                                                    <p className="text-xs text-red-500 font-medium pt-1">
                                                        * Required: Please select the specific shop for this role.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex justify-end pt-6">
                                                <Button
                                                    type="submit"
                                                    size="lg"
                                                    className="w-full sm:w-auto font-semibold"
                                                    disabled={!values.shopIds.length}
                                                >
                                                    Save Changes & Assignments
                                                </Button>
                                            </div>
                                        </Form>
                                    );
                                }}
                            </Formik>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ---------- RESET PASSWORD MODAL ---------- */}
            <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password for {selectedUser?.fullName}</DialogTitle>
                    </DialogHeader>

                    <Formik
                        initialValues={{
                            userId: selectedUser?.id || "",
                            newPassword: "",
                        }}
                        validationSchema={ResetPasswordValidation}
                        enableReinitialize
                        validateOnBlur={false}
                        onSubmit={(values) => {
                            resetPasswordMutation.mutate(
                                {
                                    id: values.userId,
                                    data: { newPassword: values.newPassword },
                                },
                                {
                                    onSuccess: () => {
                                        toast.success("Password reset successfully");
                                        setResetPasswordOpen(false);
                                    },
                                    onError: () => toast.error("Failed to reset password"),
                                }
                            );
                        }}
                    >
                        {({ errors, touched }) => (
                            <Form className="space-y-4 pt-4">
                                <div>
                                    <Label>New Password</Label>
                                    <Field name="newPassword" as={Input} type="password" placeholder="Enter new strong password" />
                                    {touched.newPassword && errors.newPassword && (
                                        <p className="text-sm text-red-500 mt-1">{errors.newPassword}</p>
                                    )}
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
                                    <Button type="submit">Reset Password</Button>
                                </DialogFooter>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ======================
// ASSIGNED ROLES LIST
// ======================
const AssignedRoles = ({ userId, shopList }: { userId: number, shopList?: any[] }) => {
    const { data: roles, isLoading } = useUserRoleByUserId(userId);
    const deleteRoleMutation = useDeleteUserRole();

    const handleDelete = (roleId: number) => {
        deleteRoleMutation.mutate(roleId, {
            onSuccess: () => toast.success("Role removed successfully"),
            onError: () => toast.error("Failed to remove role"),
        });
    };

    if (isLoading) return (
        <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className="animate-pulse">Loading...</span>
        </p>
    );

    if (!roles?.length) {
        return (
            <div className="text-sm text-gray-500 italic bg-white p-3 rounded-lg border border-dashed">
                No roles currently assigned.
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {roles.map((ur: any) => {
                const shopName = ur?.shop?.name || shopList?.find((s: any) => s.id === ur.shopId)?.name || "Unknown Shop";

                return (
                    <div
                        key={ur.id}
                        className="flex justify-between items-center bg-white border border-gray-200 shadow-sm p-3 rounded-lg group hover:border-indigo-200 transition-colors"
                    >
                        <div>
                            <div className="font-bold text-gray-900 text-sm">{ur.role.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <Store className="w-3 h-3" /> {shopName}
                            </div>
                        </div>

                        {roles?.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full opacity-60 group-hover:opacity-100 transition-all"
                                onClick={() => handleDelete(ur.id)}
                                title="Remove Role"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};