// components/forms/Stock-Entry/StockEntryFormPage.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useStockEntry } from "@/hooks/useStockEntry";
import { StockEntryForm } from "./StockEntryForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const StockEntryFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.pathname.includes("/edit/");

  const stockEntryId = id ?? null;

  const shouldFetch = isEditMode && stockEntryId !== null;

  const { data: stockEntry, isLoading } = useStockEntry(
    shouldFetch ? stockEntryId : null
  );

  const handleSuccess = (message: string) => {
    toast.success(message);
    navigate("/admin/stock");
  };

  const handleRedirect = () => {
    navigate("/admin/stock");
  };

  const handleCancel = () => {
    navigate("/admin/stock");
  };

  if (isEditMode && shouldFetch && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isEditMode && shouldFetch && !isLoading && !stockEntry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-xl text-gray-600">Stock entry not found</p>
        <Button onClick={handleCancel} className="mt-4">
          Back to Stock Entries
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <PageHeader
        title={
          isEditMode && stockEntry
            ? `Edit Stock Entry - ${stockEntry.tagNumber}`
            : "Create New Stock Entry"
        }
        icon={<FileText className="w-7 h-7 text-[#b08d28]" />}
        onBack={handleCancel}
        subtitle={
          isEditMode && stockEntry ? (
            <>
              Item: <strong>{stockEntry.itemName}</strong> • Vendor:{" "}
              <strong>{stockEntry.vendor?.name}</strong> • Quantity:{" "}
              <strong>{stockEntry.quantity}</strong> • Net Weight:{" "}
              <strong>{stockEntry.netWeight.toFixed(3)}g</strong>
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
        <StockEntryForm
          stockEntry={shouldFetch ? stockEntry : undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          onRedirect={handleRedirect}
        />
      </div>
    </div>
  );
};