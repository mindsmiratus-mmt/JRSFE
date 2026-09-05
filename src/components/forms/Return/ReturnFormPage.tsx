 import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReturnForm } from "./ReturnForm"; 
import { PageHeader } from "@/components/ui/PageHeader";

export const ReturnFormPage = () => {
    const navigate = useNavigate();

    const handleCancel = () => {
        // Navigates back to the list view we created earlier
        navigate("/admin/return");
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <PageHeader
                title="Create New Return"
                icon={<RotateCcw className="w-7 h-7 text-blue-600" />}
                onBack={handleCancel}
                subtitle="Process a customer return and calculate refund amount"
                rightActions={
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto p-6">
                {/* 
                  Passing only onCancel. 
                  Removed editOrderId since Returns won't have an edit mode for now.
                */}
                <ReturnForm onCancel={handleCancel} />
            </div>
        </div>
    );
};