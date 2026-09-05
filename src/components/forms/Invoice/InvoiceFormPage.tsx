// pages/invoice/InvoiceFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useInvoice } from "@/hooks/useInvoice";
import { InvoiceForm } from "./InvoiceForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const InvoiceFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const invoiceId = id ? Number(id) : null;
    const { data: invoice, isLoading } = useInvoice(isEditMode ? invoiceId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/invoice");
    };

    const handleCancel = () => {
        navigate("/admin/invoice");
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
    if (isEditMode && !isLoading && !invoice) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Invoice not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Invoices
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Invoice - ${invoice?.invoiceNo}`
                        : "Create New Invoice"
                }
                icon={<FileText className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && invoice ? (
                        <>
                            Customer: <strong>{invoice.customer.name}</strong> •{" "}
                            Total:{" "}
                            <strong>
                                ₹{invoice.totalAmount.toLocaleString("en-IN")}
                            </strong>{" "}
                            • Status:{" "}
                            <strong
                                className={
                                    invoice.status === "PAID"
                                        ? "text-green-600"
                                        : invoice.status === "PARTIAL"
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                }
                            >
                                {invoice.status}
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
                <InvoiceForm
                    invoice={isEditMode ? invoice : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};
