// pages/porter/PorterFormPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Truck, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePorter } from "@/hooks/usePorter";
import { PorterForm } from "./PorterForm";

export const PorterFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const porterId = id ? Number(id) : null;
  const isEditMode = !!porterId;

  const { data: porter, isLoading } = usePorter(isEditMode ? porterId : null);

  const handleSuccess = (msg: string) => {
    toast.success(msg);
    navigate("/admin/porter");
  };

  const handleCancel = () => {
    navigate("/admin/porter");
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isEditMode && !isLoading && !porter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-xl text-gray-600">Porter not found</p>
        <Button onClick={handleCancel} className="mt-4">
          Back to Porters
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title={
          isEditMode
            ? `Edit Porter - ${porter?.name || ""}`
            : "Create New Porter"
        }
        icon={<Truck className="w-7 h-7 text-[#b08d28]" />}
        onBack={handleCancel}
        rightActions={
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <PorterForm
          porter={isEditMode ? porter : undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};