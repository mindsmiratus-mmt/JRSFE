// components/advance-order/BoxSlipButton.tsx
//
// Print Box Slip for a Shop 7 advance order (the server sets canPrintBoxSlip: Confirmed, Shipped or Delivered).
// Read-only: loads GET api/order/{id}/box-slip, previews the slip and prints it from a separate window so only the
// slip is printed (same isolated-window approach as Print Tag). Printing changes nothing on the order.
// Simple parcel label: SHIP TO (the order's address), SHIP FROM (the order's shop — also the return address), order
// references. The logo is the shop's invoice logo (JRS api/public/images/shops/{shopId}/logo); the advance order list is
// loaded for the selected shop, so that is the order's shop. Without a logo the header shows the shop name only.
import { useRef, useState } from "react";
import Barcode from "react-barcode";
import { AlertTriangle, Loader2, Package, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axios";
import { useBoxSlip, type BoxSlip, type BoxSlipParty } from "@/hooks/useDeliveryPartner";
import { apiErrors } from "@/utils/emailTemplate";

const shopLogoUrl = (shopId: number) => `${api.defaults.baseURL}/public/images/shops/${shopId}/logo`;

// Plain CSS (not Tailwind) so the same rules style the preview and the print window. Text stays black/dark for
// black-and-white printers; the gold rule and icon tile are accents only and print as grey.
const SLIP_CSS = `
.box-slip { box-sizing: border-box; width: 100%; max-width: 150mm; margin: 0 auto; padding: 14px 16px;
  border: 1px solid #c9c2b4; border-radius: 10px; background: #fff; color: #111;
  font-family: "Segoe UI", Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.45;
  break-inside: avoid; page-break-inside: avoid; }
.box-slip * { box-sizing: border-box; }
.box-slip .head { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 2.5px solid #b8963e; }
.box-slip .logo { width: 64px; height: 64px; flex: none; border: 1px solid #e3ded3; border-radius: 8px; padding: 4px;
  display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff; }
.box-slip .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.box-slip .brand { flex: 1; min-width: 0; }
.box-slip .brand .title { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; color: #1d3326; text-transform: uppercase; }
.box-slip .brand .sub { font-size: 10.5px; letter-spacing: 0.1em; color: #555; text-transform: uppercase; margin-top: 2px; }
.box-slip .icon { width: 40px; height: 40px; flex: none; border-radius: 8px; background: #f3e6bd; color: #6b5420;
  display: flex; align-items: center; justify-content: center; }
.box-slip .icon svg { width: 22px; height: 22px; }
.box-slip .card { border: 1px solid #c9c2b4; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
.box-slip .label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: #555; text-transform: uppercase; margin-bottom: 6px; }
.box-slip .name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.box-slip .to .name { font-size: 19px; }
.box-slip .to .addr { font-size: 15.5px; }
.box-slip .line { margin-top: 2px; }
.box-slip .refs { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 12px; }
.box-slip .refs .order { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
.box-slip .refs .invoice { color: #444; margin-top: 2px; }
.box-slip .barcode { text-align: right; flex: none; max-width: 55%; }
.box-slip .barcode svg { max-width: 100%; height: auto; display: block; margin-left: auto; }
.box-slip .barcode .cap { font-size: 10.5px; color: #444; margin-top: 2px; }
.box-slip .care { text-align: center; font-weight: 700; letter-spacing: 0.14em; font-size: 14px; color: #1d3326;
  margin-top: 12px; padding-top: 10px; border-top: 1px solid #c9c2b4; }
.box-slip .missing { font-weight: 700; font-style: italic; }
`;

const cityLine = (p: BoxSlipParty) =>
  [[p.city, p.state].filter(Boolean).join(", "), p.pinCode].filter(Boolean).join(" – ");

const AddressLines = ({ party }: { party: BoxSlipParty }) => (
  <>
    {party.addressLine1 && <div className="line">{party.addressLine1}</div>}
    {party.addressLine2 && <div className="line">{party.addressLine2}</div>}
    {party.landmark && <div className="line">Landmark: {party.landmark}</div>}
    {cityLine(party) && <div className="line">{cityLine(party)}</div>}
    {party.country && party.country.toLowerCase() !== "india" && <div className="line">{party.country}</div>}
  </>
);

const Slip = ({ slip, logoUrl }: { slip: BoxSlip; logoUrl?: string }) => {
  const { sender, deliverTo } = slip;
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoUrl && !logoFailed;

  return (
    <div className="box-slip">
      <div className="head">
        {showLogo && (
          <div className="logo">
            <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} />
          </div>
        )}
        <div className="brand">
          <div className="title">{sender.name || <span className="missing">Shop name missing</span>}</div>
          <div className="sub">Jewellery Parcel</div>
        </div>
        <div className="icon">
          <Package />
        </div>
      </div>

      <div className="card to">
        <div className="label">Ship To</div>
        {deliverTo ? (
          <>
            <div className="name">{deliverTo.name || <span className="missing">Recipient name missing</span>}</div>
            <div className="addr">
              <AddressLines party={deliverTo} />
              {deliverTo.phone && <div className="line">Mobile: {deliverTo.phone}</div>}
            </div>
          </>
        ) : (
          <div className="missing">No delivery address recorded for this order.</div>
        )}
      </div>

      {/* The order's shop: sender and return address. */}
      <div className="card">
        <div className="label">Ship From · Return Address</div>
        <div className="name">{sender.name || <span className="missing">Shop name missing</span>}</div>
        <AddressLines party={sender} />
        {sender.phone && <div className="line">Phone: {sender.phone}</div>}
      </div>

      <div className="refs">
        <div>
          <div className="label">Order Number</div>
          <div className="order">{slip.orderNo}</div>
          {slip.invoiceNo && <div className="invoice">Invoice: {slip.invoiceNo}</div>}
        </div>
        <div className="barcode">
          <Barcode
            value={slip.orderNo}
            format="CODE128"
            width={1.4}
            height={40}
            displayValue={false}
            margin={0}
            background="#ffffff"
            lineColor="#000000"
          />
          <div className="cap">Order reference</div>
        </div>
      </div>

      <div className="care">HANDLE WITH CARE</div>
    </div>
  );
};

