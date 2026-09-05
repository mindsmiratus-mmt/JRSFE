import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleForm } from "./SaleForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const SaleFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // If the route contains "/edit/" and an ID is present, we are paying for an existing order.
    const isEditMode = location.pathname.includes("/edit/") && !!id;
    
    // In a real app, 'id' might be the Cart ID (for new sales) or Order ID (for existing sales)
    const currentId = id || null; 

    const handleCancel = () => {
        navigate("/admin/sale");
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <PageHeader
                title={
                    isEditMode
                        ? `Finalize Payment - Order #${currentId}`
                        : "Create New Sale"
                }
                icon={
                    isEditMode
                        ? <CreditCard className="w-7 h-7 text-indigo-600" />
                        : <ShoppingCart className="w-7 h-7 text-[#b08d28]" />
                }
                onBack={handleCancel}
                subtitle={
                    isEditMode 
                        ? "Complete the payment for this existing order" 
                        : "Start a new transaction and add items"
                }
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <SaleForm
                    onCancel={handleCancel}
                    // We only pass editOrderId if we are explicitly on the edit route.
                    // If we are starting fresh, editOrderId is null, and it creates a new cart.
                    editOrderId={isEditMode ? currentId : null}
                />
            </div>
        </div>
    );
};
