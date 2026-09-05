// pages/role/RoleFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Shield, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRole } from "@/hooks/useRole";
import { RoleForm } from "./RoleForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const RoleFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const roleId = id ? Number(id) : null;
    const { data: role, isLoading } = useRole(isEditMode ? roleId : null);

    const handleSuccess = (msg: string) => {
        toast.success(msg);
        navigate("/admin/role");
    };

    const handleCancel = () => navigate("/admin/role");

    // Loading
    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    // Not found
    if (isEditMode && !isLoading && !role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Role not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Roles
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Role - ${role?.name}`
                        : "Create New Role"
                }
                icon={<Shield className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <RoleForm
                    role={isEditMode ? role : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
