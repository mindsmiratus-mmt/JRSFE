// pages/tag/TagFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTag } from "@/hooks/useTag";
import { TagForm } from "./TagForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const TagFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const tagId = id ? Number(id) : null;

    const { data: tag, isLoading } = useTag(isEditMode ? tagId : null);

    const handleSuccess = (msg: string) => {
        toast.success(msg);
        navigate("/admin/tag");
    };

    const handleCancel = () => {
        navigate("/admin/tag");
    };

    // Loading
    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    // Not found
    if (isEditMode && !isLoading && !tag) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Tag not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Tags
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Tag - ${tag?.tagNo}`
                        : "Create New Tag"
                }
                icon={<Package className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <TagForm
                    tag={isEditMode ? tag : undefined}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    );
};
