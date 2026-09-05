// pages/advance-order/AdvanceOrderFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAdvanceOrder } from "@/hooks/useAdvanceOrder";
import { AdvanceOrderForm } from "./AdvanceOrderForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const AdvanceOrderFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const orderId = id ? Number(id) : null;
    const { data: order, isLoading } = useAdvanceOrder(isEditMode ? orderId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/advance-order");
    };

    const handleCancel = () => {
        navigate("/admin/advance-order");
    };

    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (isEditMode && !isLoading && !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Advance order not found</p>
                <Button onClick={() => navigate("/admin/advance-order")} className="mt-4">
                    Back to Orders
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#faf9f7]">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Advance Order • ${order?.orderNo}`
                        : "Create Advance Order"
                }
                icon={<Package className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && order ? (
                        <span className="text-sm text-[#6b5a3a]">
                            Customer: <strong>{order.customer.name}</strong> •{" "}
                            Total: <strong className="text-[#3a2f1f]">
                                ₹{order.totalAmount.toLocaleString("en-IN")}
                            </strong> •{" "}
                            Advance:{" "}
                            <strong className="text-green-700">
                                ₹{order.advanceAmount.toLocaleString("en-IN")}
                            </strong>
                        </span>
                    ) : null
                }
                rightActions={
                    <Button
                        variant="outline"
                        className="border-[#fddc69] text-[#3a2f1f] hover:bg-[#fddc69]/20"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <AdvanceOrderForm
                    order={isEditMode ? order : undefined}
                    onSuccess={(msg) => handleSuccess(msg)}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};