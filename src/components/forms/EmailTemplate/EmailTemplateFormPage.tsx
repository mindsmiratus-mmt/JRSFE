// components/forms/EmailTemplate/EmailTemplateFormPage.tsx — create / edit one Email Template Master row (Admin only)
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Loader2, Mail, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  usePreviewEmailTemplate,
  useUpdateEmailTemplate,
  type EmailTemplate,
  type EmailTemplatePreview,
} from "@/hooks/useEmailTemplate";
import { apiErrors, apiStatus } from "@/utils/emailTemplate";
import { EmailPreviewDialog } from "./EmailPreviewDialog";

/** Same rule as JRS EmailTemplateService.TemplateKeyPattern. */
const TEMPLATE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;

export const EmailTemplateFormPage = () => {
  const { key } = useParams<{ key?: string }>();
  const isEdit = !!key;
  /** New template prefilled from an existing one (list → Duplicate). */
  const [searchParams] = useSearchParams();
  const duplicateOf = isEdit ? null : searchParams.get("from");
  const navigate = useNavigate();
  const { permissions, user } = useAuth();
  const { isAdmin } = getModulePermissions(permissions, user, "Email Templates");

  const { data: template, isLoading, refetch } = useEmailTemplate(isEdit ? key! : duplicateOf);
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate(key ?? "");
  const preview = usePreviewEmailTemplate();

  const [templateKey, setTemplateKey] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [version, setVersion] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<EmailTemplatePreview | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  const load = (t: EmailTemplate) => {
    setTemplateKey(t.templateKey);
    setTemplateName(t.templateName);
    setMailSubject(t.mailSubject);
    setHtmlBody(t.htmlBody);
    setIsActive(t.isActive);
    setVersion(t.version);
    setErrors([]);
    setConflict(false);
  };

  // Load the form when the fetched template arrives or changes (adjusting state during render, not in an effect).
  const [loadedFrom, setLoadedFrom] = useState<EmailTemplate | null>(null);
  if (template && template !== loadedFrom) {
    setLoadedFrom(template);
    load(template);
    if (!isEdit) {
      // Duplicate: a new, inactive template with the same content; key and name are edited before saving.
      setTemplateKey(`${template.templateKey}Copy`.slice(0, 64));
      setTemplateName(`${template.templateName} - Copy`);
      setIsActive(false);
      setVersion(1);
    }
  }

  const trimmedKey = templateKey.trim();
  const keyError = isEdit ? null
    : !trimmedKey ? "Template Key is required."
    : !TEMPLATE_KEY_PATTERN.test(trimmedKey) ? "Template Key must be 2–64 characters: a letter, then letters, digits or underscores."
    : null;

  const save = async () => {
    setErrors([]);
    setConflict(false);
    if (keyError) {
      setErrors([keyError]);
      return;
    }
    // Placeholders are free-form: JRS checks the template fields only, never what a placeholder means.
    const input = { templateName, mailSubject, htmlBody, isActive };
    try {
      if (isEdit) {
        const saved = await update.mutateAsync({ ...input, version });
        load(saved);
        toast.success(`Saved ${saved.templateKey} (v${saved.version})`);
      } else {
        const saved = await create.mutateAsync({ ...input, templateKey: trimmedKey });
        toast.success(`Created ${saved.templateKey}`);
        navigate(`/admin/email-templates/edit/${encodeURIComponent(saved.templateKey)}`, { replace: true });
      }
    } catch (error) {
      if (isEdit && apiStatus(error) === 409) setConflict(true);
      setErrors(apiErrors(error));
    }
  };

  /** Previews the current form values — saving first is not needed. */
  const runPreview = async () => {
    setPreviewResult(null);
    setPreviewErrors([]);
    setPreviewOpen(true);
    try {
      setPreviewResult(await preview.mutateAsync({ mailSubject, htmlBody }));
    } catch (error) {
      setPreviewErrors(apiErrors(error));
    }
  };

  if (!isAdmin) return <div className="p-6 text-gray-600">Email templates can only be managed by an administrator.</div>;

  if ((isEdit || duplicateOf) && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isEdit && !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-xl text-gray-600">Email template not found</p>
        <Button onClick={() => navigate("/admin/email-templates")}>Back to Email Templates</Button>
      </div>
    );
  }

  const saving = create.isPending || update.isPending;
  const deactivatingActive = isEdit && template?.isActive && !isActive;

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader fullWidth
        title={isEdit ? `Edit Email Template - ${template?.templateName}` : "New Email Template"}
        subtitle={isEdit ? `${templateKey} · v${version}`
          : template ? `Duplicate of ${template.templateKey} — inactive until you switch it on. Change the key and name, preview, then save.`
          : "Created inactive unless you switch it on. Preview, save, then activate."}
        icon={<Mail className="w-7 h-7 text-[#b08d28]" />}
        onBack={() => navigate("/admin/email-templates")}
        rightActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={runPreview} disabled={preview.isPending}
              title="Render the current (unsaved) content — placeholders show as [name]; never sends">
              <Eye className="mr-1 h-4 w-4" /> Preview
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
            </Button>
          </div>
        }
      />

      <div className="w-full p-4 sm:p-6 space-y-6">
        {errors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            {conflict && (
              <Button variant="outline" size="sm" className="mt-3" onClick={async () => { const r = await refetch(); if (r.data) load(r.data); }}>
                Reload the latest version (your unsaved changes are discarded)
              </Button>
            )}
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-5 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="templateKey">Template Key <span className="text-red-600">*</span></Label>
            <Input id="templateKey" value={templateKey} disabled={isEdit} placeholder="e.g. OrderConfirmation"
              onChange={(e) => setTemplateKey(e.target.value)} />
            <p className="text-xs text-gray-500">
              The key the application asks for when it sends this email. Letters, digits, underscore; unique; cannot be
              changed later. Creating a template does not make the application send it.
            </p>
            {keyError && trimmedKey !== "" && <p className="text-xs text-red-600">{keyError}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="templateName">Template Name</Label>
            <Input id="templateName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-gray-500">The application sends this template only while it is active.</p>
              {deactivatingActive && (
                <p className="mt-1 text-xs font-medium text-amber-700">While inactive, the email that uses this key is not sent at all.</p>
              )}
            </div>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* Content */}
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="mailSubject">Subject</Label>
            <Input id="mailSubject" value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="htmlBody">HTML content</Label>
            <Textarea id="htmlBody" value={htmlBody} spellCheck={false}
              onChange={(e) => setHtmlBody(e.target.value)} className="min-h-[560px] resize-y font-mono text-xs" />
            <p className="text-xs text-gray-500">
              The content placed inside the shared brand frame (logo header and store footer are added automatically). Use any
              placeholder such as<code className="mx-1">{"{{customer_name}}"}</code>or<code className="mx-1">{"{{product_details}}"}</code>
              — the code that sends this email supplies its values (names must match what it supplies). Optionally,
              <code className="mx-1">{"{{#name}}…{{/name}}"}</code>shows a part only when that value is present. Preview shows a
              placeholder without a value as<code className="mx-1">[name]</code>. No scripts or expressions are executed.
            </p>
          </div>
        </div>
      </div>

      <EmailPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} loading={preview.isPending}
        preview={previewResult} errors={previewErrors} />
    </div>
  );
};
