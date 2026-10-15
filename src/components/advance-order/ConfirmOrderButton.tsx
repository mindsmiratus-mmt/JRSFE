// components/advance-order/ConfirmOrderButton.tsx — Shop 7 advance order: confirm the order, preparation starts.
// Shown only when the server sets canConfirmOrder (PendingPayment, fully paid, no invoice). POST api/order/{id}/confirm-order
// sets Confirmed and notifies the customer (OrderConfirmation email + OrderConfirmed WhatsApp). No invoice, no payment.

import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useConfirmAdvanceOrder } from "@/hooks/useOrder";

interface Props {
  orderId: number;
  orderNo?: string;
  className?: string;
}

export const ConfirmOrderButton = ({ orderId, orderNo, className }: Props) => {
  const confirm = useConfirmAdvanceOrder();

  const onClick = () =>
    confirm.mutate(orderId, {
      onSuccess: () => toast.success(`${orderNo ?? "The order"} confirmed. Customer notified.`),
      onError: (error: unknown) =>
        toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to confirm the order. Please try again."),
    });

  return (
    <Button size="sm" className={cn("bg-amber-600 hover:bg-amber-700", className)} onClick={onClick} disabled={confirm.isPending}>
      {confirm.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
      Confirm Order
    </Button>
  );
};
