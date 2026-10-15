// components/advance-order/courier.ts — courier fields of an advance order row (JRS order list).

export interface CourierOrder {
  id: number;
  orderNo?: string;
  /** Server-computed: Shop 7 advance order, Confirmed or Shipped (the server enforces the same rule on save). */
  canManageCourier?: boolean;
  deliveryPartnerId?: number | null;
  deliveryPartnerName?: string | null;
  trackingNumber?: string | null;
  dispatchedOn?: string | null;
  deliveredOn?: string | null;
}

/** True when the order has courier details to show or may get them. */
export const hasCourierSection = (order: CourierOrder) => !!order.canManageCourier || !!order.trackingNumber;
