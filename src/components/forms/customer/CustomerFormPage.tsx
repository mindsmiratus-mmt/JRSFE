// pages/customer/CustomerFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerForm } from "./CustomerForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const CustomerFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const customerId = id ? Number(id) : null;
    const { data: customer, isLoading } = useCustomer(isEditMode ? customerId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/customer");
    };

    const handleCancel = () => {
        navigate("/admin/customer");
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
    if (isEditMode && !isLoading && !customer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Customer not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Customers
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Customer - ${customer?.name}`
                        : "Add New Customer"
                }
                icon={<Users className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && customer ? (
                        <>
                            Phone: <strong>{customer.phone}</strong> •{" "}
                            Email: <strong>{customer.email}</strong> •{" "}
                            Status:{" "}
                            <strong
                                className={
                                    customer.isActive
                                        ? "text-green-600"
                                        : "text-red-600"
                                }
                            >
                                {customer.isActive ? "Active" : "Inactive"}
                            </strong>
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
                <CustomerForm
                    customer={isEditMode ? customer : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
