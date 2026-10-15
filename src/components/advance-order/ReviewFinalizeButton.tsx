// components/advance-order/ReviewFinalizeButton.tsx — Shop 7 confirmed advance order (no invoice yet): open the existing
// review page to adjust the prepared jewellery and generate the invoice. Shown only when the server sets canFinalize.

import { ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  orderId: number;
  className?: string;
}

export const ReviewFinalizeButton = ({ orderId, className }: Props) => {
  const navigate = useNavigate();

  return (
    <Button
      size="sm"
      className={cn("bg-blue-600 hover:bg-blue-700", className)}
      onClick={() => navigate(`/admin/sale/advance/${orderId}`)}
    >
      <ClipboardCheck className="w-4 h-4 mr-1" />
      Review &amp; Finalize
    </Button>
  );
};