/** Opens a window holding only the slip and prints it once its images settle. False when the browser blocked the window. */
const printSlip = (node: HTMLElement) => {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Box Slip</title>
<style>${SLIP_CSS}
@page { size: A4 portrait; margin: 12mm; }
html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${node.outerHTML}</body></html>`);
  win.document.close();
  win.onafterprint = () => win.close();
  win.focus();

  // Wait for the logo (cached from the preview, so normally instant); a missing logo never blocks printing.
  const pending = Array.from(win.document.images)
    .filter((img) => !img.complete)
    .map((img) => new Promise<void>((resolve) => {
      img.onload = img.onerror = () => resolve();
    }));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  Promise.race([Promise.all(pending), timeout]).then(() => setTimeout(() => win.print(), 100));
  return true;
};

interface Props {
  orderId: number;
  orderNo?: string;
}

export const BoxSlipButton = ({ orderId, orderNo }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" title="Print Box Slip" onClick={() => setOpen(true)}>
        <Package className="mr-1 h-4 w-4" />
        Box Slip
      </Button>
      {open && <BoxSlipDialog orderId={orderId} orderNo={orderNo} onClose={() => setOpen(false)} />}
    </>
  );
};

const BoxSlipDialog = ({ orderId, orderNo, onClose }: Props & { onClose: () => void }) => {
  const { data: slip, isLoading, error } = useBoxSlip(orderId, true);
  const { selectedShop } = useAuth();
  const slipRef = useRef<HTMLDivElement>(null);
  const logoUrl = selectedShop?.id ? shopLogoUrl(selectedShop.id) : undefined;

  const print = () => {
    const node = slipRef.current?.querySelector<HTMLElement>(".box-slip");
    if (!node) return;
    if (!printSlip(node)) toast.error("The print window was blocked. Allow pop-ups for this site and try again.");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="2xl" className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Box Slip</DialogTitle>
          <DialogDescription>{orderNo} · Printing does not change the order.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading slip…
          </div>
        ) : error || !slip ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(error ? apiErrors(error) : ["The box slip could not be loaded."]).map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        ) : (
          <>
            {slip.warnings.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="mb-1 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Check before printing
                </div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {slip.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <style>{SLIP_CSS}</style>
            <div ref={slipRef} className="overflow-x-auto">
              <Slip slip={slip} logoUrl={logoUrl} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={print} disabled={!slip}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
