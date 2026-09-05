// pages/shop/ShopFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useShop } from "@/hooks/useShop";
import { ShopForm } from "./ShopForm";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";

export const ShopFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const isEditMode = location.pathname.includes("/edit/");
    const shopId = id ? Number(id) : null;
    const { data: shop, isLoading } = useShop(isEditMode ? shopId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/shop");
    };

    const handleCancel = () => {
        navigate("/admin/shop");
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
    if (isEditMode && !isLoading && !shop) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Store className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Shop not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Shops
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Shop - ${shop?.name}`
                        : "Create New Shop"
                }
                icon={<Store className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                <ShopForm
                    shop={isEditMode ? shop : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                    username={user?.username}
                />
            </div>
        </div>
    );
};
