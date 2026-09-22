// pages/customer/CustomerFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCustomer } from "@/hooks/useCustomer";
import { useCustomerAddresses } from "@/hooks/useCustomerAddress";
import { CustomerForm } from "./CustomerForm";
import { CustomerAddresses } from "./CustomerAddresses";
import { PageHeader } from "@/components/ui/PageHeader";

export const CustomerFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const customerId = id ? Number(id) : null;
    const { data: customer, isLoading } = useCustomer(isEditMode ? customerId : null);
    // Shares its React Query cache key with the same hook inside CustomerAddresses below, so
    // setting a new default there refetches here too and the form picks it up automatically.
    const { data: addresses = [] } = useCustomerAddresses(isEditMode ? customerId : null);
    const defaultAddress = addresses.find((a) => a.isDefault) ?? null;

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

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <CustomerForm
                    customer={isEditMode ? customer : undefined}
                    defaultAddress={isEditMode ? defaultAddress : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />

                {/* Saved addresses need a real CustomerId, so this only appears once the customer
                    record itself exists — a brand-new customer manages addresses after saving. */}
                {isEditMode && customer && <CustomerAddresses customerId={customer.id} />}
            </div>
        </div>
    );
};
