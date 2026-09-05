// pages/stock-movement/StockMovementFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useStockMovement } from "@/hooks/useStockMovement";
import { StockMovementForm } from "./StockMovementForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const StockMovementFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const stockMovementId = id ? Number(id) : null;
    const { data: stockMovement, isLoading } = useStockMovement(
        isEditMode ? stockMovementId : null
    );

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/stock-movement");
    };

    const handleCancel = () => {
        navigate("/admin/stock-movement");
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
    if (isEditMode && !isLoading && !stockMovement) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Stock movement not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Stock Movements
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Stock Movement - ${stockMovement?.referenceNo}`
                        : "Create New Stock Movement"
                }
                icon={<Package className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && stockMovement ? (
                        <>
                            Item:{" "}
                            <strong>{stockMovement.item.name}</strong> •{" "}
                            Type: <strong>{stockMovement.type}</strong> •{" "}
                            Quantity:{" "}
                            <strong>{stockMovement.quantity}</strong>
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
                <StockMovementForm
                    stockMovement={isEditMode ? stockMovement : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
