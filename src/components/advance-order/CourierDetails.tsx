// components/advance-order/CourierDetails.tsx
//
// Courier details of one Shop 7 advance order (the server sets canManageCourier for Orders.ShopId == 7 advance orders):
// summary, Add / Edit Courier Details, Mark Delivered. Operator-entered only — no courier API. The server
// enforces every rule (advance order, ShopId 7, not cancelled, locked once delivered); this component only
// hides what the server would reject. Dates are IST wall-clock values from datetime-local inputs, sent as is.
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Pencil, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  useActiveDeliveryPartners,
  useMarkDelivered,
  useSaveCourierDetails,
  type CourierSaveResponse,
} from "@/hooks/useDeliveryPartner";
import { apiErrors } from "@/utils/emailTemplate";
import { hasCourierSection, type CourierOrder } from "./courier";

const DISPLAY_FORMAT = "dd/MM/yyyy HH:mm";
const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : format(d, DISPLAY_FORMAT);
};

/** "2026-10-07T15:45:00" (IST from the API) → "2026-10-07T15:45" for a datetime-local input. */
const toInputValue = (value?: string | null) => (value ? value.slice(0, 16) : "");

const nowInputValue = () => format(new Date(), INPUT_FORMAT);

const notifiedText = (r: CourierSaveResponse) => {
  const channels = [r.notifications.emailQueued && "email", r.notifications.whatsAppQueued && "WhatsApp"].filter(Boolean);
  return channels.length > 0 ? ` Customer notified by ${channels.join(" and ")}.` : "";
};

interface Props {
  order: CourierOrder;
  /** Card layout (grid view) instead of the compact table cell. */
  variant?: "cell" | "card";
}

export const CourierDetails = ({ order, variant = "cell" }: Props) => {
  const [courierOpen, setCourierOpen] = useState(false);
  const [deliveredOpen, setDeliveredOpen] = useState(false);

  if (!hasCourierSection(order)) return null;

  const isDispatched = !!order.dispatchedOn && !!order.trackingNumber;
  const isDelivered = !!order.deliveredOn;
  const canEdit = !!order.canManageCourier && !isDelivered;

  const details = isDispatched ? (
    <div className="space-y-0.5 text-xs text-gray-700">
      <div>
        <span className="text-gray-500">Courier:</span> <span className="font-medium">{order.deliveryPartnerName || "-"}</span>
      </div>
      <div>
        <span className="text-gray-500">Tracking Number:</span>{" "}
        <span className="font-mono font-medium">{order.trackingNumber}</span>
      </div>
      <div>
        <span className="text-gray-500">Dispatched On:</span> {formatDateTime(order.dispatchedOn)}
      </div>
      {isDelivered && (
        <div className="pt-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>{" "}
          <span className="text-gray-600">{formatDateTime(order.deliveredOn)}</span>
        </div>
      )}
    </div>
  ) : (
    <div className="text-xs text-gray-500">Not dispatched</div>
  );

  const actions = canEdit && (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setCourierOpen(true)}>
        {isDispatched ? <Pencil className="mr-1 h-4 w-4" /> : <Truck className="mr-1 h-4 w-4" />}
        {isDispatched ? "Edit Courier Details" : "Add Courier Details"}
      </Button>
      {isDispatched && (
        <Button size="sm" onClick={() => setDeliveredOpen(true)}>
          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark Delivered
        </Button>
      )}
    </div>
  );

  return (
    <>
      {variant === "card" ? (
        <div className="space-y-2 rounded-lg border bg-gray-50/60 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-gray-500">
            <Truck className="h-3.5 w-3.5" /> Courier
          </div>
          {details}
          {actions}
        </div>
      ) : (
        <div className="min-w-[200px] space-y-2">
          {details}
          {actions}
        </div>
      )}

      {courierOpen && <CourierDetailsDialog order={order} onClose={() => setCourierOpen(false)} />}
      {deliveredOpen && <MarkDeliveredDialog order={order} onClose={() => setDeliveredOpen(false)} />}
    </>
  );
};

