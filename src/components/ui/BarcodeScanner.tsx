import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScanned = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    hasScanned.current = false;

    let cancelled = false;

    const startScanner = () => {
      if (cancelled) return;

      const containerId = "barcode-scanner-region";
      const container = document.getElementById(containerId);

      // If the div is not in the DOM yet, try again shortly
      if (!container) {
        pollTimeoutRef.current = window.setTimeout(startScanner, 100);
        return;
      }

      const html5Qrcode = new Html5Qrcode(containerId);
      scannerRef.current = html5Qrcode;

      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
          },
          (decodedText /*, decodedResult */) => {
            if (hasScanned.current) return;
            hasScanned.current = true;

            console.log("Scanned text:", decodedText);
            onScan(decodedText);

            // Just close dialog; cleanup stops scanner
            onClose();
          },
          () => {
            // per-frame decode failure; ignore
          }
        )
        .catch((err) => {
          console.error("Camera start failed:", err);
        });
    };

    startScanner();

    return () => {
      cancelled = true;

      if (pollTimeoutRef.current !== null) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      const scanner = scannerRef.current;
      if (!scanner) return;

      try {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch((err) => {
            console.warn("Scanner stop/clear error:", err);
          });
      } catch (e) {
        console.warn("Synchronous scanner stop error:", e);
      } finally {
        scannerRef.current = null;
      }
    };
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm"
        aria-describedby={undefined} // avoids Radix warning
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Scan Jewellery Tag
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 text-center -mt-2">
          Point the camera at the barcode on the tag
        </p>

        <div
          id="barcode-scanner-region"
          className="w-full overflow-hidden rounded-lg border border-slate-200 bg-black min-h-[200px]"
        />

        <p className="text-xs text-center text-gray-400">
          Scanner will close automatically after a successful read
        </p>
      </DialogContent>
    </Dialog>
  );
}