// pages/DeliveryPartners.tsx — Delivery Partner (courier) master (Admin only).
// Partners are data: a new courier is added here, never in code. No courier API is called yet — the
// tracking URL and API key are stored for a future integration. The API key is write-only.
import { useState } from "react";
import { Edit, Loader2, PackageCheck, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommonTable, type Column } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateDeliveryPartner,
  useDeliveryPartners,
  useUpdateDeliveryPartner,
  type DeliveryPartner,
} from "@/hooks/useDeliveryPartner";
import { apiErrors } from "@/utils/emailTemplate";
import { getModulePermissions } from "@/utils/permission";

export const DeliveryPartners = () => {
  const { permissions, user } = useAuth();
  const { isAdmin } = getModulePermissions(permissions, user, "Delivery Partners");
  const { data: partners = [], isLoading, isError } = useDeliveryPartners();
  const [editing, setEditing] = useState<DeliveryPartner | "new" | null>(null);

  if (!isAdmin) {
    return <div className="p-6 text-gray-600">Delivery partners can only be managed by an administrator.</div>;
  }

  const columns: Column<DeliveryPartner>[] = [
    { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "trackingUrl",
      label: "Tracking URL",
      render: (r) => <span className="break-all text-xs text-gray-600">{r.trackingUrl || "-"}</span>,
    },
    { key: "hasApiKey", label: "API Key", render: (r) => (r.hasApiKey ? "Stored" : "-") },
    {
      key: "isActive",
      label: "Active",
      render: (r) =>
        r.isActive ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
        ),
    },
    {
      key: "updateDate",
      label: "Updated",
      render: (r) => (
        <span className="text-xs text-gray-600">
          {new Date(r.updateDate ?? r.createDate).toLocaleString()} · {r.updatedBy ?? r.createdBy}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        fullWidth
        title="Delivery Partners"
        subtitle="Couriers staff can choose when recording courier details on advance orders."
        icon={<PackageCheck className="w-7 h-7 text-[#b08d28]" />}
        rightActions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New Partner
          </Button>
        }
      />
      <div className="w-full p-4 sm:p-6">
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Delivery partners could not be loaded.</div>
        ) : (
          <CommonTable<DeliveryPartner>
            columns={columns}
            data={partners}
            loading={isLoading}
            emptyMessage="No delivery partners."
            actions={[
              {
                label: "Edit",
                tooltip: "Edit partner",
                variant: "ghost",
                icon: <Edit className="h-4 w-4" />,
                onClick: (r) => setEditing(r),
              },
            ]}
          />
        )}
      </div>

      {editing && (
        <DeliveryPartnerDialog partner={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

const DeliveryPartnerDialog = ({ partner, onClose }: { partner: DeliveryPartner | null; onClose: () => void }) => {
  const create = useCreateDeliveryPartner();
  const update = useUpdateDeliveryPartner();
  const saving = create.isPending || update.isPending;

  const [name, setName] = useState(partner?.name ?? "");
  const [trackingUrl, setTrackingUrl] = useState(partner?.trackingUrl ?? "");
  const [isActive, setIsActive] = useState(partner?.isActive ?? true);
  // Write-only: left empty, the stored key is kept; "Remove" clears it.
  const [apiKey, setApiKey] = useState("");
  const [removeApiKey, setRemoveApiKey] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    if (!name.trim()) {
      setErrors(["Name is required."]);
      return;
    }
    const data = {
      name: name.trim(),
      trackingUrl: trackingUrl.trim(),
      isActive,
      apiKey: removeApiKey ? "" : apiKey.trim() || undefined,
    };
    const options = {
      onSuccess: () => {
        toast.success(partner ? "Delivery partner updated." : "Delivery partner created.");
        onClose();
      },
      onError: (error: unknown) => setErrors(apiErrors(error)),
    };
    if (partner) update.mutate({ id: partner.id, data }, options);
    else create.mutate(data, options);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{partner ? "Edit Delivery Partner" : "New Delivery Partner"}</DialogTitle>
          <DialogDescription>No courier API is called yet; the tracking URL and API key are kept for a future integration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="partner-name">Name</Label>
            <Input id="partner-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Blue Dart" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-url">Tracking URL (optional)</Label>
            <Input
              id="partner-url"
              value={trackingUrl}
              maxLength={500}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://…?trackNo={trackingNumber}"
            />
            <p className="text-xs text-gray-500">Public https address; {"{trackingNumber}"} stands for the tracking number.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-key">API Key / Token (optional)</Label>
            <Input
              id="partner-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              disabled={removeApiKey}
              maxLength={500}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={partner?.hasApiKey ? "Stored — leave empty to keep it" : "Not set"}
            />
            {partner?.hasApiKey && (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={removeApiKey} onChange={(e) => setRemoveApiKey(e.target.checked)} />
                Remove the stored API key
              </label>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Switch id="partner-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="partner-active" className="cursor-pointer">
              Active (selectable for new courier details)
            </Label>
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
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
