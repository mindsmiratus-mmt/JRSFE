// components/forms/EmailTemplate/EmailPreviewDialog.tsx — large modal showing a rendered email preview (never sends)
import { useState } from "react";
import { Loader2, Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { EmailTemplatePreview } from "@/hooks/useEmailTemplate";

type Device = "desktop" | "mobile";

interface Props {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  preview: EmailTemplatePreview | null;
  errors: string[];
}

export const EmailPreviewDialog = ({ open, onClose, loading, preview, errors }: Props) => {
  const [device, setDevice] = useState<Device>("desktop");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] w-[90vw] max-w-none flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
          <div>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription className="mt-1 text-amber-700">
              Preview only — no email is sent. Each placeholder shows as [name].
            </DialogDescription>
          </div>
          <div className="flex rounded-md border p-0.5">
            <Button type="button" size="sm" variant={device === "desktop" ? "default" : "ghost"} onClick={() => setDevice("desktop")}>
              <Monitor className="mr-1 h-4 w-4" /> Desktop
            </Button>
            <Button type="button" size="sm" variant={device === "mobile" ? "default" : "ghost"} onClick={() => setDevice("mobile")}>
              <Smartphone className="mr-1 h-4 w-4" /> Mobile
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> Rendering preview…
          </div>
        ) : errors.length > 0 ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-2 font-medium">The template cannot be rendered:</p>
            <ul className="list-disc space-y-1 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        ) : preview ? (
          <>
            <p className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-500">Subject:</span> <span className="font-medium">{preview.subject}</span>
            </p>
            <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-md border bg-gray-100 p-3">
              {/* sandbox="" — no scripts, forms, navigation or same-origin access for the previewed HTML */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className={`h-full rounded border bg-white ${device === "mobile" ? "w-[390px]" : "w-full"}`}
              />
            </div>
          </>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
