import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { SearchInput } from "@/components/ui/searchInput";

import { usePorters, useDeletePorter } from "@/hooks/usePorter";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";

export const Porter = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { permissions, user } = useAuth();
  const { hasRead, hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, 'Porter');

  const { data = [], isLoading, isFetching } = usePorters();
  const deleteMutation = useDeletePorter();

  const filteredPorters = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const search = searchTerm.toLowerCase();

    return data.filter((porter: any) => {
      return (
        porter?.name?.toLowerCase().includes(search) ||
        porter?.phone?.toLowerCase().includes(search) ||
        porter?.email?.toLowerCase().includes(search) ||
        porter?.identityProof?.toLowerCase().includes(search) ||
        porter?.identityNumber?.toLowerCase().includes(search)
      );
    });
  }, [data, searchTerm]);

  const handleCreate = () => {
    navigate("/admin/porter/new");
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/porter/${id}`);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Porter deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Failed to delete porter");
      },
    });
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (r: any) => <span>{r.id}</span>,
    },
    {
      key: "name",
      label: "Name",
      render: (r: any) => <span className="font-medium">{r.name || "—"}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (r: any) => <span>{r.phone || "—"}</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (r: any) => <span>{r.email || "—"}</span>,
    },
    {
      key: "identityProof",
      label: "Identity Proof",
      render: (r: any) => <span>{r.identityProof || "—"}</span>,
    },
    {
      key: "identityNumber",
      label: "Identity Number",
      render: (r: any) => <span>{r.identityNumber || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r: any) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            r.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  // Block the UI completely if the user has no Read permissions
  if (!hasRead) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to view porters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-[#b08d28]" />
          Porters
        </h1>

        {hasCreate && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Porter
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <SearchInput
          placeholder="Search porter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm("")}
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <CommonTable
          columns={columns}
          data={filteredPorters}
          loading={isLoading || isFetching}
          emptyMessage="No porters found"
          actions={[
            ...(hasUpdate
              ? [
                  {
                    icon: <Edit className="h-4 w-4" />,
                    label: "Edit",
                    onClick: (r: any) => handleEdit(r.id),
                  },
                ]
              : []),
            ...(hasDelete
              ? [
                  {
                    icon: deleteMutation.isPending && deleteId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />,
                    label: "Delete",
                    onClick: (r: any) => handleDeleteClick(r.id),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Porter?"
        message="This porter will be permanently deleted. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete Porter"
        variant="destructive"
      />
    </div>
  );
};