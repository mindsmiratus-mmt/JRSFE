// pages/stockTransfer/StockTransferFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Truck, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { useStockTransfer } from "@/hooks/useStockTransfer";
import { StockTransferForm } from "./StockTransferForm";

export const StockTransferFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const transferId = id ? Number(id) : null;
  
  // Determine modes based on the current URL path
  const isViewMode = location.pathname.includes("/view/");
  const isEditMode = location.pathname.includes("/edit/");
  const hasId = !!transferId; // Used to determine if we need to fetch data

  const { data: stockTransfer, isLoading } = useStockTransfer(
    hasId ? transferId : null
  );

  const handleSuccess = (msg: string) => {
    toast.success(msg);
    navigate("/admin/stock-transfer");
  };

  const handleCancel = () => {
    navigate("/admin/stock-transfer");
  };

  if (hasId && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (hasId && !isLoading && !stockTransfer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-xl text-gray-600">Stock transfer not found</p>
        <Button onClick={handleCancel} className="mt-4">
          Back to Stock Transfers
        </Button>
      </div>
    );
  }

  const getPageTitle = () => {
    if (isViewMode) return `View Stock Transfer - ${stockTransfer?.transferNumber || ""}`;
    if (isEditMode) return `Edit Stock Transfer - ${stockTransfer?.transferNumber || ""}`;
    return "Create New Stock Transfer";
  };

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title={getPageTitle()}
        icon={<Truck className="w-7 h-7 text-[#b08d28]" />}
        onBack={handleCancel}
        rightActions={
          <Button variant="outline" onClick={handleCancel}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <StockTransferForm
          stockTransfer={hasId ? stockTransfer : undefined}
          isEditMode={isEditMode}
          isViewMode={isViewMode}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};