const CourierDetailsDialog = ({ order, onClose }: { order: CourierOrder; onClose: () => void }) => {
  const { data: partners = [], isLoading: partnersLoading } = useActiveDeliveryPartners();
  const save = useSaveCourierDetails();
  const isEdit = !!order.trackingNumber;

  const [partnerId, setPartnerId] = useState<string>(order.deliveryPartnerId ? String(order.deliveryPartnerId) : "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [dispatchedOn, setDispatchedOn] = useState(toInputValue(order.dispatchedOn) || nowInputValue());
  const [errors, setErrors] = useState<string[]>([]);

  // A single active partner (today: Blue Dart) is preselected for a new assignment.
  const selectedPartnerId = partnerId || (!isEdit && partners.length === 1 ? String(partners[0].id) : "");
  const assignedPartnerInactive = isEdit && !!order.deliveryPartnerId && !partners.some((p) => p.id === order.deliveryPartnerId);

  const submit = () => {
    const local: string[] = [];
    if (!selectedPartnerId) local.push("Select a delivery partner.");
    if (!trackingNumber.trim()) local.push("Tracking number is required.");
    if (!dispatchedOn) local.push("Dispatched on is required.");
    setErrors(local);
    if (local.length > 0) return;

    save.mutate(
      { orderId: order.id, deliveryPartnerId: Number(selectedPartnerId), trackingNumber: trackingNumber.trim(), dispatchedOn },
      {
        onSuccess: (r) => {
          toast.success(`Courier details saved.${notifiedText(r)}`);
          onClose();
        },
        onError: (error) => setErrors(apiErrors(error)),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Courier Details" : "Add Courier Details"}</DialogTitle>
          <DialogDescription>{order.orderNo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="courier-partner">Delivery Partner</Label>
            <select
              id="courier-partner"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedPartnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={partnersLoading}
            >
              <option value="">{partnersLoading ? "Loading…" : "Select delivery partner"}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {assignedPartnerInactive && (
              <p className="text-xs text-amber-700">
                {order.deliveryPartnerName} is no longer active; choose an active partner to save changes.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courier-tracking">Tracking Number</Label>
            <Input
              id="courier-tracking"
              value={trackingNumber}
              maxLength={50}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Waybill / tracking number"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courier-dispatched">Dispatched On</Label>
            <Input
              id="courier-dispatched"
              type="datetime-local"
              value={dispatchedOn}
              max={nowInputValue()}
              onChange={(e) => setDispatchedOn(e.target.value)}
            />
          </div>

          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MarkDeliveredDialog = ({ order, onClose }: { order: CourierOrder; onClose: () => void }) => {
  const markDelivered = useMarkDelivered();
  const [deliveredOn, setDeliveredOn] = useState(nowInputValue());
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    if (!deliveredOn) {
      setErrors(["Delivery date is required."]);
      return;
    }
    markDelivered.mutate(
      { orderId: order.id, deliveredOn },
      {
        onSuccess: (r) => {
          toast.success(`Order marked delivered.${notifiedText(r)}`);
          onClose();
        },
        onError: (error) => setErrors(apiErrors(error)),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !markDelivered.isPending && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Mark Delivered</DialogTitle>
          <DialogDescription>
            {order.orderNo} · {order.deliveryPartnerName} {order.trackingNumber}. Courier details are locked once the
            order is delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="courier-delivered">Delivery Date</Label>
          <Input
            id="courier-delivered"
            type="datetime-local"
            value={deliveredOn}
            min={toInputValue(order.dispatchedOn)}
            max={nowInputValue()}
            onChange={(e) => setDeliveredOn(e.target.value)}
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={markDelivered.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={markDelivered.isPending}>
            {markDelivered.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Mark Delivered
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
