// components/advance-order/ConfirmPaymentButton.tsx — Shop 7 advance order: confirm the advance already paid.
// Shown only when the server sets canConfirmPayment (PendingPayment, fully paid, no invoice). No new payment is
// taken: POST api/order/{id}/confirm-payment creates the invoice, sets Confirmed and emails OrderConfirmation.

import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useConfirmAdvancePayment } from "@/hooks/useOrder";

interface Props {
  orderId: number;
  orderNo?: string;
  className?: string;
}

export const ConfirmPaymentButton = ({ orderId, orderNo, className }: Props) => {
  const confirm = useConfirmAdvancePayment();

  const onClick = () =>
    confirm.mutate(orderId, {
      onSuccess: () => toast.success(`Payment confirmed for ${orderNo ?? "the order"}. Invoice generated.`),
      onError: (error: unknown) =>
        toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to confirm payment. Please try again."),
    });

  return (
    <Button size="sm" className={cn("bg-amber-600 hover:bg-amber-700", className)} onClick={onClick} disabled={confirm.isPending}>
      {confirm.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
      Confirm Payment
    </Button>
  );
};
