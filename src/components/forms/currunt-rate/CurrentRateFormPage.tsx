// pages/currentRate/CurrentRateFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCurrentRate } from "@/hooks/useCurruntrate";
import { PageHeader } from "@/components/ui/PageHeader";
import { CurrentRateForm } from "./CurrentRateForm";

export const CurrentRateFormPage = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes("/edit/");
    const rateId = id ? id : null;
    const { data: currentRate, isLoading } = useCurrentRate(isEditMode ? rateId : null);

    const handleSuccess = (message: string) => {
        toast.success(message);
        navigate("/admin/currentrate");
    };

    const handleCancel = () => {
        navigate("/admin/currentrate");
    };

    // Loading
    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    // Not found
    if (isEditMode && !isLoading && !currentRate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full">
                <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Current rate not found</p>
                <Button onClick={handleCancel} className="mt-4">
                    Back to Current Rates
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <PageHeader
                title={
                    isEditMode
                        ? `Edit Current Rate - ${currentRate?.description}`
                        : "Add New Current Rate"
                }
                // icon={<DollarSign className="w-7 h-7 text-[#b08d28]" />}
                onBack={handleCancel}
                subtitle={
                    isEditMode && currentRate ? (
                        <>
                            Rate: <strong>{currentRate.rate} /{currentRate.unit}</strong> •{" "}
                            Metal: <strong>{currentRate.metalType}</strong> •{" "}
                            Purity: <strong>{currentRate.purity}</strong>
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
                <CurrentRateForm
                    currentRate={isEditMode ? currentRate : undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};  