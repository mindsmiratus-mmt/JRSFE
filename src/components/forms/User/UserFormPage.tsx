// pages/user/UserFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useUser } from "@/hooks/useUser";
import { UserForm } from "./UserForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const UserFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const userId = id ? Number(id) : null;

    const { data: user, isLoading } = useUser(isEditMode ? userId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/user");
    };

    const handleCancel = () => {
        navigate("/admin/user");
    };

    // Loading state
    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    // Not found
    if (isEditMode && !isLoading && !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full">
                <UserPlus className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">User not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Users
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit User - ${user?.fullName}`
                        : "Create New User"
                }
                icon={<UserPlus className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <UserForm
                    user={isEditMode ? user : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
