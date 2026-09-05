// pages/role/Role.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Plus, Shield, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";

import {
    useRoles,
    useDeleteRole,
} from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";

export const Role = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    
    // View Mode: 'table' or 'grid'
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");

    const navigate = useNavigate();
    const { data: roles = [], isLoading } = useRoles();
    const deleteMutation = useDeleteRole();

    const { permissions, user } = useAuth();
    const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, ['Role Management', 'Role']);

    const filtered = roles.filter((role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.parentRole && role.parentRole.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteId) return;

        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast.success("Role deleted successfully");
                setConfirmOpen(false);
                setDeleteId(null);
            },
            onError: () => toast.error("Failed to delete role"),
        });
    };

    if (!hasRead) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                    <p className="mt-2 text-gray-600">You do not have permission to view roles.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Shield className="w-8 h-8 text-[#b08d28]" />
                    Roles
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
                        <Button onClick={() => navigate("/admin/role/new")} size="lg" className="h-10">
                            <Plus className="w-5 h-5 mr-2" />
                            Create Role
                        </Button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <Input
                    placeholder="Search by role name or parent role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {/* Content Views */}
            {isLoading ? (
                <div className="flex justify-center py-8"><p className="text-gray-500">Loading roles...</p></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                   <p className="text-gray-500">No roles found.</p>
                </div>
            ) : viewMode === "table" ? (
                /* --- TABLE VIEW --- */
                <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <CommonTable
                        columns={[
                            {
                                key: "name",
                                label: "Role Name",
                                render: (r) => (
                                    <span className="font-semibold text-gray-900">
                                        {r.name}
                                    </span>
                                ),
                            },
                            {
                                key: "parentRole",
                                label: "Parent Role",
                                render: (r) => r.parentRole || <span className="text-gray-400 italic">None</span>,
                            },
                        ]}
                        data={filtered}
                        loading={isLoading}
                        actions={[
                            ...(hasUpdate
                                ? [
                                    {
                                        icon: <Edit className="h-4 w-4" />,
                                        onClick: (row: any) => navigate(`/admin/role/edit/${row.id}`),
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
                        emptyMessage="No roles found"
                    />
                </div>
            ) : (
                /* --- GRID VIEW --- */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((r: any) => (
                        <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 line-clamp-1 text-lg" title={r.name}>
                                        {r.name}
                                    </div>
                                    <div className="text-sm mt-1 text-gray-500 flex flex-col gap-1">
                                        <span>Parent Role:</span>
                                        {r.parentRole ? (
                                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium w-fit">
                                                {r.parentRole}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic text-xs">None</span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex gap-1 flex-wrap justify-end shrink-0">
                                    {hasUpdate && (
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/role/edit/${r.id}`)} title="Edit Role">
                                            <Edit className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                                        </Button>
                                    )}
                                    {hasDelete && (
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(r.id)} title="Delete Role">
                                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={confirmOpen}
                title="Delete Role?"
                message="This role and all its associations will be permanently removed. This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
                confirmText="Delete Role"
                variant="destructive"
            />
        </div>
    );
};