// pages/item/ItemFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useItem } from "@/hooks/useItem";
import { ItemForm } from "./ItemForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const ItemFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const itemId = id ? Number(id) : null;
    const { data: item, isLoading, isFetching } = useItem(
        isEditMode ? itemId : null
    );


    const handleSuccess = (message: string) => {
        toast.success(message);
    };

    const handleCancel = () => {
        navigate("/admin/item");
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
    if (isEditMode && !isLoading && !isFetching && !item) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Item not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Items
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Item - ${item?.name}`
                        : "Add New Item"
                }
                icon={<Package className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && item ? (
                        <>
                            Barcode: <strong>{item.barcode}</strong> •{" "}
                            Category:{" "}
                            <strong>{item.category?.categoryName}</strong>
                        </>
                    ) : null
                }
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <ItemForm
                    item={isEditMode ? item : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
